import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, MapPin, Loader2, Waves, Users, ChevronRight, Clock } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMyReservations, useCancelReservation } from "@/hooks/useOutings";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import ParticipantsList from "@/components/participants/ParticipantsList";
import { cn } from "@/lib/utils";

const Reservations = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: reservations, isLoading } = useMyReservations();
  const cancelReservation = useCancelReservation();
  const navigate = useNavigate();

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
  const upcomingReservations = reservations
    ?.filter((r) => new Date(r.outing?.date_time) >= now)
    .sort((a, b) => new Date(a.outing?.date_time).getTime() - new Date(b.outing?.date_time).getTime())
    ?? [];
  const pastReservations = reservations
    ?.filter((r) => 
      new Date(r.outing?.date_time) < now && 
      r.is_present === true &&
      !r.outing?.is_deleted
    )
    .sort((a, b) => new Date(b.outing?.date_time).getTime() - new Date(a.outing?.date_time).getTime())
    ?? [];

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
                      <Card 
                        key={reservation.id} 
                        className="shadow-card animate-fade-in cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => navigate(`/outing/${reservation.outing_id}`)}
                      >
                        <CardContent className="p-5">
                          <div className="mb-3 flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground">
                                {reservation.outing?.title}
                              </h3>
                              <div className="mt-1 flex flex-wrap items-center gap-1">
                                <Badge variant="secondary">
                                  {reservation.outing?.outing_type}
                                </Badge>
                                {reservation.status === "en_attente" && (
                                  <Badge variant="outline" className="border-amber-500 text-amber-600">
                                    Liste d'attente
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          </div>

                          <div className="space-y-2 text-sm text-muted-foreground">
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

                          {/* Participants trombinoscope */}
                          {(() => {
                            // Co-instructors always shown as encadrants regardless of profile member_status
                            const coInstructorIds = new Set(
                              (reservation.outing?.co_instructors ?? []).map((ci: any) => ci.user_id)
                            );

                            // Override member_status for participants who are co-instructors
                            const participantsWithRoles = (reservation.participants ?? []).map((p) => ({
                              ...p,
                              member_status: coInstructorIds.has(p.id) ? "Encadrant" : p.member_status,
                            }));

                            // Split confirmed vs waitlisted
                            const confirmedParticipants = participantsWithRoles.filter(
                              (p) => p.status !== "en_attente"
                            );
                            const waitlistParticipants = participantsWithRoles
                              .filter((p) => p.status === "en_attente")
                              .sort(
                                (a, b) =>
                                  new Date(a.created_at ?? 0).getTime() -
                                  new Date(b.created_at ?? 0).getTime()
                              );

                            // Add co-instructors who have no reservation (not in participants list)
                            const participantIdSet = new Set(participantsWithRoles.map((p) => p.id));
                            const additionalInstructors = (reservation.outing?.co_instructors ?? [])
                              .filter((ci: any) => ci.profile && !participantIdSet.has(ci.user_id))
                              .map((ci: any) => ({
                                id: ci.user_id,
                                first_name: ci.profile.first_name,
                                last_name: ci.profile.last_name,
                                avatar_url: ci.profile.avatar_url ?? null,
                                member_status: "Encadrant" as const,
                              }));

                            const confirmedAll = [...confirmedParticipants, ...additionalInstructors];

                            if (confirmedAll.length === 0 && waitlistParticipants.length === 0) return null;

                            return (
                              <div className="mt-4 pt-3 border-t border-border/50 space-y-4">
                                {confirmedAll.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-3">
                                      <Users className="h-4 w-4 text-primary" />
                                      <span className="text-sm font-medium text-foreground">
                                        Participants ({confirmedAll.length})
                                      </span>
                                    </div>
                                    <ParticipantsList
                                      participants={confirmedAll}
                                      maxVisible={10}
                                      size="lg"
                                      showNames
                                      organizerId={reservation.outing?.organizer_id}
                                    />
                                  </div>
                                )}

                                {waitlistParticipants.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-3">
                                      <Clock className="h-4 w-4 text-amber-600" />
                                      <span className="text-sm font-medium text-foreground">
                                        Liste d'attente ({waitlistParticipants.length})
                                      </span>
                                    </div>
                                    <div className="space-y-2">
                                      {waitlistParticipants.map((p, index) => {
                                        const isMe = p.id === user?.id;
                                        return (
                                          <div
                                            key={p.id}
                                            className={cn(
                                              "flex items-center gap-2 rounded-md px-2 py-1 text-sm",
                                              isMe
                                                ? "bg-amber-50 font-semibold text-amber-800 ring-1 ring-amber-300"
                                                : "text-muted-foreground"
                                            )}
                                          >
                                            <span
                                              className={cn(
                                                "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                                                isMe
                                                  ? "bg-amber-500 text-white"
                                                  : "bg-amber-100 text-amber-700"
                                              )}
                                            >
                                              {index + 1}
                                            </span>
                                            {p.first_name} {p.last_name}
                                            {isMe && (
                                              <span className="ml-1 text-xs font-medium text-amber-600">
                                                (vous)
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-4"
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelReservation.mutate(reservation.outing_id);
                            }}
                            disabled={cancelReservation.isPending}
                          >
                            {reservation.status === "en_attente"
                              ? "Quitter la liste d'attente"
                              : "Annuler ma réservation"}
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
