import PptxGenJS from "pptxgenjs";
import { PHOTOS_PER_PAGE, type PDFMember, type PDFReportData } from "@/hooks/usePDFReportData";
import { formatFullName } from "@/lib/formatName";
import { CONTACT_LINKS } from "./pages/PDFPageContact";
import { PDF_SECTIONS } from "./PDFSectionSelector";
import logoTeamOxygen from "@/assets/logo-team-oxygen.webp";

// Diapositives natives (textes, formes, tableaux et graphiques modifiables dans PowerPoint).
// Format 16:9, en pouces.
const W = 13.333;
const H = 7.5;
const M = 0.6; // marge

const C = {
  navy: "0A3A49",
  orange: "F08814",
  cyan: "0891B2",
  green: "059669",
  lime: "65A30D",
  amber: "CA8A04",
  brown: "C2410C",
  red: "DC2626",
  grey: "666666",
  light: "F8FAFC",
  border: "E2E8F0",
  text: "1A1A1A",
};
const PALETTE = [C.navy, C.cyan, C.green, C.lime, C.amber, C.brown];
const FONT = "Calibri";

const LEVEL_COLORS: Record<string, string> = {
  Inactif: "9CA3AF",
  Castagnole: "60A5FA",
  Crabe: "22D3EE",
  Méduse: "EF4444",
  Poulpe: "D946EF",
  Dauphin: "0A3A49",
  Requin: "F59E0B",
};

type Slide = PptxGenJS.Slide;

// Barres horizontales : première catégorie en haut. Valeur supportée par PowerPoint
// ("maxMin") mais absente des types de pptxgenjs.
const TOP_DOWN = "maxMin" as unknown as "minMax";

export interface BuildPptxOptions {
  data: PDFReportData;
  year: number;
  selectedSections: string[];
}

// --- Images -----------------------------------------------------------------
// Charge une image, la recadre (cover) au ratio demandé et la renvoie en data URI.
// Retourne null si le chargement échoue (CORS, 404...) : on affiche alors un repli.
const loadImage = (url: string, aspect?: number): Promise<string | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
        if (aspect) {
          const cur = sw / sh;
          if (cur > aspect) { sw = sh * aspect; sx = (img.naturalWidth - sw) / 2; }
          else { sh = sw / aspect; sy = (img.naturalHeight - sh) / 2; }
        }
        const maxW = 600;
        const scale = Math.min(1, maxW / sw);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(sw * scale);
        canvas.height = Math.round(sh * scale);
        canvas.getContext("2d")!.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

// --- Helpers ----------------------------------------------------------------
const initials = (m: PDFMember) => `${m.first_name.charAt(0)}${m.last_name.charAt(0)}`.toUpperCase();

const avatarColor = (name: string) => {
  const colors = [C.navy, "2563EB", C.cyan, "0D9488", C.green, C.lime, C.amber, "EA580C"];
  const hash = name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const fmtDate = (iso: string | Date) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

// Gabarits alignés sur la trame validée (voir CLAUDE.md) : Page de titre, Titre seul,
// Vide, Titre et contenu, Deux colonnes, Section. Titre 26 pt et petit intitulé en
// vrais placeholders, logo en haut à droite, pied de page, barre du bas, numéro.
const LAYOUT_COVER = "Page de titre";
const LAYOUT_TITLE = "Titre seul";
const LAYOUT_BLANK = "Vide";
const LAYOUT_CONTENT = "Titre et contenu";
const LAYOUT_TWO_COLS = "Deux colonnes";
const LAYOUT_SECTION = "Section";

const bar = (x: number, y: number, w: number, h: number, color: string) => ({
  rect: { x, y, w, h, fill: { color }, line: { color, width: 0 } },
});

const getAspect = (dataUrl: string): Promise<number> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth / img.naturalHeight || 1.6);
    img.onerror = () => resolve(1.6);
    img.src = dataUrl;
  });

