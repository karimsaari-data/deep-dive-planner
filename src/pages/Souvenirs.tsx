import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, Loader2, Image, Users, Search } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

const Souvenirs = () => {
  const { user, loading: authLoading } = useAuth();
  const [search, setSearch] = useState("");

  const { data: pastOutings, isLoading } = useQuery({
    queryKey: ["past-outings-souvenirs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const now = new Date().toISOString();
      
      // First get the user's past reservations where they were present
      const { data: myReservations, error: resError } = await supabase
        .from("reservations")
        .select(`
          outing_id,
          outing:outings(
            id,
            title,
            outing_type,
            date_time,
            location,
            photos,
            is_deleted,
            location_details:locations(name)
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "confirmé")
        .eq("is_present", true);
      
      if (resError) throw resError;
      
      // Filter to past outings only
      const pastOutingsData = myReservations
        ?.filter(r => 
          r.outing && 
          !r.outing.is_deleted && 
          new Date(r.outing.date_time) < new Date(now)
        )
        .map(r => r.outing) ?? [];
      
      // Fetch participants for each outing using SECURITY DEFINER function
      const outingsWithParticipants = await Promise.all(
        pastOutingsData.map(async (outing: any) => {
          const { data: participants } = await supabase
            .rpc('get_outing_participants', { outing_uuid: outing.id });
          
          return {
            ...outing,
            presentParticipants: participants ?? [],
          };
        })
      );
      
      // Sort by date descending
      return outingsWithParticipants.sort((a, b) => 
        new Date(b.date_time).getTime() - new Date(a.date_time).getTime()
      );
    },
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const filteredOutings = pastOutings?.filter(outing => 
    outing.title.toLowerCase().includes(search.toLowerCase()) ||
    outing.location.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Souvenirs</h1>
            <p className="text-muted-foreground">
              Revivez les moments partagés lors de nos sorties
            </p>
          </div>

          <div className="mb-6 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une sortie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredOutings.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Image className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-center text-muted-foreground">
                  Aucune sortie passée pour le moment.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredOutings.map((outing) => (
                <Dialog key={outing.id}>
                  <DialogTrigger asChild>
                    <Card className="cursor-pointer shadow-card hover:shadow-lg transition-shadow animate-fade-in">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <Badge variant="secondary" className="mb-2">
                              {outing.outing_type}
                            </Badge>
                            <CardTitle className="text-lg">{outing.title}</CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-muted-foreground mb-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            {format(new Date(outing.date_time), "d MMMM yyyy", { locale: fr })}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            {outing.location_details?.name || outing.location}
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            {outing.presentParticipants.length} participant(s)
                          </div>
                        </div>

                        {/* Preview photos */}
                        {outing.photos && outing.photos.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            {outing.photos.slice(0, 2).map((photo: string, idx: number) => (
                              <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-muted">
                                <img
                                  src={photo}
                                  alt={`Photo ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Mini avatars */}
                        <div className="mt-4 flex -space-x-2">
                          {outing.presentParticipants.slice(0, 5).map((p: any) => {
                            const initials = `${p.first_name?.[0] ?? ""}${p.last_name?.[0] ?? ""}`;
                            return (
                              <Avatar key={p.id} className="h-8 w-8 border-2 border-background">
                                <AvatarImage src={p.avatar_url ?? undefined} />
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                            );
                          })}
                          {outing.presentParticipants.length > 5 && (
                            <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs text-muted-foreground">
                              +{outing.presentParticipants.length - 5}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Badge variant="secondary">{outing.outing_type}</Badge>
                        {outing.title}
                      </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        {format(new Date(outing.date_time), "EEEE d MMMM yyyy", { locale: fr })}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        {outing.location_details?.name || outing.location}
                      </div>
                    </div>

                    {/* Photo Gallery */}
                    {outing.photos && outing.photos.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Image className="h-4 w-4 text-primary" />
                          Photos de la sortie
                        </h4>
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
                      </div>
                    )}

                    {/* Trombinoscope */}
                    <div className="mt-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        Participants présents ({outing.presentParticipants.length})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {outing.presentParticipants.map((p: any) => {
                          const initials = `${p.first_name?.[0] ?? ""}${p.last_name?.[0] ?? ""}`;
                          const isEncadrant = p.member_status === "Encadrant";
                          return (
                            <div key={p.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2">
                              <div className="relative">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={p.avatar_url ?? undefined} />
                                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                {isEncadrant && (
                                  <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-amber-500 text-white ring-2 ring-background">
                                    <span className="text-[8px]">★</span>
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {p.first_name} {p.last_name}
                                </p>
                                {isEncadrant && (
                                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Encadrant</Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Souvenirs;
