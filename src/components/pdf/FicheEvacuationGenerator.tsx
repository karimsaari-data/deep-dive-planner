import { useState, useRef } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { PDFPageEvacuationApnee } from "./pages/PDFPageEvacuationApnee";

export const FicheEvacuationGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const generatePDF = async () => {
    if (!containerRef.current) return;

    setIsGenerating(true);
    const toastId = toast.loading("Génération de la fiche...");

    try {
      await document.fonts.ready;
      await new Promise((r) => setTimeout(r, 600));

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

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

      const imgData = canvas.toDataURL("image/jpeg", 0.97);
      pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
      pdf.save("Fiche_Evacuation_Plongeur_Apnee.pdf");

      toast.success("Fiche téléchargée !", { id: toastId });
    } catch {
      toast.error("Erreur lors de la génération", { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-full gap-2 border-destructive/40 text-destructive hover:bg-destructive/5"
        onClick={generatePDF}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <><Loader2 className="h-4 w-4 animate-spin" />Génération...</>
        ) : (
          <><Download className="h-4 w-4" />Fiche d'évacuation de plongeur (Annexe III-19)</>
        )}
      </Button>

      {/* Hidden render zone */}
      <div
        ref={containerRef}
        style={{ position: "fixed", left: "-10000px", top: 0, width: "794px" }}
      >
        <PDFPageEvacuationApnee />
      </div>
    </>
  );
};
