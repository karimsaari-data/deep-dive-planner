import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, MapPin, Calendar, Users, Navigation, Clock, XCircle, Car, UserCheck, AlertTriangle, CloudRain } from "lucide-react";
import Layout from "@/components/layout/Layout";
import MarineWeather from "@/components/weather/MarineWeather";
import EditOutingDialog from "@/components/outings/EditOutingDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useOuting, useUpdateReservationPresence, useUpdateSessionReport, useCancelOuting } from "@/hooks/useOutings";
import { cn } from "@/lib/utils";

const OutingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isOrganizer, isAdmin, loading: roleLoading } = useUserRole();
  const { data: outing, isLoading } = useOuting(id ?? "");
  const updatePresence = useUpdateReservationPresence();
  const updateSessionReport = useUpdateSessionReport();
  const cancelOuting = useCancelOuting();
  const [sessionReport, setSessionReport] = useState("");
  const [cancelReason, setCancelReason] = useState("Météo défavorable");

  useEffect(() => {
    if (outing?.session_report) {
      setSessionReport(outing.session_report);
    }
  }, [outing?.session_report]);

  useEffect(() => {
    if (!authLoading && !roleLoading && !isOrganizer && !isAdmin) {
      navigate("/");
    }
  }, [authLoading, roleLoading, isOrganizer, isAdmin, navigate]);

  if (authLoading || roleLoading || isLoading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!outing) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-muted-foreground">Sortie non trouvée</p>
        </div>
      </Layout>
    );
  }

  const confirmedReservations = outing.reservations?.filter(r => r.status === "confirmé") ?? [];
  const waitlistedReservations = outing.reservations?.filter(r => r.status === "en_attente") ?? [];
  const cancelledReservations = outing.reservations?.filter(r => r.status === "annulé") ?? [];

  const outingDate = new Date(outing.date_time);
  const now = new Date();
  const isPast = outingDate < now;
  
  // Attendance module available 1 hour before start time
  const oneHourBefore = new Date(outingDate.getTime() - 60 * 60 * 1000);
  const canMarkAttendance = now >= oneHourBefore;
  
  const mapsUrl = outing.location_details?.maps_url;
  const hasActiveReservations = confirmedReservations.length > 0 || waitlistedReservations.length > 0;
  
  // Check if user is the organizer of this specific outing OR is admin
  const isOutingOrganizer = user?.id === outing.organizer_id;
  const canEditPresenceAndReport = isOutingOrganizer || isAdmin;
  // Only the organizer of the outing or admin can cancel it
  const canCancelOuting = isOutingOrganizer || isAdmin;
  const handleSaveReport = () => {
    updateSessionReport.mutate({ outingId: outing.id, sessionReport });
  };

  const handleCancelOuting = () => {
    cancelOuting.mutate({ outingId: outing.id, reason: cancelReason });
  };

  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="secondary">{outing.outing_type}</Badge>
              {!isPast && canCancelOuting && (
                <EditOutingDialog outing={outing} />
              )}
              {!isPast && hasActiveReservations && canCancelOuting && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-2">
                      <CloudRain className="h-4 w-4" />
                      Annuler la sortie
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Annuler cette sortie ?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Tous les inscrits ({confirmedReservations.length + waitlistedReservations.length} personnes) seront automatiquement notifiés par email.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                      <Label htmlFor="cancelReason">Motif d'annulation</Label>
                      <Input
                        id="cancelReason"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Météo défavorable, autre..."
                        className="mt-2"
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Retour</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCancelOuting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={cancelOuting.isPending}
                      >
                        {cancelOuting.isPending ? "Annulation..." : "Confirmer l'annulation"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <h1 className="text-3xl font-bold text-foreground">{outing.title}</h1>
            <div className="mt-4 flex flex-wrap gap-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {format(new Date(outing.date_time), "EEEE d MMMM yyyy", { locale: fr })}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                {format(new Date(outing.date_time), "HH'h'mm", { locale: fr })}
                {outing.end_date && <> → {format(new Date(outing.end_date), "HH'h'mm", { locale: fr })}</>}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {outing.location_details?.name || outing.location}
                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    <Navigation className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Marine Weather Widget for future outings */}
          {!isPast && outing.location_details?.latitude && outing.location_details?.longitude && (
            <div className="mb-8">
              <MarineWeather
                latitude={outing.location_details.latitude}
                longitude={outing.location_details.longitude}
                dateTime={outing.date_time}
              />
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Trombinoscope */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Participants confirmés ({confirmedReservations.length}/{outing.max_participants})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {confirmedReservations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Aucun inscrit</p>
                ) : (
                  <div className="space-y-3">
                    {confirmedReservations.map((reservation) => {
                      const profile = reservation.profile;
                      const initials = profile ? `${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}` : "?";
                      
                      return (
                        <div key={reservation.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={profile?.avatar_url ?? undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">{initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">
                                {profile?.first_name} {profile?.last_name}
                              </p>
                              <div className="flex items-center gap-2">
                                {profile?.apnea_level && (
                                  <Badge variant="outline" className="text-xs">{profile.apnea_level}</Badge>
                                )}
                                {reservation.carpool_option === "driver" && (
                                  <Badge variant="secondary" className="text-xs gap-1">
                                    <Car className="h-3 w-3" /> {reservation.carpool_seats} places
                                  </Badge>
                                )}
                                {reservation.carpool_option === "passenger" && (
                                  <Badge variant="outline" className="text-xs">Cherche covoiturage</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {canMarkAttendance && canEditPresenceAndReport && (
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={reservation.is_present}
                                onCheckedChange={(checked) => 
                                  updatePresence.mutate({ reservationId: reservation.id, isPresent: !!checked })
                                }
                              />
                              <span className="text-sm text-muted-foreground">Présent</span>
                            </div>
                          )}
                          {canMarkAttendance && !canEditPresenceAndReport && (
                            <Badge variant={reservation.is_present ? "default" : "outline"} className="text-xs">
                              {reservation.is_present ? "Présent" : "Absent"}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {waitlistedReservations.length > 0 && (
                  <div className="mt-6">
                    <h4 className="mb-3 text-sm font-medium text-muted-foreground">Liste d'attente ({waitlistedReservations.length})</h4>
                    <div className="space-y-2">
                      {waitlistedReservations.map((reservation) => {
                        const profile = reservation.profile;
                        return (
                          <div key={reservation.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {profile?.first_name} {profile?.last_name}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {cancelledReservations.length > 0 && (
                  <div className="mt-6">
                    <h4 className="mb-3 text-sm font-medium text-muted-foreground">Annulations ({cancelledReservations.length})</h4>
                    <div className="space-y-2">
                      {cancelledReservations.map((reservation) => {
                        const profile = reservation.profile;
                        const isLastMinute = reservation.cancelled_at && 
                          differenceInHours(new Date(outing.date_time), new Date(reservation.cancelled_at)) < 24;
                        
                        return (
                          <div 
                            key={reservation.id} 
                            className={cn(
                              "flex items-center gap-2 text-sm",
                              isLastMinute ? "text-destructive" : "text-muted-foreground"
                            )}
                          >
                            <XCircle className="h-4 w-4" />
                            {profile?.first_name} {profile?.last_name}
                            {isLastMinute && <Badge variant="destructive" className="text-xs">-24h</Badge>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Session Report */}
            {isPast && canEditPresenceAndReport && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-primary" />
                    Compte-rendu de séance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Température de l'eau, exercices réalisés, observations..."
                    value={sessionReport}
                    onChange={(e) => setSessionReport(e.target.value)}
                    className="min-h-[200px]"
                  />
                  <Button
                    variant="ocean"
                    className="mt-4 w-full"
                    onClick={handleSaveReport}
                    disabled={updateSessionReport.isPending}
                  >
                    {updateSessionReport.isPending ? "Enregistrement..." : "Enregistrer le compte-rendu"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default OutingDetail;
