import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Search, Shield, User, Calendar, CheckCircle, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { startOfWeek, endOfWeek } from "date-fns";

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  apnea_level: string | null;
  avatar_url: string | null;
  member_status: "Membre" | "Encadrant" | null;
}

interface MemberStats {
  [userId: string]: {
    completedOutings: number;
    upcomingReservations: number;
    hasReservationThisWeek: boolean;
  };
}

type FilterType = "all" | "this_week" | "more_than_10";

const MemberManager = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("last_name", { ascending: true });

      if (error) throw error;
      return data as Profile[];
    },
  });

  // Fetch member statistics
  const { data: memberStats } = useQuery({
    queryKey: ["member-stats"],
    queryFn: async () => {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

      // Get all reservations with outing dates
      const { data: reservations, error } = await supabase
        .from("reservations")
        .select(`
          user_id,
          status,
          is_present,
          outing:outings(date_time)
        `)
        .neq("status", "annulé");

      if (error) throw error;

      const stats: MemberStats = {};

      reservations?.forEach((reservation: any) => {
        const userId = reservation.user_id;
        const outingDate = new Date(reservation.outing?.date_time);
        const isConfirmed = reservation.status === "confirmé";
        const isPast = outingDate < now;
        const isFuture = outingDate >= now;
        const isThisWeek = outingDate >= weekStart && outingDate <= weekEnd;

        if (!stats[userId]) {
          stats[userId] = {
            completedOutings: 0,
            upcomingReservations: 0,
            hasReservationThisWeek: false,
          };
        }

        // Count completed outings (past + present)
        if (isPast && reservation.is_present === true) {
          stats[userId].completedOutings++;
        }

        // Count upcoming reservations
        if (isFuture && isConfirmed) {
          stats[userId].upcomingReservations++;
        }

        // Check if has reservation this week
        if (isThisWeek && isConfirmed) {
          stats[userId].hasReservationThisWeek = true;
        }
      });

      return stats;
    },
  });

  const updateMemberStatus = useMutation({
    mutationFn: async ({
      userId,
      status,
    }: {
      userId: string;
      status: "Membre" | "Encadrant";
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ member_status: status })
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-profiles"] });
      toast.success("Statut mis à jour !");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la mise à jour");
    },
  });

  const filteredProfiles = useMemo(() => {
    let result = profiles ?? [];

    // Apply search filter
    if (searchTerm) {
      result = result.filter((profile) => {
        const fullName = `${profile.first_name} ${profile.last_name}`.toLowerCase();
        return fullName.includes(searchTerm.toLowerCase());
      });
    }

    // Apply quick filters
    if (activeFilter === "this_week" && memberStats) {
      result = result.filter((profile) => 
        memberStats[profile.id]?.hasReservationThisWeek
      );
    } else if (activeFilter === "more_than_10" && memberStats) {
      result = result.filter((profile) => 
        (memberStats[profile.id]?.completedOutings ?? 0) >= 10
      );
    }

    return result;
  }, [profiles, searchTerm, activeFilter, memberStats]);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Gestion des membres
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un membre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Quick Filters */}
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="flex items-center gap-1 text-muted-foreground text-sm mr-2">
            <Filter className="h-4 w-4" />
            Filtrer:
          </div>
          <Button
            variant={activeFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("all")}
          >
            Tous
          </Button>
          <Button
            variant={activeFilter === "this_week" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("this_week")}
          >
            Inscrits cette semaine
          </Button>
          <Button
            variant={activeFilter === "more_than_10" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("more_than_10")}
          >
            +10 sorties
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredProfiles?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucun membre trouvé
          </p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {filteredProfiles?.map((profile) => {
              const initials = `${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}`;
              const stats = memberStats?.[profile.id];
              const completedOutings = stats?.completedOutings ?? 0;
              const upcomingReservations = stats?.upcomingReservations ?? 0;

              return (
                <div
                  key={profile.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3 gap-2"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={profile.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">
                        {profile.first_name} {profile.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {profile.apnea_level && (
                          <Badge variant="outline" className="text-xs">
                            {profile.apnea_level}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {completedOutings} réalisées
                        </Badge>
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Calendar className="h-3 w-3" />
                          {upcomingReservations} à venir
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Select
                    value={profile.member_status ?? "Membre"}
                    onValueChange={(value) =>
                      updateMemberStatus.mutate({
                        userId: profile.id,
                        status: value as "Membre" | "Encadrant",
                      })
                    }
                  >
                    <SelectTrigger className="w-[130px] shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Membre">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          Membre
                        </div>
                      </SelectItem>
                      <SelectItem value="Encadrant">
                        <div className="flex items-center gap-2">
                          <Shield className="h-3 w-3" />
                          Encadrant
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MemberManager;
