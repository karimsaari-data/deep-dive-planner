import { useState } from "react";
import { Clock, MapPin, Link2, MessageSquare, X, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Carpool, useCreateCarpool, useUpdateCarpool } from "@/hooks/useCarpools";

interface CarpoolFormProps {
  outingId: string;
  existingCarpool?: Carpool;
  onClose: () => void;
}

const CarpoolForm = ({ outingId, existingCarpool, onClose }: CarpoolFormProps) => {
  const isEditing = !!existingCarpool;

  const [departureTime, setDepartureTime] = useState(
    existingCarpool?.departure_time?.slice(0, 5) || ""
  );
  const [availableSeats, setAvailableSeats] = useState(
    existingCarpool?.available_seats || 3
  );
  const [meetingPoint, setMeetingPoint] = useState(
    existingCarpool?.meeting_point || ""
  );
  const [mapsLink, setMapsLink] = useState(existingCarpool?.maps_link || "");
  const [notes, setNotes] = useState(existingCarpool?.notes || "");

  const createCarpool = useCreateCarpool();
  const updateCarpool = useUpdateCarpool();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!departureTime || !meetingPoint) {
      return;
    }

    if (isEditing && existingCarpool) {
      updateCarpool.mutate(
        {
          carpoolId: existingCarpool.id,
          outingId,
          departureTime,
          availableSeats,
          meetingPoint,
          mapsLink: mapsLink || null,
          notes: notes || null,
        },
        { onSuccess: onClose }
      );
    } else {
      createCarpool.mutate(
        {
          outingId,
          departureTime,
          availableSeats,
          meetingPoint,
          mapsLink,
          notes,
        },
        { onSuccess: onClose }
      );
    }
  };

  const isPending = createCarpool.isPending || updateCarpool.isPending;

  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {isEditing ? "Modifier votre trajet" : "Configurer votre trajet"}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Departure time */}
            <div className="space-y-2">
              <Label htmlFor="departureTime" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Heure de départ *
              </Label>
              <Input
                id="departureTime"
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                required
              />
            </div>

            {/* Available seats */}
            <div className="space-y-2">
              <Label htmlFor="seats">Places disponibles *</Label>
              <Input
                id="seats"
                type="number"
                min={1}
                max={8}
                value={availableSeats}
                onChange={(e) => setAvailableSeats(parseInt(e.target.value) || 1)}
                required
              />
            </div>
          </div>

          {/* Meeting point */}
          <div className="space-y-2">
            <Label htmlFor="meetingPoint" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Lieu de rendez-vous *
            </Label>
            <Input
              id="meetingPoint"
              placeholder="Ex: Parking du supermarché, 12 rue de la Gare"
              value={meetingPoint}
              onChange={(e) => setMeetingPoint(e.target.value)}
              required
            />
          </div>

          {/* Maps link */}
          <div className="space-y-2">
            <Label htmlFor="mapsLink" className="flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              Lien Google Maps (optionnel)
            </Label>
            <Input
              id="mapsLink"
              type="url"
              placeholder="https://maps.google.com/..."
              value={mapsLink}
              onChange={(e) => setMapsLink(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Collez un lien Google Maps pour faciliter le rendez-vous
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Notes (optionnel)
            </Label>
            <Textarea
              id="notes"
              placeholder="Ex: Voiture blanche Clio, je serai devant l'entrée..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              variant="ocean"
              className="flex-1 gap-1"
              disabled={isPending || !departureTime || !meetingPoint}
            >
              <Save className="h-4 w-4" />
              {isPending ? "Enregistrement..." : isEditing ? "Mettre à jour" : "Créer"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CarpoolForm;
