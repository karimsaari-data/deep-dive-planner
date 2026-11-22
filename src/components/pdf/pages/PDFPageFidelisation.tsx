import { PDFPageWrapper } from "../PDFPageWrapper";
import { PDFRetention, PDFStats } from "@/hooks/usePDFReportData";
import { formatDate } from "../period";

interface PDFPageFidelisationProps {
  retention: PDFRetention;
  stats: PDFStats;
  pageNumber?: number;
}

const GREEN = "#059669";
const CYAN = "#0891b2";
const NAVY = "#0a3a49";
const ORANGE = "#f08814";

export const PDFPageFidelisation = ({ retention: r, stats, pageNumber }: PDFPageFidelisationProps) => {
  const kpis = [
    { label: `Adhérents ${r.seasonYear - 2}-${r.seasonYear - 1}`, value: r.previousSeasonTotal, sub: "saison précédente", color: NAVY },
    { label: "Réinscrits", value: r.retained, sub: `${r.retentionRate}% de la saison précédente`, color: GREEN },
    { label: "Départs", value: r.departures, sub: `${100 - r.retentionRate}% non réinscrits à ce jour`, color: ORANGE },
    { label: "Entrants", value: r.entrants, sub: "nouveaux adhérents ou retours", color: CYAN },
  ];
  const maxTotal = Math.max(...r.seasons.map((s) => s.total), 1);
  const rates = [
    ...(r.previousRetentionRate !== null ? [{ label: `${r.seasonYear - 2} → ${r.seasonYear - 1}`, rate: r.previousRetentionRate }] : []),
    { label: `${r.seasonYear - 1} → ${r.seasonYear}`, rate: r.retentionRate },
  ];

  return (
    <PDFPageWrapper pageNumber={pageNumber}>
      <div style={{ height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
          <span style={{ fontSize: "28px" }}>🔁</span>
          <h1 style={{ fontSize: "32px", fontWeight: "700", color: NAVY, margin: 0 }}>Fidélisation des adhérents</h1>
        </div>
        <p style={{ fontSize: "14px", lineHeight: "20px", color: "#666666", margin: "0 0 16px 0" }}>
          Saison {r.seasonYear - 1}-{r.seasonYear}, situation au {formatDate(stats.periodEnd)} · les réinscriptions peuvent se poursuivre en cours de saison
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "18px" }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ backgroundColor: "#f8fafc", border: `3px solid ${k.color}`, borderRadius: "14px", padding: "14px 12px", textAlign: "center" }}>
              <div style={{ fontSize: "44px", lineHeight: "50px", fontWeight: "700", color: k.color }}>{k.value}</div>
              <div style={{ fontSize: "14px", lineHeight: "20px", fontWeight: "600", color: "#444444" }}>{k.label}</div>
              <div style={{ fontSize: "11px", lineHeight: "16px", color: "#888888" }}>{k.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "16px" }}>
          {/* Effectifs par saison : réinscrits + entrants */}
          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px 20px 12px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "10px" }}>
              <h3 style={{ fontSize: "16px", lineHeight: "22px", fontWeight: "600", color: "#1a1a1a", margin: 0 }}>Effectifs par saison</h3>
              <span style={{ fontSize: "12px", lineHeight: "18px", fontWeight: "600", color: GREEN }}>■ Réinscrits</span>
              <span style={{ fontSize: "12px", lineHeight: "18px", fontWeight: "600", color: CYAN }}>■ Entrants</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "28px", height: "230px", padding: "0 20px" }}>
              {r.seasons.map((s) => {
                const h = (s.total / maxTotal) * 170;
                const keptH = s.retained !== null ? (s.retained / s.total) * h : 0;
                return (
                  <div key={s.season} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: "16px", lineHeight: "22px", fontWeight: "700", color: "#1a1a1a" }}>{s.total}</div>
                    {s.retained === null ? (
                      <div style={{ height: `${h}px`, backgroundColor: "#94a3b8", borderRadius: "4px 4px 0 0" }} />
                    ) : (
                      <div style={{ height: `${h}px`, borderRadius: "4px 4px 0 0", overflow: "hidden" }}>
                        <div style={{ height: `${h - keptH}px`, backgroundColor: CYAN, color: "#ffffff", fontSize: "12px", lineHeight: `${h - keptH}px`, fontWeight: "700" }}>
                          {s.entrants}
                        </div>
                        <div style={{ height: `${keptH}px`, backgroundColor: GREEN, color: "#ffffff", fontSize: "12px", lineHeight: `${keptH}px`, fontWeight: "700" }}>
                          {s.retained}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: "28px", padding: "0 20px", borderTop: "1px solid #cbd5e1", paddingTop: "4px" }}>
              {r.seasons.map((s) => (
                <div key={s.season} style={{ flex: 1, textAlign: "center", fontSize: "13px", lineHeight: "18px", color: "#666666" }}>
                  {s.season - 1}-{s.season}
                </div>
              ))}
            </div>
          </div>

          {/* Taux de réinscription */}
          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px 20px 12px 20px" }}>
            <h3 style={{ fontSize: "16px", lineHeight: "22px", fontWeight: "600", color: "#1a1a1a", margin: "0 0 14px 0" }}>Taux de réinscription</h3>
            {rates.map((t) => (
              <div key={t.label} style={{ marginBottom: "18px" }}>
                <div style={{ fontSize: "13px", lineHeight: "18px", fontWeight: "600", color: "#1a1a1a" }}>Saison {t.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ flex: 1, height: "22px", backgroundColor: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${t.rate}%`, height: "22px", backgroundColor: GREEN, borderRadius: "4px" }} />
                  </div>
                  <div style={{ width: "48px", fontSize: "16px", lineHeight: "22px", fontWeight: "700", color: GREEN, textAlign: "right" }}>{t.rate}%</div>
                </div>
              </div>
            ))}
            <p style={{ fontSize: "11px", lineHeight: "16px", color: "#888888", margin: "6px 0 0 0" }}>
              Part des adhérents d'une saison de nouveau inscrits la saison suivante. Le taux de la saison en cours peut encore évoluer.
            </p>
          </div>
        </div>
      </div>
    </PDFPageWrapper>
  );
};
