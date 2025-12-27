import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, MapPin, Calendar, Users, Navigation, Clock, Car, UserPlus, UserMinus } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
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
import { useAuth } from "@/contexts/AuthContext";
import { useOuting, useCreateReservation, useCancelReservation, CarpoolOption } from "@/hooks/useOutings";
import { useState } from "react";

const OutingView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: outing, isLoading } = useOuting(id ?? "");
  const createReservation = useCreateReservation();
  const cancelReservation = useCancelReservation();
  
  const [carpoolOption, setCarpoolOption] = useState<CarpoolOption>("none");
  const [carpoolSeats, setCarpoolSeats] = useState(0);

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <section className="py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Connexion requise</h1>
            <p className="text-muted-foreground mb-6">Connectez-vous pour voir les détails de cette sortie et vous inscrire.</p>
            <Button variant="ocean" onClick={() => navigate("/auth")}>
              Se connecter
            </Button>
          </div>
        </section>
      </Layout>
    );
  }

  if (!outing) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-muted-foreground">Sortie non trouvée</p>
        </div>
      </Layout>
    );
  }

  const confirmedReservations = outing.reservations?.filter(r => r.status === "confirmé") ?? [];
  const waitlistedReservations = outing.reservations?.filter(r => r.status === "en_attente") ?? [];
  
  const outingDate = new Date(outing.date_time);
  const now = new Date();
  const isPast = outingDate < now;
  const isFull = confirmedReservations.length >= outing.max_participants;
  
  const mapsUrl = outing.location_details?.maps_url;
  
  // Check if user is already registered
  const userReservation = outing.reservations?.find(
    r => r.user_id === user.id && r.status !== "annulé"
  );
  const isRegistered = !!userReservation;

  const handleRegister = () => {
    createReservation.mutate({
      outingId: outing.id,
      carpoolOption,
      carpoolSeats: carpoolOption === "driver" ? carpoolSeats : 0,
    });
  };

  const handleCancel = () => {
    cancelReservation.mutate(outing.id);
  };

  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="secondary">{outing.outing_type}</Badge>
              {isPast && <Badge variant="outline">Terminée</Badge>}
              {isFull && !isPast && <Badge variant="destructive">Complet</Badge>}
            </div>
            <h1 className="text-3xl font-bold text-foreground">{outing.title}</h1>
            <div className="mt-4 flex flex-wrap gap-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {format(new Date(outing.date_time), "EEEE d MMMM yyyy", { locale: fr })}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                {format(new Date(outing.date_time), "HH'h'mm", { locale: fr })}
                {outing.end_date && <> → {format(new Date(outing.end_date), "HH'h'mm", { locale: fr })}</>}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {outing.location_details?.name || outing.location}
                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    <Navigation className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
            {outing.organizer && (
              <p className="mt-2 text-sm text-muted-foreground">
                Encadrant : {outing.organizer.first_name} {outing.organizer.last_name}
              </p>
            )}
          </div>

          {/* Description */}
          {outing.description && (
            <Card className="shadow-card mb-6">
              <CardContent className="p-6">
                <p className="whitespace-pre-wrap text-foreground">{outing.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Registration Card */}
          {!isPast && (
            <Card className="shadow-card mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Inscription ({confirmedReservations.length}/{outing.max_participants})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isRegistered ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <UserPlus className="h-5 w-5" />
                      <span className="font-medium">
                        {userReservation?.status === "en_attente" 
                          ? "Vous êtes sur liste d'attente" 
                          : "Vous êtes inscrit(e) à cette sortie"}
                      </span>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full gap-2">
                          <UserMinus className="h-4 w-4" />
                          Annuler mon inscription
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Annuler votre inscription ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Vous pouvez vous réinscrire plus tard si des places sont disponibles.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Retour</AlertDialogCancel>
                          <AlertDialogAction onClick={handleCancel}>
                            Confirmer l'annulation
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Carpool options */}
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        Covoiturage
                      </Label>
                      <RadioGroup 
                        value={carpoolOption} 
                        onValueChange={(v) => setCarpoolOption(v as CarpoolOption)}
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="none" id="none" />
                          <Label htmlFor="none" className="font-normal">Pas de covoiturage</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="driver" id="driver" />
                          <Label htmlFor="driver" className="font-normal">Je propose des places</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="passenger" id="passenger" />
                          <Label htmlFor="passenger" className="font-normal">Je cherche une place</Label>
                        </div>
                      </RadioGroup>
                      
                      {carpoolOption === "driver" && (
                        <div className="flex items-center gap-2 mt-2">
                          <Label htmlFor="seats">Places disponibles :</Label>
                          <Input
                            id="seats"
                            type="number"
                            min={1}
                            max={8}
                            value={carpoolSeats}
                            onChange={(e) => setCarpoolSeats(parseInt(e.target.value) || 0)}
                            className="w-20"
                          />
                        </div>
                      )}
                    </div>

                    <Button 
                      variant="ocean" 
                      className="w-full gap-2"
                      onClick={handleRegister}
                      disabled={createReservation.isPending}
                    >
                      <UserPlus className="h-4 w-4" />
                      {createReservation.isPending 
                        ? "Inscription..." 
                        : isFull 
                          ? "S'inscrire en liste d'attente" 
                          : "S'inscrire"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Participants list */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Participants inscrits
              </CardTitle>
            </CardHeader>
            <CardContent>
              {confirmedReservations.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Aucun inscrit pour le moment</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {confirmedReservations.map((reservation) => {
                    const profile = reservation.profile;
                    const initials = profile ? `${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}` : "?";
                    
                    return (
                      <div key={reservation.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile?.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {profile?.first_name}
                          </p>
                          {reservation.carpool_option === "driver" && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Car className="h-3 w-3" /> {reservation.carpool_seats}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {waitlistedReservations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-2">
                    Liste d'attente ({waitlistedReservations.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {waitlistedReservations.map((reservation) => (
                      <Badge key={reservation.id} variant="outline">
                        {reservation.profile?.first_name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
};

export default OutingView;
