import { PDFPageWrapper } from "../PDFPageWrapper";
import { PDFTopLocation } from "@/hooks/usePDFReportData";

interface PDFPageMapProps {
  locations: PDFTopLocation[];
  pageNumber?: number;
}

const generateStaticMapUrl = (locations: PDFTopLocation[]): string => {
  // Filter locations with valid coordinates
  const validLocations = locations.filter(loc => loc.latitude && loc.longitude);
  
  if (validLocations.length === 0) {
    return "";
  }

  // Calculate center point
  const avgLat = validLocations.reduce((sum, loc) => sum + (loc.latitude || 0), 0) / validLocations.length;
  const avgLon = validLocations.reduce((sum, loc) => sum + (loc.longitude || 0), 0) / validLocations.length;

  // Build markers string for OpenStreetMap Static Map
  const markers = validLocations
    .slice(0, 10)
    .map((loc, index) => `${loc.longitude},${loc.latitude},red${index + 1}`)
    .join("|");

  // Use OpenStreetMap static map service (free, no API key required)
  // Alternative: staticmap.openstreetmap.de
  const zoom = 10;
  const width = 500;
  const height = 400;
  
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${avgLat},${avgLon}&zoom=${zoom}&size=${width}x${height}&maptype=osmarenderer&markers=${markers}`;
};

export const PDFPageMap = ({ locations, pageNumber }: PDFPageMapProps) => {
  const validLocations = locations.filter(loc => loc.latitude && loc.longitude);
  const staticMapUrl = generateStaticMapUrl(locations);

  return (
    <PDFPageWrapper pageNumber={pageNumber}>
      <div style={{ height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <span style={{ fontSize: "28px" }}>🗺️</span>
          <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#1e3a5f", margin: 0 }}>
            Carte des Spots
          </h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", height: "calc(100% - 80px)" }}>
          {/* Left column: GPS coordinates list */}
          <div style={{ padding: "20px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", margin: "0 0 16px 0" }}>
              📍 Coordonnées GPS
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {locations.slice(0, 10).map((loc, index) => (
                <div key={loc.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <span style={{ 
                    fontSize: "12px", 
                    fontWeight: "700", 
                    color: "#ffffff", 
                    backgroundColor: "#dc2626",
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    {index + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", margin: 0 }}>{loc.name}</p>
                    <p style={{ fontSize: "11px", color: "#666666", margin: "2px 0 0 0" }}>
                      {loc.latitude && loc.longitude 
                        ? `${loc.latitude.toFixed(4)}° N, ${loc.longitude.toFixed(4)}° E` 
                        : "GPS non renseigné"}
                    </p>
                  </div>
                  <span style={{ fontSize: "11px", color: "#0891b2", fontWeight: "500" }}>
                    {loc.count} sortie{loc.count > 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column: Static map */}
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            borderRadius: "12px", 
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            backgroundColor: "#ffffff"
          }}>
            <div style={{ 
              padding: "12px 16px", 
              backgroundColor: "#1e3a5f", 
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <span style={{ fontSize: "16px" }}>🌊</span>
              <h3 style={{ fontSize: "14px", fontWeight: "600", margin: 0 }}>
                Zone Méditerranée - Marseille et environs
              </h3>
            </div>
            
            {staticMapUrl && validLocations.length > 0 ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <img 
                  src={staticMapUrl}
                  alt="Carte des spots de plongée"
                  style={{ 
                    width: "100%", 
                    height: "340px",
                    objectFit: "cover"
                  }}
                  crossOrigin="anonymous"
                />
                <div style={{ 
                  padding: "12px", 
                  backgroundColor: "#f0f9ff",
                  borderTop: "1px solid #e2e8f0"
                }}>
                  <p style={{ fontSize: "11px", color: "#0369a1", margin: 0, textAlign: "center" }}>
                    📌 {validLocations.length} spot{validLocations.length > 1 ? 's' : ''} géolocalisé{validLocations.length > 1 ? 's' : ''} sur la carte
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ 
                flex: 1, 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center", 
                justifyContent: "center",
                padding: "40px",
                backgroundColor: "#e0f2fe"
              }}>
                <span style={{ fontSize: "48px", marginBottom: "12px" }}>🗺️</span>
                <p style={{ fontSize: "14px", color: "#666666", textAlign: "center", margin: 0 }}>
                  Aucune coordonnée GPS disponible
                </p>
                <p style={{ fontSize: "12px", color: "#999999", marginTop: "8px", textAlign: "center" }}>
                  Ajoutez les coordonnées aux lieux pour afficher la carte
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PDFPageWrapper>
  );
};
