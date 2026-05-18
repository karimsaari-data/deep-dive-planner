import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { PDFPageSecuritePortrait } from "./pages/PDFPageSecuritePortrait";

export const FicheSecuriteGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const generatePDF = async () => {
    if (!containerRef.current) return;

    setIsGenerating(true);
    const toastId = toast.loading("Génération de la fiche sécurité...");

    try {
      await document.fonts.ready;
      await new Promise((r) => setTimeout(r, 1000));

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const page = containerRef.current.querySelector("[data-pdf-page]") as HTMLElement;
      if (!page) throw new Error("Page not found");

      const canvas = await html2canvas(page, {
        scale: 5,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 794,
        windowHeight: 1123,
      });

      const imgData = canvas.toDataURL("image/png");
      // A4 portrait: 210mm x 297mm
      pdf.addImage(imgData, "PNG", 0, 0, 210, 297);

      pdf.save("Fiche_Securite_TeamOxygen.pdf");
      toast.success("Fiche téléchargée !", { id: toastId });
    } catch {
      toast.error("Erreur lors de la génération", { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Button onClick={generatePDF} disabled={isGenerating} className="gap-2">
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Génération...
          </>
        ) : (
          <>
            <FileDown className="h-4 w-4" />
            Télécharger le PDF
          </>
        )}
      </Button>

      {/* Hidden portrait render container */}
      <div
        ref={containerRef}
        style={{
          position: "fixed",
          left: "-10000px",
          top: 0,
          width: "794px",
        }}
      >
        <PDFPageSecuritePortrait />
      </div>
    </>
  );
};
