import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Loader2,
  MapPin,
  Calendar,
  Users,
  Clock,
  Car,
  UserPlus,
  UserMinus,
  Waves,
  Minus,
  Plus,
  Shield,
  ArrowDown,
  Download,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
import {
  useOuting,
  useCreateReservation,
  useCancelReservation,
  CarpoolOption,
} from "@/hooks/useOutings";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import NavigationButton from "@/components/locations/NavigationButton";
import WeatherSummaryBanner from "@/components/weather/WeatherSummaryBanner";
import OutingWeatherCard from "@/components/weather/OutingWeatherCard";
import MarineMiniMap from "@/components/locations/MarineMiniMap";
import SatelliteMiniMap from "@/components/locations/SatelliteMiniMap";
import { Anchor, Satellite } from "lucide-react";
import { useApneaLevels, type ApneaLevel } from "@/hooks/useApneaLevels";

import CarpoolSection from "@/components/carpool/CarpoolSection";

/** Extract max depth from prerogatives string, e.g. "-40m / 80m dynamique" -> "-40m" */
const extractDepth = (prerogatives: string | null): string | null => {
  if (!prerogatives) return null;
  const match = prerogatives.match(/^(-\d+(?:\s*[àa/]\s*-?\d+)?m)/i);
  if (match) return match[1];
  // Try to find a depth pattern anywhere
  const altMatch = prerogatives.match(/(-\d+m)/);
  return altMatch ? altMatch[1] : null;
};


