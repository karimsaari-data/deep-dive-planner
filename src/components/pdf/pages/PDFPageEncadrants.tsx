import { PDFPageWrapper } from "../PDFPageWrapper";
import { PDFMember } from "@/hooks/usePDFReportData";

interface PDFPageEncadrantsProps {
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

export const PDFPageEncadrants = ({ members }: PDFPageEncadrantsProps) => {
  return (
    <PDFPageWrapper pageNumber={4}>
      <div style={{ height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
          <span style={{ fontSize: "28px" }}>🎓</span>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "700",
              color: "#0c4a6e",
              margin: 0,
            }}
          >
            Les Encadrants
          </h1>
          <span
            style={{
              fontSize: "14px",
              color: "#666666",
              marginLeft: "8px",
            }}
          >
            ({members.length} encadrants)
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "20px",
          }}
        >
          {members.slice(0, 15).map((member) => (
            <div
              key={member.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "16px",
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
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "2px solid #0284c7",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    backgroundColor: getAvatarColor(member.first_name + member.last_name),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    fontWeight: "600",
                    color: "#1a1a1a",
                    border: "2px solid #0284c7",
                  }}
                >
                  {getInitials(member.first_name, member.last_name)}
                </div>
              )}

              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#1a1a1a",
                  margin: "10px 0 4px 0",
                  textAlign: "center",
                }}
              >
                {member.first_name}
              </h3>
              <p
                style={{
                  fontSize: "12px",
                  color: "#666666",
                  margin: 0,
                  textAlign: "center",
                }}
              >
                {member.last_name}
              </p>

              {member.apnea_level && (
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: "500",
                    color: "#0284c7",
                    backgroundColor: "#e0f2fe",
                    padding: "2px 8px",
                    borderRadius: "8px",
                    marginTop: "6px",
                  }}
                >
                  {member.apnea_level}
                </span>
              )}
            </div>
          ))}
        </div>

        {members.length > 15 && (
          <p
            style={{
              fontSize: "12px",
              color: "#666666",
              textAlign: "center",
              marginTop: "20px",
            }}
          >
            + {members.length - 15} autres encadrants
          </p>
        )}
      </div>
    </PDFPageWrapper>
  );
};
