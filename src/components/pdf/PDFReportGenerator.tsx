import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { PDFReportPages } from "./PDFReportPages";
import { usePDFReportData } from "@/hooks/usePDFReportData";

interface PDFReportGeneratorProps {
  year: number;
}

const PAGE_TITLES = [
  "Couverture",
  "Sommaire",
  "Le Bureau",
  "L'Équipe Technique",
  "Tableau de Bord",
  "Démographie",
  "Top Plongeurs",
  "Activité Encadrants",
  "Top Sites",
  "Carte des Spots",
  "Parc Matériel",
  "Contact & Réseaux",
];

export const PDFReportGenerator = ({ year }: PDFReportGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { data, isLoading, refetch } = usePDFReportData(year);

  const generatePDF = async () => {
    if (!containerRef.current) return;

    setIsGenerating(true);
    const toastId = toast.loading("Préparation du rapport...", {
      description: "Chargement des données..."
    });

    try {
      // Ensure data is fresh
      await refetch();
      
      // Wait for images to load and render
      await new Promise(r => setTimeout(r, 1000));

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pages = containerRef.current.querySelectorAll('[data-pdf-page]');
      
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        
        toast.loading(`Génération de la page ${i + 1} sur ${pages.length}...`, {
          id: toastId,
          description: PAGE_TITLES[i] || `Page ${i + 1}`,
        });

        // Capture the page
        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: 1123,
          windowHeight: 794,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        
        if (i > 0) {
          pdf.addPage();
        }

        // A4 landscape dimensions: 297mm x 210mm
        pdf.addImage(imgData, "JPEG", 0, 0, 297, 210);

        // Let UI breathe
        await new Promise(r => setTimeout(r, 100));
      }

      // Download PDF
      pdf.save(`Rapport_AG_TeamOxygen_${year}.pdf`);
      
      toast.success("Rapport téléchargé avec succès !", {
        id: toastId,
        description: `Rapport d'Assemblée Générale ${year}`,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erreur lors de la génération du PDF", {
        id: toastId,
        description: "Veuillez réessayer",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Button 
        onClick={generatePDF} 
        disabled={isGenerating || isLoading}
        className="gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Génération...
          </>
        ) : (
          <>
            <FileDown className="h-4 w-4" />
            Télécharger le Rapport AG
          </>
        )}
      </Button>

      {/* Hidden container for PDF generation */}
      <div 
        ref={containerRef}
        style={{
          position: "fixed",
          left: "-10000px",
          top: 0,
          width: "1123px",
        }}
      >
        {data && <PDFReportPages data={data} year={year} />}
      </div>
    </>
  );
};
