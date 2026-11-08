import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { TableHead } from "@/components/ui/table";
import type { SortDirection } from "@/hooks/useTableSort";

interface SortableTableHeadProps<K extends string> extends Omit<React.ThHTMLAttributes<HTMLTableCellElement>, "onClick"> {
  sortKey: K;
  activeKey: K | null;
  direction: SortDirection;
  onSort: (key: K) => void;
}

function SortableTableHead<K extends string>({
  sortKey,
  activeKey,
  direction,
  onSort,
  className,
  children,
  ...props
}: SortableTableHeadProps<K>) {
  const active = activeKey === sortKey;
  const Icon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;
  const centered = className?.includes("text-center");
  const right = className?.includes("text-right");

  return (
    <TableHead
      className={className}
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
      {...props}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 rounded-sm font-medium transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          centered && "justify-center",
          right && "justify-end",
          active && "text-foreground"
        )}
      >
        {children}
        <Icon className={cn("h-3 w-3 shrink-0", !active && "opacity-50")} aria-hidden="true" />
      </button>
    </TableHead>
  );
}

export { SortableTableHead };
