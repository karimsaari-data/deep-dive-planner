import { useMemo, useState } from "react";
import { Loader2, BellRing } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useTrombinoscope, TrombiMember } from "@/hooks/useTrombinoscope";
import { useClubMembersDirectory } from "@/hooks/useClubMembersDirectory";
import { formatFirstName, formatLastName } from "@/lib/formatName";
import ContactDialog from "@/components/participants/ContactDialog";

type RelanceListKey = "no-license" | "no-lycra" | "no-photo";

const RELANCE_LISTS: { key: RelanceListKey; label: string }[] = [
  { key: "no-license", label: "Absence de licence" },
  { key: "no-lycra", label: "Taille lycra non saisie" },
  { key: "no-photo", label: "Absence de photo" },
];

const RelanceManager = () => {
  const { data: trombi, isLoading: trombiLoading } = useTrombinoscope();
  const { members: directory, isLoading: directoryLoading } = useClubMembersDirectory();
  const [listKey, setListKey] = useState<RelanceListKey>("no-license");
  const [selectedMember, setSelectedMember] = useState<TrombiMember | null>(null);

  // Adhérents de la saison en cours (trombinoscope = source de la saison courante)
  const allMembers = useMemo(() => {
    if (!trombi) return [];
    const byId = new Map<string, TrombiMember>();
    [...trombi.bureau, ...trombi.encadrants, ...trombi.membres].forEach((m) => byId.set(m.id, m));
    return [...byId.values()].sort((a, b) => a.last_name.localeCompare(b.last_name, "fr"));
  }, [trombi]);

  const lycraById = useMemo(
    () => new Map((directory ?? []).map((m) => [m.id, m.lycra_size])),
    [directory]
  );

  const filtered = useMemo(() => {
    switch (listKey) {
      case "no-license":
        return allMembers.filter((m) => !m.license_number?.trim());
      case "no-lycra":
        return allMembers.filter((m) => !lycraById.get(m.id)?.trim());
      case "no-photo":
        return allMembers.filter((m) => !m.avatar_url);
    }
  }, [allMembers, lycraById, listKey]);

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
        <Select value={listKey} onValueChange={(v) => setListKey(v as RelanceListKey)}>
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

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">{filtered.length}</Badge>
          <span>membre{filtered.length > 1 ? "s" : ""} à relancer</span>
        </div>

        {filtered.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">Aucun membre à relancer.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {filtered.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className="w-full px-4 py-3 text-left text-sm transition-colors hover:bg-muted"
                  onClick={() => setSelectedMember(m)}
                >
                  <span className="font-medium">{formatFirstName(m.first_name)}</span>{" "}
                  {formatLastName(m.last_name)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <ContactDialog member={selectedMember} onClose={() => setSelectedMember(null)} showLicense />
    </Card>
  );
};

export default RelanceManager;