const defineMasters = async (pptx: PptxGenJS, year: number, logo: string | null) => {
  const aspect = logo ? await getAspect(logo) : 1.6;
  const footer = `Team Oxygen · Assemblée Générale ${year}`;

  // Éléments communs aux mises en page de contenu : logo, pied, barre du bas
  const chrome: PptxGenJS.SlideMasterProps["objects"] = [
    ...(logo ? [{ image: { data: logo, x: 12.73 - 0.64 * aspect, y: 0.12, w: 0.64 * aspect, h: 0.64 } }] : []),
    bar(0, 7.42, W, 0.08, C.navy),
    bar(0, 7.42, 1.6, 0.08, C.orange),
    { text: { text: footer, options: { x: M, y: 7.1, w: 8, h: 0.3, fontFace: FONT, fontSize: 10, color: C.grey, valign: "middle" as const } } },
  ];
  const slideNumber = { x: 12.13, y: 7.1, w: 0.6, h: 0.3, fontFace: FONT, fontSize: 10, color: "666666", align: "right" as const };
  const kicker = (x: number, y: number, w: number, h: number) => ({
    placeholder: { options: { name: "kicker", type: "body" as const, x, y, w, h, fontFace: FONT, fontSize: 13, bold: true, color: C.orange, align: "left" as const, valign: "middle" as const }, text: "SECTION" },
  });
  const title = (x: number, y: number, w: number, h: number) => ({
    placeholder: { options: { name: "title", type: "title" as const, x, y, w, h, fontFace: FONT, fontSize: 26, bold: true, color: C.navy, align: "left" as const, valign: "middle" as const }, text: "Titre de la diapositive" },
  });
  const titleBlock = [kicker(M, 0.2, 10.9, 0.3), title(M, 0.48, 10.9, 0.55), bar(M, 1.05, 1.2, 0.05, C.orange)];
  const bodyPh = (name: string, x: number, w: number, text: string) => ({
    placeholder: { options: { name, type: "body" as const, x, y: 1.7, w, h: 5.2, fontFace: FONT, fontSize: 16, color: C.text, valign: "top" as const }, text },
  });

  pptx.defineSlideMaster({
    title: LAYOUT_COVER,
    background: { color: "FFFFFF" },
    objects: [
      ...(logo ? [{ image: { data: logo, x: 4.37, y: 0.9, w: 4.6, h: 2.8 } }] : []),
      {
        placeholder: { options: { name: "title", type: "title" as const, x: M, y: 4.0, w: 12.13, h: 0.8, fontFace: FONT, fontSize: 36, bold: true, color: C.navy, align: "center" as const, valign: "middle" as const }, text: "Titre de la présentation" },
      },
      {
        placeholder: { options: { name: "subtitle", type: "body" as const, x: M, y: 4.8, w: 12.13, h: 0.6, fontFace: FONT, fontSize: 24, color: C.orange, align: "center" as const, valign: "middle" as const }, text: "Sous-titre" },
      },
      bar(5.87, 5.6, 1.6, 0.06, C.orange),
      bar(0, 7.1, W, 0.4, C.navy),
      bar(0, 7.1, 1.6, 0.4, C.orange),
    ],
  });
  pptx.defineSlideMaster({ title: LAYOUT_TITLE, background: { color: "FFFFFF" }, objects: [...chrome, ...titleBlock], slideNumber });
  pptx.defineSlideMaster({ title: LAYOUT_BLANK, background: { color: "FFFFFF" }, objects: [...chrome], slideNumber });
  pptx.defineSlideMaster({
    title: LAYOUT_CONTENT,
    background: { color: "FFFFFF" },
    objects: [...chrome, ...titleBlock, bodyPh("content", M, 12.13, "Texte")],
    slideNumber,
  });
  pptx.defineSlideMaster({
    title: LAYOUT_TWO_COLS,
    background: { color: "FFFFFF" },
    objects: [...chrome, ...titleBlock, bodyPh("left", M, 5.9, "Colonne gauche"), bodyPh("right", 6.83, 5.9, "Colonne droite")],
    slideNumber,
  });
  pptx.defineSlideMaster({
    title: LAYOUT_SECTION,
    background: { color: "FFFFFF" },
    objects: [
      kicker(0.9, 2.6, 11.5, 0.4),
      title(0.9, 3.05, 11.5, 1.2),
      bar(0.9, 4.35, 1.6, 0.06, C.orange),
      bar(0, 7.42, 1.6, 0.08, C.orange),
    ],
  });
};

const addTitle = (slide: Slide, text: string, subtitle?: string, kicker?: string) => {
  slide.addText((kicker || "").toUpperCase(), { placeholder: "kicker" });
  slide.addText(text, { placeholder: "title" });
  if (subtitle) {
    slide.addText(subtitle, { x: M, y: 1.15, w: W - 2 * M, h: 0.4, fontFace: FONT, fontSize: 13, color: C.grey, valign: "middle" });
  }
};

const card = (slide: Slide, x: number, y: number, w: number, h: number, borderColor = C.border, fill = C.light) =>
  slide.addShape("roundRect", { x, y, w, h, rectRadius: 0.1, fill: { color: fill }, line: { color: borderColor, width: 1 } });

// Pastille cercle : photo si disponible, sinon initiales sur fond coloré
const addAvatar = async (slide: Slide, m: PDFMember, x: number, y: number, size: number, ring: string, fontSize: number) => {
  const photo = m.avatar_url ? await loadImage(m.avatar_url, 1) : null;
  if (photo) {
    slide.addImage({ data: photo, x, y, w: size, h: size, rounding: true });
    slide.addShape("ellipse", { x, y, w: size, h: size, fill: { type: "none" }, line: { color: ring, width: 2 } });
  } else {
    slide.addShape("ellipse", {
      x, y, w: size, h: size,
      fill: { color: avatarColor(m.first_name + m.last_name) },
      line: { color: ring, width: 2 },
    });
    slide.addText(initials(m), { x, y, w: size, h: size, align: "center", valign: "middle", fontFace: FONT, fontSize, bold: true, color: "FFFFFF" });
  }
};

// --- Slides -----------------------------------------------------------------
const slideCover = (pptx: PptxGenJS, year: number) => {
  const slide = pptx.addSlide({ masterName: LAYOUT_COVER });
  slide.addText(`Rapport d'Activité & Statistiques ${year}`, { placeholder: "title" });
  slide.addText("Assemblée Générale", { placeholder: "subtitle" });
  slide.addText(`Document généré le ${fmtDate(new Date())}`, { x: M, y: 5.85, w: W - 2 * M, h: 0.4, align: "center", fontFace: FONT, fontSize: 13, color: C.grey });
};

