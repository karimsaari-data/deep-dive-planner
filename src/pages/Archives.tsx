import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Calendar, MapPin, Loader2, Image, Users, Search, FileText, Download, Upload, Edit, Save, X } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

const Archives = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { isOrganizer, isAdmin, loading: roleLoading } = useUserRole();
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [uploadingOutingId, setUploadingOutingId] = useState<string | null>(null);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [reportDraft, setReportDraft] = useState<string>("");

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const { data: pastOutings, isLoading, refetch } = useQuery({
    queryKey: ["past-outings-archives", selectedYear],
    queryFn: async () => {
      let query = supabase
        .from("outings")
        .select(`
          id,
          title,
          outing_type,
          date_time,
          location,
          photos,
          session_report,
          is_deleted,
          is_archived,
          organizer:profiles!outings_organizer_id_fkey(id, first_name, last_name),
          location_details:locations(name),
          reservations(
            id,
            is_present,
            status,
            profile:profiles(id, first_name, last_name, email, avatar_url, apnea_level)
          )
        `)
        .eq("is_deleted", false)
        .eq("is_archived", true)
        .order("date_time", { ascending: false });

      if (selectedYear !== "all") {
        const yearStart = new Date(parseInt(selectedYear), 0, 1).toISOString();
        const yearEnd = new Date(parseInt(selectedYear), 11, 31, 23, 59, 59).toISOString();
        query = query.gte("date_time", yearStart).lte("date_time", yearEnd);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get historical participants for all outings
      const outingIds = data?.map(o => o.id) ?? [];
      const { data: historicalParticipants } = await supabase
        .from("historical_outing_participants")
        .select(`
          outing_id,
          member:club_members_directory(id, first_name, last_name, email, is_encadrant)
        `)
        .in("outing_id", outingIds);

      // Group historical participants by outing_id
      const historicalByOuting = new Map<string, any[]>();
      historicalParticipants?.forEach(hp => {
        const existing = historicalByOuting.get(hp.outing_id) ?? [];
        existing.push(hp.member);
        historicalByOuting.set(hp.outing_id, existing);
      });

      // Infer the real encadrant for historical outings (the single encadrant among participants)
      const inferredEncadrantByOuting = new Map<string, { first_name: string; last_name: string } | null>();
      historicalByOuting.forEach((members, outingId) => {
        const encadrants = members.filter((m: any) => m?.is_encadrant);
        if (encadrants.length === 1) {
          inferredEncadrantByOuting.set(outingId, encadrants[0]);
        } else {
          inferredEncadrantByOuting.set(outingId, null);
        }
      });
      
      // Process outings: all archived outings are shown
      return data?.map(outing => {
        const confirmedParticipants = outing.reservations?.filter(
          (r: any) => r.status === "confirmé"
        ) ?? [];
        const presentParticipants = outing.reservations?.filter(
          (r: any) => r.status === "confirmé" && r.is_present
        ) ?? [];
        const historicalMembers = historicalByOuting.get(outing.id) ?? [];
        
        // Historical outings have historical_outing_participants
        const isHistorical = historicalMembers.length > 0;
        
        // Get the inferred encadrant for historical outings
        const inferredEncadrant = isHistorical ? inferredEncadrantByOuting.get(outing.id) : null;
        
        // Check if organizer is already in historical members (by email match)
        const organizerId = outing.organizer?.id;
        const organizerInHistorical = isHistorical && historicalMembers.some(
          (m: any) => m.id === organizerId
        );
        
        // For historical outings, use the inferred encadrant if available
        // Otherwise fall back to the technical organizer
        const displayedOrganizer = isHistorical && inferredEncadrant
          ? { first_name: inferredEncadrant.first_name, last_name: inferredEncadrant.last_name }
          : outing.organizer;
        
        // Calculate total participants: 
        // - For historical: all members (organizer is already included as participant)
        // - For regular: present participants
        const totalParticipantCount = isHistorical 
          ? historicalMembers.length
          : presentParticipants.length;
        
        return {
          ...outing,
          confirmedParticipants,
          presentParticipants,
          historicalMembers,
          isHistorical,
          organizerInHistorical,
          totalParticipantCount,
          displayedOrganizer,
        };
      }) ?? [];
    },
    enabled: !!user && (isOrganizer || isAdmin),
  });

  const handlePhotoUpload = async (outingId: string, files: FileList) => {
    if (!files || files.length === 0) return;
    
    setUploadingOutingId(outingId);
    const uploadedUrls: string[] = [];
    
    try {
      for (const file of Array.from(files).slice(0, 4)) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${outingId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("outings_gallery")
          .upload(fileName, file);
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from("outings_gallery")
          .getPublicUrl(fileName);
          
        uploadedUrls.push(publicUrl);
      }
      
      // Get existing photos
      const { data: outing } = await supabase
        .from("outings")
        .select("photos")
        .eq("id", outingId)
        .single();
      
      const existingPhotos = outing?.photos ?? [];
      const newPhotos = [...existingPhotos, ...uploadedUrls].slice(0, 4);
      
      // Update outing with new photos
      const { error: updateError } = await supabase
        .from("outings")
        .update({ photos: newPhotos })
        .eq("id", outingId);
        
      if (updateError) throw updateError;
      
      toast.success(`${uploadedUrls.length} photo(s) ajoutée(s)`);
      refetch();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Erreur lors de l'upload: " + error.message);
    } finally {
      setUploadingOutingId(null);
    }
  };

  const exportCSV = (outing: any) => {
    const headers = ["Prénom", "Nom", "Email", "Niveau", "Présent"];
    const rows = outing.confirmedParticipants.map((r: any) => [
      r.profile?.first_name ?? "",
      r.profile?.last_name ?? "",
      r.profile?.email ?? "",
      r.profile?.apnea_level ?? "",
      r.is_present ? "Oui" : "Non",
    ]);
    
    const csvContent = [
      headers.join(";"),
      ...rows.map((row: string[]) => row.join(";")),
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${outing.title.replace(/\s+/g, "_")}_participants.csv`;
    link.click();
  };

  const updateReportMutation = useMutation({
    mutationFn: async ({ outingId, report }: { outingId: string; report: string }) => {
      const { error } = await supabase
        .from("outings")
        .update({ session_report: report })
        .eq("id", outingId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Compte-rendu enregistré");
      queryClient.invalidateQueries({ queryKey: ["past-outings-archives"] });
      setEditingReportId(null);
      setReportDraft("");
    },
    onError: (error: any) => {
      toast.error("Erreur: " + error.message);
    },
  });

  const handleEditReport = (outing: any) => {
    setEditingReportId(outing.id);
    setReportDraft(outing.session_report ?? "");
  };

  const handleSaveReport = (outingId: string) => {
    updateReportMutation.mutate({ outingId, report: reportDraft });
  };

  const handleCancelEdit = () => {
    setEditingReportId(null);
    setReportDraft("");
  };

  if (authLoading || roleLoading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user || (!isOrganizer && !isAdmin)) {
    navigate("/souvenirs");
    return null;
  }

  const filteredOutings = pastOutings?.filter(outing => 
    outing.title.toLowerCase().includes(search.toLowerCase()) ||
    outing.location.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  // For historical outings: all participants are considered present
  // For regular outings: use confirmed/present from reservations
  const totalParticipants = pastOutings?.reduce((acc, o) => acc + o.totalParticipantCount, 0) ?? 0;
  const totalConfirmed = pastOutings?.reduce((acc, o) => 
    o.isHistorical ? o.totalParticipantCount : o.confirmedParticipants.length, 0
  ) ?? 0;
  const totalPresent = pastOutings?.reduce((acc, o) => 
    o.isHistorical ? o.totalParticipantCount : o.presentParticipants.length, 0
  ) ?? 0;
  const presenceRate = totalConfirmed > 0 ? Math.round((totalPresent / totalConfirmed) * 100) : 0;

  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Archives</h1>
            <p className="text-muted-foreground">
              Historique complet des sorties avec comptes-rendus
            </p>
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une sortie..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Année" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stats summary */}
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Card className="shadow-card">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Sorties archivées</p>
                <p className="text-2xl font-bold text-foreground">{pastOutings?.length ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Participations totales</p>
                <p className="text-2xl font-bold text-foreground">{totalConfirmed}</p>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Taux de présence</p>
                <p className="text-2xl font-bold text-foreground">{presenceRate}%</p>
              </CardContent>
            </Card>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredOutings.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-center text-muted-foreground">
                  Aucune sortie archivée.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredOutings.map((outing) => (
                <Card key={outing.id} className="shadow-card animate-fade-in">
                  <CardContent className="p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge variant="secondary">{outing.outing_type}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(outing.date_time), "d MMMM yyyy", { locale: fr })}
                          </span>
                        </div>
                        <h3 className="text-xl font-semibold text-foreground">{outing.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-4 w-4 text-primary" />
                          {outing.location_details?.name || outing.location}
                          {outing.displayedOrganizer && (
                            <span className="ml-4">
                              Encadrant: {outing.displayedOrganizer.first_name} {outing.displayedOrganizer.last_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => exportCSV(outing)}>
                          <Download className="h-4 w-4 mr-2" />
                          Export CSV
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ocean" size="sm">
                              Voir détails
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Badge variant="secondary">{outing.outing_type}</Badge>
                                {outing.title}
                              </DialogTitle>
                            </DialogHeader>
                            
                            <Tabs defaultValue="participants" className="mt-4">
                              <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="participants">Participants</TabsTrigger>
                                <TabsTrigger value="photos">Photos</TabsTrigger>
                                <TabsTrigger value="report">Compte-rendu</TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="participants" className="mt-4">
                                {outing.isHistorical ? (
                                  // Historical outing: show members from club_members_directory
                                  <>
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="font-medium flex items-center gap-2">
                                        <Users className="h-4 w-4 text-primary" />
                                        Participants ({outing.totalParticipantCount})
                                      </h4>
                                      <Badge variant="outline" className="text-xs">Sortie historique</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                      {/* Show organizer first if not already in historical members */}
                                      {outing.organizer && !outing.organizerInHistorical && (
                                        <div 
                                          className="flex items-center gap-2 rounded-lg border border-primary/50 bg-primary/10 p-2"
                                        >
                                          <Avatar className="h-10 w-10">
                                            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                              {outing.organizer.first_name?.[0] ?? ""}{outing.organizer.last_name?.[0] ?? ""}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div>
                                            <p className="text-sm font-medium text-foreground">
                                              {outing.organizer.first_name} {outing.organizer.last_name}
                                            </p>
                                            <Badge variant="secondary" className="text-xs">
                                              Encadrant
                                            </Badge>
                                          </div>
                                        </div>
                                      )}
                                      {outing.historicalMembers.map((member: any) => {
                                        const initials = `${member?.first_name?.[0] ?? ""}${member?.last_name?.[0] ?? ""}`;
                                        // Use is_encadrant from club_members_directory to identify encadrants
                                        const isEncadrant = member?.is_encadrant === true;
                                        return (
                                          <div 
                                            key={member.id} 
                                            className={`flex items-center gap-2 rounded-lg border p-2 ${
                                              isEncadrant 
                                                ? "border-primary/50 bg-primary/10" 
                                                : "border-emerald-500/50 bg-emerald-500/10"
                                            }`}
                                          >
                                            <Avatar className="h-10 w-10">
                                              <AvatarFallback className={`text-sm ${
                                                isEncadrant 
                                                  ? "bg-primary text-primary-foreground" 
                                                  : "bg-primary/10 text-primary"
                                              }`}>
                                                {initials}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div>
                                              <p className="text-sm font-medium text-foreground">
                                                {member?.first_name} {member?.last_name}
                                              </p>
                                              <Badge variant={isEncadrant ? "secondary" : "default"} className="text-xs">
                                                {isEncadrant ? "Encadrant" : "Présent"}
                                              </Badge>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </>
                                ) : (
                                  // Regular outing: show reservations
                                  <>
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="font-medium flex items-center gap-2">
                                        <Users className="h-4 w-4 text-primary" />
                                        Participants ({outing.presentParticipants.length}/{outing.confirmedParticipants.length} présents)
                                      </h4>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                      {outing.confirmedParticipants.map((r: any) => {
                                        const profile = r.profile;
                                        const initials = `${profile?.first_name?.[0] ?? ""}${profile?.last_name?.[0] ?? ""}`;
                                        return (
                                          <div 
                                            key={r.id} 
                                            className={`flex items-center gap-2 rounded-lg border p-2 ${
                                              r.is_present 
                                                ? "border-emerald-500/50 bg-emerald-500/10" 
                                                : "border-border bg-muted/30 opacity-60"
                                            }`}
                                          >
                                            <Avatar className="h-10 w-10">
                                              <AvatarImage src={profile?.avatar_url ?? undefined} />
                                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                                {initials}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div>
                                              <p className="text-sm font-medium text-foreground">
                                                {profile?.first_name} {profile?.last_name}
                                              </p>
                                              <Badge 
                                                variant={r.is_present ? "default" : "outline"} 
                                                className="text-xs"
                                              >
                                                {r.is_present ? "Présent" : "Absent"}
                                              </Badge>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </>
                                )}
                              </TabsContent>
                              
                              <TabsContent value="photos" className="mt-4">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="font-medium flex items-center gap-2">
                                    <Image className="h-4 w-4 text-primary" />
                                    Galerie ({outing.photos?.length ?? 0}/4)
                                  </h4>
                                  {(outing.photos?.length ?? 0) < 4 && (
                                    <label className="cursor-pointer">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => e.target.files && handlePhotoUpload(outing.id, e.target.files)}
                                        disabled={uploadingOutingId === outing.id}
                                      />
                                      <Button variant="outline" size="sm" asChild disabled={uploadingOutingId === outing.id}>
                                        <span>
                                          <Upload className="h-4 w-4 mr-2" />
                                          {uploadingOutingId === outing.id ? "Upload..." : "Ajouter photos"}
                                        </span>
                                      </Button>
                                    </label>
                                  )}
                                </div>
                                {outing.photos && outing.photos.length > 0 ? (
                                  <div className="grid grid-cols-2 gap-3">
                                    {outing.photos.map((photo: string, idx: number) => (
                                      <div key={idx} className="aspect-video rounded-lg overflow-hidden bg-muted">
                                        <img
                                          src={photo}
                                          alt={`Photo ${idx + 1}`}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-center text-muted-foreground py-8">
                                    Aucune photo pour cette sortie
                                  </p>
                                )}
                              </TabsContent>
                              
                              <TabsContent value="report" className="mt-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-medium flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    Compte-rendu de séance
                                  </h4>
                                  {editingReportId !== outing.id && (
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => handleEditReport(outing)}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      {outing.session_report ? "Modifier" : "Rédiger"}
                                    </Button>
                                  )}
                                </div>
                                {editingReportId === outing.id ? (
                                  <div className="space-y-3">
                                    <Textarea
                                      value={reportDraft}
                                      onChange={(e) => setReportDraft(e.target.value)}
                                      placeholder="Rédigez le compte-rendu de la sortie..."
                                      rows={8}
                                      className="resize-none"
                                    />
                                    <div className="flex gap-2 justify-end">
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={handleCancelEdit}
                                      >
                                        <X className="h-4 w-4 mr-2" />
                                        Annuler
                                      </Button>
                                      <Button 
                                        variant="ocean" 
                                        size="sm" 
                                        onClick={() => handleSaveReport(outing.id)}
                                        disabled={updateReportMutation.isPending}
                                      >
                                        <Save className="h-4 w-4 mr-2" />
                                        {updateReportMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                                      </Button>
                                    </div>
                                  </div>
                                ) : outing.session_report ? (
                                  <div className="rounded-lg border border-border bg-muted/30 p-4 whitespace-pre-wrap">
                                    {outing.session_report}
                                  </div>
                                ) : (
                                  <p className="text-center text-muted-foreground py-8">
                                    Aucun compte-rendu renseigné
                                  </p>
                                )}
                              </TabsContent>
                            </Tabs>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    {/* Quick stats */}
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {outing.isHistorical 
                          ? `${outing.totalParticipantCount} présents`
                          : `${outing.presentParticipants.length}/${outing.confirmedParticipants.length} présents`
                        }
                      </span>
                      {outing.photos && outing.photos.length > 0 && (
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Image className="h-4 w-4" />
                          {outing.photos.length} photo(s)
                        </span>
                      )}
                      {outing.session_report && (
                        <Badge variant="outline" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          Compte-rendu
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Archives;
