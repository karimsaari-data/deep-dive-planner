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
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <svg 
        viewBox="0 0 400 320" 
        style={{ width: "100%", height: "320px", backgroundColor: "#e0f2fe" }}
      >
        {/* Sea background pattern */}
        <defs>
          <pattern id="waves" patternUnits="userSpaceOnUse" width="30" height="10">
            <path 
              d="M0 5 Q7.5 0, 15 5 T30 5" 
              fill="none" 
              stroke="#93c5fd" 
              strokeWidth="0.5"
            />
          </pattern>
          <linearGradient id="seaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#bfdbfe" />
            <stop offset="100%" stopColor="#93c5fd" />
          </linearGradient>
        </defs>
        
        {/* Background */}
        <rect width="400" height="320" fill="url(#seaGradient)" />
        <rect width="400" height="320" fill="url(#waves)" opacity="0.5" />
        
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
              <circle cx={x + 1} cy={y + 1} r="14" fill="rgba(0,0,0,0.2)" />
              
              {/* Marker circle */}
              <circle cx={x} cy={y} r="14" fill="#dc2626" stroke="#ffffff" strokeWidth="2" />
              
              {/* Marker number */}
              <text 
                x={x} 
                y={y + 5} 
                textAnchor="middle" 
                fill="#ffffff" 
                fontSize="12" 
                fontWeight="bold"
                fontFamily="Arial, sans-serif"
              >
                {index + 1}
              </text>
              
              {/* Location name label */}
              <rect 
                x={x + 18} 
                y={y - 10} 
                width={Math.min(loc.name.length * 5.5 + 10, 120)} 
                height="20" 
                rx="4" 
                fill="#ffffff" 
                opacity="0.9"
              />
              <text 
                x={x + 24} 
                y={y + 4} 
                fill="#1e3a5f" 
                fontSize="10" 
                fontWeight="500"
                fontFamily="Arial, sans-serif"
              >
                {loc.name.length > 18 ? loc.name.substring(0, 18) + "…" : loc.name}
              </text>
            </g>
          );
        })}
        
        {/* Compass rose */}
        <g transform="translate(360, 40)">
          <circle cx="0" cy="0" r="20" fill="#ffffff" opacity="0.9" />
          <polygon points="0,-15 3,-5 -3,-5" fill="#dc2626" />
          <polygon points="0,15 3,5 -3,5" fill="#1e3a5f" />
          <polygon points="-15,0 -5,3 -5,-3" fill="#64748b" />
          <polygon points="15,0 5,3 5,-3" fill="#64748b" />
          <text x="0" y="-6" textAnchor="middle" fontSize="8" fill="#dc2626" fontWeight="bold" fontFamily="Arial">N</text>
        </g>
        
        {/* Scale indicator */}
        <g transform="translate(20, 300)">
          <line x1="0" y1="0" x2="50" y2="0" stroke="#1e3a5f" strokeWidth="2" />
          <line x1="0" y1="-5" x2="0" y2="5" stroke="#1e3a5f" strokeWidth="2" />
          <line x1="50" y1="-5" x2="50" y2="5" stroke="#1e3a5f" strokeWidth="2" />
          <text x="25" y="-8" textAnchor="middle" fontSize="8" fill="#1e3a5f" fontFamily="Arial">~5 km</text>
        </g>
      </svg>
      
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
  );
};

export const PDFPageMap = ({ locations, pageNumber }: PDFPageMapProps) => {
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

          {/* Right column: SVG Map visualization */}
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
            
            <MapVisualization locations={locations} />
          </div>
        </div>
      </div>
    </PDFPageWrapper>
  );
};