const slideSummary = (pptx: PptxGenJS, sections: string[]) => {
  const slide = pptx.addSlide({ masterName: LAYOUT_TITLE });
  addTitle(slide, "Sommaire", undefined, "Assemblée Générale");
  const descriptions: Record<string, string> = {
    bureau: "Composition du bureau du club",
    encadrants: "Nos encadrants certifiés",
    dashboard: "Chiffres clés de l'année",
    demographics: "Profil des adhérents",
    membership: "Parité H/F et nouvelles adhésions",
    levels: "Castagnole, Dauphin, Requin…",
    topPlongeurs: "Les mordus de l'apnée",
    photos: "Les moments forts de la saison",
    encadrantsActivity: "Mobilisation de l'équipe",
    topSites: "Nos spots favoris",
    equipment: "Inventaire et valorisation",
    contact: "Restons connectés",
  };
  const items = PDF_SECTIONS.filter((s) => s.id !== "cover" && s.id !== "summary" && sections.includes(s.id));
  const colW = (W - 2 * M - 0.4) / 2;
  const perCol = Math.ceil(items.length / 2);
  items.forEach((s, i) => {
    const col = Math.floor(i / perCol);
    const row = i % perCol;
    const x = M + col * (colW + 0.4);
    const y = 1.5 + row * 0.9;
    card(slide, x, y, colW, 0.75);
    slide.addShape("ellipse", { x: x + 0.15, y: y + 0.12, w: 0.5, h: 0.5, fill: { color: C.navy }, line: { color: C.navy, width: 0 } });
    slide.addText(String(i + 1), { x: x + 0.15, y: y + 0.12, w: 0.5, h: 0.5, align: "center", valign: "middle", fontFace: FONT, fontSize: 15, bold: true, color: "FFFFFF" });
    slide.addText(
      [
        { text: s.label, options: { bold: true, fontSize: 16, color: C.text, breakLine: true } },
        { text: descriptions[s.id] || "", options: { fontSize: 11, color: C.grey } },
      ],
      { x: x + 0.8, y: y + 0.05, w: colW - 0.95, h: 0.65, fontFace: FONT, valign: "middle" }
    );
  });
};

const slideBureau = async (pptx: PptxGenJS, members: PDFMember[]) => {
  const slide = pptx.addSlide({ masterName: LAYOUT_TITLE });
  addTitle(slide, "Le Bureau", `${members.length} membres · composition au ${fmtDate(new Date())}`, "Gouvernance");
  const cols = 4;
  const gap = 0.25;
  const cw = (W - 2 * M - gap * (cols - 1)) / cols;
  const ch = 1.9;
  for (let i = 0; i < members.length; i++) {
    const m = members[i];
    const x = M + (i % cols) * (cw + gap);
    const y = 1.7 + Math.floor(i / cols) * (ch + 0.2);
    card(slide, x, y, cw, ch);
    await addAvatar(slide, m, x + (cw - 0.95) / 2, y + 0.15, 0.95, C.navy, 22);
    slide.addText(formatFullName(m.first_name, m.last_name), { x, y: y + 1.12, w: cw, h: 0.35, align: "center", fontFace: FONT, fontSize: 14, bold: true, color: C.text });
    slide.addText(m.board_role || "", { x, y: y + 1.45, w: cw, h: 0.3, align: "center", fontFace: FONT, fontSize: 11, color: C.orange, bold: true });
  }
};

const slideEncadrants = async (pptx: PptxGenJS, members: PDFMember[]) => {
  const slide = pptx.addSlide({ masterName: LAYOUT_TITLE });
  addTitle(slide, "Nos Encadrants", `${members.length} encadrants · composition au ${fmtDate(new Date())}`, "Équipe technique");
  const cols = 6;
  const gap = 0.18;
  const cw = (W - 2 * M - gap * (cols - 1)) / cols;
  const ch = 1.95;
  const shown = members.slice(0, 18);
  for (let i = 0; i < shown.length; i++) {
    const m = shown[i];
    const x = M + (i % cols) * (cw + gap);
    const y = 1.7 + Math.floor(i / cols) * (ch + 0.15);
    card(slide, x, y, cw, ch);
    await addAvatar(slide, m, x + (cw - 0.75) / 2, y + 0.12, 0.75, C.cyan, 16);
    slide.addText(
      [
        { text: m.first_name, options: { bold: true, fontSize: 11, color: C.text, breakLine: true } },
        { text: m.last_name, options: { fontSize: 10, color: C.grey, breakLine: true } },
        { text: m.apnea_level || "", options: { fontSize: 9, color: C.cyan, bold: true, breakLine: true } },
        { text: m.board_role || "", options: { fontSize: 9, color: C.orange } },
      ],
      { x: x + 0.05, y: y + 0.9, w: cw - 0.1, h: 1.0, align: "center", valign: "top", fontFace: FONT }
    );
  }
  if (members.length > 18) {
    slide.addText(`+ ${members.length - 18} autres encadrants`, { x: M, y: 7.0, w: W - 2 * M, h: 0.3, align: "center", fontFace: FONT, fontSize: 11, color: C.grey });
  }
};

