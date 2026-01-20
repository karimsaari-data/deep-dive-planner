import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { PDFReportPages } from "./PDFReportPages";
import { usePDFReportData } from "@/hooks/usePDFReportData";
import { CONTACT_LINKS } from "./pages/PDFPageContact";
import { PDFSectionSelector, PDF_SECTIONS } from "./PDFSectionSelector";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PDFReportGeneratorProps {
  year: number;
}

// Link positions for contact page (Contact page)
// These are approximate positions in mm for A4 landscape (297x210mm)
const CONTACT_PAGE_LINKS = [
  // Social links - left column
  { x: 10, y: 65, w: 130, h: 25, url: CONTACT_LINKS.facebook },   // Facebook
  { x: 10, y: 95, w: 130, h: 25, url: CONTACT_LINKS.instagram },  // Instagram
  { x: 10, y: 125, w: 130, h: 25, url: CONTACT_LINKS.linkedin },  // LinkedIn
  // Location links - right column
  { x: 155, y: 65, w: 130, h: 25, url: CONTACT_LINKS.siege },     // Siège Social
  { x: 155, y: 95, w: 130, h: 25, url: CONTACT_LINKS.local },     // Local Club
];

export const PDFReportGenerator = ({ year }: PDFReportGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSections, setSelectedSections] = useState<string[]>(
    PDF_SECTIONS.map(s => s.id)
  );
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { data, isLoading, refetch } = usePDFReportData(year);

  const handleSectionToggle = (sectionId: string) => {
    setSelectedSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleSelectAll = () => {
    setSelectedSections(PDF_SECTIONS.map(s => s.id));
  };

  const handleDeselectAll = () => {
    setSelectedSections([]);
  };

  const addContactPageLinks = (pdf: jsPDF) => {
    // Add clickable link annotations to contact page
    CONTACT_PAGE_LINKS.forEach(link => {
      pdf.link(link.x, link.y, link.w, link.h, { url: link.url });
    });
  };

  const getPageTitle = (index: number): string => {
    const orderedSections = PDF_SECTIONS.filter(s => selectedSections.includes(s.id));
    return orderedSections[index]?.label || `Page ${index + 1}`;
  };

  const generatePDF = async () => {
    if (!containerRef.current || selectedSections.length === 0) {
      toast.error("Veuillez sélectionner au moins une section");
      return;
    }

    setIsDialogOpen(false);
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
          description: getPageTitle(i),
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

        // Add clickable links if contact page is the last selected page
        const isContactPage = selectedSections.includes("contact") && 
          i === pages.length - 1 && 
          PDF_SECTIONS.filter(s => selectedSections.includes(s.id)).at(-1)?.id === "contact";
        
        if (isContactPage) {
          addContactPageLinks(pdf);
        }

        // Let UI breathe
        await new Promise(r => setTimeout(r, 100));
      }

      // Download PDF
      pdf.save(`Rapport_AG_TeamOxygen_${year}.pdf`);
      
      toast.success("Rapport téléchargé avec succès !", {
        id: toastId,
        description: `${pages.length} pages générées`,
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
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button 
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
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Configurer le Rapport PDF
            </DialogTitle>
            <DialogDescription>
              Sélectionnez les sections à inclure dans le rapport d'Assemblée Générale {year}
            </DialogDescription>
          </DialogHeader>

          <PDFSectionSelector
            selectedSections={selectedSections}
            onSectionToggle={handleSectionToggle}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
          />

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={generatePDF}
              disabled={selectedSections.length === 0 || isLoading}
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              Générer ({selectedSections.length} pages)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        {data && (
          <PDFReportPages 
            data={data} 
            year={year} 
            selectedSections={selectedSections}
          />
        )}
      </div>
    </>
  );
};
