import Papa from "papaparse";

// CSV import helpers focused on: header normalization + encoding robustness.

const looksLikeMojibake = (s: string) => /Ã.|Â./.test(s) || s.includes("\\uFFFD");

export const fixMojibake = (input: string): string => {
  if (!input) return "";
  const s = String(input);
  if (!looksLikeMojibake(s)) return s;

  // Typical case: UTF-8 bytes interpreted as latin1 => "PrÃ©nom"
  try {
    const bytes = Uint8Array.from(Array.from(s).map((ch) => ch.charCodeAt(0) & 0xff));
    const repaired = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return repaired;
  } catch {
    return s;
  }
};

export const normalizeHeader = (header: string): string => {
  const fixed = fixMojibake(String(header ?? ""))
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase();

  // Remove accents, spaces & special chars => stable matching
  return fixed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
};

export const cleanCsvCell = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const s = fixMojibake(String(value).replace(/\u00A0/g, " ")).trim();
  return s.length ? s : null;
};

const mojibakeScore = (s: string) => {
  const replacement = (s.match(/\uFFFD/g) || []).length;
  const suspicious = (s.match(/[ÃÂ]/g) || []).length;
  return replacement * 10 + suspicious;
};

export const readCsvFileText = async (file: File): Promise<string> => {
  const ab = await file.arrayBuffer();

  const candidates: Array<{ encoding: string; text: string }> = [
    { encoding: "utf-8", text: new TextDecoder("utf-8", { fatal: false }).decode(ab) },
    // Excel FR exports often land here
    { encoding: "windows-1252", text: new TextDecoder("windows-1252", { fatal: false }).decode(ab) },
    { encoding: "iso-8859-1", text: new TextDecoder("iso-8859-1", { fatal: false }).decode(ab) },
  ];

  candidates.sort((a, b) => mojibakeScore(a.text) - mojibakeScore(b.text));
  return candidates[0].text;
};

// Map normalized headers to internal fields
const HEADER_MAP: Record<string, string> = {
  // identity
  prenom: "first_name",
  firstname: "first_name",
  first: "first_name",
  nom: "last_name",
  lastname: "last_name",
  last: "last_name",
  // email
  email: "email",
  mail: "email",
  "e-mail": "email", // will be normalized
  // phone
  telephone: "phone",
  tel: "phone",
  phone: "phone",
  portable: "phone",
  // dates
  datenaissance: "birth_date",
  naissance: "birth_date",
  birthdate: "birth_date",
  birth: "birth_date",
  datedarrivee: "joined_at",
  datearrivee: "joined_at",
  dateinscription: "joined_at",
  inscription: "joined_at",
  joinedat: "joined_at",
  joined: "joined_at",
  // other
  adresse: "address",
  address: "address",
  niveauapnee: "apnea_level",
  apnee: "apnea_level",
  apneelevel: "apnea_level",
  niveau: "apnea_level",
  genre: "gender",
  sexe: "gender",
  gender: "gender",
  notes: "notes",
  remarques: "notes",
  commentaires: "notes",

  // emergency (split)
  contacturgencenom: "emergency_contact_name",
  urgencenom: "emergency_contact_name",
  emergencycontactname: "emergency_contact_name",
  contacturgencetel: "emergency_contact_phone",
  urgencetel: "emergency_contact_phone",
  emergencycontactphone: "emergency_contact_phone",

  // emergency (combined)
  contacturgence: "emergency_contact",
  urgence: "emergency_contact",
  emergency: "emergency_contact",
  emergencycontact: "emergency_contact",
};

export const mapHeaderToFieldKey = (header: string): string => {
  const normalized = normalizeHeader(header);
  return HEADER_MAP[normalized] ?? normalized;
};

export const normalizePhone = (value: string | null): string | null => {
  if (!value) return null;
  const digits = value.replace(/[\s.\-()]/g, "");
  return digits.length ? digits : null;
};

export const parseFlexibleDateToISO = (
  value: string | null
): { iso: string | null; error?: string } => {
  if (!value) return { iso: null };
  const v = value.trim();

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return { iso: v };

  const m = v.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (!m) return { iso: null, error: "Format de date invalide" };

  const dd = Number(m[1]);
  const mm = Number(m[2]);
  let yyyy = Number(m[3]);
  if (m[3].length === 2) yyyy = 2000 + yyyy;

  const date = new Date(Date.UTC(yyyy, mm - 1, dd));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== yyyy ||
    date.getUTCMonth() !== mm - 1 ||
    date.getUTCDate() !== dd
  ) {
    return { iso: null, error: "Format de date invalide" };
  }

  const iso = `${yyyy.toString().padStart(4, "0")}-${mm
    .toString()
    .padStart(2, "0")}-${dd.toString().padStart(2, "0")}`;
  return { iso };
};

export const parseCsvText = (text: string) => {
  // Note: In browser, PapaParse doesn't truly auto-detect encoding; we decode upstream.
  const baseConfig: Papa.ParseConfig = {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: mapHeaderToFieldKey,
    transform: (v) => cleanCsvCell(v) ?? "",
  };

  const first = Papa.parse<Record<string, string>>(text, baseConfig);
  if (first.data?.length) return first;

  // Small fallback for edge cases where delimiter autodetection struggles
  const semi = Papa.parse<Record<string, string>>(text, { ...baseConfig, delimiter: ";" });
  if (semi.data?.length) return semi;

  return Papa.parse<Record<string, string>>(text, { ...baseConfig, delimiter: "," });
};
