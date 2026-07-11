import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, MapPin, Calendar, Users, Navigation, Clock, XCircle, Car, UserCheck, AlertTriangle, CloudRain, CheckCircle2, Share2, Copy, Check, Phone, Lock, FileText, Unlock, Shield, ArrowDown, Gauge, Download, Mail, MessageCircle, UserPlus, UserMinus, X, Trash2 } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useOuting, useUpdateReservationPresence, useUpdateSessionReport, useCancelOuting, useArchiveOuting, useLockPOSS, useUnlockPOSS, useAddCoInstructor, useRemoveCoInstructor, useDeleteOuting, useAdminRemoveReservation, useSetReservationGroup } from "@/hooks/useOutings";
import { usePOSSGenerator } from "@/hooks/usePOSSGenerator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import EmergencySOSModal from "@/components/emergency/EmergencySOSModal";
import ParticipantPhotoFrame from "@/components/participants/ParticipantPhotoFrame";
import { FicheEvacuationGenerator } from "@/components/pdf/FicheEvacuationGenerator";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import CarpoolSection from "@/components/carpool/CarpoolSection";
import { useCarpools } from "@/hooks/useCarpools";
import WeatherSummaryBanner from "@/components/weather/WeatherSummaryBanner";
import OutingWeatherCard from "@/components/weather/OutingWeatherCard";
import MarineMiniMap from "@/components/locations/MarineMiniMap";
import SatelliteMiniMap from "@/components/locations/SatelliteMiniMap";
import { Anchor, Satellite } from "lucide-react";
import { useApneaLevels, type ApneaLevel } from "@/hooks/useApneaLevels";

/** Motifs d'annulation proposés en un clic (le champ reste éditable pour un motif libre) */
const CANCEL_REASONS = [
  "Météo défavorable",
  "Nombre d'inscrits insuffisant",
  "Encadrant indisponible",
  "Problème logistique",
];

/** Numéros de groupes proposés lors de l'affectation des inscrits */
const GROUP_NUMBERS = [1, 2, 3, 4, 5, 6];

/**
 * Palette de teintes douces pour différencier visuellement les groupes.
 * On évite l'ambre et le bleu (déjà utilisés pour organisateur / encadrant).
 * Classes écrites en toutes lettres pour que Tailwind les conserve.
 */
const GROUP_COLORS = [
  { card: "border-teal-300 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/30", label: "text-teal-700 dark:text-teal-300" },
  { card: "border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/30", label: "text-violet-700 dark:text-violet-300" },
  { card: "border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30", label: "text-rose-700 dark:text-rose-300" },
  { card: "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30", label: "text-emerald-700 dark:text-emerald-300" },
  { card: "border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30", label: "text-orange-700 dark:text-orange-300" },
  { card: "border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/30", label: "text-sky-700 dark:text-sky-300" },
];
const groupColor = (n: number) => GROUP_COLORS[(n - 1) % GROUP_COLORS.length];

