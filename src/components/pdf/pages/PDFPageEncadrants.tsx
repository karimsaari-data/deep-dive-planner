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
    "#1e3a5f", "#2563eb", "#0891b2", "#0d9488",
    "#059669", "#65a30d", "#ca8a04", "#ea580c",
  ];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export const PDFPageEncadrants = ({ members }: PDFPageEncadrantsProps) => {
  return (
    <PDFPageWrapper pageNumber={4}>
      <div style={{ height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <span style={{ fontSize: "28px" }}>🎓</span>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "700",
              color: "#1e3a5f",
              margin: 0,
            }}
          >
            Nos Encadrants
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
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: "16px",
          }}
        >
          {members.slice(0, 18).map((member) => (
            <div
              key={member.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "14px",
                backgroundColor: "#f8fafc",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
              }}
            >
              {member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt={`${member.first_name} ${member.last_name}`}
                  crossOrigin="anonymous"
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "2px solid #0891b2",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    backgroundColor: getAvatarColor(member.first_name + member.last_name),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    fontWeight: "600",
                    color: "#ffffff",
                    border: "2px solid #0891b2",
                  }}
                >
                  {getInitials(member.first_name, member.last_name)}
                </div>
              )}

              <h3
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#1a1a1a",
                  margin: "8px 0 2px 0",
                  textAlign: "center",
                }}
              >
                {member.first_name}
              </h3>
              <p
                style={{
                  fontSize: "11px",
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
                    fontSize: "9px",
                    fontWeight: "500",
                    color: "#0891b2",
                    backgroundColor: "#e0f2fe",
                    padding: "2px 6px",
                    borderRadius: "6px",
                    marginTop: "4px",
                  }}
                >
                  {member.apnea_level}
                </span>
              )}

              {member.board_role && (
                <span
                  style={{
                    fontSize: "8px",
                    fontWeight: "500",
                    color: "#e67e22",
                    marginTop: "2px",
                  }}
                >
                  {member.board_role}
                </span>
              )}
            </div>
          ))}
        </div>

        {members.length > 18 && (
          <p
            style={{
              fontSize: "12px",
              color: "#666666",
              textAlign: "center",
              marginTop: "16px",
            }}
          >
            + {members.length - 18} autres encadrants
          </p>
        )}
      </div>
    </PDFPageWrapper>
  );
};
