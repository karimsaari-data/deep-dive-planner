import { PDFPageWrapper } from "../PDFPageWrapper";
import { PDFTopLocation } from "@/hooks/usePDFReportData";

interface PDFPageMapProps {
  locations: PDFTopLocation[];
  pageNumber?: number;
}

// Generate a simple SVG map representation based on coordinates
const MapVisualization = ({ locations }: { locations: PDFTopLocation[] }) => {
  const validLocations = locations.filter(loc => loc.latitude && loc.longitude);
  
  if (validLocations.length === 0) {
    return (
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
      </div>
    );
  }

  // Calculate bounds
  const lats = validLocations.map(l => l.latitude!);
  const lons = validLocations.map(l => l.longitude!);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  
  // Add padding to bounds
  const latPadding = Math.max((maxLat - minLat) * 0.2, 0.05);
  const lonPadding = Math.max((maxLon - minLon) * 0.2, 0.05);
  
  const latRange = (maxLat - minLat) + latPadding * 2;
  const lonRange = (maxLon - minLon) + lonPadding * 2;

  // Convert GPS to SVG coordinates
  const toSvgX = (lon: number) => ((lon - minLon + lonPadding) / lonRange) * 380 + 10;
  const toSvgY = (lat: number) => 290 - ((lat - minLat + latPadding) / latRange) * 280 + 10;

  return (
    <svg 
      viewBox="0 0 400 280" 
      width="100%"
      height="280"
      style={{ display: "block", backgroundColor: "#e0f2fe" }}
    >
      {/* Sea background - solid colors for better html2canvas support */}
      <rect width="400" height="280" fill="#bfdbfe" />
      
      {/* Wave lines pattern - drawn directly */}
      {[0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260].map((y) => (
        <path 
          key={y}
          d={`M0 ${y + 10} Q15 ${y + 5}, 30 ${y + 10} T60 ${y + 10} T90 ${y + 10} T120 ${y + 10} T150 ${y + 10} T180 ${y + 10} T210 ${y + 10} T240 ${y + 10} T270 ${y + 10} T300 ${y + 10} T330 ${y + 10} T360 ${y + 10} T390 ${y + 10} T420 ${y + 10}`}
          fill="none" 
          stroke="#93c5fd" 
          strokeWidth="0.5"
          opacity="0.6"
        />
      ))}
      
      {/* Connection lines between spots */}
      {validLocations.slice(0, 10).map((loc, i) => {
        if (i === 0) return null;
        const prev = validLocations[i - 1];
        return (
          <line
            key={`line-${i}`}
            x1={toSvgX(prev.longitude!)}
            y1={toSvgY(prev.latitude!)}
            x2={toSvgX(loc.longitude!)}
            y2={toSvgY(loc.latitude!)}
            stroke="#1e3a5f"
            strokeWidth="1"
            strokeDasharray="4,4"
            opacity="0.3"
          />
        );
      })}
      
      {/* Location markers */}
      {validLocations.slice(0, 10).map((loc, index) => {
        const x = toSvgX(loc.longitude!);
        const y = toSvgY(loc.latitude!);
        
        return (
          <g key={loc.id}>
            {/* Marker shadow */}
            <circle cx={x + 1} cy={y + 1} r="12" fill="rgba(0,0,0,0.2)" />
            
            {/* Marker circle */}
            <circle cx={x} cy={y} r="12" fill="#dc2626" stroke="#ffffff" strokeWidth="2" />
            
            {/* Marker number */}
            <text 
              x={x} 
              y={y + 4} 
              textAnchor="middle" 
              fill="#ffffff" 
              fontSize="11" 
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
            >
              {index + 1}
            </text>
            
            {/* Location name label */}
            <rect 
              x={x + 15} 
              y={y - 8} 
              width={Math.min(loc.name.length * 5 + 8, 100)} 
              height="16" 
              rx="3" 
              fill="#ffffff" 
              stroke="#e2e8f0"
              strokeWidth="0.5"
            />
            <text 
              x={x + 20} 
              y={y + 3} 
              fill="#1e3a5f" 
              fontSize="9" 
              fontWeight="500"
              fontFamily="Arial, sans-serif"
            >
              {loc.name.length > 16 ? loc.name.substring(0, 16) + "…" : loc.name}
            </text>
          </g>
        );
      })}
      
      {/* Compass rose */}
      <g transform="translate(365, 35)">
        <circle cx="0" cy="0" r="18" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
        <polygon points="0,-12 2,-4 -2,-4" fill="#dc2626" />
        <polygon points="0,12 2,4 -2,4" fill="#1e3a5f" />
        <polygon points="-12,0 -4,2 -4,-2" fill="#64748b" />
        <polygon points="12,0 4,2 4,-2" fill="#64748b" />
        <text x="0" y="-4" textAnchor="middle" fontSize="7" fill="#dc2626" fontWeight="bold" fontFamily="Arial">N</text>
      </g>
      
      {/* Scale indicator */}
      <g transform="translate(15, 260)">
        <line x1="0" y1="0" x2="40" y2="0" stroke="#1e3a5f" strokeWidth="2" />
        <line x1="0" y1="-4" x2="0" y2="4" stroke="#1e3a5f" strokeWidth="2" />
        <line x1="40" y1="-4" x2="40" y2="4" stroke="#1e3a5f" strokeWidth="2" />
        <text x="20" y="-6" textAnchor="middle" fontSize="7" fill="#1e3a5f" fontFamily="Arial">~5 km</text>
      </g>
    </svg>
  );
};

