import { PDFReportData } from "@/hooks/usePDFReportData";
import { PDFPageCover } from "./pages/PDFPageCover";
import { PDFPageSummary } from "./pages/PDFPageSummary";
import { PDFPageBureau } from "./pages/PDFPageBureau";
import { PDFPageEncadrants } from "./pages/PDFPageEncadrants";
import { PDFPageDashboard } from "./pages/PDFPageDashboard";
import { PDFPageDemographics } from "./pages/PDFPageDemographics";
import { PDFPageTopPlongeurs } from "./pages/PDFPageTopPlongeurs";
import { PDFPageEncadrantsActivity } from "./pages/PDFPageEncadrantsActivity";
import { PDFPageTopSites } from "./pages/PDFPageTopSites";
import { PDFPageMap } from "./pages/PDFPageMap";
import { PDFPageEquipment } from "./pages/PDFPageEquipment";
import { PDFPageContact } from "./pages/PDFPageContact";

interface PDFReportPagesProps {
  data: PDFReportData;
  year: number;
  selectedSections?: string[];
}

export const PDFReportPages = ({ data, year, selectedSections }: PDFReportPagesProps) => {
  // If no sections specified, render all
  const sections = selectedSections || [
    "cover", "summary", "bureau", "encadrants", "dashboard", 
    "demographics", "topPlongeurs", "encadrantsActivity", 
    "topSites", "map", "equipment", "contact"
  ];

  // Calculate dynamic page numbers based on selected sections
  let pageNumber = 0;
  const getPageNumber = (sectionId: string) => {
    if (sections.includes(sectionId)) {
      pageNumber++;
      return pageNumber;
    }
    return 0;
  };

  return (
    <div className="flex flex-col">
      {sections.includes("cover") && <PDFPageCover year={year} pageNumber={getPageNumber("cover")} />}
      {sections.includes("summary") && <PDFPageSummary selectedSections={sections} pageNumber={getPageNumber("summary")} />}
      {sections.includes("bureau") && <PDFPageBureau members={data.bureau} pageNumber={getPageNumber("bureau")} />}
      {sections.includes("encadrants") && <PDFPageEncadrants members={data.allEncadrants} pageNumber={getPageNumber("encadrants")} />}
      {sections.includes("dashboard") && <PDFPageDashboard stats={data.stats} year={year} pageNumber={getPageNumber("dashboard")} />}
      {sections.includes("demographics") && <PDFPageDemographics demographics={data.demographics} pageNumber={getPageNumber("demographics")} />}
      {sections.includes("topPlongeurs") && <PDFPageTopPlongeurs participants={data.topParticipants} year={year} pageNumber={getPageNumber("topPlongeurs")} />}
      {sections.includes("encadrantsActivity") && <PDFPageEncadrantsActivity encadrants={data.topEncadrants} year={year} pageNumber={getPageNumber("encadrantsActivity")} />}
      {sections.includes("topSites") && <PDFPageTopSites locations={data.topLocations} year={year} pageNumber={getPageNumber("topSites")} />}
      {sections.includes("map") && <PDFPageMap locations={data.topLocations} pageNumber={getPageNumber("map")} />}
      {sections.includes("equipment") && <PDFPageEquipment equipment={data.equipment} pageNumber={getPageNumber("equipment")} />}
      {sections.includes("contact") && <PDFPageContact pageNumber={getPageNumber("contact")} />}
    </div>
  );
};
