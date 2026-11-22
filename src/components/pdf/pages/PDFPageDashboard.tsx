import { PDFPageWrapper } from "../PDFPageWrapper";
import { PDFStats } from "@/hooks/usePDFReportData";
import { formatPeriod } from "../period";


interface PDFPageDashboardProps {
  stats: PDFStats;
  year: number;
  pageNumber?: number;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export const PDFPageDashboard = ({ stats, year, pageNumber }: PDFPageDashboardProps) => {
  const kpis = [
    {
      icon: "👥",
      label: "Adhérents saison",
      sub: `${stats.seasonYear - 1}-${stats.seasonYear} · dont ${stats.totalEncadrants} encadrants`,
      value: stats.totalMembers,
      color: "#1e3a5f",
    },
    {
      icon: "🤿",
      label: "Sorties Réalisées",
      sub: formatPeriod(stats),
      value: stats.totalOutings,
      color: "#0891b2",
    },
    {
      icon: "📊",
      label: "Plongées Cumulées",
      sub: "participations cumulées",
      value: stats.totalParticipations,
      color: "#059669",
    },
  ];

  return (
    <PDFPageWrapper pageNumber={pageNumber}>
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "48px" }}>
          <span style={{ fontSize: "28px" }}>📈</span>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "700",
              color: "#1e3a5f",
              margin: 0,
            }}
          >
            Bilan Global {year}
          </h1>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "40px",
            flex: 1,
            alignItems: "center",
          }}
        >
          {kpis.map((kpi, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "48px 32px",
                backgroundColor: "#f8fafc",
                borderRadius: "16px",
                border: `3px solid ${kpi.color}`,
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: "56px", marginBottom: "16px" }}>{kpi.icon}</span>
              
              <p
                style={{
                  fontSize: "72px",
                  fontWeight: "700",
                  color: kpi.color,
                  margin: "0 0 16px 0",
                  lineHeight: 1,
                }}
              >
                {kpi.value.toLocaleString("fr-FR")}
              </p>

              <p
                style={{
                  fontSize: "20px",
                  fontWeight: "500",
                  color: "#666666",
                  margin: 0,
                }}
              >
                {kpi.label}
              </p>
              <p style={{ fontSize: "13px", color: "#888888", margin: "8px 0 0 0", lineHeight: "18px" }}>
                {kpi.sub}
              </p>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "32px",
            padding: "14px 24px",
            backgroundColor: "#ecfdf5",
            borderRadius: "8px",
            borderLeft: "4px solid #059669",
          }}
        >
          <p
            style={{
              fontSize: "14px",
              color: "#166534",
              margin: 0,
            }}
          >
            💡 En moyenne, chaque sortie a réuni{" "}
            <strong>
              {stats.totalOutings > 0
                ? Math.round(stats.totalParticipations / stats.totalOutings)
                : 0}
            </strong>{" "}
            participants
          </p>
          <p style={{ fontSize: "12px", color: "#92400e", margin: "8px 0 0 0", lineHeight: "18px" }}>
            ⚠️ Sorties comptabilisées depuis la mise en service de l'application
            {stats.firstOutingDate ? ` (première sortie : ${fmt(stats.firstOutingDate)})` : ""}.
            Quelques sorties antérieures ne sont pas incluses.
          </p>
        </div>
      </div>
    </PDFPageWrapper>
  );
};
