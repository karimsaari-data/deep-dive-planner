import { useCallback, useMemo, useState } from "react";
import { Loader2, BellRing, Copy, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { useTableSort } from "@/hooks/useTableSort";
import { useTrombinoscope, TrombiMember } from "@/hooks/useTrombinoscope";
import { useClubMembersDirectory } from "@/hooks/useClubMembersDirectory";
import { formatFirstName, formatLastName } from "@/lib/formatName";
import { downloadXlsx, XlsxSheet } from "@/lib/exportXlsx";
import ContactDialog from "@/components/participants/ContactDialog";

type RelanceListKey = "no-license" | "no-lycra" | "lycra-sizes" | "no-photo" | "no-account" | "inactive";

const RELANCE_LISTS: { key: RelanceListKey; label: string }[] = [
  { key: "no-license", label: "Absence de licence (non uploadée ou expirée)" },
  { key: "no-lycra", label: "Taille lycra non saisie" },
  { key: "lycra-sizes", label: "Tailles lycra (liste de commande)" },
  { key: "no-photo", label: "Absence de photo" },
  { key: "no-account", label: "Absence de compte app" },
  { key: "inactive", label: "Adhérents inactifs (0 sortie cette année)" },
];

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL", "5XL"];
const sizeRank = (size: string) => {
  const i = SIZE_ORDER.indexOf(size.toUpperCase());
  return i === -1 ? SIZE_ORDER.length : i;
};
const GENDER_GROUPS = ["Homme", "Femme", "Autre / non renseigné"] as const;
const genderGroup = (g: string | null | undefined) =>
  g === "Homme" || g === "Femme" ? g : "Autre / non renseigné";

const RelanceManager = () => {
  const { data: trombi, isLoading: trombiLoading } = useTrombinoscope();
  const { members: directory, isLoading: directoryLoading, isEmailRegistered } = useClubMembersDirectory();
  const [listKey, setListKey] = useState<RelanceListKey>("no-license");
  const [selectedMember, setSelectedMember] = useState<TrombiMember | null>(null);

  // Adhérents de la saison en cours (trombinoscope = source de la saison courante)
  const allMembers = useMemo(() => {
    if (!trombi) return [];
    const byId = new Map<string, TrombiMember>();
    [...trombi.bureau, ...trombi.encadrants, ...trombi.membres].forEach((m) => byId.set(m.id, m));
    return [...byId.values()].sort(
      (a, b) =>
        a.first_name.localeCompare(b.first_name, "fr", { sensitivity: "base" }) ||
        a.last_name.localeCompare(b.last_name, "fr", { sensitivity: "base" })
    );
  }, [trombi]);

  const lycraById = useMemo(
    () => new Map((directory ?? []).map((m) => [m.id, m.lycra_size])),
    [directory]
  );
  const genderById = useMemo(
    () => new Map((directory ?? []).map((m) => [m.id, genderGroup(m.gender)])),
    [directory]
  );

  const hasAccount = useCallback(
    (m: TrombiMember) => !!m.email && isEmailRegistered(m.email),
    [isEmailRegistered]
  );

  const filtered = useMemo(() => {
    switch (listKey) {
      case "no-license":
        return allMembers.filter((m) => !m.license_ok);
      case "no-lycra":
        return allMembers.filter((m) => !lycraById.get(m.id)?.trim());
      case "lycra-sizes":
        return allMembers
          .filter((m) => !!lycraById.get(m.id)?.trim())
          .sort(
            (a, b) =>
              GENDER_GROUPS.indexOf(genderById.get(a.id) as (typeof GENDER_GROUPS)[number]) -
                GENDER_GROUPS.indexOf(genderById.get(b.id) as (typeof GENDER_GROUPS)[number]) ||
              sizeRank(lycraById.get(a.id)!.trim()) - sizeRank(lycraById.get(b.id)!.trim()) ||
              a.first_name.localeCompare(b.first_name, "fr", { sensitivity: "base" })
          );
      case "no-photo":
        return allMembers.filter((m) => !m.avatar_url);
      case "no-account":
        return allMembers.filter((m) => !hasAccount(m));
      case "inactive":
        return allMembers.filter((m) => m.outings_count === 0);
    }
  }, [allMembers, lycraById, genderById, listKey, hasAccount]);

  const isLycraList = listKey === "lycra-sizes";
  const sizeOf = (id: string) => lycraById.get(id)?.trim() ?? "";

  // Tri par clic sur entête (sans clic : ordre par défaut de la liste)
  const sortAccessors = useMemo(
    () => ({
      first_name: (m: TrombiMember) => m.first_name,
      last_name: (m: TrombiMember) => m.last_name,
      gender: (m: TrombiMember) =>
        GENDER_GROUPS.indexOf(genderById.get(m.id) as (typeof GENDER_GROUPS)[number]),
      size: (m: TrombiMember) => {
        const s = lycraById.get(m.id)?.trim();
        return s ? sizeRank(s) : null;
      },
      account: (m: TrombiMember) => hasAccount(m),
    }),
    [genderById, lycraById, hasAccount]
  );
  const {
    sorted: rows,
    sortKey,
    direction,
    toggleSort,
    resetSort,
  } = useTableSort(filtered, sortAccessors);
  const sortProps = { activeKey: sortKey, direction, onSort: toggleSort };
  const showAccountColumn = listKey !== "no-account";

  // Récapitulatif commande : genre -> taille -> quantité
  const lycraSummary = useMemo(() => {
    if (listKey !== "lycra-sizes") return [];
    return GENDER_GROUPS.map((g) => {
      const counts = new Map<string, number>();
      filtered.forEach((m) => {
        if (genderById.get(m.id) !== g) return;
        const size = (lycraById.get(m.id) ?? "").trim().toUpperCase();
        counts.set(size, (counts.get(size) ?? 0) + 1);
      });
      const sizes = [...counts.entries()].sort((a, b) => sizeRank(a[0]) - sizeRank(b[0]));
      return { gender: g, sizes, total: sizes.reduce((n, [, c]) => n + c, 0) };
    }).filter((g) => g.total > 0);
  }, [filtered, genderById, lycraById, listKey]);

  const handleCopy = async () => {
    const nameOf = (m: TrombiMember) =>
      `${formatFirstName(m.first_name)} ${formatLastName(m.last_name)}${
        listKey !== "no-account" && !hasAccount(m) ? " (sans compte)" : ""
      }`;
    const text = isLycraList
      ? [
          "RÉCAPITULATIF",
          ...lycraSummary.map(
            (g) => `${g.gender} (${g.total}) : ${g.sizes.map(([s, c]) => `${s} x${c}`).join(", ")}`
          ),
          `TOTAL : ${filtered.length}`,
          ...lycraSummary.flatMap((g) => [
            "",
            `${g.gender.toUpperCase()}`,
            ...(rows ?? [])
              .filter((m) => genderById.get(m.id) === g.gender)
              .map((m) => `• ${nameOf(m)} : ${sizeOf(m.id)}`),
          ]),
        ].join("\n")
      : (rows ?? []).map((m) => `• ${nameOf(m)}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${filtered.length} nom${filtered.length > 1 ? "s" : ""} copié${filtered.length > 1 ? "s" : ""}`);
    } catch {
      toast.error("Copie impossible");
    }
  };

  const handleExport = async () => {
    const list = rows ?? [];
    const base = (m: TrombiMember) => [
      formatFirstName(m.first_name),
      formatLastName(m.last_name),
      m.email ?? "",
      m.phone ?? "",
      hasAccount(m) ? "Oui" : "Non",
    ];
    const columns = [
      { header: "Prénom", width: 18 },
      { header: "Nom", width: 22 },
      { header: "Email", width: 32 },
      { header: "Téléphone", width: 16 },
      { header: "Compte app", width: 12 },
    ];
    const label = RELANCE_LISTS.find((l) => l.key === listKey)?.label ?? "Relances";
    const sheets: XlsxSheet[] = [
      {
        name: "Liste",
        columns: isLycraList
          ? [...columns, { header: "Genre", width: 20 }, { header: "Taille", width: 10 }]
          : columns,
        rows: list.map((m) =>
          isLycraList ? [...base(m), genderById.get(m.id) ?? "", sizeOf(m.id)] : base(m)
        ),
      },
    ];
    if (isLycraList) {
      sheets.push({
        name: "Récapitulatif",
        columns: [{ header: "Genre", width: 24 }, { header: "Taille", width: 10 }, { header: "Quantité", width: 10 }],
        rows: lycraSummary.flatMap((g) => g.sizes.map(([size, count]) => [g.gender, size, count])),
      });
    }
    try {
      const date = new Date().toISOString().slice(0, 10);
      await downloadXlsx(`relances-${listKey}-${date}.xlsx`, sheets);
      toast.success(`${list.length} ligne${list.length > 1 ? "s" : ""} exportée${list.length > 1 ? "s" : ""} (${label})`);
    } catch {
      toast.error("Export impossible");
    }
  };

  if (trombiLoading || directoryLoading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-primary" />
          Relances
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select
          value={listKey}
          onValueChange={(v) => {
            setListKey(v as RelanceListKey);
            resetSort();
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RELANCE_LISTS.map((l) => (
              <SelectItem key={l.key} value={l.key}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{filtered.length}</Badge>
            <span>
              {isLycraList
                ? `membre${filtered.length > 1 ? "s" : ""} avec taille`
                : `membre${filtered.length > 1 ? "s" : ""} à relancer`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Exporter Excel
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleCopy} disabled={filtered.length === 0}>
              <Copy className="mr-2 h-4 w-4" />
              Copier la liste
            </Button>
          </div>
        </div>

        {isLycraList && lycraSummary.length > 0 && (
          <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
            {lycraSummary.map((g) => (
              <div key={g.gender} className="flex flex-wrap items-center gap-2">
                <span className="font-medium">
                  {g.gender} ({g.total})
                </span>
                {g.sizes.map(([size, count]) => (
                  <Badge key={size} variant="secondary">
                    {size} × {count}
                  </Badge>
                ))}
              </div>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">Aucun membre à relancer.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead sortKey="first_name" {...sortProps}>Prénom</SortableTableHead>
                  <SortableTableHead sortKey="last_name" {...sortProps}>Nom</SortableTableHead>
                  {isLycraList && (
                    <>
                      <SortableTableHead sortKey="gender" {...sortProps}>Genre</SortableTableHead>
                      <SortableTableHead sortKey="size" {...sortProps}>Taille</SortableTableHead>
                    </>
                  )}
                  {showAccountColumn && (
                    <SortableTableHead sortKey="account" {...sortProps}>Compte</SortableTableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows ?? []).map((m) => (
                  <TableRow
                    key={m.id}
                    tabIndex={0}
                    className="cursor-pointer"
                    onClick={() => setSelectedMember(m)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedMember(m);
                      }
                    }}
                  >
                    <TableCell className="font-medium">{formatFirstName(m.first_name)}</TableCell>
                    <TableCell>{formatLastName(m.last_name)}</TableCell>
                    {isLycraList && (
                      <>
                        <TableCell className="text-xs text-muted-foreground">{genderById.get(m.id)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{sizeOf(m.id)}</Badge>
                        </TableCell>
                      </>
                    )}
                    {showAccountColumn && (
                      <TableCell>
                        {!hasAccount(m) && (
                          <Badge variant="destructive" className="whitespace-nowrap">Sans compte</Badge>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <ContactDialog member={selectedMember} onClose={() => setSelectedMember(null)} showLicense />
    </Card>
  );
};

export default RelanceManager;
