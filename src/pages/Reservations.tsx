import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, MapPin, Loader2, Waves } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMyReservations, useCancelReservation } from "@/hooks/useOutings";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

const Reservations = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: reservations, isLoading } = useMyReservations();
  const cancelReservation = useCancelReservation();

  if (authLoading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const now = new Date();
  const upcomingReservations = reservations?.filter(
    (r) => new Date(r.outing?.date_time) >= now
  ) ?? [];
  const pastReservations = reservations?.filter(
    (r) => new Date(r.outing?.date_time) < now
  ) ?? [];

  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Mes Réservations</h1>
            <p className="text-muted-foreground">
              Gérez vos inscriptions aux sorties
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Upcoming Reservations */}
              <div>
                <h2 className="mb-4 text-xl font-semibold text-foreground">
                  À venir ({upcomingReservations.length})
                </h2>

                {upcomingReservations.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Waves className="mb-4 h-12 w-12 text-muted-foreground/50" />
                      <p className="text-center text-muted-foreground">
                        Aucune réservation à venir.<br />
                        Découvrez nos prochaines sorties !
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {upcomingReservations.map((reservation) => (
                      <Card key={reservation.id} className="shadow-card animate-fade-in">
                        <CardContent className="p-5">
                          <div className="mb-3 flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-foreground">
                                {reservation.outing?.title}
                              </h3>
                              <Badge variant="secondary" className="mt-1">
                                {reservation.outing?.outing_type}
                              </Badge>
                            </div>
                          </div>

                          <div className="mb-4 space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-primary" />
                              <span>
                                {format(
                                  new Date(reservation.outing?.date_time),
                                  "EEEE d MMMM yyyy 'à' HH'h'mm",
                                  { locale: fr }
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-primary" />
                              <span>{reservation.outing?.location}</span>
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => cancelReservation.mutate(reservation.outing_id)}
                            disabled={cancelReservation.isPending}
                          >
                            Annuler ma réservation
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Past Reservations */}
              {pastReservations.length > 0 && (
                <div>
                  <h2 className="mb-4 text-xl font-semibold text-muted-foreground">
                    Passées ({pastReservations.length})
                  </h2>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {pastReservations.map((reservation) => (
                      <Card key={reservation.id} className="opacity-60">
                        <CardContent className="p-5">
                          <h3 className="mb-2 font-semibold text-foreground">
                            {reservation.outing?.title}
                          </h3>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {format(
                                  new Date(reservation.outing?.date_time),
                                  "d MMMM yyyy",
                                  { locale: fr }
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>{reservation.outing?.location}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Reservations;
