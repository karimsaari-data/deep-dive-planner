import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, History, Search, UserCheck, UserX } from "lucide-react";
import { useMembershipHistory, MemberHistory } from "@/hooks/useMembershipHistory";
import { getSeasonLabel } from "@/hooks/useMembershipYearlyStatus";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const formatDate = (date: string | null) => {
  if (!date) return "-";
  try {
    return format(new Date(date), "d MMM yyyy", { locale: fr });
  } catch {
    return date;
  }
};

const filterByQuery = (members: MemberHistory[], query: string): MemberHistory[] => {
  if (!query) return members;
  const q = query.toLowerCase();
  return members.filter(
    (m) =>
      m.first_name.toLowerCase().includes(q) ||
      m.last_name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.member_id.toLowerCase().includes(q)
  );
};

const SeasonBadges = ({ member }: { member: MemberHistory }) => {
  if (member.seasons.length === 0) return <span className="text-muted-foreground text-xs">-</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {member.seasons.map((s) => {
        const complete = s.payment_status && s.medical_certificate_ok && s.buddies_charter_signed && s.fsgt_insurance_ok;
        return (
          <Badge
            key={s.season_year}
            variant="outline"
            className={cn(
              "text-[10px] whitespace-nowrap",
              complete ? "border-green-500 bg-green-50 text-green-700" : "border-muted-foreground/40 text-muted-foreground"
            )}
            title={complete ? "Dossier complet" : "Dossier incomplet"}
          >
            {getSeasonLabel(s.season_year)}
          </Badge>
        );
      })}
    </div>
  );
};

const lastKnownLicense = (member: MemberHistory): string | null => {
  for (let i = member.seasons.length - 1; i >= 0; i--) {
    if (member.seasons[i].license_number) return member.seasons[i].license_number;
  }
  return null;
};

interface HistoryTableProps {
  title: string;
  icon: React.ReactNode;
  members: MemberHistory[];
  showDeparture: boolean;
}

const HistoryTable = ({ title, icon, members, showDeparture }: HistoryTableProps) => (
  <div className="mb-8">
    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
      {icon}
      {title}
      <span className="text-xs font-normal text-muted-foreground">({members.length})</span>
    </h3>
    {members.length === 0 ? (
      <p className="text-sm text-muted-foreground py-4">Aucun adhérent</p>
    ) : (
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Identité</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Arrivée</TableHead>
              {showDeparture && <TableHead>Départ</TableHead>}
              <TableHead>N° licence</TableHead>
              <TableHead>Saisons</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-mono text-xs">{member.member_id}</TableCell>
                <TableCell className="font-medium">
                  {member.last_name.toUpperCase()} {member.first_name}
                </TableCell>
                <TableCell className="text-sm">{member.email}</TableCell>
                <TableCell className="text-sm">{formatDate(member.joined_at)}</TableCell>
                {showDeparture && (
                  <TableCell className="text-sm">{formatDate(member.departure_date)}</TableCell>
                )}
                <TableCell className="font-mono text-xs">{lastKnownLicense(member) || "-"}</TableCell>
                <TableCell>
                  <SeasonBadges member={member} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )}
  </div>
);

const MembershipHistory = () => {
  const { data, isLoading } = useMembershipHistory();
  const [search, setSearch] = useState("");

  const active = useMemo(() => filterByQuery(data?.active || [], search), [data, search]);
  const departed = useMemo(() => filterByQuery(data?.departed || [], search), [data, search]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Historique adhérents
        </CardTitle>
        <CardDescription>
          Vue consolidée multi-saisons — arrivée, départ et dossiers par saison, actifs et partis séparés.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un adhérent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <HistoryTable
              title="Actifs"
              icon={<UserCheck className="h-4 w-4 text-green-600" />}
              members={active}
              showDeparture={false}
            />
            <HistoryTable
              title="Partis"
              icon={<UserX className="h-4 w-4 text-destructive" />}
              members={departed}
              showDeparture={true}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MembershipHistory;
