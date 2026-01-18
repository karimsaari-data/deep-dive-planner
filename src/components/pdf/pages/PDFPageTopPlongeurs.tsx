import { PDFPageWrapper } from "../PDFPageWrapper";
import { PDFTopParticipant } from "@/hooks/usePDFReportData";

interface PDFPageTopPlongeursProps {
  participants: PDFTopParticipant[];
  year: number;
}

export const PDFPageTopPlongeurs = ({ participants, year }: PDFPageTopPlongeursProps) => {
  const getMedalEmoji = (rank: number): string => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return "";
  };

  return (
    <PDFPageWrapper pageNumber={7}>
      <div style={{ height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <span style={{ fontSize: "28px" }}>🏆</span>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "700",
              color: "#0c4a6e",
              margin: 0,
            }}
          >
            Top 15 Plongeurs {year}
          </h1>
        </div>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#0c4a6e", color: "#ffffff" }}>
              <th style={{ padding: "12px 16px", textAlign: "left", borderRadius: "8px 0 0 0" }}>Rang</th>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>Nom</th>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>Code Membre</th>
              <th style={{ padding: "12px 16px", textAlign: "center", borderRadius: "0 8px 0 0" }}>Participations</th>
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
                  <td style={{ padding: "10px 16px", fontWeight: isTop3 ? "600" : "400" }}>
                    {getMedalEmoji(rank)} {rank}
                  </td>
                  <td style={{ padding: "10px 16px", fontWeight: isTop3 ? "600" : "400" }}>
                    {participant.name}
                  </td>
                  <td style={{ padding: "10px 16px", color: "#666666" }}>
                    {participant.memberCode || "-"}
                  </td>
                  <td
                    style={{
                      padding: "10px 16px",
                      textAlign: "center",
                      fontWeight: "600",
                      color: isTop3 ? "#0c4a6e" : "#1a1a1a",
                    }}
                  >
                    <span
                      style={{
                        backgroundColor: isTop3 ? "#0c4a6e" : "#e2e8f0",
                        color: isTop3 ? "#ffffff" : "#1a1a1a",
                        padding: "4px 12px",
                        borderRadius: "12px",
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