const slideDashboard = (pptx: PptxGenJS, data: PDFReportData, year: number) => {
  const { stats } = data;
  const slide = pptx.addSlide({ masterName: LAYOUT_TITLE });
  addTitle(slide, `Bilan Global ${year}`, undefined, "Chiffres clés");
  const kpis = [
    { label: "Adhérents saison", sub: `${stats.seasonYear - 1}-${stats.seasonYear} · dont ${stats.totalEncadrants} encadrants`, value: stats.totalMembers, color: C.navy },
    { label: "Sorties réalisées", sub: `du 1er janvier au ${fmtDate(stats.periodEnd)}`, value: stats.totalOutings, color: C.cyan },
    { label: "Plongées cumulées", sub: "participations cumulées", value: stats.totalParticipations, color: C.green },
  ];
  const gap = 0.4;
  const cw = (W - 2 * M - 2 * gap) / 3;
  kpis.forEach((k, i) => {
    const x = M + i * (cw + gap);
    card(slide, x, 1.8, cw, 3.3, k.color);
    slide.addText(k.value.toLocaleString("fr-FR"), { x, y: 2.2, w: cw, h: 1.3, align: "center", valign: "middle", fontFace: FONT, fontSize: 66, bold: true, color: k.color });
    slide.addText(k.label, { x, y: 3.55, w: cw, h: 0.5, align: "center", fontFace: FONT, fontSize: 20, color: C.grey });
    slide.addText(k.sub, { x, y: 4.1, w: cw, h: 0.4, align: "center", fontFace: FONT, fontSize: 12, color: "888888" });
  });
  const avg = stats.totalOutings > 0 ? Math.round(stats.totalParticipations / stats.totalOutings) : 0;
  slide.addShape("rect", { x: M, y: 5.5, w: W - 2 * M, h: 1.2, fill: { color: "ECFDF5" }, line: { color: "ECFDF5", width: 0 } });
  slide.addShape("rect", { x: M, y: 5.5, w: 0.07, h: 1.2, fill: { color: C.green }, line: { color: C.green, width: 0 } });
  slide.addText(
    [
      { text: `En moyenne, chaque sortie a réuni ${avg} participants`, options: { fontSize: 15, color: "166534", breakLine: true } },
      {
        text:
          "Sorties comptabilisées depuis la mise en service de l'application" +
          (stats.firstOutingDate ? ` (première sortie : ${fmtDate(stats.firstOutingDate)})` : "") +
          ". Quelques sorties antérieures ne sont pas incluses.",
        options: { fontSize: 12, color: "92400E" },
      },
    ],
    { x: M + 0.25, y: 5.5, w: W - 2 * M - 0.4, h: 1.2, fontFace: FONT, valign: "middle" }
  );
};

const slideDemographics = (pptx: PptxGenJS, d: PDFReportData["demographics"]) => {
  const slide = pptx.addSlide({ masterName: LAYOUT_TITLE });
  addTitle(slide, "Démographie", `${d.totalMembers} adhérents · âge moyen ${d.averageAge} ans`, "Adhérents");
  const gap = 0.3;
  const cw = (W - 2 * M - 2 * gap) / 3;
  const y = 1.7;
  const ch = 5.3;
  const panels = [`Pyramide des âges (total ${d.totalMembers})`, `Parité H/F (total ${d.totalMembers})`, `Répartition des niveaux (total ${d.totalMembers})`];
  panels.forEach((t, i) => {
    const x = M + i * (cw + gap);
    card(slide, x, y, cw, ch);
    slide.addText(t, { x: x + 0.2, y: y + 0.1, w: cw - 0.4, h: 0.45, fontFace: FONT, fontSize: 15, bold: true, color: C.text });
  });

  const barOpts = (colors: string[], x: number): PptxGenJS.IChartOpts => ({
    x: x + 0.1, y: y + 0.6, w: cw - 0.2, h: ch - 0.75,
    barDir: "bar",
    chartColors: colors,
    catAxisOrientation: TOP_DOWN,
    valAxisHidden: true,
    valGridLine: { style: "none" },
    showValue: true,
    dataLabelFontSize: 11,
    dataLabelFontBold: true,
    catAxisLabelFontSize: 11,
    catAxisLabelFontFace: FONT,
    showLegend: false,
    barGapWidthPct: 40,
  });

  if (d.ageData.length) {
    slide.addChart(
      "bar",
      [{ name: "Adhérents", labels: d.ageData.map((a) => a.name), values: d.ageData.map((a) => a.value) }],
      barOpts(PALETTE, M)
    );
  }

  const genderColors: Record<string, string> = { Homme: C.cyan, Femme: "EC4899", "Non renseigné": "9CA3AF" };
  if (d.genderData.length) {
    slide.addChart(
      "doughnut",
      [{ name: "Genre", labels: d.genderData.map((g) => g.name), values: d.genderData.map((g) => g.value) }],
      {
        x: M + (cw + gap) + 0.1, y: y + 0.6, w: cw - 0.2, h: ch - 0.75,
        chartColors: d.genderData.map((g) => genderColors[g.name] || "9CA3AF"),
        holeSize: 55,
        showLegend: true,
        legendPos: "b",
        legendFontSize: 12,
        legendFontFace: FONT,
        showPercent: true,
        showValue: false,
        dataLabelColor: "FFFFFF",
        dataLabelFontSize: 13,
        dataLabelFontBold: true,
      }
    );
  }

  const levels = d.levelData.slice(0, 8);
  if (levels.length) {
    slide.addChart(
      "bar",
      [{ name: "Adhérents", labels: levels.map((l) => l.name), values: levels.map((l) => l.value) }],
      barOpts(PALETTE, M + 2 * (cw + gap))
    );
  }
};

