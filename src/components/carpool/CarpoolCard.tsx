import { Clock, MapPin, ExternalLink, Users, Trash2, Edit2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
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
    <Card className={`border ${isOwner ? "border-primary/50 bg-primary/5" : "border-border"}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Driver info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={carpool.driver?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {driverInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-foreground">
                {carpool.driver?.first_name} {carpool.driver?.last_name}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                Départ à {carpool.departure_time.slice(0, 5)}
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

        {/* Meeting point */}
        <div className="mt-3 flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <span className="text-foreground">{carpool.meeting_point}</span>
          {carpool.maps_link && (
            <a
              href={carpool.maps_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>

        {/* Notes */}
        {carpool.notes && (
          <p className="mt-2 text-sm text-muted-foreground italic">{carpool.notes}</p>
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
            <Badge variant={isFull ? "destructive" : "secondary"}>
              {remainingSeats > 0 ? `${remainingSeats} dispo` : "Complet"}
            </Badge>
          </div>
          <Progress value={occupancyPercent} className="h-2" />
        </div>

        {/* Passengers list */}
        {passengers.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {passengers.map((p) => (
              <Badge key={p.id} variant="outline" className="text-xs">
                {p.passenger?.first_name}
              </Badge>
            ))}
          </div>
        )}

        {/* Action buttons for passengers */}
        {!isOwner && !isPast && isPassenger && (
          <div className="mt-4">
            {isBooked ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleCancelBooking}
                disabled={cancelBooking.isPending}
              >
                {cancelBooking.isPending ? "Annulation..." : "Annuler ma réservation"}
              </Button>
            ) : (
              <Button
                variant="ocean"
                className="w-full"
                onClick={handleBook}
                disabled={isFull || bookCarpool.isPending}
              >
                {bookCarpool.isPending
                  ? "Réservation..."
                  : isFull
                    ? "Complet"
                    : "Réserver une place"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CarpoolCard;
