import { useState, useEffect } from "react";
import { Clock, MapPin, Link2, MessageSquare, X, Save, Minus, Plus, Phone, Map } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Carpool, useCreateCarpool, useUpdateCarpool } from "@/hooks/useCarpools";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import CarpoolMapPicker from "./CarpoolMapPicker";

interface CarpoolFormProps {
  outingId: string;
  existingCarpool?: Carpool;
  onClose: () => void;
  destinationLat?: number;
  destinationLng?: number;
  destinationName?: string;
}

const CarpoolForm = ({ 
  outingId, 
  existingCarpool, 
  onClose,
  destinationLat,
  destinationLng,
  destinationName,
}: CarpoolFormProps) => {
  const { user } = useAuth();
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
  const [phone, setPhone] = useState("");
  const [showMap, setShowMap] = useState(false);

  // Fetch user phone from profile
  useEffect(() => {
    const fetchPhone = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", user.id)
        .single();
      
      if (data?.phone) {
        setPhone(data.phone);
      }
    };
    
    fetchPhone();
  }, [user]);

  // Update phone in profile when changed
  const handlePhoneChange = async (newPhone: string) => {
    setPhone(newPhone);
    
    if (user && newPhone) {
      await supabase
        .from("profiles")
        .update({ phone: newPhone })
        .eq("id", user.id);
    }
  };

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

  const handleMapLocationSelect = (lat: number, lng: number, address: string, link: string) => {
    setMeetingPoint(address);
    setMapsLink(link);
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
          {/* Phone number */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              Votre téléphone (visible des passagers)
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="06 12 34 56 78"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Permet aux passagers de vous joindre facilement
            </p>
          </div>

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

          {/* Available seats - Mobile friendly */}
          <div className="space-y-2">
            <Label>Places disponibles *</Label>
            <div className="flex items-center justify-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full text-lg"
                onClick={() => setAvailableSeats(Math.max(1, availableSeats - 1))}
                disabled={availableSeats <= 1}
              >
                <Minus className="h-5 w-5" />
              </Button>
              <span className="text-3xl font-bold w-12 text-center">
                {availableSeats}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full text-lg"
                onClick={() => setAvailableSeats(Math.min(8, availableSeats + 1))}
                disabled={availableSeats >= 8}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Map picker toggle */}
          {(destinationLat && destinationLng) && (
            <div className="space-y-2">
              <Button
                type="button"
                variant={showMap ? "secondary" : "outline"}
                className="w-full gap-2"
                onClick={() => setShowMap(!showMap)}
              >
                <Map className="h-4 w-4" />
                {showMap ? "Masquer la carte" : "📍 Choisir le RDV sur la carte"}
              </Button>
              
              {showMap && (
                <CarpoolMapPicker
                  destinationLat={destinationLat}
                  destinationLng={destinationLng}
                  destinationName={destinationName}
                  onLocationSelect={handleMapLocationSelect}
                />
              )}
            </div>
          )}

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
              {showMap ? "Rempli automatiquement depuis la carte" : "Collez un lien Google Maps pour faciliter le rendez-vous"}
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