const slideMembership = (pptx: PptxGenJS, data: PDFReportData) => {
  const m = data.membership;
  const slide = pptx.addSlide({ masterName: LAYOUT_TITLE });
  const pct = (n: number, t: number) => (t > 0 ? Math.round((n / t) * 100) : 0);
  const delta = m.total - m.previousSeasonTotal;
  addTitle(
    slide,
    "Parité & Nouveaux Adhérents",
    `Saison ${m.seasonYear - 1}-${m.seasonYear}` +
      (m.previousSeasonTotal > 0
        ? ` · ${delta >= 0 ? "+" : "-"}${Math.abs(delta)} adhérents vs saison précédente (${m.previousSeasonTotal}, ${delta >= 0 ? "+" : "-"}${pct(Math.abs(delta), m.previousSeasonTotal)}%)`
        : ""),
    "Adhérents"
  );

  const kpis = [
    { label: "Adhérents saison", value: m.total, sub: `${m.seasonYear - 1}-${m.seasonYear}`, color: C.navy },
    { label: "Nouveaux adhérents", value: m.newCount, sub: `${pct(m.newCount, m.total)}% des adhérents`, color: C.green },
    { label: "Renouvellements", value: m.renewedCount, sub: `${pct(m.renewedCount, m.total)}% des adhérents`, color: C.cyan },
  ];
  const gap = 0.35;
  const cw = (W - 2 * M - 2 * gap) / 3;
  kpis.forEach((k, i) => {
    const x = M + i * (cw + gap);
    card(slide, x, 1.7, cw, 1.75, k.color);
    slide.addText(String(k.value), { x, y: 1.75, w: cw, h: 0.9, align: "center", valign: "middle", fontFace: FONT, fontSize: 48, bold: true, color: k.color });
    slide.addText(k.label, { x, y: 2.62, w: cw, h: 0.4, align: "center", fontFace: FONT, fontSize: 16, color: "444444" });
    slide.addText(k.sub, { x, y: 3.0, w: cw, h: 0.3, align: "center", fontFace: FONT, fontSize: 11, color: "888888" });
  });

  card(slide, M, 3.7, W - 2 * M, 3.2);
  slide.addText("Parité Homme / Femme", { x: M + 0.2, y: 3.75, w: 5, h: 0.4, fontFace: FONT, fontSize: 15, bold: true, color: C.text });
  const groups = [
    { name: `Tous les adhérents (${m.total})`, g: m.all },
    { name: `Nouveaux adhérents (${m.newCount})`, g: m.newMembers },
    { name: `Renouvellements (${m.renewedCount})`, g: m.renewed },
  ];
  const labels = groups.map((x) => x.name);
  const series = [
    { name: "Hommes", labels, values: groups.map((x) => x.g.homme) },
    { name: "Femmes", labels, values: groups.map((x) => x.g.femme) },
  ];
  if (groups.some((x) => x.g.autre > 0)) series.push({ name: "Non renseigné", labels, values: groups.map((x) => x.g.autre) });
  slide.addChart("bar", series, {
    x: M + 0.1, y: 4.1, w: W - 2 * M - 0.2, h: 2.75,
    barDir: "bar",
    barGrouping: "percentStacked",
    chartColors: [C.cyan, "EC4899", "9CA3AF"].slice(0, series.length),
    catAxisOrientation: TOP_DOWN,
    valAxisHidden: true,
    valGridLine: { style: "none" },
    showValue: true,
    dataLabelColor: "FFFFFF",
    dataLabelFontSize: 13,
    dataLabelFontBold: true,
    catAxisLabelFontSize: 12,
    catAxisLabelFontFace: FONT,
    showLegend: true,
    legendPos: "t",
    legendFontSize: 12,
    barGapWidthPct: 40,
  });
  slide.addText(`Nouvel adhérent : date d'entrée dans le club à partir du 1er septembre ${m.seasonYear - 1}.`, {
    x: M, y: 6.92, w: W - 2 * M, h: 0.2, fontFace: FONT, fontSize: 9, color: "888888",
  });
};

const slideLevels = (pptx: PptxGenJS, data: PDFReportData, year: number) => {
  const { fishLevels, stats } = data;
  const slide = pptx.addSlide({ masterName: LAYOUT_TITLE });
  const total = fishLevels.reduce((s, l) => s + l.count, 0);
  const active = fishLevels.filter((l) => l.min > 0).reduce((s, l) => s + l.count, 0);
  addTitle(
    slide,
    `Niveaux des adhérents ${year}`,
    `Niveau selon le nombre de sorties depuis le 1er janvier · ${total} adhérents saison ${stats.seasonYear - 1}-${stats.seasonYear} · dont ${active} actifs`,
    "Adhérents"
  );

  slide.addChart(
    "bar",
    [{ name: "Adhérents", labels: fishLevels.map((l) => `${l.emoji} ${l.name}`), values: fishLevels.map((l) => l.count) }],
    {
      x: M, y: 1.7, w: 7.4, h: 5.3,
      barDir: "bar",
      chartColors: fishLevels.map((l) => LEVEL_COLORS[l.name] || C.navy),
      catAxisOrientation: TOP_DOWN,
      valAxisHidden: true,
      valGridLine: { style: "none" },
      showValue: true,
      dataLabelFontSize: 13,
      dataLabelFontBold: true,
      catAxisLabelFontSize: 13,
      catAxisLabelFontFace: FONT,
      showLegend: false,
      barGapWidthPct: 35,
    }
  );

  const head = (t: string, align: "left" | "center" | "right" = "left") => ({
    text: t,
    options: { bold: true, color: "FFFFFF", fill: { color: C.navy }, align, fontFace: FONT, fontSize: 12 },
  });
  const rows: PptxGenJS.TableRow[] = [[head("Niveau"), head("Sorties"), head("Adhérents", "center"), head("%", "center")]];
  fishLevels.forEach((l, i) => {
    const range = l.max === null ? `${l.min}+` : l.min === l.max ? `${l.min}` : `${l.min}-${l.max}`;
    const fill = { color: i % 2 === 0 ? C.light : "FFFFFF" };
    const pct = total > 0 ? Math.round((l.count / total) * 100) : 0;
    rows.push([
      { text: `${l.emoji} ${l.name}`, options: { fill, fontFace: FONT, fontSize: 12 } },
      { text: range, options: { fill, fontFace: FONT, fontSize: 12, color: C.grey } },
      { text: String(l.count), options: { fill, fontFace: FONT, fontSize: 12, bold: true, align: "center" } },
      { text: `${pct}%`, options: { fill, fontFace: FONT, fontSize: 12, color: C.grey, align: "center" } },
    ]);
  });
  slide.addTable(rows, { x: 8.3, y: 1.9, w: W - M - 8.3, colW: [1.7, 1, 1.0, 0.73], rowH: 0.45, border: { type: "solid", color: C.border, pt: 0.5 } });
};

