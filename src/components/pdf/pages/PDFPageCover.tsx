import { PDFPageWrapper } from "../PDFPageWrapper";
import logoTeamOxygen from "@/assets/logo-team-oxygen.webp";

interface PDFPageCoverProps {
  year: number;
  pageNumber?: number;
}

export const PDFPageCover = ({ year, pageNumber }: PDFPageCoverProps) => {
  const currentDate = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <PDFPageWrapper pageNumber={pageNumber}>
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
        {/* Logo Team Oxygen */}
        <img
          src={logoTeamOxygen}
          alt="Team Oxygen Logo"
          style={{
            width: "350px",
            height: "auto",
            marginBottom: "40px",
          }}
        />

        <h1
          style={{
            fontSize: "42px",
            fontWeight: "700",
            color: "#1e3a5f",
            margin: "0 0 12px 0",
            letterSpacing: "-0.5px",
          }}
        >
          Rapport d'Activité & Statistiques {year}
        </h1>

        <h2
          style={{
            fontSize: "28px",
            fontWeight: "500",
            color: "#e67e22",
            margin: "0 0 32px 0",
          }}
        >
          Assemblée Générale
        </h2>

        <div
          style={{
            width: "120px",
            height: "4px",
            background: "linear-gradient(90deg, #1e3a5f, #e67e22)",
            borderRadius: "2px",
            margin: "0 0 32px 0",
          }}
        />

        <p
          style={{
            fontSize: "14px",
            color: "#666666",
            margin: 0,
          }}
        >
          Document généré le {currentDate}
        </p>
      </div>
    </PDFPageWrapper>
  );
};
