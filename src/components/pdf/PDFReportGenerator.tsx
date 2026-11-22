import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, Presentation, Settings2 } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import PptxGenJS from "pptxgenjs";
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

  const isContactAt = (i: number, total: number) =>
    selectedSections.includes("contact") &&
    i === total - 1 &&
    PDF_SECTIONS.filter(s => selectedSections.includes(s.id)).at(-1)?.id === "contact";

  // Capture chaque page du rapport en image JPEG (même rendu pour PDF et PowerPoint)
  const capturePages = async (toastId: string | number): Promise<string[]> => {
    await refetch();
    // Wait for images to load and render
    await new Promise(r => setTimeout(r, 1000));

    const pages = containerRef.current!.querySelectorAll('[data-pdf-page]');
    const images: string[] = [];

    for (let i = 0; i < pages.length; i++) {
      toast.loading(`Génération de la page ${i + 1} sur ${pages.length}...`, {
        id: toastId,
        description: getPageTitle(i),
      });

      const canvas = await html2canvas(pages[i] as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1123,
        windowHeight: 794,
      });
      images.push(canvas.toDataURL("image/jpeg", 0.95));

      // Let UI breathe
      await new Promise(r => setTimeout(r, 100));
    }
    return images;
  };

  const runExport = async (
    format: "pdf" | "pptx",
    build: (images: string[]) => Promise<void>
  ) => {
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
      const images = await capturePages(toastId);
      await build(images);
      toast.success(format === "pdf" ? "Rapport téléchargé avec succès !" : "Présentation téléchargée avec succès !", {
        id: toastId,
        description: `${images.length} pages générées`,
      });
    } catch (error) {
      console.error(`Error generating ${format}:`, error);
      toast.error(`Erreur lors de la génération du ${format === "pdf" ? "PDF" : "PowerPoint"}`, {
        id: toastId,
        description: "Veuillez réessayer",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePDF = () =>
    runExport("pdf", async (images) => {
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      images.forEach((imgData, i) => {
        if (i > 0) pdf.addPage();
        // A4 landscape dimensions: 297mm x 210mm
        pdf.addImage(imgData, "JPEG", 0, 0, 297, 210);
        // Add clickable links if contact page is the last selected page
        if (isContactAt(i, images.length)) addContactPageLinks(pdf);
      });
      pdf.save(`Rapport_AG_TeamOxygen_${year}.pdf`);
    });

  const generatePPTX = () =>
    runExport("pptx", async (images) => {
      const pptx = new PptxGenJS();
      // Même format que les pages du rapport (A4 paysage, en pouces)
      const W = 297 / 25.4;
      const H = 210 / 25.4;
      pptx.defineLayout({ name: "A4_LANDSCAPE", width: W, height: H });
      pptx.layout = "A4_LANDSCAPE";
      pptx.title = `Rapport AG Team Oxygen ${year}`;
      pptx.company = "Team Oxygen";

      images.forEach((imgData, i) => {
        const slide = pptx.addSlide();
        slide.addImage({ data: imgData, x: 0, y: 0, w: W, h: H });
        slide.addNotes(getPageTitle(i));
        if (isContactAt(i, images.length)) {
          // Zones cliquables transparentes (mêmes positions que le PDF, mm -> pouces)
          CONTACT_PAGE_LINKS.forEach(link => {
            slide.addText(" ", {
              x: link.x / 25.4,
              y: link.y / 25.4,
              w: link.w / 25.4,
              h: link.h / 25.4,
              hyperlink: { url: link.url },
            });
          });
        }
      });

      await pptx.writeFile({ fileName: `Rapport_AG_TeamOxygen_${year}.pptx` });
    });

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
              variant="secondary"
              onClick={generatePPTX}
              disabled={selectedSections.length === 0 || isLoading}
              className="gap-2"
            >
              <Presentation className="h-4 w-4" />
              PowerPoint ({selectedSections.length} diapos)
            </Button>
            <Button
              onClick={generatePDF}
              disabled={selectedSections.length === 0 || isLoading}
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              PDF ({selectedSections.length} pages)
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