export const PDFPageMap = ({ locations, pageNumber }: PDFPageMapProps) => {
  const validLocations = locations.filter(loc => loc.latitude && loc.longitude);
  
  return (
    <PDFPageWrapper pageNumber={pageNumber}>
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <span style={{ fontSize: "28px" }}>🗺️</span>
          <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#1e3a5f", margin: 0 }}>
            Carte des Spots
          </h1>
        </div>

        {/* Main content - using table for reliable html2canvas capture */}
        <table style={{ width: "100%", height: "auto", borderCollapse: "separate", borderSpacing: "24px 0", tableLayout: "fixed" }}>
          <tbody>
            <tr>
              {/* Left column: GPS coordinates list */}
              <td style={{ width: "50%", verticalAlign: "top", padding: "20px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", margin: "0 0 16px 0" }}>
                  📍 Coordonnées GPS
                </h3>
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px" }}>
                  <tbody>
                    {locations.slice(0, 8).map((loc, index) => (
                      <tr key={loc.id}>
                        <td style={{ 
                          padding: "10px 12px", 
                          backgroundColor: "#ffffff", 
                          borderRadius: "8px", 
                          border: "1px solid #e2e8f0"
                        }}>
                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <tbody>
                              <tr>
                                <td style={{ width: "30px", verticalAlign: "middle" }}>
                                  <div style={{ 
                                    fontSize: "12px", 
                                    fontWeight: "700", 
                                    color: "#ffffff", 
                                    backgroundColor: "#dc2626",
                                    width: "24px",
                                    height: "24px",
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    textAlign: "center",
                                    lineHeight: "24px"
                                  }}>
                                    {index + 1}
                                  </div>
                                </td>
                                <td style={{ verticalAlign: "middle", paddingLeft: "10px" }}>
                                  <p style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", margin: 0 }}>{loc.name}</p>
                                  <p style={{ fontSize: "10px", color: "#666666", margin: "2px 0 0 0" }}>
                                    {loc.latitude && loc.longitude 
                                      ? `${loc.latitude.toFixed(4)}° N, ${loc.longitude.toFixed(4)}° E` 
                                      : "GPS non renseigné"}
                                  </p>
                                </td>
                                <td style={{ width: "60px", verticalAlign: "middle", textAlign: "right" }}>
                                  <span style={{ fontSize: "11px", color: "#0891b2", fontWeight: "500" }}>
                                    {loc.count} sortie{loc.count > 1 ? 's' : ''}
                                  </span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </td>

              {/* Right column: SVG Map visualization */}
              <td style={{ 
                width: "50%",
                verticalAlign: "top",
                borderRadius: "12px", 
                border: "1px solid #e2e8f0",
                overflow: "hidden",
                backgroundColor: "#ffffff",
                padding: 0
              }}>
                <div style={{ 
                  padding: "12px 16px", 
                  backgroundColor: "#1e3a5f", 
                  color: "#ffffff"
                }}>
                  <span style={{ fontSize: "16px", marginRight: "8px" }}>🌊</span>
                  <span style={{ fontSize: "14px", fontWeight: "600" }}>
                    Zone Méditerranée - Marseille et environs
                  </span>
                </div>
                
                <MapVisualization locations={locations} />
                
                <div style={{ 
                  padding: "10px", 
                  backgroundColor: "#f0f9ff",
                  borderTop: "1px solid #e2e8f0",
                  textAlign: "center"
                }}>
                  <span style={{ fontSize: "11px", color: "#0369a1" }}>
                    📌 {validLocations.length} spot{validLocations.length > 1 ? 's' : ''} géolocalisé{validLocations.length > 1 ? 's' : ''} sur la carte
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </PDFPageWrapper>
  );
};