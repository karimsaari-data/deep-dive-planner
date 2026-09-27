import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface ParsedLicense {
  licenseNumber: string | null;
  expiryDate: string | null; // ISO yyyy-mm-dd
  season: string | null; // e.g. "2025-2026"
}

const toIsoDate = (frDate: string): string | null => {
  const match = frDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
};

// Heuristique positionnelle sur le texte extrait d'une licence FSGT "Omnisport" :
// pas de libellés ("N°", "Valide jusqu'au") dans la couche texte du PDF, seulement
// les valeurs, dans l'ordre saison / date d'expiration / nom / naissance / genre / n° licence.
export const parseLicensePdf = async (file: File): Promise<ParsedLicense> => {
  const empty: ParsedLicense = { licenseNumber: null, expiryDate: null, season: null };

  try {
    const buffer = await file.arrayBuffer();
    const doc = await getDocument({ data: buffer }).promise;
    const page = await doc.getPage(1);
    const content = await page.getTextContent();
    const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");

    const seasonMatch = text.match(/\b(\d{4})-(\d{4})\b/);
    const dates = [...text.matchAll(/\d{2}\/\d{2}\/\d{4}/g)].map((m) => m[0]);
    const numberMatch = text.match(/\b[MF]\s+(\d{5,10})\b/);

    return {
      season: seasonMatch?.[0] ?? null,
      expiryDate: dates[0] ? toIsoDate(dates[0]) : null,
      licenseNumber: numberMatch?.[1] ?? null,
    };
  } catch {
    return empty;
  }
};
