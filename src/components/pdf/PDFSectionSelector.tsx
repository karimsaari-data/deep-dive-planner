import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  BookOpen, 
  Users, 
  Award, 
  BarChart3, 
  PieChart, 
  Trophy, 
  UserCheck, 
  MapPin, 
  Map, 
  Package, 
  Phone,
  FileText
} from "lucide-react";

export interface PDFSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  defaultSelected: boolean;
}

export const PDF_SECTIONS: PDFSection[] = [
  { id: "cover", label: "Couverture", icon: <BookOpen className="h-4 w-4" />, defaultSelected: true },
  { id: "summary", label: "Sommaire", icon: <FileText className="h-4 w-4" />, defaultSelected: true },
  { id: "bureau", label: "Le Bureau", icon: <Users className="h-4 w-4" />, defaultSelected: true },
  { id: "encadrants", label: "L'Équipe Technique", icon: <Award className="h-4 w-4" />, defaultSelected: true },
  { id: "dashboard", label: "Tableau de Bord", icon: <BarChart3 className="h-4 w-4" />, defaultSelected: true },
  { id: "demographics", label: "Démographie", icon: <PieChart className="h-4 w-4" />, defaultSelected: true },
  { id: "topPlongeurs", label: "Top Plongeurs", icon: <Trophy className="h-4 w-4" />, defaultSelected: true },
  { id: "encadrantsActivity", label: "Activité Encadrants", icon: <UserCheck className="h-4 w-4" />, defaultSelected: true },
  { id: "topSites", label: "Top Sites", icon: <MapPin className="h-4 w-4" />, defaultSelected: true },
  { id: "map", label: "Carte des Spots", icon: <Map className="h-4 w-4" />, defaultSelected: true },
  { id: "equipment", label: "Parc Matériel", icon: <Package className="h-4 w-4" />, defaultSelected: true },
  { id: "contact", label: "Contact & Réseaux", icon: <Phone className="h-4 w-4" />, defaultSelected: true },
];

interface PDFSectionSelectorProps {
  selectedSections: string[];
  onSectionToggle: (sectionId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export const PDFSectionSelector = ({
  selectedSections,
  onSectionToggle,
  onSelectAll,
  onDeselectAll,
}: PDFSectionSelectorProps) => {
  const allSelected = selectedSections.length === PDF_SECTIONS.length;
  const noneSelected = selectedSections.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {selectedSections.length} / {PDF_SECTIONS.length} sections
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={allSelected}
            className="text-xs text-primary hover:underline disabled:opacity-50 disabled:no-underline"
          >
            Tout sélectionner
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            type="button"
            onClick={onDeselectAll}
            disabled={noneSelected}
            className="text-xs text-primary hover:underline disabled:opacity-50 disabled:no-underline"
          >
            Tout désélectionner
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {PDF_SECTIONS.map((section) => {
          const isSelected = selectedSections.includes(section.id);
          return (
            <div
              key={section.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                isSelected 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-muted-foreground/50"
              }`}
              onClick={() => onSectionToggle(section.id)}
            >
              <Checkbox
                id={section.id}
                checked={isSelected}
                onCheckedChange={() => onSectionToggle(section.id)}
                className="pointer-events-none"
              />
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={isSelected ? "text-primary" : "text-muted-foreground"}>
                  {section.icon}
                </span>
                <Label
                  htmlFor={section.id}
                  className="text-sm font-medium cursor-pointer truncate"
                >
                  {section.label}
                </Label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
