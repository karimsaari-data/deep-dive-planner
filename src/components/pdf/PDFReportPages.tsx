import { PDFReportData, PHOTOS_PER_PAGE } from "@/hooks/usePDFReportData";
import { PDFPageCover } from "./pages/PDFPageCover";
import { PDFPageSummary } from "./pages/PDFPageSummary";
import { PDFPageBureau } from "./pages/PDFPageBureau";
import { PDFPageEncadrants } from "./pages/PDFPageEncadrants";
import { PDFPageDashboard } from "./pages/PDFPageDashboard";
import { PDFPageDemographics } from "./pages/PDFPageDemographics";
import { PDFPageLevels } from "./pages/PDFPageLevels";
import { PDFPageTopPlongeurs } from "./pages/PDFPageTopPlongeurs";
import { PDFPageEncadrantsActivity } from "./pages/PDFPageEncadrantsActivity";
import { PDFPageTopSites } from "./pages/PDFPageTopSites";
import { PDFPageEquipment } from "./pages/PDFPageEquipment";
import { PDFPageMembership } from "./pages/PDFPageMembership";
import { PDFPagePhotos } from "./pages/PDFPagePhotos";
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
    "demographics", "membership", "levels", "topPlongeurs", "encadrantsActivity", 
    "topSites", "equipment", "photos", "contact"
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

  const photoPages = Math.ceil(data.photos.items.length / PHOTOS_PER_PAGE);

  return (
    <div className="flex flex-col">
      {sections.includes("cover") && <PDFPageCover year={year} pageNumber={getPageNumber("cover")} />}
      {sections.includes("summary") && <PDFPageSummary selectedSections={sections} photoPages={photoPages} pageNumber={getPageNumber("summary")} />}
      {sections.includes("bureau") && <PDFPageBureau members={data.bureau} pageNumber={getPageNumber("bureau")} />}
      {sections.includes("encadrants") && <PDFPageEncadrants members={data.allEncadrants} pageNumber={getPageNumber("encadrants")} />}
      {sections.includes("dashboard") && <PDFPageDashboard stats={data.stats} year={year} pageNumber={getPageNumber("dashboard")} />}
      {sections.includes("demographics") && <PDFPageDemographics demographics={data.demographics} pageNumber={getPageNumber("demographics")} />}
      {sections.includes("membership") && <PDFPageMembership membership={data.membership} year={year} pageNumber={getPageNumber("membership")} />}
      {sections.includes("levels") && <PDFPageLevels levels={data.fishLevels} stats={data.stats} year={year} pageNumber={getPageNumber("levels")} />}
      {sections.includes("topPlongeurs") && <PDFPageTopPlongeurs participants={data.topParticipants} year={year} pageNumber={getPageNumber("topPlongeurs")} />}
      {sections.includes("encadrantsActivity") && <PDFPageEncadrantsActivity staff={data.staff} year={year} pageNumber={getPageNumber("encadrantsActivity")} />}
      {sections.includes("topSites") && <PDFPageTopSites locations={data.topLocations} year={year} pageNumber={getPageNumber("topSites")} />}
      {sections.includes("equipment") && <PDFPageEquipment equipment={data.equipment} pageNumber={getPageNumber("equipment")} />}
      {sections.includes("photos") && Array.from({ length: photoPages }, (_, part) => (
        <PDFPagePhotos key={part} photos={data.photos} year={year} part={part} pageNumber={getPageNumber("photos")} />
      ))}
      {sections.includes("contact") && <PDFPageContact pageNumber={getPageNumber("contact")} />}
    </div>
  );
};
