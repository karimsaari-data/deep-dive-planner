import { PDFReportData } from "@/hooks/usePDFReportData";
import { PDFPageCover } from "./pages/PDFPageCover";
import { PDFPageSummary } from "./pages/PDFPageSummary";
import { PDFPageBureau } from "./pages/PDFPageBureau";
import { PDFPageEncadrants } from "./pages/PDFPageEncadrants";
import { PDFPageDashboard } from "./pages/PDFPageDashboard";
import { PDFPageDemographics } from "./pages/PDFPageDemographics";
import { PDFPageTopPlongeurs } from "./pages/PDFPageTopPlongeurs";
import { PDFPageEncadrantsActivity } from "./pages/PDFPageEncadrantsActivity";

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
      <PDFPageEncadrants members={data.encadrants} />
      <PDFPageDashboard stats={data.stats} year={year} />
      <PDFPageDemographics demographics={data.demographics} />
      <PDFPageTopPlongeurs participants={data.topParticipants} year={year} />
      <PDFPageEncadrantsActivity encadrants={data.topEncadrants} year={year} />
    </div>
  );
};