const rankTable = (
  slide: Slide,
  headers: string[],
  rows: (string | number)[][],
  colW: number[],
  centerCols: number[],
  highlightTop3: string
) => {
  const head = headers.map((h, i) => ({
    text: h,
    options: { bold: true, color: "FFFFFF", fill: { color: C.navy }, fontFace: FONT, fontSize: 12, align: (centerCols.includes(i) ? "center" : "left") as "left" | "center" },
  }));
  const body: PptxGenJS.TableRow[] = rows.map((r, idx) => {
    const top = idx < 3;
    const fill = { color: top ? highlightTop3 : idx % 2 === 0 ? C.light : "FFFFFF" };
    return r.map((cell, i) => ({
      text: String(cell),
      options: {
        fill,
        fontFace: FONT,
        fontSize: 12,
        bold: top || centerCols.includes(i),
        color: i === 2 && headers.length === 4 ? C.grey : C.text,
        align: (centerCols.includes(i) ? "center" : "left") as "left" | "center",
      },
    }));
  });
  slide.addTable([head, ...body], { x: M, y: 1.7, w: W - 2 * M, colW, rowH: 0.31, border: { type: "solid", color: C.border, pt: 0.5 } });
};

const slideTopPlongeurs = (pptx: PptxGenJS, data: PDFReportData, year: number) => {
  const slide = pptx.addSlide({ masterName: LAYOUT_TITLE });
  addTitle(slide, `Les Mordus de l'Apnée ${year}`, "Top 15 des participants les plus assidus", "Participation");
  const medals = ["🥇", "🥈", "🥉"];
  const rows = data.topParticipants.slice(0, 15).map((p, i) => [
    `${medals[i] ? medals[i] + " " : ""}${i + 1}`,
    p.name,
    p.memberCode || "-",
    p.participations,
  ]);
  if (rows.length === 0) {
    slide.addText(`Aucune donnée de participation disponible pour ${year}`, { x: M, y: 3, w: W - 2 * M, h: 1, align: "center", fontFace: FONT, fontSize: 16, color: C.grey });
    return;
  }
  const total = W - 2 * M;
  rankTable(slide, ["Rang", "Nom", "Code Membre", "Participations"], rows, [1.1, total - 1.1 - 2.2 - 2.2, 2.2, 2.2], [3], "FEF3C7");
};

const slideEncadrantsActivity = (pptx: PptxGenJS, data: PDFReportData, year: number) => {
  const { staff } = data;
  const slide = pptx.addSlide({ masterName: LAYOUT_TITLE });
  addTitle(
    slide,
    `Implication du Staff ${year}`,
    `Mobilisation de l'équipe d'encadrement · ${staff.totalOutings} sorties · une sortie compte pour chaque encadrant, co-encadrement inclus`,
    "Encadrement"
  );
  const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  const kpis = [
    { label: "Encadrants actifs", value: fmt(staff.activeEncadrants), sub: "ont encadré au moins une sortie", color: C.navy },
    { label: "Sorties par encadrant", value: fmt(staff.avgOutingsPerEncadrant), sub: "en moyenne sur l'année", color: C.cyan },
    { label: "Encadrants par sortie", value: fmt(staff.avgEncadrantsPerOuting), sub: "en moyenne", color: C.green },
    { label: "Sorties co-encadrées", value: `${staff.coEncadrementRate}%`, sub: "au moins 2 encadrants", color: C.orange },
  ];
  const gap = 0.25;
  const cw = (W - 2 * M - 3 * gap) / 4;
  kpis.forEach((k, i) => {
    const x = M + i * (cw + gap);
    card(slide, x, 1.7, cw, 1.6, k.color);
    slide.addText(k.value, { x, y: 1.72, w: cw, h: 0.85, align: "center", valign: "middle", fontFace: FONT, fontSize: 40, bold: true, color: k.color });
    slide.addText(k.label, { x, y: 2.55, w: cw, h: 0.35, align: "center", fontFace: FONT, fontSize: 14, bold: true, color: "444444" });
    slide.addText(k.sub, { x, y: 2.88, w: cw, h: 0.3, align: "center", fontFace: FONT, fontSize: 10, color: "888888" });
  });

  card(slide, M, 3.5, W - 2 * M, 3.45);
  slide.addText("Évolution mensuelle", { x: M + 0.2, y: 3.55, w: 5, h: 0.4, fontFace: FONT, fontSize: 15, bold: true, color: C.text });
  if (staff.monthly.length) {
    const labels = staff.monthly.map((m) => m.month);
    slide.addChart(
      "line",
      [
        { name: "Sorties", labels, values: staff.monthly.map((m) => m.outings) },
        { name: "Encadrants mobilisés", labels, values: staff.monthly.map((m) => m.encadrants) },
      ],
      {
        x: M + 0.1, y: 3.9, w: W - 2 * M - 0.2, h: 3.0,
        chartColors: [C.cyan, C.orange],
        lineSize: 3,
        lineDataSymbol: "circle",
        lineDataSymbolSize: 8,
        lineSmooth: true,
        showValue: true,
        dataLabelPosition: "t",
        dataLabelFontSize: 11,
        dataLabelFontBold: true,
        catAxisLabelFontSize: 12,
        catAxisLabelFontFace: FONT,
        valAxisLabelFontSize: 11,
        valAxisMinVal: 0,
        valGridLine: { color: "E2E8F0", style: "solid", size: 0.5 },
        showLegend: true,
        legendPos: "t",
        legendFontSize: 12,
      }
    );
  }
};

