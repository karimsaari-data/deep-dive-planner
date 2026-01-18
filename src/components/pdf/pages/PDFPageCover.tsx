import { PDFPageWrapper } from "../PDFPageWrapper";

interface PDFPageCoverProps {
  year: number;
}

export const PDFPageCover = ({ year }: PDFPageCoverProps) => {
  const currentDate = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <PDFPageWrapper>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          textAlign: "center",
        }}
      >
        {/* Logo placeholder */}
        <div
          style={{
            width: "150px",
            height: "150px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #0c4a6e 0%, #0284c7 50%, #14b8a6 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "40px",
          }}
        >
          <span style={{ fontSize: "48px", color: "#ffffff", fontWeight: "bold" }}>
            🤿
          </span>
        </div>

        <h1
          style={{
            fontSize: "48px",
            fontWeight: "700",
            color: "#0c4a6e",
            margin: "0 0 16px 0",
          }}
        >
          Team Oxygen
        </h1>

        <h2
          style={{
            fontSize: "32px",
            fontWeight: "600",
            color: "#1a1a1a",
            margin: "0 0 24px 0",
          }}
        >
          Rapport d'Activité {year}
        </h2>

        <div
          style={{
            width: "100px",
            height: "4px",
            background: "linear-gradient(90deg, #0c4a6e, #14b8a6)",
            borderRadius: "2px",
            margin: "0 0 24px 0",
          }}
        />

        <p
          style={{
            fontSize: "18px",
            color: "#666666",
            margin: 0,
          }}
        >
          Assemblée Générale
        </p>

        <p
          style={{
            fontSize: "14px",
            color: "#999999",
            margin: "8px 0 0 0",
          }}
        >
          Document généré le {currentDate}
        </p>
      </div>
    </PDFPageWrapper>
  );
};
