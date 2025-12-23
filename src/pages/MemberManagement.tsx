import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Users, Search, Shield, User, Trash2, AlertTriangle } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const APNEA_LEVELS = [
  "AIDA 1", "AIDA 2", "AIDA 3", "AIDA 4",
  "Initiateur", "MEF1", "MEF2", "BPJEPS", "DEJEPS", "FSGT EA2"
];

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  apnea_level: string | null;
  avatar_url: string | null;
  member_status: "Membre" | "Encadrant" | null;
}

interface UserRole {
  user_id: string;
  role: "admin" | "organizer" | "member";
}

const MemberManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ["all-profiles-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("last_name", { ascending: true });

      if (error) throw error;
      return data as Profile[];
    },
    enabled: isAdmin,
  });

  const { data: userRoles } = useQuery({
    queryKey: ["all-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (error) throw error;
      return data as UserRole[];
    },
    enabled: isAdmin,
  });

  const updateProfile = useMutation({
    mutationFn: async ({
      userId,
      updates,
    }: {
      userId: string;
      updates: Partial<Profile>;
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-profiles-admin"] });
      toast.success("Profil mis à jour !");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la mise à jour");
    },
  });

  const updateUserRole = useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: "admin" | "organizer" | "member";
    }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role })
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-user-roles"] });
      toast.success("Rôle mis à jour !");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la mise à jour du rôle");
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      // Delete reservations first
      await supabase.from("reservations").delete().eq("user_id", userId);
      // Delete user role
      await supabase.from("user_roles").delete().eq("user_id", userId);
      // Delete profile
      const { error } = await supabase.from("profiles").delete().eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-profiles-admin"] });
      toast.success("Membre supprimé !");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la suppression");
    },
  });

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate("/auth");
      } else if (!isAdmin) {
        navigate("/");
      }
    }
  }, [user, isAdmin, authLoading, roleLoading, navigate]);

  if (authLoading || roleLoading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) return null;

  const filteredProfiles = profiles?.filter((profile) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      profile.first_name.toLowerCase().includes(searchLower) ||
      profile.last_name.toLowerCase().includes(searchLower) ||
      profile.email.toLowerCase().includes(searchLower)
    );
  });

  const getUserRole = (userId: string) => {
    return userRoles?.find((r) => r.user_id === userId)?.role ?? "member";
  };

  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Gestion des Membres</h1>
            <p className="text-muted-foreground">
              Gérez les profils, niveaux et statuts des membres
            </p>
          </div>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Tous les membres ({profiles?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {profilesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredProfiles?.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">
                  Aucun membre trouvé
                </p>
              ) : (
                <div className="space-y-4">
                  {filteredProfiles?.map((profile) => {
                    const initials = `${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}`;
                    const currentRole = getUserRole(profile.id);

                    return (
                      <div
                        key={profile.id}
                        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 p-4"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={profile.avatar_url ?? undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-foreground">
                              {profile.first_name} {profile.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">{profile.email}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {/* Niveau d'apnée */}
                          <Select
                            value={profile.apnea_level ?? ""}
                            onValueChange={(value) =>
                              updateProfile.mutate({
                                userId: profile.id,
                                updates: { apnea_level: value },
                              })
                            }
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="Niveau" />
                            </SelectTrigger>
                            <SelectContent>
                              {APNEA_LEVELS.map((level) => (
                                <SelectItem key={level} value={level}>
                                  {level}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Statut membre/encadrant */}
                          <Select
                            value={profile.member_status ?? "Membre"}
                            onValueChange={(value) =>
                              updateProfile.mutate({
                                userId: profile.id,
                                updates: { member_status: value as "Membre" | "Encadrant" },
                              })
                            }
                          >
                            <SelectTrigger className="w-[130px]">
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

                          {/* Rôle système */}
                          <Select
                            value={currentRole}
                            onValueChange={(value) =>
                              updateUserRole.mutate({
                                userId: profile.id,
                                role: value as "admin" | "organizer" | "member",
                              })
                            }
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">
                                <Badge variant="outline">Membre</Badge>
                              </SelectItem>
                              <SelectItem value="organizer">
                                <Badge variant="secondary">Organisateur</Badge>
                              </SelectItem>
                              <SelectItem value="admin">
                                <Badge variant="default">Admin</Badge>
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          {/* Suppression */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10"
                                disabled={profile.id === user?.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                  <AlertTriangle className="h-5 w-5 text-destructive" />
                                  Supprimer ce membre ?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action est irréversible. Le profil de{" "}
                                  <strong>{profile.first_name} {profile.last_name}</strong>{" "}
                                  et toutes ses réservations seront supprimés.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUser.mutate(profile.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
};

export default MemberManagement;
