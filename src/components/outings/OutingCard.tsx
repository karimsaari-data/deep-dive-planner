import { useState } from "react";
import { format, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";
import { MapPin, Calendar, Users, User, Waves, Droplets, Building, TreePine, Navigation, Trash2, Clock } from "lucide-react";
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

const typeIcons: Record<OutingType, typeof Waves> = {
  Fosse: Building,
  Mer: Waves,
  Piscine: Droplets,
  Étang: TreePine,
  Dépollution: Trash2,
};

const typeColors: Record<OutingType, string> = {
  Fosse: "bg-ocean-deep text-foam",
  Mer: "bg-ocean-light text-foam",
  Piscine: "bg-accent text-accent-foreground",
  Étang: "bg-emerald-600 text-foam",
  Dépollution: "bg-amber-600 text-foam",
};

interface OutingCardProps {
  outing: Outing;
}

const OutingCard = ({ outing }: OutingCardProps) => {
  const { user } = useAuth();
  const createReservation = useCreateReservation();
  const cancelReservation = useCancelReservation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [carpoolOption, setCarpoolOption] = useState<CarpoolOption>("none");
  const [carpoolSeats, setCarpoolSeats] = useState(0);

  const confirmedReservations = outing.reservations?.filter(r => r.status === "confirmé") ?? [];
  const currentParticipants = confirmedReservations.length;
  const isFull = currentParticipants >= outing.max_participants;
  const userReservation = outing.reservations?.find((r) => r.user_id === user?.id && r.status !== "annulé");
  const isRegistered = !!userReservation;
  const isWaitlisted = userReservation?.status === "en_attente";
  const spotsLeft = outing.max_participants - currentParticipants;

  const Icon = typeIcons[outing.outing_type];
  const mapsUrl = outing.location_details?.maps_url;

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
      <div className={cn("h-2", typeColors[outing.outing_type])} />

      <CardContent className="p-5">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", typeColors[outing.outing_type])}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{outing.title}</h3>
              <Badge variant="secondary" className="mt-1 text-xs">
                {outing.outing_type}
              </Badge>
            </div>
          </div>
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
            <span className="flex-1">{displayLocation}</span>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Navigation className="h-3 w-3" />
                Itinéraire
              </a>
            )}
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
