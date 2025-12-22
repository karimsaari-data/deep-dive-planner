import { Building, Waves, Droplets, TreePine, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OutingType } from "@/hooks/useOutings";
import { cn } from "@/lib/utils";

const filters: { type: OutingType; icon: typeof Waves; label: string }[] = [
  { type: "Mer", icon: Waves, label: "Mer" },
  { type: "Piscine", icon: Droplets, label: "Piscine" },
  { type: "Dépollution", icon: Trash2, label: "Dépollution" },
  { type: "Fosse", icon: Building, label: "Fosse" },
  { type: "Étang", icon: TreePine, label: "Étang" },
];

interface OutingFiltersProps {
  activeFilter: OutingType | null;
  onFilterChange: (type: OutingType | null) => void;
}

const OutingFilters = ({ activeFilter, onFilterChange }: OutingFiltersProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Filtrer :</span>
      
      {filters.map(({ type, icon: Icon, label }) => (
        <Button
          key={type}
          variant={activeFilter === type ? "ocean" : "outline"}
          size="sm"
          onClick={() => onFilterChange(activeFilter === type ? null : type)}
          className={cn(
            "gap-2 transition-all",
            activeFilter === type && "shadow-md"
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Button>
      ))}

      {activeFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFilterChange(null)}
          className="gap-1 text-muted-foreground"
        >
          <X className="h-4 w-4" />
          Effacer
        </Button>
      )}
    </div>
  );
};

export default OutingFilters;
