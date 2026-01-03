import { Package, LifeBuoy, Anchor, Cable, Link, CircleDot, Box, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EquipmentInventoryItem } from "@/hooks/useEquipment";

interface EquipmentSynthesisProps {
  inventory: EquipmentInventoryItem[];
}

// Map category names to icons
const categoryIcons: Record<string, React.ElementType> = {
  "Bouée": LifeBuoy,
  "Bouées": LifeBuoy,
  "Ancre": Anchor,
  "Ancres": Anchor,
  "Corde": Cable,
  "Cordes": Cable,
  "Mousqueton": Link,
  "Mousquetons": Link,
  "Poulie": CircleDot,
  "Poulies": CircleDot,
  "Caisse": Box,
  "Caisses": Box,
};

const getIconForCategory = (categoryName: string): React.ElementType => {
  // Try to find a matching icon
  for (const [key, icon] of Object.entries(categoryIcons)) {
    if (categoryName.toLowerCase().includes(key.toLowerCase())) {
      return icon;
    }
  }
  return Package;
};

export const EquipmentSynthesis = ({ inventory }: EquipmentSynthesisProps) => {
  // Group by catalog category and count
  const categoryCounts = inventory.reduce((acc, item) => {
    const categoryName = item.catalog?.name || "Non catégorisé";
    if (!acc[categoryName]) {
      acc[categoryName] = {
        name: categoryName,
        total: 0,
        disponible: 0,
        prêté: 0,
        horsService: 0,
      };
    }
    acc[categoryName].total++;
    if (item.status === "disponible") {
      acc[categoryName].disponible++;
    } else if (item.status === "prêté") {
      acc[categoryName].prêté++;
    } else {
      acc[categoryName].horsService++;
    }
    return acc;
  }, {} as Record<string, { name: string; total: number; disponible: number; prêté: number; horsService: number }>);

  const categories = Object.values(categoryCounts).sort((a, b) => b.total - a.total);

  if (categories.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Aucun matériel dans l'inventaire
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {categories.map((category) => {
        const IconComponent = getIconForCategory(category.name);
        return (
          <Card key={category.name} className="bg-muted/30 border-border hover:bg-muted/50 transition-colors">
            <CardContent className="p-4 text-center">
              <div className="flex justify-center mb-3">
                <div className="rounded-full bg-primary/10 p-3">
                  <IconComponent className="h-6 w-6 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">{category.total}</p>
              <p className="text-sm font-medium text-foreground mt-1 line-clamp-2">
                {category.name}
              </p>
              <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
                <span className="text-green-600">{category.disponible} dispo</span>
                {category.prêté > 0 && (
                  <span className="text-orange-500">• {category.prêté} prêté</span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
