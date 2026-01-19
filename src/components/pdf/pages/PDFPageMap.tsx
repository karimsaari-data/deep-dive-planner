import { PDFPageWrapper } from "../PDFPageWrapper";
import { PDFTopLocation } from "@/hooks/usePDFReportData";

interface PDFPageMapProps {
  locations: PDFTopLocation[];
}

export const PDFPageMap = ({ locations }: PDFPageMapProps) => {
  return (
    <PDFPageWrapper pageNumber={10}>
      <div style={{ height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <span style={{ fontSize: "28px" }}>🗺️</span>
          <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#1e3a5f", margin: 0 }}>
            Carte des Spots
          </h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", height: "calc(100% - 80px)" }}>
          <div style={{ padding: "20px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", margin: "0 0 16px 0" }}>
              📍 Coordonnées GPS
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {locations.slice(0, 10).map((loc, index) => (
                <div key={loc.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "14px", fontWeight: "700", color: "#e67e22", width: "24px" }}>#{index + 1}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", margin: 0 }}>{loc.name}</p>
                    <p style={{ fontSize: "11px", color: "#666666", margin: "2px 0 0 0" }}>
                      {loc.latitude && loc.longitude ? `${loc.latitude.toFixed(4)}° N, ${loc.longitude.toFixed(4)}° E` : "GPS non renseigné"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px", backgroundColor: "#e0f2fe", borderRadius: "12px", border: "2px dashed #0891b2" }}>
            <span style={{ fontSize: "64px", marginBottom: "16px" }}>🗺️</span>
            <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1e3a5f", margin: "0 0 8px 0" }}>
              Zone Méditerranée
            </h3>
            <p style={{ fontSize: "14px", color: "#666666", textAlign: "center", margin: 0 }}>
              Marseille et environs
            </p>
            <p style={{ fontSize: "12px", color: "#999999", marginTop: "16px", textAlign: "center" }}>
              Carte interactive disponible sur l'application web
            </p>
          </div>
        </div>
      </div>
    </PDFPageWrapper>
  );
};
