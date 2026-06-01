import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Search, Crown, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useClubMembersDirectory } from "@/hooks/useClubMembersDirectory";
import { useMembershipYearlyStatus, getCurrentSeasonYear, getSeasonLabel } from "@/hooks/useMembershipYearlyStatus";

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
  member_code: string | null;
}

interface UserRole {
  id: string;
  user_id: string;
  role: "admin" | "organizer" | "member";
}

const MemberManager = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

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

  const { data: userRoles } = useQuery({
    queryKey: ["user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*");

      if (error) throw error;
      return data as UserRole[];
    },
  });

  // Removed: updateMemberStatus mutation - role management moved to club_members_directory

  const toggleAdminRole = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      if (isAdmin) {
        // Remove admin role
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");

        if (error) throw error;
      } else {
        // Add admin role
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "admin" });

        if (error) throw error;
      }
    },
    onSuccess: (_, { isAdmin }) => {
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      toast.success(isAdmin ? "Rôle admin retiré" : "Promu administrateur !");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la mise à jour du rôle");
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("delete-user", {
        body: { userId },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-profiles"] });
      toast.success("Compte supprimé");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la suppression");
    },
  });

  const { members: adherents } = useClubMembersDirectory();
  const currentSeason = getCurrentSeasonYear();
  const { statuses } = useMembershipYearlyStatus(currentSeason);

  // Inscription progress for the CURRENT season only: count adhérents that have a
  // membership status for the season (same denominator as the Fichier Adhérents
  // screen), then how many of them already have an app account (profile, matched by email).
  const registeredEmailSet = new Set(
    (profiles ?? []).map((p) => p.email?.toLowerCase()).filter(Boolean)
  );
  const seasonMemberIds = new Set((statuses ?? []).map((s) => s.member_id));
  const seasonAdherents = (adherents ?? []).filter((m) => seasonMemberIds.has(m.id));
  const totalAdherents = seasonAdherents.length;
  const totalComptes = profiles?.length ?? 0;
  const inscrits = seasonAdherents.filter((m) =>
    registeredEmailSet.has(m.email?.toLowerCase())
  ).length;
  const progressPct = totalAdherents > 0 ? Math.round((inscrits / totalAdherents) * 100) : 0;

  const isUserAdmin = (userId: string) => {
    return userRoles?.some((role) => role.user_id === userId && role.role === "admin");
  };

  const filteredProfiles = profiles?.filter((profile) => {
    const fullName = `${profile.first_name} ${profile.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Comptes App
        </CardTitle>
        <p className="text-sm text-muted-foreground">Gestion des utilisateurs inscrits et de leurs rôles</p>
      </CardHeader>
      <CardContent>
        {/* Avancement des inscriptions : comptes app vs fichier adhérents */}
        <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-foreground">Avancement des inscriptions — saison {getSeasonLabel(currentSeason)}</span>
            <span className="text-sm font-semibold text-primary">
              {inscrits} / {totalAdherents} adhérents
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{progressPct}% des adhérents ont créé leur compte</span>
            <span>{totalComptes} comptes app</span>
          </div>
        </div>

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

              return (
                <div
                  key={profile.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">
                        {profile.first_name} {profile.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{profile.email}</p>
                      {profile.member_code && (
                        <p className="text-xs font-semibold text-foreground mt-1">
                          {profile.member_code}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground mr-2">Admin</span>
                    <Switch
                      checked={isUserAdmin(profile.id)}
                      onCheckedChange={(checked) =>
                        toggleAdminRole.mutate({ userId: profile.id, isAdmin: !checked })
                      }
                    />
                    <Crown className={`h-4 w-4 ${isUserAdmin(profile.id) ? "text-amber-500" : "text-muted-foreground"}`} />
                    {profile.id !== currentUser?.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer ce compte ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Le compte de <strong>{profile.first_name} {profile.last_name}</strong> ({profile.email}) sera définitivement supprimé. Cette action est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteUser.mutate(profile.id)}
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
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
