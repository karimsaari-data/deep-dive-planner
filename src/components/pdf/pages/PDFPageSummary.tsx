import { PDFPageWrapper } from "../PDFPageWrapper";

export const PDFPageSummary = () => {
  const sections = [
    { number: 1, title: "Le Bureau", description: "Composition du bureau du club", page: 3 },
    { number: 2, title: "L'Équipe Technique", description: "Nos encadrants certifiés", page: 4 },
    { number: 3, title: "Tableau de Bord", description: "Chiffres clés de l'année", page: 5 },
    { number: 4, title: "Démographie", description: "Profil des adhérents", page: 6 },
    { number: 5, title: "Top Plongeurs", description: "Les mordus de l'apnée", page: 7 },
    { number: 6, title: "Activité Encadrants", description: "Implication du staff", page: 8 },
    { number: 7, title: "Top 10 Sites", description: "Nos spots favoris", page: 9 },
    { number: 8, title: "Carte des Spots", description: "Géolocalisation des sites", page: 10 },
    { number: 9, title: "Parc Matériel", description: "Inventaire et valorisation", page: 11 },
    { number: 10, title: "Contact & Réseaux", description: "Restons connectés", page: 12 },
  ];

  return (
    <PDFPageWrapper pageNumber={2}>
      <div style={{ height: "100%" }}>
        <h1
          style={{
            fontSize: "36px",
            fontWeight: "700",
            color: "#1e3a5f",
            marginBottom: "32px",
            paddingBottom: "16px",
            borderBottom: "3px solid #1e3a5f",
          }}
        >
          Sommaire
        </h1>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {sections.map((section) => (
            <div
              key={section.number}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "14px 20px",
                backgroundColor: "#f8fafc",
                borderRadius: "8px",
                borderLeft: "4px solid #1e3a5f",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "#1e3a5f",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  fontWeight: "600",
                  flexShrink: 0,
                }}
              >
                {section.number}
              </div>
              <div style={{ flex: 1 }}>
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "#1a1a1a",
                    margin: "0 0 2px 0",
                  }}
                >
                  {section.title}
                </h3>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#666666",
                    margin: 0,
                  }}
                >
                  {section.description}
                </p>
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#999999",
                  fontWeight: "500",
                }}
              >
                p.{section.page}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PDFPageWrapper>
  );
};
