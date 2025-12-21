import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MapPin, Calendar, Users, User, Waves, Droplets, Building, TreePine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Outing, OutingType, useCreateReservation, useCancelReservation } from "@/hooks/useOutings";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const typeIcons: Record<OutingType, typeof Waves> = {
  Fosse: Building,
  Mer: Waves,
  Piscine: Droplets,
  Étang: TreePine,
};

const typeColors: Record<OutingType, string> = {
  Fosse: "bg-ocean-deep text-foam",
  Mer: "bg-ocean-light text-foam",
  Piscine: "bg-accent text-accent-foreground",
  Étang: "bg-emerald-600 text-foam",
};

interface OutingCardProps {
  outing: Outing;
}

const OutingCard = ({ outing }: OutingCardProps) => {
  const { user } = useAuth();
  const createReservation = useCreateReservation();
  const cancelReservation = useCancelReservation();

  const currentParticipants = outing.reservations?.length ?? 0;
  const isFull = currentParticipants >= outing.max_participants;
  const isRegistered = outing.reservations?.some((r) => r.user_id === user?.id);
  const spotsLeft = outing.max_participants - currentParticipants;

  const Icon = typeIcons[outing.outing_type];

  const handleRegister = () => {
    if (!user) return;
    createReservation.mutate(outing.id);
  };

  const handleCancel = () => {
    cancelReservation.mutate(outing.id);
  };

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
              {format(new Date(outing.date_time), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
            </span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <span>{outing.location}</span>
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
            <span className={cn(
              "font-medium",
              isFull ? "text-destructive" : "text-foreground"
            )}>
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
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCancel}
              disabled={cancelReservation.isPending}
            >
              Annuler mon inscription
            </Button>
          ) : (
            <Button
              variant="ocean"
              className="w-full"
              onClick={handleRegister}
              disabled={isFull || createReservation.isPending}
            >
              {isFull ? "Complet" : "S'inscrire"}
            </Button>
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
