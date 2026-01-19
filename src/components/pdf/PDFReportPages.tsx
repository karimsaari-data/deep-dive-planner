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
}

export const PDFReportPages = ({ data, year }: PDFReportPagesProps) => {
  return (
    <div className="flex flex-col">
      <PDFPageCover year={year} />
      <PDFPageSummary />
      <PDFPageBureau members={data.bureau} />
      <PDFPageEncadrants members={data.allEncadrants} />
      <PDFPageDashboard stats={data.stats} year={year} />
      <PDFPageDemographics demographics={data.demographics} />
      <PDFPageTopPlongeurs participants={data.topParticipants} year={year} />
      <PDFPageEncadrantsActivity encadrants={data.topEncadrants} year={year} />
      <PDFPageTopSites locations={data.topLocations} year={year} />
      <PDFPageMap locations={data.topLocations} />
      <PDFPageEquipment equipment={data.equipment} />
      <PDFPageContact />
    </div>
  );
};
