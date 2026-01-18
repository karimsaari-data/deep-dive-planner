import { PDFPageWrapper } from "../PDFPageWrapper";
import { PDFMember } from "@/hooks/usePDFReportData";

interface PDFPageBureauProps {
  members: PDFMember[];
}

const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

const getAvatarColor = (name: string): string => {
  const colors = [
    "#fecdd3", "#fbcfe8", "#f5d0fe", "#e9d5ff",
    "#ddd6fe", "#c7d2fe", "#bfdbfe", "#bae6fd",
    "#a5f3fc", "#99f6e4", "#a7f3d0", "#bbf7d0",
  ];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export const PDFPageBureau = ({ members }: PDFPageBureauProps) => {
  return (
    <PDFPageWrapper pageNumber={3}>
      <div style={{ height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
          <span style={{ fontSize: "28px" }}>👑</span>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "700",
              color: "#0c4a6e",
              margin: 0,
            }}
          >
            Le Bureau
          </h1>
          <span
            style={{
              fontSize: "14px",
              color: "#666666",
              marginLeft: "8px",
            }}
          >
            ({members.length} membres)
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "24px",
          }}
        >
          {members.map((member) => (
            <div
              key={member.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "20px",
                backgroundColor: "#f8fafc",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
              }}
            >
              {member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt={`${member.first_name} ${member.last_name}`}
                  crossOrigin="anonymous"
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "3px solid #0c4a6e",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    backgroundColor: getAvatarColor(member.first_name + member.last_name),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    fontWeight: "600",
                    color: "#1a1a1a",
                    border: "3px solid #0c4a6e",
                  }}
                >
                  {getInitials(member.first_name, member.last_name)}
                </div>
              )}

              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#1a1a1a",
                  margin: "12px 0 4px 0",
                  textAlign: "center",
                }}
              >
                {member.first_name} {member.last_name}
              </h3>

              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "#ffffff",
                  backgroundColor: "#0c4a6e",
                  padding: "4px 12px",
                  borderRadius: "12px",
                }}
              >
                {member.board_role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </PDFPageWrapper>
  );
};
