import { PDFPageWrapper } from "../PDFPageWrapper";
import { PDFPhoto, PDFPhotos, PHOTOS_PER_PAGE } from "@/hooks/usePDFReportData";

interface PDFPagePhotosProps {
  photos: PDFPhotos;
  year: number;
  part: number; // 0 = première page, 1 = seconde
  pageNumber?: number;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export const PDFPagePhotos = ({ photos, year, part, pageNumber }: PDFPagePhotosProps) => {
  const items: PDFPhoto[] = photos.items.slice(part * PHOTOS_PER_PAGE, (part + 1) * PHOTOS_PER_PAGE);

  return (
    <PDFPageWrapper pageNumber={pageNumber}>
      <div style={{ height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
          <span style={{ fontSize: "28px" }}>📸</span>
          <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#1e3a5f", margin: 0 }}>
            {part === 0 ? `Souvenirs ${year}` : `Souvenirs ${year} (suite)`}
          </h1>
        </div>
        <p style={{ fontSize: "14px", lineHeight: "20px", color: "#666666", margin: "0 0 16px 0" }}>
          {photos.totalPhotos} photos dans l'album du club · {photos.totalOutings} sortie{photos.totalOutings > 1 ? "s" : ""} photographiée{photos.totalOutings > 1 ? "s" : ""}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {items.map((p, i) => (
            <div
              key={p.url + i}
              style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" }}
            >
              <img
                src={p.url}
                alt={p.title}
                crossOrigin="anonymous"
                style={{ display: "block", width: "100%", height: "210px", objectFit: "cover" }}
              />
              <div style={{ padding: "8px 12px 10px 12px" }}>
                <div style={{ fontSize: "13px", lineHeight: "18px", height: "18px", fontWeight: "600", color: "#1a1a1a", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {p.title}
                </div>
                <div style={{ fontSize: "11px", lineHeight: "16px", height: "16px", color: "#666666", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {fmt(p.dateTime)}{p.location ? ` · ${p.location}` : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PDFPageWrapper>
  );
};
