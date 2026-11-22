import type { PDFStats } from "@/hooks/usePDFReportData";

// L'application n'est en service que depuis mai : toutes les statistiques de sorties
// couvrent la période suivie dans l'application, pas l'année civile entière.
const fmtDay = (iso: string, withYear = false) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
  });

/** « du 17 mai au 22 novembre 2026 » */
export const formatPeriod = (stats: Pick<PDFStats, "periodStart" | "periodEnd">): string =>
  `du ${fmtDay(stats.periodStart)} au ${fmtDay(stats.periodEnd, true)}`;

/** « Période : du 17 mai au 22 novembre 2026 · application en service depuis mai » */
export const periodLabel = (stats: Pick<PDFStats, "periodStart" | "periodEnd">): string => {
  const since = new Date(stats.periodStart).toLocaleDateString("fr-FR", { month: "long" });
  return `Période : ${formatPeriod(stats)} · application en service depuis ${since}`;
};

/** « 22 novembre 2026 » */
export const formatDate = (iso: string): string => fmtDay(iso, true);
