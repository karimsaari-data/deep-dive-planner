import { PDFPageWrapper } from "../PDFPageWrapper";
import { PDF_SECTIONS } from "../PDFSectionSelector";

interface PDFPageSummaryProps {
  selectedSections?: string[];
  pageNumber?: number;
}

export const PDFPageSummary = ({ selectedSections, pageNumber }: PDFPageSummaryProps) => {
  // Filter to show only selected sections (excluding cover and summary themselves)
  const contentSections = PDF_SECTIONS.filter(
    s => s.id !== "cover" && s.id !== "summary" && 
    (!selectedSections || selectedSections.includes(s.id))
  );

  // Calculate dynamic page numbers
  let currentPage = 2; // Summary is page 2 if included
  if (selectedSections?.includes("cover")) currentPage = 3;
  
  const sectionsWithPages = contentSections.map((section, index) => {
    const page = currentPage + index;
    return {
      number: index + 1,
      title: section.label,
      description: getSectionDescription(section.id),
      page,
    };
  });

  return (
    <PDFPageWrapper pageNumber={pageNumber}>
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
          {sectionsWithPages.map((section) => (
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

function getSectionDescription(sectionId: string): string {
  const descriptions: Record<string, string> = {
    bureau: "Composition du bureau du club",
    encadrants: "Nos encadrants certifiés",
    dashboard: "Chiffres clés de l'année",
    demographics: "Profil des adhérents",
    topPlongeurs: "Les mordus de l'apnée",
    encadrantsActivity: "Implication du staff",
    topSites: "Nos spots favoris",
    map: "Géolocalisation des sites",
    equipment: "Inventaire et valorisation",
    contact: "Restons connectés",
  };
  return descriptions[sectionId] || "";
}
