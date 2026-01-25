import { Clock, MapPin, ExternalLink, Users, Trash2, Edit2, Phone, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  Carpool,
  useDeleteCarpool,
  useBookCarpool,
  useCancelCarpoolBooking,
} from "@/hooks/useCarpools";

interface CarpoolCardProps {
  carpool: Carpool;
  outingId: string;
  isOwner?: boolean;
  isPassenger?: boolean;
  userBookingId?: string;
  isPast?: boolean;
  onEdit?: () => void;
}

const CarpoolCard = ({
  carpool,
  outingId,
  isOwner = false,
  isPassenger = false,
  userBookingId,
  isPast = false,
  onEdit,
}: CarpoolCardProps) => {
  const deleteCarpool = useDeleteCarpool();
  const bookCarpool = useBookCarpool();
  const cancelBooking = useCancelCarpoolBooking();

  const passengers = carpool.passengers ?? [];
  const takenSeats = passengers.length;
  const availableSeats = carpool.available_seats;
  const remainingSeats = availableSeats - takenSeats;
  const occupancyPercent = (takenSeats / availableSeats) * 100;
  const isFull = remainingSeats <= 0;
  const isBooked = !!userBookingId;

  const driverName = carpool.driver
    ? `${carpool.driver.first_name} ${carpool.driver.last_name}`
    : "Conducteur";
  const driverInitials = carpool.driver
    ? `${carpool.driver.first_name?.[0] ?? ""}${carpool.driver.last_name?.[0] ?? ""}`
    : "?";

  const handleBook = () => {
    bookCarpool.mutate({ carpoolId: carpool.id, outingId });
  };

  const handleCancelBooking = () => {
    if (userBookingId) {
      cancelBooking.mutate({ bookingId: userBookingId, outingId });
    }
  };

  const handleDelete = () => {
    deleteCarpool.mutate({ carpoolId: carpool.id, outingId });
  };

  return (
    <Card className={`border ${isOwner ? "border-primary/50 bg-primary/5" : isBooked ? "border-primary/50 bg-primary/5" : "border-border"}`}>
      <CardContent className="p-4">
        {/* Confirmation message for booked passengers */}
        {isBooked && !isOwner && (
          <Alert className="mb-4 border-primary/50 bg-primary/10">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <AlertDescription className="text-primary font-medium">
              C'est validé ! Vous partez avec {carpool.driver?.first_name} 🚗
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-start justify-between gap-3">
          {/* Driver info - Humanized with larger avatar and bold name */}
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-primary/20">
              <AvatarImage src={carpool.driver?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-base">
                {driverInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold text-foreground text-lg">
                {driverName}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                Départ à <span className="font-semibold text-foreground">{carpool.departure_time.slice(0, 5)}</span>
              </div>
            </div>
          </div>

          {/* Owner actions */}
          {isOwner && !isPast && (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={onEdit}>
                <Edit2 className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer votre trajet ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {passengers.length > 0
                        ? `${passengers.length} passager(s) seront automatiquement désinscrit(s).`
                        : "Cette action est irréversible."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground"
                    >
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {/* Contact Button - Prominent call button */}
        {carpool.driver?.phone && !isOwner && (
          <div className="mt-3">
            <a href={`tel:${carpool.driver.phone}`}>
              <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto border-primary/50 text-primary hover:bg-primary/10">
                <Phone className="h-4 w-4" />
                Appeler {carpool.driver.first_name}
              </Button>
            </a>
          </div>
        )}

        {/* Meeting point with clickable map link */}
        <div className="mt-4 flex items-center gap-2 text-sm p-3 bg-muted/50 rounded-lg">
          <MapPin className="h-5 w-5 text-primary shrink-0" />
          <span className="text-foreground flex-1">{carpool.meeting_point}</span>
          {carpool.maps_link && (
            <a
              href={carpool.maps_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors font-medium"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="text-xs">GPS</span>
            </a>
          )}
        </div>

        {/* Notes */}
        {carpool.notes && (
          <p className="mt-2 text-sm text-muted-foreground italic bg-muted/30 p-2 rounded">
            💬 {carpool.notes}
          </p>
        )}

        {/* Seats progress */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>
                {takenSeats}/{availableSeats} places
              </span>
            </div>
            <Badge variant={isFull ? "destructive" : remainingSeats === 1 ? "secondary" : "default"} className={!isFull && remainingSeats > 1 ? "bg-primary" : ""}>
              {remainingSeats > 0 ? `${remainingSeats} dispo` : "Complet"}
            </Badge>
          </div>
          <Progress value={occupancyPercent} className="h-2" />
        </div>

        {/* Passengers Avatar Group */}
        {passengers.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">Passagers inscrits :</p>
            <div className="flex items-center -space-x-2">
              {passengers.slice(0, 5).map((p) => (
                <Avatar key={p.id} className="h-8 w-8 border-2 border-background">
                  <AvatarImage src={p.passenger?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-medium">
                    {p.passenger?.first_name?.[0]}{p.passenger?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
              ))}
              {passengers.length > 5 && (
                <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                  <span className="text-xs text-muted-foreground font-medium">
                    +{passengers.length - 5}
                  </span>
                </div>
              )}
              <div className="pl-3 flex flex-wrap gap-1">
                {passengers.slice(0, 3).map((p) => (
                  <span key={p.id} className="text-xs text-muted-foreground">
                    {p.passenger?.first_name}
                  </span>
                ))}
                {passengers.length > 3 && (
                  <span className="text-xs text-muted-foreground">...</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action buttons for passengers */}
        {!isOwner && !isPast && isPassenger && (
          <div className="mt-4">
            {isBooked ? (
              <Button
                variant="outline"
                className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={handleCancelBooking}
                disabled={cancelBooking.isPending}
              >
                {cancelBooking.isPending ? "Annulation..." : "Annuler ma réservation"}
              </Button>
            ) : (
              <Button
                variant="ocean"
                className="w-full text-base py-5"
                onClick={handleBook}
                disabled={isFull || bookCarpool.isPending}
              >
                {bookCarpool.isPending
                  ? "Réservation..."
                  : isFull
                    ? "Complet"
                    : `🚗 Réserver une place avec ${carpool.driver?.first_name}`}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CarpoolCard;