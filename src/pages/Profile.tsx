import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, User, Save, Camera, MapPin, Phone, Calendar, AlertCircle, UserCircle } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileDirectory } from "@/hooks/useProfileDirectory";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// French phone regex: accepts formats like 06 12 34 56 78, 0612345678, +33612345678
const frenchPhoneRegex = /^(?:(?:\+|00)33[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}$/;

const profileSchema = z.object({
  first_name: z.string().min(2, "Le prénom doit faire au moins 2 caractères").max(50),
  last_name: z.string().min(2, "Le nom doit faire au moins 2 caractères").max(50),
  phone: z.string()
    .optional()
    .refine(
      (val) => !val || frenchPhoneRegex.test(val.replace(/\s/g, "")),
      { message: "Format invalide. Ex: 06 12 34 56 78 ou +33612345678" }
    ),
  address: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string()
    .optional()
    .refine(
      (val) => !val || frenchPhoneRegex.test(val.replace(/\s/g, "")),
      { message: "Format invalide. Ex: 06 12 34 56 78" }
    ),
});

type ProfileData = z.infer<typeof profileSchema>;

const Profile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch app profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch directory profile (club_members_directory)
  const { directoryProfile, isLoading: directoryLoading, updateDirectoryProfile } = useProfileDirectory(user?.email);

  const form = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      phone: "",
      address: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
    },
  });

  useEffect(() => {
    if (profile || directoryProfile) {
      form.reset({
        first_name: profile?.first_name ?? directoryProfile?.first_name ?? "",
        last_name: profile?.last_name ?? directoryProfile?.last_name ?? "",
        phone: directoryProfile?.phone ?? profile?.phone ?? "",
        address: directoryProfile?.address ?? "",
        emergency_contact_name: directoryProfile?.emergency_contact_name ?? "",
        emergency_contact_phone: directoryProfile?.emergency_contact_phone ?? "",
      });
    }
  }, [profile, directoryProfile, form]);

  const updateProfile = useMutation({
    mutationFn: async (data: ProfileData) => {
      if (!user) throw new Error("Non connecté");

      // Normalize phone number (remove spaces for storage)
      const normalizedPhone = data.phone?.replace(/\s/g, "") || null;

      // Update app profile (names + phone for carpool)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          phone: normalizedPhone,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Update directory profile if exists
      if (directoryProfile) {
        await updateDirectoryProfile.mutateAsync({
          phone: data.phone || null,
          address: data.address || null,
          emergency_contact_name: data.emergency_contact_name || null,
          emergency_contact_phone: data.emergency_contact_phone || null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profil mis à jour !");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la mise à jour");
    },
  });

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image doit faire moins de 2MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Photo de profil mise à jour !");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || profileLoading || directoryLoading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const initials = profile
    ? `${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}`
    : "?";

  const formatBirthDate = (date: string | null) => {
    if (!date) return "-";
    try {
      return format(new Date(date), "d MMMM yyyy", { locale: fr });
    } catch {
      return date;
    }
  };

  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto max-w-2xl px-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Mon Profil
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Avatar Section */}
              <div className="mb-6 flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>

                {/* Member Code & Status Badges */}
                <div className="flex items-center gap-2">
                  {directoryProfile?.member_id && (
                    <Badge variant="outline" className="font-mono">
                      {directoryProfile.member_id}
                    </Badge>
                  )}
                  {profile?.member_code && !directoryProfile?.member_id && (
                    <Badge variant="outline" className="font-mono">
                      {profile.member_code}
                    </Badge>
                  )}
                  {profile?.member_status && (
                    <Badge variant={profile.member_status === "Encadrant" ? "default" : "secondary"}>
                      {profile.member_status}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Read-only info from directory */}
              {directoryProfile && (
                <div className="mb-6 rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <UserCircle className="h-4 w-4" />
                    Informations du fichier adhérent
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Naissance:</span>
                      <span>{formatBirthDate(directoryProfile.birth_date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Arrivée:</span>
                      <span>{directoryProfile.joined_at || "-"}</span>
                    </div>
                    {directoryProfile.gender && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Genre:</span>
                        <span>{directoryProfile.gender}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Niveau: {directoryProfile.apnea_level || profile?.apnea_level || "-"}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ces informations sont gérées par l'administration du club.
                  </p>
                </div>
              )}

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((data) => updateProfile.mutate(data))}
                  className="space-y-4"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prénom</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Phone - always visible (for carpool feature) */}
                  <Separator />
                  <h4 className="text-sm font-medium">Mes coordonnées</h4>
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Téléphone
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="tel"
                            placeholder="06 12 34 56 78" 
                            inputMode="tel"
                          />
                        </FormControl>
                        <FormDescription>
                          Utilisé pour le covoiturage et les urgences
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {directoryProfile && (
                    <>
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              Adresse
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Adresse complète" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Separator />
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        Contact d'urgence
                      </h4>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="emergency_contact_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nom du contact</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Nom" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="emergency_contact_phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Téléphone</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="tel"
                                  placeholder="06 12 34 56 78" 
                                  inputMode="tel"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}

                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="text-sm text-muted-foreground">
                      <strong>Email :</strong> {user?.email}
                    </p>
                    {!directoryProfile && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Votre email ne figure pas encore dans le fichier adhérents. Contactez l'administration pour y être ajouté.
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="ocean"
                    className="w-full"
                    disabled={updateProfile.isPending}
                  >
                    {updateProfile.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Enregistrer
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
};

export default Profile;
