import { PDFPageWrapper } from "../PDFPageWrapper";
import { PDFDemographics } from "@/hooks/usePDFReportData";

interface PDFPageDemographicsProps {
  demographics: PDFDemographics;
}

const COLORS = ["#1e3a5f", "#0891b2", "#059669", "#65a30d", "#ca8a04", "#ea580c"];

export const PDFPageDemographics = ({ demographics }: PDFPageDemographicsProps) => {
  const maxAge = Math.max(...demographics.ageData.map(d => d.value), 1);
  const maxLevel = Math.max(...demographics.levelData.map(d => d.value), 1);

  return (
    <PDFPageWrapper pageNumber={6}>
      <div style={{ height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <span style={{ fontSize: "28px" }}>📊</span>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "700",
              color: "#1e3a5f",
              margin: 0,
            }}
          >
            Démographie
          </h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px", height: "calc(100% - 80px)" }}>
          {/* Age Distribution */}
          <div
            style={{
              padding: "20px",
              backgroundColor: "#f8fafc",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", margin: "0 0 16px 0" }}>
              📅 Pyramide des Âges
            </h3>
            <p style={{ fontSize: "12px", color: "#666666", margin: "0 0 16px 0" }}>
              Âge moyen: <strong>{demographics.averageAge} ans</strong>
            </p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {demographics.ageData.map((item, index) => (
                <div key={item.name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "12px", color: "#666666", width: "50px" }}>{item.name}</span>
                  <div style={{ flex: 1, height: "20px", backgroundColor: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${(item.value / maxAge) * 100}%`,
                        height: "100%",
                        backgroundColor: COLORS[index % COLORS.length],
                        borderRadius: "4px",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "#1a1a1a", width: "30px", textAlign: "right" }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Gender Parity */}
          <div
            style={{
              padding: "20px",
              backgroundColor: "#f8fafc",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", margin: "0 0 16px 0" }}>
              ⚖️ Parité H/F
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", marginTop: "24px" }}>
              {demographics.genderData.map((item) => {
                const total = demographics.genderData.reduce((sum, d) => sum + d.value, 0);
                const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
                const colors: Record<string, string> = {
                  "Homme": "#0891b2",
                  "Femme": "#ec4899",
                  "Non renseigné": "#9ca3af",
                };
                
                return (
                  <div key={item.name} style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%" }}>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        backgroundColor: colors[item.name] || "#9ca3af",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ffffff",
                        fontSize: "20px",
                      }}
                    >
                      {item.name === "Homme" ? "♂" : item.name === "Femme" ? "♀" : "?"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "14px", fontWeight: "600", color: "#1a1a1a", margin: "0 0 4px 0" }}>
                        {item.name}
                      </p>
                      <p style={{ fontSize: "24px", fontWeight: "700", color: colors[item.name] || "#9ca3af", margin: 0 }}>
                        {item.value} <span style={{ fontSize: "14px", fontWeight: "400" }}>({percentage}%)</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Level Distribution */}
          <div
            style={{
              padding: "20px",
              backgroundColor: "#f8fafc",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", margin: "0 0 16px 0" }}>
              🎯 Répartition Niveaux
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {demographics.levelData.slice(0, 8).map((item, index) => (
                <div key={item.name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "11px", color: "#666666", width: "80px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.name}
                  </span>
                  <div style={{ flex: 1, height: "16px", backgroundColor: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${(item.value / maxLevel) * 100}%`,
                        height: "100%",
                        backgroundColor: COLORS[index % COLORS.length],
                        borderRadius: "4px",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "#1a1a1a", width: "25px", textAlign: "right" }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PDFPageWrapper>
  );
};
