import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, History, Search, UserCheck, UserX, Users } from "lucide-react";
import { useMembershipHistory, MemberHistory } from "@/hooks/useMembershipHistory";
import { useClubMembersDirectory } from "@/hooks/useClubMembersDirectory";
import { AppAccessDot } from "@/components/admin/AppAccessDot";
import { getSeasonLabel, getLastSeasonEndDate, getCurrentSeasonYear } from "@/hooks/useMembershipYearlyStatus";
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
        const isCurrentSeason = s.season_year === getCurrentSeasonYear();
        return (
          <Badge
            key={s.season_year}
            variant="outline"
            className={cn(
              "text-[10px] whitespace-nowrap",
              isCurrentSeason ? "border-green-500 bg-green-50 text-green-700" : "border-muted-foreground/40 text-muted-foreground"
            )}
            title={isCurrentSeason ? "Saison en cours" : "Saison terminée"}
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
  onArchive?: (member: MemberHistory) => void;
  isEmailRegistered: (email: string) => boolean;
}

const HistoryTable = ({ title, icon, members, showDeparture, onArchive, isEmailRegistered }: HistoryTableProps) => (
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
              {onArchive && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-mono text-xs">{member.member_id}</TableCell>
                <TableCell className="font-medium">
                  <AppAccessDot hasAccount={isEmailRegistered(member.email)} isBanned={!!member.departure_date} />{" "}
                  {member.first_name} {member.last_name.toUpperCase()}
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
                {onArchive && (
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onArchive(member)}
                      title="Marquer comme parti"
                      className="text-destructive hover:text-destructive"
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
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
  const { archiveMember, isEmailRegistered } = useClubMembersDirectory();
  const [search, setSearch] = useState("");
  const [archiveConfirm, setArchiveConfirm] = useState<MemberHistory | null>(null);

  const active = useMemo(() => filterByQuery(data?.active || [], search), [data, search]);
  const departed = useMemo(() => filterByQuery(data?.departed || [], search), [data, search]);

  const handleArchive = async (member: MemberHistory) => {
    try {
      await archiveMember.mutateAsync({
        id: member.id,
        email: member.email,
        departureDate: getLastSeasonEndDate(),
      });
    } catch {
      // toast already shown by the mutation's onError
    }
    setArchiveConfirm(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Historique adhérents
        </CardTitle>
        <CardDescription>
          Vue consolidée multi-saisons — arrivée, départ et dossiers par saison, actifs et partis séparés, triés par ancienneté.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isLoading && (
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <div className="flex items-center gap-4 rounded-xl border border-border p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Base totale</p>
                <p className="text-2xl font-bold text-foreground">
                  {(data?.active.length || 0) + (data?.departed.length || 0)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-border p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Actifs</p>
                <p className="text-2xl font-bold text-foreground">{data?.active.length || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-border p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-500/10">
                <UserX className="h-6 w-6 text-slate-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Partis</p>
                <p className="text-2xl font-bold text-foreground">{data?.departed.length || 0}</p>
              </div>
            </div>
          </div>
        )}

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
              onArchive={setArchiveConfirm}
              isEmailRegistered={isEmailRegistered}
            />
            <HistoryTable
              title="Partis"
              icon={<UserX className="h-4 w-4 text-slate-500" />}
              members={departed}
              showDeparture={true}
              isEmailRegistered={isEmailRegistered}
            />
          </>
        )}
      </CardContent>

      <AlertDialog open={!!archiveConfirm} onOpenChange={() => setArchiveConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Marquer {archiveConfirm?.first_name} {archiveConfirm?.last_name} comme parti ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Date de départ enregistrée : {formatDate(getLastSeasonEndDate())}. Son accès à l'application sera
              coupé immédiatement s'il en a un. Sa fiche et son historique (cotisations, licences) sont conservés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => archiveConfirm && handleArchive(archiveConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={archiveMember.isPending}
            >
              {archiveMember.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Marquer comme parti
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default MembershipHistory;
