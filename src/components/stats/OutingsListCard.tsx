import { useMemo, useState } from "react";
import { Check, ListChecks } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatFirstName, formatLastName } from "@/lib/formatName";
import type { OutingListItem } from "@/lib/outingsList";

const TYPE_BADGE_CLASS: Record<string, string> = {
  Mer: "bg-sky-100 text-sky-800 border-sky-200",
  Fosse: "bg-indigo-100 text-indigo-800 border-indigo-200",
  Piscine: "bg-cyan-100 text-cyan-800 border-cyan-200",
  Étang: "bg-teal-100 text-teal-800 border-teal-200",
  Dépollution: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const ALL_ORGANIZERS = "__all__";

const formatOrganizer = (name: string | null | undefined) => {
  if (!name) return "—";
  const [first, ...rest] = name.split(" ");
  return `${formatFirstName(first)} ${formatLastName(rest.join(" "))}`.trim();
};

// Inscrits (réservations confirmées + participants historiques) : clic = liste des noms
const RegistrantsPopover = ({ outing }: { outing: OutingListItem }) => {
  const registrants = outing.registrants ?? [];
  if (registrants.length === 0) {
    return <Badge variant="outline" className="min-w-[28px] text-muted-foreground">0</Badge>;
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`Voir les ${registrants.length} inscrits`}>
          <Badge variant="outline" className="min-w-[28px] cursor-pointer hover:bg-accent">
            {registrants.length}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="center">
        <p className="mb-2 text-sm font-semibold">
          {outing.title} · {registrants.length} inscrit{registrants.length > 1 ? "s" : ""}
        </p>
        <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
          {registrants.map((r, i) => (
            <li key={`${r.name}-${i}`} className="flex items-center justify-between gap-2">
              <span className="truncate">{r.name}</span>
              {r.present && <Check className="h-3.5 w-3.5 shrink-0 text-green-600" aria-label="Présent" />}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] text-muted-foreground">✓ = présent</p>
      </PopoverContent>
    </Popover>
  );
};

interface OutingsListCardProps {
  outings: OutingListItem[] | undefined;
  year: number;
}

const OutingsListCard = ({ outings, year }: OutingsListCardProps) => {
  const [onlyEmpty, setOnlyEmpty] = useState(false);
  const [organizer, setOrganizer] = useState<string>(ALL_ORGANIZERS);
  const total = outings?.length ?? 0;
  const emptyCount = outings?.filter((o) => o.participant_count === 0).length ?? 0;

  // Distinct encadrants with their number of outings, most active first
  const organizerOptions = useMemo(() => {
    const counts = new Map<string, number>();
    (outings ?? []).forEach((o) => {
      if (o.organizer_name) counts.set(o.organizer_name, (counts.get(o.organizer_name) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"));
  }, [outings]);

  const visible = outings?.filter(
    (o) =>
      (!onlyEmpty || o.participant_count === 0) &&
      (organizer === ALL_ORGANIZERS || o.organizer_name === organizer)
  );
  const isFiltered = onlyEmpty || organizer !== ALL_ORGANIZERS;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          Liste des sorties en {year}
          {total > 0 && (
            <Badge variant="secondary" className="ml-1">
              {isFiltered ? `${visible?.length ?? 0} / ${total}` : total}
            </Badge>
          )}
        </CardTitle>
        {total > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Select value={organizer} onValueChange={setOrganizer}>
              <SelectTrigger className="h-9 w-auto min-w-[160px] max-w-full" aria-label="Filtrer par encadrant">
                <SelectValue placeholder="Encadrant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ORGANIZERS}>Tous les encadrants</SelectItem>
                {organizerOptions.map(([name, count]) => (
                  <SelectItem key={name} value={name}>
                    {formatOrganizer(name)} ({count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant={onlyEmpty ? "default" : "outline"}
              onClick={() => setOnlyEmpty(!onlyEmpty)}
              aria-pressed={onlyEmpty}
            >
              0 participant ({emptyCount})
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!visible || visible.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {isFiltered ? "Aucune sortie pour ces filtres" : "Aucune sortie cette année"}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[110px]">Date</TableHead>
                  <TableHead className="min-w-[180px]">Nom</TableHead>
                  <TableHead className="min-w-[130px]">Encadrant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Inscrits</TableHead>
                  <TableHead className="text-center">Participants</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((outing) => {
                  const start = new Date(outing.date_time);
                  const end = outing.end_date ? new Date(outing.end_date) : null;
                  const isMultiDay = end && end.toDateString() !== start.toDateString();
                  return (
                    <TableRow key={outing.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {start.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                        {isMultiDay && (
                          <span className="text-muted-foreground">
                            {" "}→ {end!.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{outing.title}</TableCell>
                      <TableCell className="text-sm">{formatOrganizer(outing.organizer_name)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={TYPE_BADGE_CLASS[outing.outing_type] ?? ""}>
                          {outing.outing_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <RegistrantsPopover outing={outing} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="min-w-[28px]">
                          {outing.participant_count}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OutingsListCard;
