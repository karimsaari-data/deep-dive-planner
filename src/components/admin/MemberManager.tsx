import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Search, Crown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// Removed: Select components - no longer needed
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