/** Couleurs vives correspondantes, pour le liseré à gauche des lignes inscrits */
const GROUP_ACCENTS = ["#14b8a6", "#8b5cf6", "#f43f5e", "#10b981", "#f97316", "#0ea5e9"];
const groupAccent = (n: number) => GROUP_ACCENTS[(n - 1) % GROUP_ACCENTS.length];

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
  const setReservationGroup = useSetReservationGroup();
  const updateSessionReport = useUpdateSessionReport();
  const cancelOuting = useCancelOuting();
  const adminRemoveReservation = useAdminRemoveReservation();
  const deleteOuting = useDeleteOuting();
  const archiveOuting = useArchiveOuting();
  const lockPOSS = useLockPOSS();
  const unlockPOSS = useUnlockPOSS();
  const possGenerator = usePOSSGenerator();
  const { data: apneaLevels } = useApneaLevels();
  const { data: carpools } = useCarpools(id ?? "");

  // Set of user ids who already have a seat booked in a carpool for this outing
  const bookedPassengerIds = new Set(
    (carpools ?? []).flatMap((c) => (c.passengers ?? []).map((p) => p.passenger_id))
  );
  // Remaining (not yet booked) seats per driver, to stay consistent with the carpool widget
  const remainingSeatsByDriver = new Map(
    (carpools ?? []).map((c) => [
      c.driver_id,
      Math.max(0, (c.available_seats ?? 0) - (c.passengers?.length ?? 0)),
    ])
  );
  const addCoInstructor = useAddCoInstructor();
  const removeCoInstructor = useRemoveCoInstructor();
  const { data: allMembers } = useQuery({
    queryKey: ["encadrants-picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("member_status", "Encadrant")
        .order("last_name");
      if (error) throw error;
      return data as { id: string; first_name: string; last_name: string }[];
    },
  });
  const [sessionReport, setSessionReport] = useState("");
  const [cancelReason, setCancelReason] = useState("Météo défavorable");
  const [linkCopied, setLinkCopied] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [isGeneratingPOSS, setIsGeneratingPOSS] = useState(false);
  const [coInstructorSearch, setCoInstructorSearch] = useState("");
  const [coInstructorPickerOpen, setCoInstructorPickerOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<{
    firstName: string; lastName: string; avatarUrl: string | null; email: string | null; phone: string | null;
  } | null>(null);
  const [participantToRemove, setParticipantToRemove] = useState<{
    userId: string; name: string;
  } | null>(null);
  const [removeMessage, setRemoveMessage] = useState(
    "Le nombre de demandes pour cette sortie a dépassé le nombre de places disponibles. Un tirage au sort a été effectué et vous n'avez malheureusement pas été retenu(e) cette fois-ci."
  );

  // Compute derived values for the query
  const outingDate = outing ? new Date(outing.date_time) : new Date();
  const now = new Date();
  const oneHourBefore = new Date(outingDate.getTime() - 60 * 60 * 1000);
  const canMarkAttendance = now >= oneHourBefore;

  // Fetch emergency contacts for participants
  const { data: participantsEmergency } = useQuery({
    queryKey: ["participants-emergency", id],
    queryFn: async () => {
      if (!id) return [];

      const { data: presentReservations } = await supabase
        .from("reservations")
        .select("user_id")
        .eq("outing_id", id)
        .eq("status", "confirmé")
        .eq("is_present", true);

      const confirmedUserIds = (presentReservations || []).map(r => r.user_id);

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
    enabled: !!id && canMarkAttendance,
  });

  // Fetch participant phones for contact dialog
  const { data: participantPhones } = useQuery({
    queryKey: ["participant-phones", id],
    queryFn: async () => {
      if (!outing?.reservations) return new Map<string, string | null>();
      const emails = outing.reservations
        .filter(r => r.status === "confirmé" && r.profile?.email)
        .map(r => (r.profile!.email as string).toLowerCase());
      if (emails.length === 0) return new Map<string, string | null>();
      const { data } = await supabase
        .from("club_members_directory")
        .select("email, phone")
        .in("email", emails);
      return new Map((data || []).map(d => [d.email.toLowerCase(), d.phone ?? null]));
    },
    enabled: !!outing?.reservations,
  });

  useEffect(() => {
    if (outing?.session_report) {
      setSessionReport(outing.session_report);
    }
  }, [outing?.session_report]);

  // Redirect if not the organizer, co-instructor or admin of this specific outing
  useEffect(() => {
    if (!authLoading && !roleLoading && !isLoading && outing) {
      const isOutingOrganizerCheck = user?.id === outing.organizer_id;
      const isCoInstructorCheck = outing.co_instructors?.some((ci) => ci.user_id === user?.id) ?? false;
      if (!isOutingOrganizerCheck && !isCoInstructorCheck && !isAdmin) {
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
  const waitlistedReservations = (outing.reservations?.filter(r => r.status === "en_attente") ?? [])
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const cancelledReservations = outing.reservations?.filter(r => r.status === "annulé") ?? [];

  const isPast = outingDate < now;
  
  const mapsUrl = outing.location_details?.maps_url;
  // Cover image: outing's own image → location photo (no generic placeholder here)
  const coverImage = (outing as any).cover_image_url || (outing.location_details as any)?.photo_url || null;
  const hasActiveReservations = confirmedReservations.length > 0 || waitlistedReservations.length > 0;
  
  // Check if user is the organizer, co-instructor or admin of this outing
  const isOutingOrganizer = user?.id === outing.organizer_id;
  const isCoInstructor = outing.co_instructors?.some((ci) => ci.user_id === user?.id) ?? false;
  const canManageOuting = isOutingOrganizer || isCoInstructor || isAdmin;
  const canEditPresenceAndReport = canManageOuting;
  const canCancelOuting = canManageOuting;
  // Reservation UPDATE is only allowed by admins or the outing's organizer (RLS), not co-instructors
  const canRemoveParticipant = isAdmin || isOutingOrganizer;
  
  // Check if outing can be archived (past, not already archived)
  const hasAttendanceMarked = confirmedReservations.some(r => r.is_present);
  const canArchiveOuting = isPast && canEditPresenceAndReport && !outing.is_archived;

  const handleSaveReport = () => {
    updateSessionReport.mutate({ outingId: outing.id, sessionReport });
  };

  const handleCancelOuting = () => {
    cancelOuting.mutate({ outingId: outing.id, reason: cancelReason });
  };

  const handleRemoveParticipant = () => {
    if (!participantToRemove) return;
    adminRemoveReservation.mutate(
      { outingId: outing.id, userId: participantToRemove.userId, message: removeMessage },
      { onSuccess: () => setParticipantToRemove(null) }
    );
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

  // Sort participants: organizer first, then encadrants (team encadrant), then others.
  // "Team encadrant" = this outing's organizer, its co-encadrants, or a member whose
  // member_status is "Encadrant" (admin-controlled). Holding an instructor-level diving
  // qualification (apnea level flagged is_instructor) does NOT make someone an encadrant
  // of the outing — e.g. a BPJEPS holder who is a simple member stays in the participants.
  const isReservationEncadrant = (r: typeof confirmedReservations[number]) => {
    if (r.user_id === outing.organizer_id) return true;
    if (outing.co_instructors?.some((ci) => ci.user_id === r.user_id)) return true;
    return r.profile?.member_status === "Encadrant";
  };
  const sortedConfirmed = [...confirmedReservations].sort((a, b) => {
    const aIsOrganizer = a.user_id === outing.organizer_id;
    const bIsOrganizer = b.user_id === outing.organizer_id;
    if (aIsOrganizer && !bIsOrganizer) return -1;
    if (!aIsOrganizer && bIsOrganizer) return 1;
    const aIsInstructor = isReservationEncadrant(a);
    const bIsInstructor = isReservationEncadrant(b);
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
              {outing.is_staff_only && (
                <Badge className="bg-amber-500 text-white">PRIVÉ STAFF</Badge>
              )}
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
              {/* Fiche Sécurité Download - Available to all users */}
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = '/files/Fiche sécurité.pdf';
                  link.download = 'Fiche_Securite_Apnee.pdf';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  toast.success("Téléchargement de la fiche sécurité...");
                }}
              >
                <Download className="h-4 w-4" />
                Fiche Sécurité
              </Button>
              {/* Fiche évacuation - encadrants uniquement */}
              {canManageOuting && <FicheEvacuationGenerator compact />}
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
              {(isOutingOrganizer || isAdmin) && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                      Supprimer
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Supprimer définitivement ?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        La sortie sera supprimée sans notification aux participants. Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteOuting.mutate(outing.id, { onSuccess: () => navigate("/") })}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={deleteOuting.isPending}
                      >
                        {deleteOuting.isPending ? "Suppression..." : "Supprimer définitivement"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
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
                      <div className="mt-2 flex flex-wrap gap-2">
                        {CANCEL_REASONS.map((reason) => (
                          <Button
                            key={reason}
                            type="button"
                            variant={cancelReason === reason ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCancelReason(reason)}
                          >
                            {reason}
                          </Button>
                        ))}
                      </div>
                      <Input
                        id="cancelReason"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Météo défavorable, nombre d'inscrits insuffisant, autre..."
                        className="mt-3"
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
            {coverImage && (
              <div className="mb-4 overflow-hidden rounded-xl border border-border/50">
                <img
                  src={coverImage}
                  alt={outing.title}
                  className="h-48 w-full object-cover sm:h-56"
                  loading="lazy"
                />
              </div>
            )}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
              <div className="min-w-0 lg:flex-1">
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
            {(outing.water_entry_time || outing.water_exit_time) && (
              <div className="mt-4 space-y-0">
                {[
                  { label: "RDV", time: format(new Date(outing.date_time), "HH'h'mm", { locale: fr }), color: "bg-primary", desc: "Arrivée & équipement" },
                  ...(outing.water_entry_time ? [{ label: "Mise à l'eau", time: outing.water_entry_time.slice(0,5).replace(":", "h"), color: "bg-cyan-500", desc: "Début de session" }] : []),
                  ...(outing.water_exit_time ? [{ label: "Sortie de l'eau", time: outing.water_exit_time.slice(0,5).replace(":", "h"), color: "bg-blue-500", desc: "Fin de session" }] : []),
                  ...(outing.end_date ? [{ label: "Fin RDV", time: format(new Date(outing.end_date), "HH'h'mm", { locale: fr }), color: "bg-muted-foreground", desc: "Rangement & départ" }] : []),
                ].map((step, i, arr) => (
                  <div key={step.label} className="flex items-stretch gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${step.color}`} />
                      {i < arr.length - 1 && <div className="w-0.5 flex-1 bg-border my-1" />}
                    </div>
                    <div className={i < arr.length - 1 ? "pb-2" : "pb-0"}>
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-sm text-foreground">{step.time}</span>
                        <span className="text-sm font-medium text-foreground">{step.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {outing.description && (
              <p className="mt-2 text-muted-foreground">{outing.description}</p>
            )}
            {/* Organizer info with max depth */}
            {outing.organizer && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Encadrant principal : <span className="font-medium text-foreground">{formatFullName(outing.organizer.first_name, outing.organizer.last_name)}</span>
                </p>
                {outing.outing_type !== "Piscine" && (outing.organizer_max_depth_eaa || outing.organizer_max_depth_eao) && (() => {
                  const isOpenWater = outing.outing_type === "Mer" || outing.outing_type === "Étang" || outing.outing_type === "Dépollution";
                  const organizerMaxDepth = isOpenWater ? outing.organizer_max_depth_eao : outing.organizer_max_depth_eaa;
                  const locationMaxDepth = outing.location_details?.max_depth;

                  // If both organizer and location have max depth, show the minimum (most restrictive)
                  const effectiveMaxDepth = organizerMaxDepth && locationMaxDepth
                    ? Math.min(organizerMaxDepth, locationMaxDepth)
                    : organizerMaxDepth || locationMaxDepth;

                  const encadrementLabel = isOpenWater ? "EAO" : "EAA";

                  return effectiveMaxDepth ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-700">
                          Profondeur max encadrement : {effectiveMaxDepth}m {isOpenWater ? "(eau ouverte)" : "(eau artificielle)"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Les apnéistes peuvent avoir des prérogatives personnelles plus profondes, mais dans le
                        cadre d'une activité organisée par le club avec un DP « {outing.organizer_level_name ?? outing.organizer.apnea_level} »,
                        la zone encadrée doit rester dans la limite {encadrementLabel} de {effectiveMaxDepth} m.
                      </p>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {/* Co-instructors: display + management */}
            {(() => {
              const existingCoInstructorIds = new Set(outing.co_instructors?.map((ci) => ci.user_id) ?? []);
              const filteredMembers = (allMembers ?? []).filter(
                (m) => m.id !== outing.organizer_id && !existingCoInstructorIds.has(m.id) &&
                  (coInstructorSearch === "" ||
                    `${m.first_name} ${m.last_name}`.toLowerCase().includes(coInstructorSearch.toLowerCase()))
              );

              return (
                <div className="mt-3 space-y-2">
                  {/* Existing co-instructors */}
                  {(outing.co_instructors ?? []).map((ci) => (
                    <div key={ci.user_id} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4 text-primary" />
                      <span>
                        Co-encadrant : <span className="font-medium text-foreground">
                          {ci.profile ? formatFullName(ci.profile.first_name, ci.profile.last_name) : ci.user_id}
                        </span>
                      </span>
                      {isOutingOrganizer && (
                        <button
                          onClick={() => removeCoInstructor.mutate({ outingId: outing.id, userId: ci.user_id })}
                          className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                          title="Retirer ce co-encadrant"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Add co-instructor button (organizer only, future outings) */}
                  {isOutingOrganizer && !isPast && (
                    <Popover open={coInstructorPickerOpen} onOpenChange={setCoInstructorPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2 h-8 text-xs">
                          <UserPlus className="h-3.5 w-3.5" />
                          Ajouter un co-encadrant
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-3">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Choisir un co-encadrant</p>
                          <input
                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="Rechercher par nom..."
                            value={coInstructorSearch}
                            onChange={(e) => setCoInstructorSearch(e.target.value)}
                            autoFocus
                          />
                          <div className="max-h-48 overflow-y-auto space-y-0.5">
                            {filteredMembers.length === 0 ? (
                              <p className="text-xs text-muted-foreground py-2 text-center">Aucun résultat</p>
                            ) : (
                              filteredMembers.map((m) => (
                                <button
                                  key={m.id}
                                  className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors"
                                  onClick={() => {
                                    addCoInstructor.mutate({ outingId: outing.id, userId: m.id });
                                    setCoInstructorPickerOpen(false);
                                    setCoInstructorSearch("");
                                  }}
                                >
                                  {formatFullName(m.first_name, m.last_name)}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              );
            })()}
              </div>
              {coverImage && (
                <div className="hidden lg:block lg:w-72 xl:w-80 lg:flex-shrink-0">
                  <img
                    src={coverImage}
                    alt={outing.title}
                    className="aspect-[4/3] w-full rounded-xl border border-border/50 object-cover"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
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
          {(() => {
            // A person is an encadrant of this outing if they are its organizer, one of its
            // co-encadrants, or a member of the encadrant team (member_status = 'Encadrant',
            // admin-controlled, always up to date). A diving qualification alone (apnea level
            // flagged is_instructor) does NOT make someone an encadrant — e.g. a BPJEPS holder
            // who is a simple member stays in the participants list.
            const isEncadrant = (r: typeof sortedConfirmed[number]) => {
              if (r.user_id === outing.organizer_id) return true;
              if (outing.co_instructors?.some((ci) => ci.user_id === r.user_id)) return true;
              return r.profile?.member_status === "Encadrant";
            };

            // Separate confirmed reservations into instructors and regular participants
            const confirmedInstructors = sortedConfirmed.filter(isEncadrant);
            const confirmedParticipants = sortedConfirmed.filter(r => !isEncadrant(r));

            // Effective max = sum of each instructor's max_participants_encadrement
            const effectiveMax = confirmedInstructors.length > 0
              ? confirmedInstructors.reduce((sum, r) => {
                  const li = apneaLevelMap.get(r.profile?.apnea_level ?? "");
                  return sum + (li?.max_participants_encadrement ?? outing.max_participants);
                }, 0)
              : outing.max_participants;

            const renderRow = (reservation: typeof sortedConfirmed[number]) => {
              const profile = reservation.profile;
              const initials = profile ? `${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}` : "?";
              const isOrg = reservation.user_id === outing.organizer_id;
              const isCoInstructor = !isOrg && (outing.co_instructors?.some(ci => ci.user_id === reservation.user_id) ?? false);
              const levelInfo = apneaLevelMap.get(profile?.apnea_level ?? "");
              const isInstructor = isEncadrant(reservation);
              const depth = !isInstructor ? extractDepth(levelInfo?.prerogatives ?? null) : null;
              return (
                <div
                  key={reservation.id}
                  className={`flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between ${
                    isOrg
                      ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700"
                      : isInstructor
                        ? "border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-700"
                        : "border-border bg-muted/30"
                  }`}
                  style={
                    reservation.group_number
                      ? { borderLeftWidth: 4, borderLeftColor: groupAccent(reservation.group_number) }
                      : undefined
                  }
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      className="relative focus:outline-none"
                      onClick={() => profile && setSelectedContact({
                        firstName: profile.first_name ?? "",
                        lastName: profile.last_name ?? "",
                        avatarUrl: profile.avatar_url ?? null,
                        email: profile.email ?? null,
                        phone: participantPhones?.get((profile.email ?? "").toLowerCase()) ?? null,
                      })}
                    >
                      <Avatar className="h-10 w-10 transition-opacity hover:opacity-80">
                        <AvatarImage src={profile?.avatar_url ?? undefined} />
                        <AvatarFallback className={`text-sm ${isOrg ? "bg-amber-200 text-amber-800" : isInstructor ? "bg-blue-100 text-blue-800" : "bg-primary/10 text-primary"}`}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      {isInstructor && (
                        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center shadow-sm" title="Encadrant">
                          <Shield className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="font-medium text-foreground">
                          {formatFullName(profile?.first_name, profile?.last_name)}
                        </p>
                        {isOrg && (
                          <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">Organisateur</Badge>
                        )}
                        {isInstructor && !isOrg && (
                          <Badge className="bg-blue-500 text-white text-[10px] px-1.5 py-0">Encadrant</Badge>
                        )}
                        {isCoInstructor && (
                          <Badge className="bg-purple-500 text-white text-[10px] px-1.5 py-0">Co-encadrant</Badge>
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
                            <Car className="h-3 w-3" />{" "}
                            {(remainingSeatsByDriver.get(reservation.user_id) ?? reservation.carpool_seats)} dispo
                          </Badge>
                        )}
                        {reservation.carpool_option === "passenger" && (
                          bookedPassengerIds.has(reservation.user_id) ? (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Car className="h-3 w-3" /> Inscrit covoit.
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Cherche covoit.</Badge>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0 sm:justify-end">
                    {!isPast && canManageOuting && (
                      <Select
                        value={reservation.group_number ? String(reservation.group_number) : "none"}
                        onValueChange={(v) =>
                          setReservationGroup.mutate({
                            reservationId: reservation.id,
                            groupNumber: v === "none" ? null : Number(v),
                          })
                        }
                      >
                        <SelectTrigger className="h-8 w-[130px] text-xs">
                          <SelectValue placeholder="Groupe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sans groupe</SelectItem>
                          {GROUP_NUMBERS.map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              Groupe {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
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
                    {!isPast && canRemoveParticipant && !isOrg && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Retirer ce participant"
                        onClick={() =>
                          setParticipantToRemove({
                            userId: reservation.user_id,
                            name: formatFullName(profile?.first_name, profile?.last_name),
                          })
                        }
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            };

            return (
          <Card className="shadow-card my-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 flex-wrap">
                <Users className="h-5 w-5 text-primary" />
                Participants confirmés ({confirmedReservations.length}/{effectiveMax})
                {confirmedInstructors.length >= 2 && (
                  <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300">
                    {confirmedInstructors.length} encadrants · capacité ×{confirmedInstructors.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const assigned = sortedConfirmed.filter((r) => r.group_number != null);
                if (assigned.length === 0) return null;
                const groupNumbers = [...new Set(assigned.map((r) => r.group_number as number))].sort(
                  (a, b) => a - b
                );
                const unassignedCount = sortedConfirmed.length - assigned.length;
                return (
                  <div className="mb-6 border-b border-border/50 pb-4">
                    <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <Users className="h-4 w-4 text-primary" />
                      Groupes
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {groupNumbers.map((n) => {
                        const members = assigned.filter((r) => r.group_number === n);
                        return (
                          <div key={n} className={cn("rounded-lg border p-3", groupColor(n).card)}>
                            <p className={cn("mb-2 text-xs font-semibold uppercase tracking-wide", groupColor(n).label)}>
                              Groupe {n} ({members.length})
                            </p>
                            <div className="space-y-1.5">
                              {members.map((r) => (
                                <div key={r.id} className="flex items-center gap-1.5 text-sm">
                                  {isEncadrant(r) && (
                                    <Shield className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                                  )}
                                  <span className="text-foreground">
                                    {formatFullName(r.profile?.first_name, r.profile?.last_name)}
                                  </span>
                                  {r.profile?.apnea_level && (
                                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                                      {r.profile.apnea_level}
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {unassignedCount > 0 && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {unassignedCount} inscrit{unassignedCount > 1 ? "s" : ""} sans groupe
                      </p>
                    )}
                  </div>
                );
              })()}

              {sortedConfirmed.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Aucun inscrit</p>
              ) : (
                <div className="space-y-3">
                  {confirmedInstructors.length > 0 && (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 flex items-center gap-1.5 px-1">
                        <Shield className="h-3.5 w-3.5" />
                        Encadrant{confirmedInstructors.length > 1 ? "s" : ""} ({confirmedInstructors.length})
                      </p>
                      <div className="space-y-2">
                        {confirmedInstructors.map(renderRow)}
                      </div>
                    </>
                  )}
                  {confirmedParticipants.length > 0 && (
                    <>
                      {confirmedInstructors.length > 0 && (
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 px-1 pt-1">
                          <Users className="h-3.5 w-3.5" />
                          Participants ({confirmedParticipants.length})
                        </p>
                      )}
                      <div className="space-y-2">
                        {confirmedParticipants.map(renderRow)}
                      </div>
                    </>
                  )}
                </div>
              )}

              {waitlistedReservations.length > 0 && (
                <div className="mt-6">
                  <h4 className="mb-3 text-sm font-medium text-muted-foreground">Liste d'attente ({waitlistedReservations.length})</h4>
                  <div className="space-y-2">
                    {waitlistedReservations.map((reservation, index) => {
                      const profile = reservation.profile;
                      return (
                        <div key={reservation.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-700">
                            {index + 1}
                          </span>
                          {formatFullName(profile?.first_name, profile?.last_name)}
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
                          {formatFullName(profile?.first_name, profile?.last_name)}
                          {isLastMinute && <Badge variant="destructive" className="text-xs">-24h</Badge>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
            );
          })()}

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
                <CardContent className="p-0">
                  <div className="overflow-hidden rounded-b-lg">
                    <MarineMiniMap
                      latitude={outing.location_details.latitude}
                      longitude={outing.location_details.longitude}
                      siteName={outing.location_details?.name || outing.location}
                      siteId={outing.location_id ?? undefined}
                    />
                  </div>
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
                <CardContent className="p-0">
                  <div className="overflow-hidden rounded-b-lg">
                    <SatelliteMiniMap
                      latitude={outing.location_details.latitude}
                      longitude={outing.location_details.longitude}
                      siteName={outing.location_details?.name || outing.location}
                      siteId={outing.location_id ?? undefined}
                    />
                  </div>
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
                <div className="flex flex-wrap gap-3 mt-4">
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

      {/* Contact dialog */}
      {selectedContact && (() => {
        const normalizePhone = (p: string) => {
          const digits = p.replace(/[\s.\-()]/g, "");
          return digits.startsWith("0") && digits.length === 10 ? "+33" + digits.slice(1) : digits;
        };
        const phone = selectedContact.phone ? normalizePhone(selectedContact.phone) : null;
        return (
          <Dialog open={!!selectedContact} onOpenChange={(open) => !open && setSelectedContact(null)}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <div className="flex flex-col items-center gap-3 pt-2">
                  <ParticipantPhotoFrame
                    firstName={selectedContact.firstName}
                    lastName={selectedContact.lastName}
                    avatarUrl={selectedContact.avatarUrl}
                  />
                  <DialogTitle className="text-center leading-tight">
                    <p className="font-semibold">{selectedContact.firstName}</p>
                    <p className="text-sm font-normal text-muted-foreground">{selectedContact.lastName}</p>
                  </DialogTitle>
                </div>
              </DialogHeader>
              <div className="flex gap-3 pt-2 justify-center">
                {selectedContact.email && (
                  <Button asChild variant="outline" size="icon" className="h-14 w-14 flex-col gap-1 rounded-xl">
                    <a href={`mailto:${selectedContact.email}`} className="flex flex-col items-center gap-1">
                      <Mail className="h-5 w-5 text-primary" />
                      <span className="text-[10px]">Email</span>
                    </a>
                  </Button>
                )}
                {phone && (
                  <>
                    <Button asChild variant="outline" size="icon" className="h-14 w-14 flex-col gap-1 rounded-xl">
                      <a href={`tel:${phone}`} className="flex flex-col items-center gap-1">
                        <Phone className="h-5 w-5 text-primary" />
                        <span className="text-[10px]">Appeler</span>
                      </a>
                    </Button>
                    <Button asChild variant="outline" size="icon" className="h-14 w-14 flex-col gap-1 rounded-xl border-green-500 text-green-600 hover:bg-green-500 hover:text-white">
                      <a href={`https://wa.me/${phone.replace("+", "")}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1">
                        <MessageCircle className="h-5 w-5" />
                        <span className="text-[10px]">WhatsApp</span>
                      </a>
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Remove participant dialog */}
      <AlertDialog open={!!participantToRemove} onOpenChange={(open) => !open && setParticipantToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Retirer {participantToRemove?.name} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Sa place sera libérée et il/elle sera notifié(e) par email. Cette action est utile par exemple après un tirage au sort pour retirer les personnes non retenues.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="removeMessage">Message envoyé au participant</Label>
            <Textarea
              id="removeMessage"
              value={removeMessage}
              onChange={(e) => setRemoveMessage(e.target.value)}
              className="mt-2"
              rows={4}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveParticipant}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={adminRemoveReservation.isPending}
            >
              {adminRemoveReservation.isPending ? "Retrait..." : "Retirer et notifier"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default OutingDetail;
