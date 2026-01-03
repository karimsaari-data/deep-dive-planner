import { Package, LifeBuoy, Anchor, Cable, Link, CircleDot, Box, Euro } from "lucide-react";
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

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const EquipmentSynthesis = ({ inventory }: EquipmentSynthesisProps) => {
  // Group by catalog category and count + calculate valuation
  const categoryCounts = inventory.reduce((acc, item) => {
    const categoryName = item.catalog?.name || "Non catégorisé";
    const unitValue = item.catalog?.estimated_value || 0;
    
    if (!acc[categoryName]) {
      acc[categoryName] = {
        name: categoryName,
        total: 0,
        disponible: 0,
        prêté: 0,
        horsService: 0,
        valuation: 0,
        unitValue: unitValue,
      };
    }
    acc[categoryName].total++;
    acc[categoryName].valuation += unitValue;
    
    if (item.status === "disponible") {
      acc[categoryName].disponible++;
    } else if (item.status === "prêté") {
      acc[categoryName].prêté++;
    } else {
      acc[categoryName].horsService++;
    }
    return acc;
  }, {} as Record<string, { name: string; total: number; disponible: number; prêté: number; horsService: number; valuation: number; unitValue: number }>);

  const categories = Object.values(categoryCounts).sort((a, b) => b.total - a.total);
  
  // Calculate total valuation
  const totalValuation = categories.reduce((sum, cat) => sum + cat.valuation, 0);

  if (categories.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Aucun matériel dans l'inventaire
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global valuation card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Valorisation théorique du stock</p>
              <p className="text-3xl font-bold text-foreground mt-1">{formatCurrency(totalValuation)}</p>
            </div>
            <div className="rounded-full bg-primary/20 p-4">
              <Euro className="h-8 w-8 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category cards grid */}
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
                {category.valuation > 0 && (
                  <p className="text-xs text-primary font-medium mt-2">
                    Valo: {formatCurrency(category.valuation)}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
