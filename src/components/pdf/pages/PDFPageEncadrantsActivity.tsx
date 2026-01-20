import { PDFPageWrapper } from "../PDFPageWrapper";
import { PDFTopEncadrant } from "@/hooks/usePDFReportData";

interface PDFPageEncadrantsActivityProps {
  encadrants: PDFTopEncadrant[];
  year: number;
  pageNumber?: number;
}

export const PDFPageEncadrantsActivity = ({ encadrants, year, pageNumber }: PDFPageEncadrantsActivityProps) => {
  const getMedalEmoji = (rank: number): string => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return "";
  };

  const maxOutings = Math.max(...encadrants.map(e => e.outingsOrganized), 1);

  return (
    <PDFPageWrapper pageNumber={pageNumber}>
      <div style={{ height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <span style={{ fontSize: "28px" }}>🎯</span>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "700",
              color: "#1e3a5f",
              margin: 0,
            }}
          >
            Implication du Staff {year}
          </h1>
        </div>

        <p style={{ fontSize: "14px", color: "#666666", margin: "0 0 20px 0" }}>
          Top Directeurs de Plongée par nombre de sorties encadrées
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* Table */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#1e3a5f", color: "#ffffff" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", borderRadius: "8px 0 0 0", width: "70px" }}>Rang</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>Encadrant</th>
                <th style={{ padding: "12px 16px", textAlign: "center", borderRadius: "0 8px 0 0", width: "100px" }}>Sorties</th>
              </tr>
            </thead>
            <tbody>
              {encadrants.slice(0, 12).map((encadrant, index) => {
                const rank = index + 1;
                const isTop3 = rank <= 3;
                
                return (
                  <tr
                    key={encadrant.name + index}
                    style={{
                      backgroundColor: isTop3 ? "#fef3c7" : index % 2 === 0 ? "#f8fafc" : "#ffffff",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    <td style={{ padding: "10px 16px", fontWeight: isTop3 ? "600" : "400" }}>
                      {getMedalEmoji(rank)} {rank}
                    </td>
                    <td style={{ padding: "10px 16px", fontWeight: isTop3 ? "600" : "400" }}>
                      {encadrant.name}
                    </td>
                    <td
                      style={{
                        padding: "10px 16px",
                        textAlign: "center",
                        fontWeight: "600",
                      }}
                    >
                      <span
                        style={{
                          backgroundColor: isTop3 ? "#059669" : "#e2e8f0",
                          color: isTop3 ? "#ffffff" : "#1a1a1a",
                          padding: "4px 12px",
                          borderRadius: "12px",
                          fontSize: "13px",
                        }}
                      >
                        {encadrant.outingsOrganized}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Bar Chart */}
          <div
            style={{
              padding: "20px",
              backgroundColor: "#f8fafc",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", margin: "0 0 20px 0" }}>
              Répartition des sorties encadrées
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {encadrants.slice(0, 10).map((encadrant, index) => (
                <div key={encadrant.name + index} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#666666",
                      width: "100px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {encadrant.name.split(" ")[0]}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: "24px",
                      backgroundColor: "#e2e8f0",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${(encadrant.outingsOrganized / maxOutings) * 100}%`,
                        height: "100%",
                        backgroundColor: index < 3 ? "#059669" : "#0891b2",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        paddingRight: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "600",
                          color: "#ffffff",
                        }}
                      >
                        {encadrant.outingsOrganized}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: "20px",
                padding: "12px",
                backgroundColor: "#ecfdf5",
                borderRadius: "6px",
                fontSize: "12px",
                color: "#166534",
              }}
            >
              Total sorties encadrées:{" "}
              <strong>{encadrants.reduce((sum, e) => sum + e.outingsOrganized, 0)}</strong>
            </div>
          </div>
        </div>

        {encadrants.length === 0 && (
          <div
            style={{
              padding: "48px",
              textAlign: "center",
              color: "#666666",
              backgroundColor: "#f8fafc",
              borderRadius: "8px",
              marginTop: "24px",
            }}
          >
            Aucune donnée d'encadrement disponible pour {year}
          </div>
        )}
      </div>
    </PDFPageWrapper>
  );
};