const slideTopSites = async (pptx: PptxGenJS, data: PDFReportData, year: number) => {
  const slide = pptx.addSlide({ masterName: LAYOUT_TITLE });
  addTitle(slide, `Top 10 des Sites ${year}`, undefined, "Sites de plongée");
  const cols = 5;
  const gap = 0.2;
  const cw = (W - 2 * M - gap * (cols - 1)) / cols;
  const ph = 1.45;
  const ch = 2.55;
  const locs = data.topLocations.slice(0, 10);
  for (let i = 0; i < locs.length; i++) {
    const loc = locs[i];
    const x = M + (i % cols) * (cw + gap);
    const y = 1.5 + Math.floor(i / cols) * (ch + 0.2);
    card(slide, x, y, cw, ch);
    const photo = loc.photo_url ? await loadImage(loc.photo_url, cw / ph) : null;
    if (photo) {
      slide.addImage({ data: photo, x: x + 0.05, y: y + 0.05, w: cw - 0.1, h: ph });
    } else {
      slide.addShape("rect", { x: x + 0.05, y: y + 0.05, w: cw - 0.1, h: ph, fill: { color: C.navy }, line: { color: C.navy, width: 0 } });
      slide.addText("🌊", { x: x + 0.05, y: y + 0.05, w: cw - 0.1, h: ph, align: "center", valign: "middle", fontSize: 30 });
    }
    slide.addText(`#${i + 1}`, { x: x + 0.1, y: y + ph + 0.1, w: cw - 0.2, h: 0.3, fontFace: FONT, fontSize: 14, bold: true, color: C.orange });
    slide.addText(loc.name, { x: x + 0.1, y: y + ph + 0.4, w: cw - 0.2, h: 0.35, fontFace: FONT, fontSize: 12, bold: true, color: C.text, fit: "shrink" });
    slide.addText(`${loc.count} sortie${loc.count > 1 ? "s" : ""}`, { x: x + 0.1, y: y + ph + 0.75, w: cw - 0.2, h: 0.3, fontFace: FONT, fontSize: 12, bold: true, color: C.green });
  }
};

const slideEquipment = (pptx: PptxGenJS, data: PDFReportData) => {
  const { equipment } = data;
  const slide = pptx.addSlide({ masterName: LAYOUT_TITLE });
  addTitle(slide, "Parc Matériel & Valorisation", undefined, "Matériel");
  card(slide, M, 1.5, 3.6, 5.5, C.green, "ECFDF5");
  slide.addText("Valeur totale du parc", { x: M, y: 2.5, w: 3.6, h: 0.5, align: "center", fontFace: FONT, fontSize: 15, color: "166534" });
  slide.addText(`${equipment.totalValue.toLocaleString("fr-FR")} €`, { x: M, y: 3.1, w: 3.6, h: 1.0, align: "center", valign: "middle", fontFace: FONT, fontSize: 44, bold: true, color: C.green });
  slide.addText("Valeur de remplacement estimée", { x: M, y: 4.2, w: 3.6, h: 0.4, align: "center", fontFace: FONT, fontSize: 12, color: C.grey });

  const items = equipment.items.slice(0, 15);
  slide.addText("Top 15 des équipements par valeur (€)", { x: M + 3.9, y: 1.5, w: W - 2 * M - 3.9, h: 0.4, fontFace: FONT, fontSize: 14, bold: true, color: C.text });
  if (items.length) {
    slide.addChart(
      "bar",
      [{ name: "Valeur (€)", labels: items.map((e) => `${e.name} (x${e.quantity})`), values: items.map((e) => e.totalValue) }],
      {
        x: M + 3.9, y: 1.9, w: W - 2 * M - 3.9, h: 5.1,
        barDir: "bar",
        chartColors: items.map((_, i) => (i < 3 ? C.green : C.cyan)),
        catAxisOrientation: TOP_DOWN,
        valAxisHidden: true,
        valGridLine: { style: "none" },
        showValue: true,
        dataLabelFormatCode: "#,##0 €",
        dataLabelFontSize: 10,
        catAxisLabelFontSize: 10,
        catAxisLabelFontFace: FONT,
        showLegend: false,
        barGapWidthPct: 30,
      }
    );
  }
};

const slidePhotos = async (pptx: PptxGenJS, data: PDFReportData, year: number) => {
  const { photos } = data;
  const pages = Math.ceil(photos.items.length / PHOTOS_PER_PAGE);
  const cols = 3;
  const gap = 0.25;
  const cw = (W - 2 * M - gap * (cols - 1)) / cols;
  const ph = 2.0;
  const ch = ph + 0.55;
  for (let part = 0; part < pages; part++) {
    const slide = pptx.addSlide({ masterName: LAYOUT_TITLE });
    addTitle(
      slide,
      part === 0 ? `Souvenirs ${year}` : `Souvenirs ${year} (suite)`,
      `${photos.totalPhotos} photos dans l'album du club · ${photos.totalOutings} sortie${photos.totalOutings > 1 ? "s" : ""} photographiée${photos.totalOutings > 1 ? "s" : ""}`,
      "Album photo"
    );
    const items = photos.items.slice(part * PHOTOS_PER_PAGE, (part + 1) * PHOTOS_PER_PAGE);
    for (let i = 0; i < items.length; i++) {
      const p = items[i];
      const x = M + (i % cols) * (cw + gap);
      const y = 1.65 + Math.floor(i / cols) * (ch + 0.2);
      card(slide, x, y, cw, ch);
      const img = await loadImage(p.url, (cw - 0.1) / ph);
      if (img) {
        slide.addImage({ data: img, x: x + 0.05, y: y + 0.05, w: cw - 0.1, h: ph, altText: p.title });
      } else {
        slide.addShape("rect", { x: x + 0.05, y: y + 0.05, w: cw - 0.1, h: ph, fill: { color: C.navy }, line: { color: C.navy, width: 0 } });
        slide.addText("📸", { x: x + 0.05, y: y + 0.05, w: cw - 0.1, h: ph, align: "center", valign: "middle", fontSize: 30 });
      }
      slide.addText(
        [
          { text: p.title, options: { bold: true, fontSize: 12, color: C.text, breakLine: true } },
          { text: `${fmtDate(p.dateTime)}${p.location ? ` · ${p.location}` : ""}`, options: { fontSize: 10, color: C.grey } },
        ],
        { x: x + 0.1, y: y + ph + 0.08, w: cw - 0.2, h: 0.45, fontFace: FONT, valign: "top", fit: "shrink" }
      );
    }
  }
};

