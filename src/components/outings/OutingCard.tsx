import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "react-router-dom";
import { MapPin, Calendar, Users, User, Waves, Droplets, Building, TreePine, Trash2, Clock, Sun, CloudSun, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Outing, OutingType, useCreateReservation, useCancelReservation, CarpoolOption } from "@/hooks/useOutings";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import NavigationButton from "@/components/locations/NavigationButton";

// Default placeholder image
const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=800&auto=format&fit=crop&q=60";

const typeIcons: Record<OutingType, typeof Waves> = {
  Fosse: Building,
  Mer: Waves,
  Piscine: Droplets,
  Étang: TreePine,
  Dépollution: Trash2,
};

const weatherIcons: Record<OutingType, typeof Sun> = {
  Fosse: Building,
  Mer: Sun,
  Piscine: Droplets,
  Étang: CloudSun,
  Dépollution: Cloud,
};

const typeColors: Record<OutingType, string> = {
  Fosse: "bg-ocean-deep text-foam",
  Mer: "bg-ocean-light text-foam",
  Piscine: "bg-accent text-accent-foreground",
  Étang: "bg-emerald-600 text-foam",
  Dépollution: "bg-amber-600 text-foam",
};

interface OutingCardProps {
  outing: Outing & { location_details?: { photo_url?: string | null } | null };
}

const OutingCard = ({ outing }: OutingCardProps) => {
  const { user } = useAuth();
  const createReservation = useCreateReservation();
  const cancelReservation = useCancelReservation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [carpoolOption, setCarpoolOption] = useState<CarpoolOption>("none");
  const [carpoolSeats, setCarpoolSeats] = useState(0);

  // Use real confirmed count from SECURITY DEFINER function (bypasses RLS)
  const currentParticipants = outing.confirmed_count ?? 0;
  const isFull = currentParticipants >= outing.max_participants;
  const userReservation = outing.reservations?.find((r) => r.user_id === user?.id && r.status !== "annulé");
  const isRegistered = !!userReservation;
  const isWaitlisted = userReservation?.status === "en_attente";
  const spotsLeft = outing.max_participants - currentParticipants;

  const Icon = typeIcons[outing.outing_type];
  const WeatherIcon = weatherIcons[outing.outing_type];
  const locationPhoto = (outing.location_details as any)?.photo_url || null;
  const locationCoords = {
    latitude: outing.location_details?.latitude,
    longitude: outing.location_details?.longitude,
    mapsUrl: outing.location_details?.maps_url,
  };

  const handleRegister = () => {
    if (!user) return;
    createReservation.mutate(
      { outingId: outing.id, carpoolOption, carpoolSeats },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          setCarpoolOption("none");
          setCarpoolSeats(0);
        },
      }
    );
  };

  const handleCancel = () => {
    cancelReservation.mutate(outing.id);
  };

  const displayLocation = outing.location_details?.name || outing.location;

  return (
    <Card className="group overflow-hidden shadow-card transition-all duration-300 hover:shadow-elevated animate-fade-in">
      {/* Location photo header */}
      <div className="relative h-32 overflow-hidden">
        <img
          src={locationPhoto || PLACEHOLDER_IMAGE}
          alt={displayLocation}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = PLACEHOLDER_IMAGE;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
        <div className={cn("absolute top-3 left-3 flex h-10 w-10 items-center justify-center rounded-xl shadow-lg", typeColors[outing.outing_type])}>
          <Icon className="h-5 w-5" />
        </div>
        <Badge variant="secondary" className="absolute top-3 right-3 text-xs shadow-lg">
          {outing.outing_type}
        </Badge>
      </div>

      <CardContent className="p-5 -mt-6 relative">
        <div className="mb-4">
          <h3 className="font-semibold text-foreground text-lg">{outing.title}</h3>
        </div>

        {outing.description && (
          <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
            {outing.description}
          </p>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 text-primary" />
            <span>
              {format(new Date(outing.date_time), "EEEE d MMMM yyyy", { locale: fr })}
            </span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 text-primary" />
            <span>
              {format(new Date(outing.date_time), "HH'h'mm", { locale: fr })}
              {outing.end_date && (
                <> → {format(new Date(outing.end_date), "HH'h'mm", { locale: fr })}</>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            {outing.location_id ? (
              <Link 
                to={`/location/${outing.location_id}`} 
                className="flex-1 hover:text-primary hover:underline transition-colors"
              >
                {displayLocation}
              </Link>
            ) : (
              <span className="flex-1">{displayLocation}</span>
            )}
            <NavigationButton 
              latitude={locationCoords.latitude}
              longitude={locationCoords.longitude}
              mapsUrl={locationCoords.mapsUrl}
              variant="icon"
            />
          </div>

          {outing.organizer && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4 text-primary" />
              <span>
                {outing.organizer.first_name} {outing.organizer.last_name}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className={cn("font-medium", isFull ? "text-destructive" : "text-foreground")}>
              {currentParticipants}/{outing.max_participants} participants
            </span>
            {!isFull && (
              <span className="text-xs text-muted-foreground">
                ({spotsLeft} place{spotsLeft > 1 ? "s" : ""} restante{spotsLeft > 1 ? "s" : ""})
              </span>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="border-t border-border/50 bg-muted/30 p-4">
        {user ? (
          isRegistered ? (
            <div className="flex w-full flex-col gap-2">
              {isWaitlisted && (
                <Badge variant="outline" className="w-fit bg-amber-500/10 text-amber-600">
                  En liste d'attente
                </Badge>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleCancel}
                disabled={cancelReservation.isPending}
              >
                Annuler mon inscription
              </Button>
            </div>
          ) : (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ocean" className="w-full">
                  {isFull ? "Liste d'attente" : "S'inscrire"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Inscription à la sortie</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Covoiturage</Label>
                    <Select
                      value={carpoolOption}
                      onValueChange={(v) => setCarpoolOption(v as CarpoolOption)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Pas de covoiturage</SelectItem>
                        <SelectItem value="driver">Je peux véhiculer</SelectItem>
                        <SelectItem value="passenger">Je cherche une place</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {carpoolOption === "driver" && (
                    <div className="space-y-2">
                      <Label>Nombre de places disponibles</Label>
                      <Input
                        type="number"
                        min={1}
                        max={8}
                        value={carpoolSeats}
                        onChange={(e) => setCarpoolSeats(parseInt(e.target.value) || 0)}
                      />
                    </div>
                  )}

                  {isFull && (
                    <p className="text-sm text-amber-600">
                      La sortie est complète. Vous serez ajouté à la liste d'attente.
                    </p>
                  )}

                  <Button
                    variant="ocean"
                    className="w-full"
                    onClick={handleRegister}
                    disabled={createReservation.isPending}
                  >
                    {createReservation.isPending
                      ? "Inscription..."
                      : isFull
                        ? "Rejoindre la liste d'attente"
                        : "Confirmer l'inscription"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )
        ) : (
          <p className="w-full text-center text-sm text-muted-foreground">
            Connectez-vous pour vous inscrire
          </p>
        )}
      </CardFooter>
    </Card>
  );
};

export default OutingCard;
