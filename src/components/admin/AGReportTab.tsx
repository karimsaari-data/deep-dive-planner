import { useState } from "react";
import { FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PDFReportGenerator } from "@/components/pdf/PDFReportGenerator";

const FIRST_YEAR = 2025;

// Rapport d'Assemblée Générale : périodicité annuelle (année civile),
// distinct des statistiques du club qui sont suivies par saison.
const AGReportTab = () => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: Math.max(currentYear - FIRST_YEAR + 1, 1) }, (_, i) => currentYear - i);
  const [year, setYear] = useState(currentYear);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Rapport d'Assemblée Générale
        </CardTitle>
        <CardDescription>
          Rapport annuel (du 1er janvier à aujourd'hui), à télécharger en PDF ou en PowerPoint éditable.
          Les adhérents, le bureau et les encadrants reflètent la saison en cours.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Année" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <PDFReportGenerator year={year} />
      </CardContent>
    </Card>
  );
};

export default AGReportTab;