const OutingView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { data: outing, isLoading } = useOuting(id ?? "");

  const participantsQuery = useQuery({
    queryKey: ["outing-participants", id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-outing-participants", {
        body: { outingId: id },
      });
      if (error) throw error;
      return data as {
        organizerId: string | null;
        confirmed: any[];
        waitlist: any[];
      };
    },
    enabled: !!id && !!user,
  });

  const createReservation = useCreateReservation();
  const cancelReservation = useCancelReservation();
  const { data: apneaLevels } = useApneaLevels();

  const [carpoolOption, setCarpoolOption] = useState<CarpoolOption>("none");
  const [carpoolSeats, setCarpoolSeats] = useState(1);

  const handleCarpoolOptionChange = (value: CarpoolOption) => {
    setCarpoolOption(value);
    if (value === "driver" && carpoolSeats === 0) {
      setCarpoolSeats(1);
    }
  };

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
            <Button variant="ocean" onClick={() => navigate("/auth", { state: { from: location.pathname } })}>
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

  const organizerId = participantsQuery.data?.organizerId ?? outing.organizer_id;

  const confirmedReservations =
    (participantsQuery.data?.confirmed ??
      outing.reservations?.filter((r) => r.status === "confirmé") ??
      []) as any[];

  const waitlistedReservations =
    (participantsQuery.data?.waitlist ??
      outing.reservations?.filter((r) => r.status === "en_attente") ??
      []) as any[];
  
  const outingDate = new Date(outing.date_time);
  const now = new Date();
  const isPast = outingDate < now;
  const isFull = confirmedReservations.length >= outing.max_participants;
  
  const locationDetails = outing.location_details as any;
  const locationPhoto = locationDetails?.photo_url || null;
  const locationCoords = {
    latitude: locationDetails?.latitude,
    longitude: locationDetails?.longitude,
    mapsUrl: locationDetails?.maps_url,
  };

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

  // Build a map of apnea level code -> ApneaLevel for quick lookup
  const apneaLevelMap = new Map<string, ApneaLevel>(
    (apneaLevels || []).map(l => [l.code, l])
  );

  // Sort participants: organizer first, then instructors, then others
  const sortedConfirmed = [...confirmedReservations].sort((a, b) => {
    const aIsOrganizer = a.user_id === organizerId;
    const bIsOrganizer = b.user_id === organizerId;
    if (aIsOrganizer && !bIsOrganizer) return -1;
    if (!aIsOrganizer && bIsOrganizer) return 1;

    const aLevel = apneaLevelMap.get(a.profile?.apnea_level ?? "");
    const bLevel = apneaLevelMap.get(b.profile?.apnea_level ?? "");
    const aIsInstructor = aLevel?.is_instructor ?? false;
    const bIsInstructor = bLevel?.is_instructor ?? false;
    if (aIsInstructor && !bIsInstructor) return -1;
    if (!aIsInstructor && bIsInstructor) return 1;
    return 0;
  });

  return (
    <Layout>
      <section className="py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Hero image of the location */}
          <div className="relative mb-6 rounded-xl overflow-hidden shadow-elevated">
            <div className="h-56 md:h-72">
              <img
                src={locationPhoto || "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=1200&auto=format&fit=crop&q=60"}
                alt={outing.location_details?.name || outing.location}
                className="h-full w-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=1200&auto=format&fit=crop&q=60";
                }}
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant="secondary">{outing.outing_type}</Badge>
                {outing.is_staff_only && (
                  <Badge className="bg-amber-500 text-white">PRIVÉ STAFF</Badge>
                )}
                {isPast && <Badge variant="outline" className="bg-background/80">Terminée</Badge>}
                {isFull && !isPast && <Badge variant="destructive">Complet</Badge>}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{outing.title}</h1>
            </div>
          </div>

          {/* Info bar */}
          <Card className="shadow-card mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 text-sm">
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
                  {outing.location_id ? (
                    <Link
                      to={`/location/${outing.location_id}`}
                      className="hover:text-primary hover:underline transition-colors"
                    >
                      {outing.location_details?.name || outing.location}
                    </Link>
                  ) : (
                    <span>{outing.location_details?.name || outing.location}</span>
                  )}
                </div>
              </div>

              {/* Navigation button */}
              <div className="mt-4 flex gap-2">
                <NavigationButton
                  latitude={locationCoords.latitude}
                  longitude={locationCoords.longitude}
                  mapsUrl={locationCoords.mapsUrl}
                  variant="full"
                />
                {outing.location_id && locationDetails?.max_depth && (
                  <Badge variant="outline" className="gap-1 py-2">
                    <Waves className="h-3 w-3" />
                    Prof. max: {locationDetails.max_depth}m
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {outing.description && (
            <Card className="shadow-card mb-6">
              <CardContent className="p-6">
                <p className="whitespace-pre-wrap text-foreground">{outing.description}</p>
              </CardContent>
            </Card>
          )}

          {/* 1. Weather summary banner at top */}
          {!isPast && locationCoords.latitude && locationCoords.longitude && (
            <div className="mb-6">
              <WeatherSummaryBanner
                latitude={locationCoords.latitude}
                longitude={locationCoords.longitude}
                outingDate={outing.date_time}
              />
            </div>
          )}

          {/* 2. Registration Card */}
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
                        onValueChange={handleCarpoolOptionChange}
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
                        <div className="space-y-2 mt-3">
                          <Label>Places disponibles</Label>
                          <div className="flex items-center justify-center gap-4">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-12 w-12 rounded-full text-lg"
                              onClick={() => setCarpoolSeats(Math.max(1, carpoolSeats - 1))}
                              disabled={carpoolSeats <= 1}
                            >
                              <Minus className="h-5 w-5" />
                            </Button>
                            <span className="text-3xl font-bold w-12 text-center">
                              {carpoolSeats}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-12 w-12 rounded-full text-lg"
                              onClick={() => setCarpoolSeats(Math.min(8, carpoolSeats + 1))}
                              disabled={carpoolSeats >= 8}
                            >
                              <Plus className="h-5 w-5" />
                            </Button>
                          </div>
                          <p className="text-xs text-center text-muted-foreground">
                            Maximum 8 places
                          </p>
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

          {/* Fiche Sécurité - Available to all */}
          <Card className="shadow-card mb-6">
            <CardContent className="pt-6">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = '/files/Fiche sécurité.pdf';
                  link.download = 'Fiche_Securite_Apnee.pdf';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                <Download className="h-4 w-4" />
                Télécharger la Fiche Sécurité Apnée
              </Button>
            </CardContent>
          </Card>

          {/* 3. Participants list - enriched with instructor icons, organizer highlighted, apnea levels & depth */}
          <Card className="shadow-card mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Participants confirmés ({confirmedReservations.length}/{outing.max_participants})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sortedConfirmed.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Aucun inscrit pour le moment</p>
              ) : (
                <div className="space-y-2">
                  {sortedConfirmed.map((reservation) => {
                    const profile = reservation.profile;
                    const initials = profile ? `${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}` : "?";
                    const isOrg = reservation.user_id === organizerId;
                    const levelInfo = apneaLevelMap.get(profile?.apnea_level ?? "");
                    const isInstructor = levelInfo?.is_instructor ?? false;
                    const depth = !isInstructor ? extractDepth(levelInfo?.prerogatives ?? null) : null;

                    return (
                      <div
                        key={reservation.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 ${
                          isOrg
                            ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700"
                            : "border-border bg-muted/30"
                        }`}
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={profile?.avatar_url ?? undefined} />
                            <AvatarFallback className={`text-sm ${isOrg ? "bg-amber-200 text-amber-800" : "bg-primary/10 text-primary"}`}>
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          {isInstructor && (
                            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center shadow-sm" title="Encadrant">
                              <Shield className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground truncate">
                              {profile?.first_name} {profile?.last_name}
                            </p>
                            {isOrg && (
                              <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">Organisateur</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {profile?.apnea_level && (
                              <Badge variant={isInstructor ? "default" : "outline"} className={`text-xs ${isInstructor ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300" : ""}`}>
                                {profile.apnea_level}
                              </Badge>
                            )}
                            {depth && (
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                <ArrowDown className="h-3 w-3" />
                                {depth}
                              </span>
                            )}
                            {reservation.carpool_option === "driver" && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Car className="h-3 w-3" /> {reservation.carpool_seats}
                              </Badge>
                            )}
                            {reservation.carpool_option === "passenger" && (
                              <Badge variant="outline" className="text-xs">Cherche covoit.</Badge>
                            )}
                          </div>
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

          {/* 4. Carpool Section */}
          <CarpoolSection
            outingId={outing.id}
            userReservation={userReservation}
            isPast={isPast}
            destinationLat={locationCoords.latitude}
            destinationLng={locationCoords.longitude}
            destinationName={outing.location_details?.name}
            outingDateTime={outing.date_time}
          />

          {/* 5. Detailed weather card */}
          {!isPast && locationCoords.latitude && locationCoords.longitude && (
            <div className="mb-6">
              <OutingWeatherCard
                latitude={locationCoords.latitude}
                longitude={locationCoords.longitude}
                outingDate={outing.date_time}
              />
            </div>
          )}

          {/* 6. Maps: Bathymetry + Satellite */}
          {locationCoords.latitude && locationCoords.longitude && (
            <div className="grid gap-6 md:grid-cols-2 mb-6">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Anchor className="h-5 w-5 text-primary" />
                    Carte Marine (Bathymétrie)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-hidden rounded-b-lg">
                  <MarineMiniMap
                    latitude={locationCoords.latitude}
                    longitude={locationCoords.longitude}
                    siteName={outing.location_details?.name || outing.location}
                    siteId={outing.location_id ?? undefined}
                  />
                  <p className="text-xs text-muted-foreground text-center py-2 px-3">
                    Carte SHOM/IGN – Lignes de profondeur et sondes marines
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Satellite className="h-5 w-5 text-primary" />
                    Vue Satellite
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-hidden rounded-b-lg">
                  <SatelliteMiniMap
                    latitude={locationCoords.latitude}
                    longitude={locationCoords.longitude}
                    siteName={outing.location_details?.name || outing.location}
                    siteId={outing.location_id ?? undefined}
                  />
                  <p className="text-xs text-muted-foreground text-center py-2 px-3">
                    Vue satellite – Points d'intérêt du site
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default OutingView;
