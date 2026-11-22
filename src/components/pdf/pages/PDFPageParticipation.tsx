import { PDFPageWrapper } from "../PDFPageWrapper";
import { PDFParticipationStats, PDFStats } from "@/hooks/usePDFReportData";
import { periodLabel } from "../period";

interface PDFPageParticipationProps {
  participation: PDFParticipationStats;
  stats: PDFStats;
  year: number;
  pageNumber?: number;
}

const TYPE_COLORS = ["#0891b2", "#059669", "#f08814", "#65a30d", "#c2410c", "#0a3a49"];
const fmtNum = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

export const PDFPageParticipation = ({ participation: p, stats, year, pageNumber }: PDFPageParticipationProps) => {
  const kpis = [
    { label: "Participants différents", value: fmtNum(p.participants), sub: "au moins une sortie", color: "#0a3a49" },
    { label: "Adhérents ayant participé", value: `${p.participationRate}%`, sub: `${p.seasonMembersParticipating} sur ${p.seasonMembers} adhérents`, color: "#0891b2" },
    { label: "Sorties par participant", value: fmtNum(p.avgPerParticipant), sub: "en moyenne", color: "#059669" },
    { label: "Participants par sortie", value: fmtNum(p.avgPerOuting), sub: "en moyenne", color: "#f08814" },
  ];
  const maxMonth = Math.max(...p.monthly.map((m) => m.participations), 1);
  const maxType = Math.max(...p.byType.map((t) => t.participations), 1);
  const typeTotal = p.byType.reduce((sum, t) => sum + t.participations, 0);

  return (
    <PDFPageWrapper pageNumber={pageNumber}>
      <div style={{ height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
          <span style={{ fontSize: "28px" }}>🏆</span>
          <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#0a3a49", margin: 0 }}>
            Participation aux sorties {year}
          </h1>
        </div>
        <p style={{ fontSize: "14px", lineHeight: "20px", color: "#666666", margin: "0 0 16px 0" }}>
          {periodLabel(stats)}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "18px" }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ backgroundColor: "#f8fafc", border: `3px solid ${k.color}`, borderRadius: "14px", padding: "14px 12px", textAlign: "center" }}>
              <div style={{ fontSize: "42px", lineHeight: "48px", fontWeight: "700", color: k.color }}>{k.value}</div>
              <div style={{ fontSize: "14px", lineHeight: "20px", fontWeight: "600", color: "#444444" }}>{k.label}</div>
              <div style={{ fontSize: "11px", lineHeight: "16px", color: "#888888" }}>{k.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "16px" }}>
          {/* Participations par mois */}
          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px 20px 12px 20px" }}>
            <h3 style={{ fontSize: "16px", lineHeight: "22px", fontWeight: "600", color: "#1a1a1a", margin: "0 0 10px 0" }}>
              Participations par mois
            </h3>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", height: "200px" }}>
              {p.monthly.map((m) => (
                <div key={m.month} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: "12px", lineHeight: "16px", fontWeight: "700", color: "#0891b2" }}>{m.participations}</div>
                  <div style={{ height: `${Math.max((m.participations / maxMonth) * 160, 2)}px`, backgroundColor: "#0891b2", borderRadius: "4px 4px 0 0" }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "10px", borderTop: "1px solid #cbd5e1", paddingTop: "4px" }}>
              {p.monthly.map((m) => (
                <div key={m.month} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: "12px", lineHeight: "16px", color: "#666666" }}>{m.month}</div>
                  <div style={{ fontSize: "10px", lineHeight: "14px", color: "#999999" }}>{m.outings} sortie{m.outings > 1 ? "s" : ""}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Par type de sortie */}
          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px 20px 12px 20px" }}>
            <h3 style={{ fontSize: "16px", lineHeight: "22px", fontWeight: "600", color: "#1a1a1a", margin: "0 0 10px 0" }}>
              Par type de sortie
            </h3>
            {p.byType.map((t, i) => (
              <div key={t.name} style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "13px", lineHeight: "18px", fontWeight: "600", color: "#1a1a1a" }}>
                  {t.name} <span style={{ fontWeight: "400", color: "#666666" }}>· {t.outings} sortie{t.outings > 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ flex: 1, height: "18px", backgroundColor: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${(t.participations / maxType) * 100}%`, height: "18px", backgroundColor: TYPE_COLORS[i % TYPE_COLORS.length], borderRadius: "4px" }} />
                  </div>
                  <div style={{ width: "74px", fontSize: "12px", lineHeight: "18px", fontWeight: "700", color: "#1a1a1a", textAlign: "right" }}>
                    {t.participations} ({typeTotal > 0 ? Math.round((t.participations / typeTotal) * 100) : 0}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PDFPageWrapper>
  );
};
