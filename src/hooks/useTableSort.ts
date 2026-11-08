import { useCallback, useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";
export type SortValue = string | number | boolean | Date | null | undefined;
export type SortAccessors<T, K extends string> = Record<K, (item: T) => SortValue>;

const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

const isEmpty = (v: SortValue) => v === null || v === undefined || v === "";

const compareValues = (a: SortValue, b: SortValue): number => {
  if (typeof a === "boolean") a = a ? 1 : 0;
  if (typeof b === "boolean") b = b ? 1 : 0;
  if (a instanceof Date) a = a.getTime();
  if (b instanceof Date) b = b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  return collator.compare(String(a), String(b));
};

/**
 * Tri d'une liste par clic sur les entêtes de colonne.
 * Cycle : 1er clic = croissant, 2e = décroissant, 3e = retour à l'ordre d'origine.
 * Les valeurs vides sont toujours placées en fin de liste.
 * `accessors` doit être stable (défini hors du composant ou mémoïsé).
 */
export function useTableSort<T, K extends string>(
  items: T[] | undefined,
  accessors: SortAccessors<T, K>,
  initial?: { key: K; direction?: SortDirection } | null
) {
  const [sortKey, setSortKey] = useState<K | null>(initial?.key ?? null);
  const [direction, setDirection] = useState<SortDirection>(initial?.direction ?? "asc");

  const toggleSort = useCallback(
    (key: K) => {
      if (sortKey !== key) {
        setSortKey(key);
        setDirection("asc");
      } else if (direction === "asc") {
        setDirection("desc");
      } else {
        setSortKey(null);
        setDirection("asc");
      }
    },
    [sortKey, direction]
  );

  const resetSort = useCallback(() => {
    setSortKey(null);
    setDirection("asc");
  }, []);

  const sorted = useMemo(() => {
    if (!items) return items;
    if (!sortKey) return items;
    const get = accessors[sortKey];
    const factor = direction === "asc" ? 1 : -1;
    return [...items].sort((x, y) => {
      const a = get(x);
      const b = get(y);
      const aEmpty = isEmpty(a);
      const bEmpty = isEmpty(b);
      if (aEmpty || bEmpty) return aEmpty === bEmpty ? 0 : aEmpty ? 1 : -1;
      return compareValues(a, b) * factor;
    });
  }, [items, accessors, sortKey, direction]);

  return { sorted, sortKey, direction, toggleSort, resetSort };
}
