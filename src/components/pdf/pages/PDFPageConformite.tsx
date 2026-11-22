import { PDFPageWrapper } from "../PDFPageWrapper";
import { PDFCompliance, PDFStats } from "@/hooks/usePDFReportData";
import { formatDate } from "../period";

interface PDFPageConformiteProps {
  compliance: PDFCompliance;
  stats: PDFStats;
  pageNumber?: number;
}

const rateColor = (rate: number) => (rate >= 90 ? "#059669" : rate >= 70 ? "#f08814" : "#c2410c");

export const PDFPageConformite = ({ compliance: c, stats, pageNumber }: PDFPageConformiteProps) => {
  return (
    <PDFPageWrapper pageNumber={pageNumber}>
      <div style={{ height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
          <span style={{ fontSize: "28px" }}>🛡️</span>
          <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#0a3a49", margin: 0 }}>Sécurité & Conformité</h1>
        </div>
        <p style={{ fontSize: "14px", lineHeight: "20px", color: "#666666", margin: "0 0 18px 0" }}>
          Dossiers des {c.total} adhérents de la saison {stats.seasonYear - 1}-{stats.seasonYear}, situation au {formatDate(stats.periodEnd)} · taux uniquement, aucune donnée nominative
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}>
          <div style={{ backgroundColor: "#f8fafc", border: `3px solid ${rateColor(c.completeRate)}`, borderRadius: "16px", padding: "28px 16px", textAlign: "center" }}>
            <div style={{ fontSize: "76px", lineHeight: "84px", fontWeight: "700", color: rateColor(c.completeRate) }}>{c.completeRate}%</div>
            <div style={{ fontSize: "18px", lineHeight: "26px", fontWeight: "600", color: "#444444" }}>Dossiers complets</div>
            <div style={{ fontSize: "13px", lineHeight: "20px", color: "#888888" }}>{c.complete} adhérents sur {c.total}</div>
            <div style={{ fontSize: "11px", lineHeight: "16px", color: "#888888", marginTop: "12px" }}>
              Cotisation, certificat médical, charte, assurance FSGT et licence FSGT : tous les points validés.
            </div>
          </div>

          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px 24px 6px 24px" }}>
            {c.items.map((i) => (
              <div key={i.label} style={{ marginBottom: "18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ fontSize: "15px", lineHeight: "22px", fontWeight: "600", color: "#1a1a1a" }}>{i.label}</div>
                  <div style={{ fontSize: "14px", lineHeight: "22px", color: "#666666" }}>
                    {i.ok} / {c.total}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ flex: 1, height: "22px", backgroundColor: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${i.rate}%`, height: "22px", backgroundColor: rateColor(i.rate), borderRadius: "4px" }} />
                  </div>
                  <div style={{ width: "52px", fontSize: "16px", lineHeight: "22px", fontWeight: "700", color: rateColor(i.rate), textAlign: "right" }}>{i.rate}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: "11px", lineHeight: "16px", color: "#888888", margin: "12px 0 0 0" }}>
          Les licences FSGT sont déposées dans l'application depuis la saison {stats.seasonYear - 1}-{stats.seasonYear} : les saisons précédentes ne sont pas suivies.
        </p>
      </div>
    </PDFPageWrapper>
  );
};
