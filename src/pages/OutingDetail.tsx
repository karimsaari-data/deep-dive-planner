import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, MapPin, Calendar, Users, Navigation, Clock, XCircle, Car, UserCheck, AlertTriangle, CloudRain, CheckCircle2, Share2, Copy, Check, Phone, Lock, FileText, Unlock, Shield, ArrowDown, Gauge } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { formatFullName } from "@/lib/formatName";

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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useOuting, useUpdateReservationPresence, useUpdateSessionReport, useCancelOuting, useArchiveOuting, useLockPOSS, useUnlockPOSS } from "@/hooks/useOutings";
import { usePOSSGenerator } from "@/hooks/usePOSSGenerator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import EmergencySOSModal from "@/components/emergency/EmergencySOSModal";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import CarpoolSection from "@/components/carpool/CarpoolSection";
import WeatherSummaryBanner from "@/components/weather/WeatherSummaryBanner";
import OutingWeatherCard from "@/components/weather/OutingWeatherCard";
import MarineMiniMap from "@/components/locations/MarineMiniMap";
import SatelliteMiniMap from "@/components/locations/SatelliteMiniMap";
import { Anchor, Satellite } from "lucide-react";
import { useApneaLevels, type ApneaLevel } from "@/hooks/useApneaLevels";

/** Extract max depth from prerogatives string */
const extractDepth = (prerogatives: string | null): string | null => {
  if (!prerogatives) return null;
  const match = prerogatives.match(/^(-\d+(?:\s*[àa/]\s*-?\d+)?m)/i);
  if (match) return match[1];
  const altMatch = prerogatives.match(/(-\d+m)/);
  return altMatch ? altMatch[1] : null;
};

const OutingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isOrganizer, isAdmin, loading: roleLoading } = useUserRole();
  const { data: outing, isLoading } = useOuting(id ?? "");
  const updatePresence = useUpdateReservationPresence();
  const updateSessionReport = useUpdateSessionReport();
  const cancelOuting = useCancelOuting();
  const archiveOuting = useArchiveOuting();
  const lockPOSS = useLockPOSS();
  const unlockPOSS = useUnlockPOSS();
  const possGenerator = usePOSSGenerator();
  const { data: apneaLevels } = useApneaLevels();
  const [sessionReport, setSessionReport] = useState("");
  const [cancelReason, setCancelReason] = useState("Météo défavorable");
  const [linkCopied, setLinkCopied] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [isGeneratingPOSS, setIsGeneratingPOSS] = useState(false);

  // Compute derived values for the query
  const outingDate = outing ? new Date(outing.date_time) : new Date();
  const now = new Date();
  const oneHourBefore = new Date(outingDate.getTime() - 60 * 60 * 1000);
  const canMarkAttendance = now >= oneHourBefore;

  // Fetch emergency contacts for participants
  const { data: participantsEmergency } = useQuery({
    queryKey: ["participants-emergency", id],
    queryFn: async () => {
      if (!outing?.reservations) return [];
      
      const confirmedUserIds = outing.reservations
        .filter(r => r.status === "confirmé" && r.is_present)
        .map(r => r.user_id);
      
      if (confirmedUserIds.length === 0) return [];

      // Get emails from profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url, apnea_level, email")
        .in("id", confirmedUserIds);

      if (!profiles) return [];

      // Get emergency contacts from club_members_directory
      const emails = profiles.map(p => p.email.toLowerCase());
      const { data: directory } = await supabase
        .from("club_members_directory")
        .select("id, email, emergency_contact_name, emergency_contact_phone")
        .in("email", emails);

      // Get apnea_level from membership_yearly_status (current season)
      const currentSeasonYear = new Date().getMonth() >= 8 
        ? new Date().getFullYear() + 1 
        : new Date().getFullYear();
      
      const memberIds = directory?.map(d => d.id) || [];
      const { data: membershipStatuses } = await supabase
        .from("membership_yearly_status")
        .select("member_id, apnea_level")
        .eq("season_year", currentSeasonYear)
        .in("member_id", memberIds.length > 0 ? memberIds : ['00000000-0000-0000-0000-000000000000']);

      const apneaLevelMap = new Map(membershipStatuses?.map(s => [s.member_id, s.apnea_level]) || []);

      const directoryMap = new Map(directory?.map(d => [
        d.email.toLowerCase(), 
        { ...d, apnea_level: apneaLevelMap.get(d.id) }
      ]) || []);

      return profiles.map(p => {
        const dirEntry = directoryMap.get(p.email.toLowerCase());
        return {
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          avatar_url: p.avatar_url,
          apnea_level: dirEntry?.apnea_level || p.apnea_level,
          emergency_contact_name: dirEntry?.emergency_contact_name || null,
          emergency_contact_phone: dirEntry?.emergency_contact_phone || null,
        };
      });
    },
    enabled: !!outing?.reservations && canMarkAttendance,
  });

  useEffect(() => {
    if (outing?.session_report) {
      setSessionReport(outing.session_report);
    }
  }, [outing?.session_report]);

  // Redirect if not the organizer of this specific outing or admin
  useEffect(() => {
    if (!authLoading && !roleLoading && !isLoading && outing) {
      const isOutingOrganizerCheck = user?.id === outing.organizer_id;
      if (!isOutingOrganizerCheck && !isAdmin) {
        navigate("/");
      }
    }
  }, [authLoading, roleLoading, isLoading, outing, user, isAdmin, navigate]);

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

  const isPast = outingDate < now;
  
  const mapsUrl = outing.location_details?.maps_url;
  const hasActiveReservations = confirmedReservations.length > 0 || waitlistedReservations.length > 0;
  
  // Check if user is the organizer of this specific outing OR is admin
  const isOutingOrganizer = user?.id === outing.organizer_id;
  const canEditPresenceAndReport = isOutingOrganizer || isAdmin;
  // Only the organizer of the outing or admin can cancel it
  const canCancelOuting = isOutingOrganizer || isAdmin;
  
  // Check if outing can be archived (past, has attendance marked, not already archived)
  const hasAttendanceMarked = confirmedReservations.some(r => r.is_present);
  const canArchiveOuting = isPast && canEditPresenceAndReport && hasAttendanceMarked && !outing.is_archived;

  const handleSaveReport = () => {
    updateSessionReport.mutate({ outingId: outing.id, sessionReport });
  };

  const handleCancelOuting = () => {
    cancelOuting.mutate({ outingId: outing.id, reason: cancelReason });
  };

  const handleArchiveOuting = () => {
    archiveOuting.mutate(outing.id);
  };

  const getShareLink = () => {
    return `${window.location.origin}/outing/${id}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareLink());
      setLinkCopied(true);
      toast.success("Lien copié !");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  // Build a map of apnea level code -> ApneaLevel for quick lookup
  const apneaLevelMap = new Map<string, ApneaLevel>(
    (apneaLevels || []).map(l => [l.code, l])
  );

  // Sort participants: organizer first, then instructors, then others
  const sortedConfirmed = [...confirmedReservations].sort((a, b) => {
    const aIsOrganizer = a.user_id === outing.organizer_id;
    const bIsOrganizer = b.user_id === outing.organizer_id;
    if (aIsOrganizer && !bIsOrganizer) return -1;
    if (!aIsOrganizer && bIsOrganizer) return 1;

    const aLevel = apneaLevelMap.get(a.profile?.apnea_level ?? "");
    const bLevel = apneaLevelMap.get(b.profile?.apnea_level ?? "");
    const aIsInstructor = aLevel?.is_instructor ?? false;
    const bIsInstructor = bLevel?.is_instructor ?? false;
    if (aIsInstructor && !bIsInstructor) return -1;
    if (!aIsInstructor && bIsInstructor) return 1;
    return 0;
  });

  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="secondary">{outing.outing_type}</Badge>
              {outing.is_poss_locked && (
                <Badge className="gap-1 bg-amber-600 text-white">
                  <Lock className="h-3 w-3" />
                  POSS Verrouillé
                </Badge>
              )}
              {canMarkAttendance && canEditPresenceAndReport && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => setSosModalOpen(true)}
                >
                  <Phone className="h-4 w-4" />
                  🚨 SOS / Urgence
                </Button>
              )}
              {!isPast && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Share2 className="h-4 w-4" />
                      Partager
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Partager cette sortie</p>
                      <div className="flex gap-2">
                        <Input readOnly value={getShareLink()} className="flex-1 text-xs" />
                        <Button variant="ocean" size="icon" onClick={handleCopyLink}>
                          {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${outing.title} - ${format(new Date(outing.date_time), "d MMMM yyyy", { locale: fr })} ${getShareLink()}`)}`, "_blank")}
                      >
                        Partager sur WhatsApp
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              {!isPast && canCancelOuting && (
                <EditOutingDialog outing={outing} />
              )}
              {/* POSS Lock/Unlock Button */}
              {!isPast && canEditPresenceAndReport && (
                outing.is_poss_locked ? (
                  <>
                    <Button
                      variant="ocean"
                      size="sm"
                      className="gap-2"
                      onClick={async () => {
                        setIsGeneratingPOSS(true);
                        try {
                          const organizerName = outing.organizer
                            ? formatFullName(outing.organizer.first_name, outing.organizer.last_name)
                            : "Encadrant";
                          await possGenerator.generate({ outing, organizerName });
                        } finally {
                          setIsGeneratingPOSS(false);
                        }
                      }}
                      disabled={isGeneratingPOSS}
                    >
                      <FileText className="h-4 w-4" />
                      {isGeneratingPOSS ? "Génération..." : "Re-générer POSS"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => unlockPOSS.mutate(outing.id)}
                      disabled={unlockPOSS.isPending}
                    >
                      <Unlock className="h-4 w-4" />
                      Déverrouiller
                    </Button>
                  </>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ocean" size="sm" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Générer le POSS
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <Lock className="h-5 w-5 text-amber-600" />
                          Verrouiller les inscriptions ?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                          <p>La génération du POSS va <strong>clôturer les inscriptions</strong>.</p>
                          <p>Les membres ne pourront plus s'inscrire ou se désinscrire.</p>
                          <p className="text-sm text-muted-foreground">
                            La liste des {confirmedReservations.length} participant(s) sera figée.
                          </p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            setIsGeneratingPOSS(true);
                            try {
                              // Lock the POSS first
                              await lockPOSS.mutateAsync(outing.id);
                              // Generate the PDF
                              const organizerName = outing.organizer
                                ? formatFullName(outing.organizer.first_name, outing.organizer.last_name)
                                : "Encadrant";
                              await possGenerator.generate({ outing, organizerName });
                            } finally {
                              setIsGeneratingPOSS(false);
                            }
                          }}
                          disabled={lockPOSS.isPending || isGeneratingPOSS}
                          className="gap-2"
                        >
                          <FileText className="h-4 w-4" />
                          {lockPOSS.isPending || isGeneratingPOSS ? "Génération..." : "Verrouiller et générer"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )
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
            {outing.description && (
              <p className="mt-2 text-muted-foreground">{outing.description}</p>
            )}
            {/* Organizer info with max depth */}
            {outing.organizer && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Encadrant : <span className="font-medium text-foreground">{formatFullName(outing.organizer.first_name, outing.organizer.last_name)}</span>
                </p>
                {outing.outing_type !== "Piscine" && (outing.organizer_max_depth_eaa || outing.organizer_max_depth_eao) && (() => {
                  const isOpenWater = outing.outing_type === "Mer" || outing.outing_type === "Étang" || outing.outing_type === "Dépollution";
                  const organizerMaxDepth = isOpenWater ? outing.organizer_max_depth_eao : outing.organizer_max_depth_eaa;
                  const locationMaxDepth = outing.location_details?.max_depth;

                  // If both organizer and location have max depth, show the minimum (most restrictive)
                  const effectiveMaxDepth = organizerMaxDepth && locationMaxDepth
                    ? Math.min(organizerMaxDepth, locationMaxDepth)
                    : organizerMaxDepth || locationMaxDepth;

                  return effectiveMaxDepth ? (
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-700">
                        Profondeur max encadrement : {effectiveMaxDepth}m {isOpenWater ? "(eau ouverte)" : "(eau artificielle)"}
                      </span>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>

          {/* 1. Weather summary banner at top */}
          {!isPast && outing.location_details?.latitude && outing.location_details?.longitude && (
            <div className="my-6">
              <WeatherSummaryBanner
                latitude={outing.location_details.latitude}
                longitude={outing.location_details.longitude}
                outingDate={outing.date_time}
              />
            </div>
          )}

          {/* 2. Participants - enriched with instructor icons, organizer highlighted, apnea levels & depth */}
          <Card className="shadow-card my-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Participants confirmés ({confirmedReservations.length}/{outing.max_participants})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sortedConfirmed.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Aucun inscrit</p>
              ) : (
                <div className="space-y-2">
                  {sortedConfirmed.map((reservation) => {
                    const profile = reservation.profile;
                    const initials = profile ? `${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}` : "?";
                    const isOrg = reservation.user_id === outing.organizer_id;
                    const levelInfo = apneaLevelMap.get(profile?.apnea_level ?? "");
                    const isInstructor = levelInfo?.is_instructor ?? false;
                    const depth = !isInstructor ? extractDepth(levelInfo?.prerogatives ?? null) : null;

                    return (
                      <div
                        key={reservation.id}
                        className={`flex items-center justify-between rounded-lg border p-3 ${
                          isOrg
                            ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700"
                            : "border-border bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={profile?.avatar_url ?? undefined} />
                              <AvatarFallback className={`text-sm ${isOrg ? "bg-amber-200 text-amber-800" : "bg-primary/10 text-primary"}`}>
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            {isInstructor && (
                              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center shadow-sm" title="Encadrant">
                                <Shield className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">
                                {profile?.first_name} {profile?.last_name}
                              </p>
                              {isOrg && (
                                <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">Organisateur</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {profile?.apnea_level && (
                                <Badge variant={isInstructor ? "default" : "outline"} className={`text-xs ${isInstructor ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300" : ""}`}>
                                  {profile.apnea_level}
                                </Badge>
                              )}
                              {depth && (
                                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                  <ArrowDown className="h-3 w-3" />
                                  {depth}
                                </span>
                              )}
                              {reservation.carpool_option === "driver" && (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <Car className="h-3 w-3" /> {reservation.carpool_seats} places
                                </Badge>
                              )}
                              {reservation.carpool_option === "passenger" && (
                                <Badge variant="outline" className="text-xs">Cherche covoit.</Badge>
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

          {/* 3. Carpool Section - full width */}
          <CarpoolSection
            outingId={outing.id}
            userReservation={confirmedReservations.find((r) => r.user_id === user?.id)}
            isPast={isPast}
            destinationLat={outing.location_details?.latitude}
            destinationLng={outing.location_details?.longitude}
            destinationName={outing.location_details?.name}
            outingDateTime={outing.date_time}
          />

          {/* 4. Detailed weather card */}
          {!isPast && outing.location_details?.latitude && outing.location_details?.longitude && (
            <div className="my-6">
              <OutingWeatherCard
                latitude={outing.location_details.latitude}
                longitude={outing.location_details.longitude}
                outingDate={outing.date_time}
              />
            </div>
          )}

          {/* 5. Maps: Bathymetry + Satellite */}
          {outing.location_details?.latitude && outing.location_details?.longitude && (
            <div className="grid gap-6 md:grid-cols-2 my-6">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Anchor className="h-5 w-5 text-primary" />
                    Carte Marine (Bathymétrie)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-hidden rounded-b-lg">
                  <MarineMiniMap
                    latitude={outing.location_details.latitude}
                    longitude={outing.location_details.longitude}
                    siteName={outing.location_details?.name || outing.location}
                    siteId={outing.location_id ?? undefined}
                  />
                  <p className="text-xs text-muted-foreground text-center py-2 px-3">
                    Carte SHOM/IGN – Lignes de profondeur et sondes marines
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Satellite className="h-5 w-5 text-primary" />
                    Vue Satellite
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-hidden rounded-b-lg">
                  <SatelliteMiniMap
                    latitude={outing.location_details.latitude}
                    longitude={outing.location_details.longitude}
                    siteName={outing.location_details?.name || outing.location}
                    siteId={outing.location_id ?? undefined}
                  />
                  <p className="text-xs text-muted-foreground text-center py-2 px-3">
                    Vue satellite – Points d'intérêt du site
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 6. Session Report */}
          {isPast && canEditPresenceAndReport && (
            <Card className="shadow-card my-6">
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
                <div className="flex gap-3 mt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleSaveReport}
                    disabled={updateSessionReport.isPending}
                  >
                    {updateSessionReport.isPending ? "Enregistrement..." : "Enregistrer le compte-rendu"}
                  </Button>
                  {canArchiveOuting && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ocean" className="flex-1 gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Valider la sortie
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                            Valider et archiver cette sortie ?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            La sortie sera archivée et n'apparaîtra plus dans les sorties à venir. L'appel et le compte-rendu seront conservés.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleArchiveOuting}
                            disabled={archiveOuting.isPending}
                          >
                            {archiveOuting.isPending ? "Archivage..." : "Confirmer"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  {outing.is_archived && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Archivée
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Emergency SOS Modal */}
      <EmergencySOSModal
        isOpen={sosModalOpen}
        onClose={() => setSosModalOpen(false)}
        participants={participantsEmergency || []}
        outingTitle={outing.title}
      />
    </Layout>
  );
};

export default OutingDetail;