const slideContact = (pptx: PptxGenJS) => {
  const slide = pptx.addSlide({ masterName: LAYOUT_TITLE });
  addTitle(slide, "Restons Connectés", undefined, "Contact");
  const gap = 0.4;
  const cw = (W - 2 * M - gap) / 2;
  const block = (x: number, heading: string, entries: { name: string; badge: string; sub?: string; url: string; color: string }[]) => {
    slide.addText(heading, { x, y: 1.5, w: cw, h: 0.45, fontFace: FONT, fontSize: 18, bold: true, color: C.text });
    entries.forEach((e, i) => {
      const y = 2.1 + i * 1.15;
      card(slide, x, y, cw, 0.95, C.border, "FFFFFF");
      slide.addShape("roundRect", { x: x + 0.2, y: y + 0.17, w: 0.6, h: 0.6, rectRadius: 0.1, fill: { color: e.color }, line: { color: e.color, width: 0 } });
      slide.addText(e.badge, { x: x + 0.2, y: y + 0.17, w: 0.6, h: 0.6, align: "center", valign: "middle", fontFace: FONT, fontSize: 16, bold: true, color: "FFFFFF" });
      slide.addText(
        [
          { text: e.name, options: { bold: true, fontSize: 16, color: C.text, breakLine: true } },
          ...(e.sub ? [{ text: e.sub, options: { fontSize: 11, color: C.grey, breakLine: true } }] : []),
          { text: e.url.replace(/^https?:\/\/(www\.)?/, ""), options: { fontSize: 11, color: C.cyan, hyperlink: { url: e.url } } },
        ],
        { x: x + 0.95, y: y + 0.05, w: cw - 1.1, h: 0.85, fontFace: FONT, valign: "middle" }
      );
    });
  };
  block(M, "Nos Réseaux Sociaux", [
    { name: "Facebook", badge: "f", url: CONTACT_LINKS.facebook, color: "1877F2" },
    { name: "Instagram", badge: "IG", url: CONTACT_LINKS.instagram, color: "E1306C" },
    { name: "LinkedIn", badge: "in", url: CONTACT_LINKS.linkedin, color: "0A66C2" },
  ]);
  block(M + cw + gap, "Nos Localisations", [
    { name: "Siège Social", badge: "📍", sub: "Association Team Oxygen", url: CONTACT_LINKS.siege, color: C.red },
    { name: "Local Club", badge: "⚓", sub: "Base nautique", url: CONTACT_LINKS.local, color: C.cyan },
  ]);
  slide.addShape("roundRect", { x: M + cw + gap, y: 4.6, w: cw, h: 1.6, rectRadius: 0.1, fill: { color: C.navy }, line: { color: C.navy, width: 0 } });
  slide.addText(
    [
      { text: "Team Oxygen - Eco Exploration", options: { bold: true, fontSize: 20, color: "FFFFFF", breakLine: true } },
      { text: "Club d'apnée éco-responsable à Marseille", options: { fontSize: 13, color: "FFFFFF" } },
    ],
    { x: M + cw + gap, y: 4.6, w: cw, h: 1.6, align: "center", valign: "middle", fontFace: FONT }
  );
};

// --- Entrée -----------------------------------------------------------------
export const buildPptx = async ({ data, year, selectedSections }: BuildPptxOptions): Promise<void> => {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "WIDE", width: W, height: H });
  pptx.layout = "WIDE";
  pptx.title = `Rapport AG Team Oxygen ${year}`;
  pptx.company = "Team Oxygen";
  const logo = await loadImage(logoTeamOxygen);
  await defineMasters(pptx, year, logo);

  // Ordre = celui du sélecteur
  const ordered = PDF_SECTIONS.map((s) => s.id).filter((id) => selectedSections.includes(id));

  for (const id of ordered) {
    switch (id) {
      case "cover": slideCover(pptx, year); break;
      case "summary": slideSummary(pptx, selectedSections); break;
      case "bureau": await slideBureau(pptx, data.bureau); break;
      case "encadrants": await slideEncadrants(pptx, data.allEncadrants); break;
      case "dashboard": slideDashboard(pptx, data, year); break;
      case "demographics": slideDemographics(pptx, data.demographics); break;
      case "membership": slideMembership(pptx, data); break;
      case "levels": slideLevels(pptx, data, year); break;
      case "topPlongeurs": slideTopPlongeurs(pptx, data, year); break;
      case "encadrantsActivity": slideEncadrantsActivity(pptx, data, year); break;
      case "topSites": await slideTopSites(pptx, data, year); break;
      case "equipment": slideEquipment(pptx, data); break;
      case "photos": await slidePhotos(pptx, data, year); break;
      case "contact": slideContact(pptx); break;
    }
  }

  await pptx.writeFile({ fileName: `Rapport_AG_TeamOxygen_${year}.pptx` });
};
