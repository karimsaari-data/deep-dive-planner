import { PDFPageWrapper } from "../PDFPageWrapper";
import { PDFTopParticipant } from "@/hooks/usePDFReportData";

interface PDFPageTopPlongeursProps {
  participants: PDFTopParticipant[];
  year: number;
  pageNumber?: number;
}

export const PDFPageTopPlongeurs = ({ participants, year, pageNumber }: PDFPageTopPlongeursProps) => {
  const getMedalEmoji = (rank: number): string => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return "";
  };

  return (
    <PDFPageWrapper pageNumber={pageNumber}>
      <div style={{ height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <span style={{ fontSize: "28px" }}>🏆</span>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "700",
              color: "#1e3a5f",
              margin: 0,
            }}
          >
            Les Mordus de l'Apnée {year}
          </h1>
        </div>

        <p style={{ fontSize: "14px", color: "#666666", margin: "0 0 12px 0" }}>
          Top 15 des participants les plus assidus
        </p>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "13px",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#1e3a5f", color: "#ffffff" }}>
              <th style={{ padding: "6px 16px", textAlign: "left", borderRadius: "8px 0 0 0", width: "80px" }}>Rang</th>
              <th style={{ padding: "6px 16px", textAlign: "left" }}>Nom</th>
              <th style={{ padding: "6px 16px", textAlign: "left", width: "140px" }}>Code Membre</th>
              <th style={{ padding: "6px 16px", textAlign: "center", borderRadius: "0 8px 0 0", width: "140px" }}>Participations</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((participant, index) => {
              const rank = index + 1;
              const isTop3 = rank <= 3;
              
              return (
                <tr
                  key={participant.name + index}
                  style={{
                    backgroundColor: isTop3 ? "#fef3c7" : index % 2 === 0 ? "#f8fafc" : "#ffffff",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <td style={{ padding: "2px 16px", height: "30px", fontWeight: isTop3 ? "600" : "400" }}>
                    {getMedalEmoji(rank)} {rank}
                  </td>
                  <td style={{ padding: "2px 16px", height: "30px", fontWeight: isTop3 ? "600" : "400" }}>
                    {participant.name}
                  </td>
                  <td style={{ padding: "2px 16px", height: "30px", color: "#666666" }}>
                    {participant.memberCode || "-"}
                  </td>
                  <td
                    style={{
                      padding: "2px 16px", height: "30px",
                      textAlign: "center",
                      fontWeight: "600",
                    }}
                  >
                    <span
                      style={{
                        backgroundColor: isTop3 ? "#1e3a5f" : "#e2e8f0",
                        color: isTop3 ? "#ffffff" : "#1a1a1a",
                        display: "inline-block",
                        minWidth: "28px",
                        height: "22px",
                        lineHeight: "22px",
                        padding: "0 10px",
                        borderRadius: "11px",
                        fontSize: "13px",
                      }}
                    >
                      {participant.participations}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {participants.length === 0 && (
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
            Aucune donnée de participation disponible pour {year}
          </div>
        )}
      </div>
    </PDFPageWrapper>
  );
};
