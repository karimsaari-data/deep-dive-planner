import { Shield } from "lucide-react";
import { EquipmentInventoryItem } from "@/hooks/useEquipment";

interface Encadrant {
  id: string;
  first_name: string;
  last_name: string;
}

interface EquipmentSynthesisByEncadrantProps {
  inventory: EquipmentInventoryItem[];
  encadrants: Encadrant[];
}

const ACTIVE_STATUSES = new Set(["disponible", "prêté"]);

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const matchesColumn = (name: string, column: string): boolean => {
  const n = name.toLowerCase();
  switch (column) {
    case "planche":
      return n.includes("planche");
    case "bouee":
      return n.includes("bouée") || n.includes("bouee");
    case "kit":
      return n.includes("kit");
    case "telephone":
      return n.includes("téléphone") || n.includes("telephone");
    default:
      return false;
  }
};

const COLUMNS = ["planche", "bouee", "kit", "telephone"] as const;
type Column = (typeof COLUMNS)[number];

const COLUMN_LABELS: Record<Column, string> = {
  planche: "Planche",
  bouee: "Bouée ronde",
  kit: "Kit oxy",
  telephone: "Téléphone",
};

interface EncadrantRow {
  id: string;
  name: string;
  counts: Record<Column | "autres", number>;
  valo: number;
}

export const EquipmentSynthesisByEncadrant = ({
  inventory,
  encadrants,
}: EquipmentSynthesisByEncadrantProps) => {
  // Seed rowMap with all encadrants (even those with no inventory)
  const rowMap = new Map<string, EncadrantRow>();
  for (const enc of encadrants) {
    rowMap.set(enc.id, {
      id: enc.id,
      name: `${enc.first_name} ${enc.last_name}`,
      counts: { planche: 0, bouee: 0, kit: 0, telephone: 0, autres: 0 },
      valo: 0,
    });
  }

  // Fill counts from inventory (active items only)
  for (const item of inventory) {
    if (!ACTIVE_STATUSES.has(item.status)) continue;
    if (!item.owner) continue;

    const ownerId = item.owner.id;
    // If owner is not in encadrants list, add them anyway
    if (!rowMap.has(ownerId)) {
      rowMap.set(ownerId, {
        id: ownerId,
        name: `${item.owner.first_name} ${item.owner.last_name}`,
        counts: { planche: 0, bouee: 0, kit: 0, telephone: 0, autres: 0 },
        valo: 0,
      });
    }

    const row = rowMap.get(ownerId)!;
    const catalogName = item.catalog?.name || "";
    const unitValue = item.catalog?.estimated_value || 0;

    row.valo += unitValue;

    let matched = false;
    for (const col of COLUMNS) {
      if (matchesColumn(catalogName, col)) {
        row.counts[col]++;
        matched = true;
        break;
      }
    }
    if (!matched) {
      row.counts.autres++;
    }
  }

  const rows = Array.from(rowMap.values()).sort((a, b) =>
    b.valo - a.valo || a.name.localeCompare(b.name, "fr")
  );

  if (rows.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Aucun matériel actif dans l'inventaire
      </div>
    );
  }

  // Totals row
  const totals = rows.reduce(
    (acc, row) => {
      for (const col of COLUMNS) acc.counts[col] += row.counts[col];
      acc.counts.autres += row.counts.autres;
      acc.valo += row.valo;
      return acc;
    },
    { counts: { planche: 0, bouee: 0, kit: 0, telephone: 0, autres: 0 }, valo: 0 }
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 pr-4 font-semibold text-foreground">
              Encadrant
            </th>
            {COLUMNS.map((col) => (
              <th
                key={col}
                className="text-center py-2 px-3 font-semibold text-foreground whitespace-nowrap"
              >
                {COLUMN_LABELS[col]}
              </th>
            ))}
            <th className="text-center py-2 px-3 font-semibold text-foreground">
              Autres
            </th>
            <th className="text-right py-2 pl-4 font-semibold text-foreground whitespace-nowrap">
              Valo totale
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-border/50 hover:bg-muted/30 transition-colors"
            >
              <td className="py-2.5 pr-4 font-medium text-foreground">
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  {row.name}
                </span>
              </td>
              {COLUMNS.map((col) => (
                <td key={col} className="text-center py-2.5 px-3">
                  {row.counts[col] > 0 ? (
                    <span className="font-medium text-foreground">
                      {row.counts[col]}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </td>
              ))}
              <td className="text-center py-2.5 px-3">
                {row.counts.autres > 0 ? (
                  <span className="font-medium text-foreground">
                    {row.counts.autres}
                  </span>
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </td>
              <td className="text-right py-2.5 pl-4 font-semibold text-primary whitespace-nowrap">
                {row.valo > 0 ? formatCurrency(row.valo) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border bg-muted/20">
            <td className="py-2.5 pr-4 font-bold text-foreground">Total</td>
            {COLUMNS.map((col) => (
              <td key={col} className="text-center py-2.5 px-3 font-bold text-foreground">
                {totals.counts[col] || "—"}
              </td>
            ))}
            <td className="text-center py-2.5 px-3 font-bold text-foreground">
              {totals.counts.autres || "—"}
            </td>
            <td className="text-right py-2.5 pl-4 font-bold text-primary whitespace-nowrap">
              {formatCurrency(totals.valo)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};
