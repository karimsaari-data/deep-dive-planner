import { useState } from "react";
import { Car, Plus, AlertCircle, List, MapIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { Reservation, CarpoolOption, useCancelCarpoolOffer } from "@/hooks/useOutings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useCarpools,
  useUserCarpool,
  useUserCarpoolBooking,
} from "@/hooks/useCarpools";
import CarpoolCard from "./CarpoolCard";
import CarpoolForm from "./CarpoolForm";
import CarpoolMapView from "./CarpoolMapView";

interface CarpoolSectionProps {
  outingId: string;
  userReservation?: Reservation;
  isPast: boolean;
  destinationLat?: number;
  destinationLng?: number;
  destinationName?: string;
  outingDateTime?: string;
}

type ViewMode = "list" | "map";

const CarpoolSection = ({ outingId, userReservation, isPast, destinationLat, destinationLng, destinationName, outingDateTime }: CarpoolSectionProps) => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const cancelCarpoolOffer = useCancelCarpoolOffer();
  const { data: carpools, isLoading } = useCarpools(outingId);
  const { data: userCarpool } = useUserCarpool(outingId);
  const { data: userBooking } = useUserCarpoolBooking(outingId);

  const { data: volunteerSeatsCount = 0 } = useQuery({
    queryKey: ["carpool-driver-seats", outingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("reservations")
        .select("carpool_seats")
        .eq("outing_id", outingId)
        .eq("status", "confirmé")
        .eq("carpool_option", "driver");
      return (data ?? []).reduce((sum, r) => sum + (r.carpool_seats ?? 0), 0);
    },
    enabled: !!outingId && !!user,
  });

  const isDriver = userReservation?.carpool_option === "driver";
  const isPassenger = userReservation?.carpool_option === "passenger";
  const hasCreatedCarpool = !!userCarpool;
  const hasBookedCarpool = !!userBooking;

  // Driver who said they can drive but hasn't created a carpool yet
  const showDriverPrompt = isDriver && !hasCreatedCarpool && !isPast;

  if (!user || !userReservation || userReservation.status === "annulé") {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="shadow-card mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            Covoiturage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-24 bg-muted rounded-lg" />
            <div className="h-24 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter carpools with map coords for map view
  const carpoolsWithCoords = (carpools || []).filter((c) => c.maps_link);
  const hasCarpoolsForMap = carpoolsWithCoords.length > 0;

  return (
    <Card className="shadow-card mb-6">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            Covoiturage
          </CardTitle>

          {/* View toggle - only show if there are carpools */}
          {carpools && carpools.length > 0 && (
            <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="gap-1.5 h-8 px-3"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Liste</span>
              </Button>
              <Button
                variant={viewMode === "map" ? "secondary" : "ghost"}
                size="sm"
                className="gap-1.5 h-8 px-3"
                onClick={() => setViewMode("map")}
                disabled={!hasCarpoolsForMap}
                title={!hasCarpoolsForMap ? "Aucun trajet avec coordonnées" : undefined}
              >
                <MapIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Carte</span>
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* Driver prompt - they said they can drive but haven't created a carpool */}
        {showDriverPrompt && (
          <Alert className="border-primary/50 bg-primary/10">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span>
                👋 Vous avez proposé de conduire ! Configurez votre trajet maintenant.
              </span>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="ocean"
                  size="sm"
                  className="gap-1"
                  onClick={() => setShowForm(true)}
                >
                  <Plus className="h-4 w-4" />
                  Configurer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/50 hover:bg-destructive/10"
                  onClick={() => cancelCarpoolOffer.mutate(outingId)}
                  disabled={cancelCarpoolOffer.isPending}
                >
                  {cancelCarpoolOffer.isPending ? "Annulation..." : "Annuler ma proposition"}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Form for creating/editing carpool */}
        {showForm && (
          <CarpoolForm
            outingId={outingId}
            existingCarpool={userCarpool || undefined}
            onClose={() => setShowForm(false)}
            destinationLat={destinationLat}
            destinationLng={destinationLng}
            destinationName={destinationName}
            outingDateTime={outingDateTime}
          />
        )}

        {/* User's own carpool (if driver) */}
        {hasCreatedCarpool && userCarpool && !showForm && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Votre trajet</p>
            <CarpoolCard
              carpool={userCarpool}
              outingId={outingId}
              isOwner
              onEdit={() => setShowForm(true)}
            />
          </div>
        )}

        {/* User's booking info (if passenger) */}
        {hasBookedCarpool && userBooking && (
          <Alert className="border-primary/50 bg-primary/10">
            <Car className="h-4 w-4 text-primary" />
            <AlertDescription>
              Vous avez réservé une place avec{" "}
              <strong>
                {userBooking.carpool?.driver?.first_name} {userBooking.carpool?.driver?.last_name}
              </strong>
              {" "}• Départ à {userBooking.carpool?.departure_time?.slice(0, 5)} depuis{" "}
              {userBooking.carpool?.meeting_point}
            </AlertDescription>
          </Alert>
        )}

        {/* Available carpools - List or Map view */}
        {carpools && carpools.length > 0 ? (
          viewMode === "map" && hasCarpoolsForMap ? (
            <CarpoolMapView
              carpools={carpools.filter((c) => c.driver_id !== user.id)}
              outingId={outingId}
              destinationLat={destinationLat}
              destinationLng={destinationLng}
              destinationName={destinationName}
              isPassenger={isPassenger}
              userBookingCarpoolId={userBooking?.carpool_id}
              isPast={isPast}
            />
          ) : (
            <div className="space-y-3">
              {!hasCreatedCarpool && (
                <p className="text-sm font-medium text-muted-foreground">
                  Véhicules disponibles ({carpools.length})
                </p>
              )}
              {carpools
                .filter((c) => c.driver_id !== user.id) // Don't show own carpool in the list
                .map((carpool) => (
                  <CarpoolCard
                    key={carpool.id}
                    carpool={carpool}
                    outingId={outingId}
                    isPassenger={isPassenger}
                    userBookingId={
                      userBooking?.carpool_id === carpool.id ? userBooking.id : undefined
                    }
                    isPast={isPast}
                  />
                ))}
            </div>
          )
        ) : (
          !showDriverPrompt &&
          !hasCreatedCarpool && (
            volunteerSeatsCount > 0 ? (
              <Alert className="border-amber-400/50 bg-amber-50 dark:bg-amber-950/20">
                <Car className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-300">
                  <span className="font-semibold">{volunteerSeatsCount} place{volunteerSeatsCount > 1 ? "s" : ""} proposée{volunteerSeatsCount > 1 ? "s" : ""}</span>, aucun trajet configuré pour l'instant.
                  {isDriver && !isPast && (
                    <span> Vous proposez de conduire ? <button className="underline font-medium" onClick={() => setShowForm(true)}>Configurez votre trajet.</button></span>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Aucun covoiturage proposé pour le moment
              </p>
            )
          )
        )}

        {/* Button for drivers who haven't created a carpool yet (alternative placement) */}
        {isDriver && !hasCreatedCarpool && !showForm && !showDriverPrompt && (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" />
            Proposer un trajet
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default CarpoolSection;
