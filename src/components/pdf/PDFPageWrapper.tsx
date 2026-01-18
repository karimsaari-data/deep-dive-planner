import { ReactNode } from "react";

interface PDFPageWrapperProps {
  children: ReactNode;
  pageNumber?: number;
}

// A4 Landscape: 297mm x 210mm
// At 96dpi: 1123px x 794px
export const PDFPageWrapper = ({ children, pageNumber }: PDFPageWrapperProps) => {
  return (
    <div
      data-pdf-page
      style={{
        width: "1123px",
        height: "794px",
        backgroundColor: "#ffffff",
        color: "#1a1a1a",
        fontFamily: "Outfit, sans-serif",
        position: "relative",
        overflow: "hidden",
        padding: "40px 50px",
        boxSizing: "border-box",
      }}
    >
      {children}
      {pageNumber && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            right: "40px",
            fontSize: "12px",
            color: "#666666",
          }}
        >
          {pageNumber} / 8
        </div>
      )}
    </div>
  );
};
