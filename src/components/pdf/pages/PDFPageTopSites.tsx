import { PDFPageWrapper } from "../PDFPageWrapper";
import { PDFTopLocation } from "@/hooks/usePDFReportData";

interface PDFPageTopSitesProps {
  locations: PDFTopLocation[];
  year: number;
  pageNumber?: number;
}

export const PDFPageTopSites = ({ locations, year, pageNumber }: PDFPageTopSitesProps) => {
  return (
    <PDFPageWrapper pageNumber={pageNumber}>
      <div style={{ height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <span style={{ fontSize: "28px" }}>📍</span>
          <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#1e3a5f", margin: 0 }}>
            Top 10 des Sites {year}
          </h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px" }}>
          {locations.slice(0, 10).map((loc, index) => (
            <div
              key={loc.id}
              style={{
                backgroundColor: "#f8fafc",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100px",
                  backgroundColor: loc.photo_url ? "transparent" : "#1e3a5f",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {loc.photo_url ? (
                  <img src={loc.photo_url} alt={loc.name} crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: "32px" }}>🌊</span>
                )}
              </div>
              <div style={{ padding: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "14px", fontWeight: "700", color: "#e67e22" }}>#{index + 1}</span>
                </div>
                <h3 style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", margin: "0 0 4px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {loc.name}
                </h3>
                <span style={{ fontSize: "12px", color: "#059669", fontWeight: "600" }}>
                  {loc.count} sortie{loc.count > 1 ? "s" : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PDFPageWrapper>
  );
};
