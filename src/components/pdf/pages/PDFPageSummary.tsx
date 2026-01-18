import { PDFPageWrapper } from "../PDFPageWrapper";

export const PDFPageSummary = () => {
  const sections = [
    { number: 1, title: "Le Bureau", description: "Composition du bureau du club" },
    { number: 2, title: "Les Encadrants", description: "Équipe d'encadrement technique" },
    { number: 3, title: "Tableau de Bord", description: "Chiffres clés de l'année" },
    { number: 4, title: "Démographie", description: "Profil des adhérents" },
    { number: 5, title: "Top Plongeurs", description: "Classement des participants" },
    { number: 6, title: "Activité Encadrants", description: "Statistiques d'encadrement" },
  ];

  return (
    <PDFPageWrapper pageNumber={2}>
      <div style={{ height: "100%" }}>
        <h1
          style={{
            fontSize: "36px",
            fontWeight: "700",
            color: "#0c4a6e",
            marginBottom: "40px",
            paddingBottom: "16px",
            borderBottom: "3px solid #0c4a6e",
          }}
        >
          Sommaire
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {sections.map((section) => (
            <div
              key={section.number}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "24px",
                padding: "16px 24px",
                backgroundColor: "#f8fafc",
                borderRadius: "8px",
                borderLeft: "4px solid #0c4a6e",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  backgroundColor: "#0c4a6e",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  fontWeight: "600",
                  flexShrink: 0,
                }}
              >
                {section.number}
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "20px",
                    fontWeight: "600",
                    color: "#1a1a1a",
                    margin: "0 0 4px 0",
                  }}
                >
                  {section.title}
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#666666",
                    margin: 0,
                  }}
                >
                  {section.description}
                </p>
              </div>
              <div
                style={{
                  marginLeft: "auto",
                  fontSize: "14px",
                  color: "#999999",
                }}
              >
                Page {section.number + 2}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PDFPageWrapper>
  );
};
