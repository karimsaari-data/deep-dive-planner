import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type OutingType = "Fosse" | "Mer" | "Piscine" | "Étang" | "Dépollution";
export type BookingStatus = "confirmé" | "annulé" | "en_attente";
export type CarpoolOption = "none" | "driver" | "passenger";

export interface Reservation {
  id: string;
  user_id: string;
  outing_id?: string;
  status: BookingStatus;
  cancelled_at: string | null;
  carpool_option: CarpoolOption;
  carpool_seats: number;
  is_present: boolean;
  created_at: string;
  profile?: {
    first_name: string;
    last_name: string;
    email: string;
    apnea_level: string | null;
    avatar_url: string | null;
    member_status: string | null;
  };
}

export interface CoInstructor {
  user_id: string;
  profile: {
    first_name: string;
    last_name: string;
    apnea_level: string | null;
    avatar_url: string | null;
  } | null;
}

export interface Outing {
  id: string;
  title: string;
  description: string | null;
  date_time: string;
  end_date: string | null;
  location: string;
  location_id: string | null;
  organizer_id: string | null;
  outing_type: OutingType;
  max_participants: number;
  session_report: string | null;
  water_entry_time: string | null;
  water_exit_time: string | null;
  created_at: string;
  is_deleted?: boolean;
  is_archived?: boolean;
  is_staff_only?: boolean;
  is_poss_locked?: boolean;
  dive_mode?: "boat" | "shore" | null;
  boat_id?: string | null;
  confirmed_count?: number; // Real count from SECURITY DEFINER function
  waitlist_count?: number; // Real waitlist count from SECURITY DEFINER function
  co_instructors?: CoInstructor[];
  organizer?: {
    first_name: string;
    last_name: string;
    apnea_level: string | null;
  } | null;
  organizer_max_depth_eaa?: number | null;
  organizer_max_depth_eao?: number | null;
  organizer_max_participants?: number | null;
  location_details?: {
    id: string;
    name: string;
    address: string | null;
    maps_url: string | null;
    latitude: number | null;
    longitude: number | null;
    satellite_map_url?: string | null;
    bathymetric_map_url?: string | null;
  } | null;
  boat?: {
    id: string;
    name: string;
    registration_number: string | null;
    pilot_name: string | null;
    pilot_phone: string | null;
    oxygen_location: string | null;
    home_port: string | null;
  } | null;
  reservations?: Reservation[];
}

export const useOutings = (typeFilter?: OutingType | null, includePastUnarchived = false) => {
  return useQuery({
    queryKey: ["outings", typeFilter, includePastUnarchived],
    queryFn: async () => {
      const now = new Date();
      
      let query = supabase
        .from("outings")
        .select(`
          *,
          organizer:profiles!outings_organizer_id_fkey(first_name, last_name, apnea_level),
          location_details:locations(id, name, address, maps_url, latitude, longitude, photo_url, max_depth),
          co_instructors:outing_co_instructors(user_id, profile:profiles(first_name, last_name)),
          reservations(id, user_id, status, carpool_option, carpool_seats, cancelled_at, is_present, created_at, profile:profiles(first_name, last_name))
        `)
        .eq("is_deleted", false)
        .order("date_time", { ascending: true });

      if (typeFilter) {
        query = query.eq("outing_type", typeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const upcomingOutings = data?.filter(outing => {
        const endDate = outing.end_date ? new Date(outing.end_date) : new Date(outing.date_time);
        if (includePastUnarchived) {
          const recentPastUnarchived = endDate <= now && endDate >= sevenDaysAgo && outing.is_archived === false;
          return endDate > now || recentPastUnarchived;
        }
        return endDate > now;
      }) ?? [];
      
      // Fetch real confirmed counts and organizer max depths
      const outingsWithCounts = await Promise.all(
        upcomingOutings.map(async (outing) => {
          const { data: countData } = await supabase
            .rpc('get_outing_confirmed_count', { outing_uuid: outing.id });

          const { data: waitlistData } = await supabase
            .rpc('get_outing_waitlist_count', { outing_uuid: outing.id });

          // Fetch organizer max depths and max participants if organizer has apnea_level
          let maxDepthEaa = null;
          let maxDepthEao = null;
          let maxParticipants = null;

          if (outing.organizer?.apnea_level) {
            const { data: levelData } = await supabase
              .from('apnea_levels')
              .select('profondeur_max_eaa, profondeur_max_eao, max_participants_encadrement')
              .eq('code', outing.organizer.apnea_level)
              .maybeSingle();

            if (levelData) {
              maxDepthEaa = levelData.profondeur_max_eaa;
              maxDepthEao = levelData.profondeur_max_eao;
              maxParticipants = levelData.max_participants_encadrement;
            }
          }

          return {
            ...outing,
            confirmed_count: countData ?? 0,
            waitlist_count: waitlistData ?? 0,
            organizer_max_depth_eaa: maxDepthEaa,
            organizer_max_depth_eao: maxDepthEao,
            organizer_max_participants: maxParticipants,
          };
        })
      );

      return outingsWithCounts as Outing[];
    },
  });
};

export const useOuting = (outingId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["outing", outingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outings")
        .select(`
          *,
          organizer:profiles!outings_organizer_id_fkey(first_name, last_name, apnea_level),
          location_details:locations(id, name, address, maps_url, latitude, longitude, photo_url, max_depth, satellite_map_url, bathymetric_map_url),
          boat:boats(id, name, registration_number, pilot_name, pilot_phone, oxygen_location, home_port),
          co_instructors:outing_co_instructors(user_id, profile:profiles(first_name, last_name, apnea_level, avatar_url)),
          reservations(
            id,
            user_id,
            status,
            carpool_option,
            carpool_seats,
            cancelled_at,
            is_present,
            created_at,
            profile:profiles(first_name, last_name, email, apnea_level, avatar_url, member_status)
          )
        `)
        .eq("id", outingId)
        .eq("is_deleted", false)
        .maybeSingle();

      if (error) throw error;

      // Enrich reservations with apnea_level from membership_yearly_status (authoritative source)
      if (data?.reservations?.length) {
        const currentSeasonYear = new Date().getMonth() >= 8
          ? new Date().getFullYear() + 1
          : new Date().getFullYear();

        const userIds = data.reservations.map((r: any) => r.user_id);

        // Get emails from profiles to join with directory
        const { data: profileEmails } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", userIds);

        const emailByUserId = new Map((profileEmails || []).map((p: any) => [p.id, p.email?.toLowerCase()]));

        // Get directory member IDs
        const emails = [...emailByUserId.values()].filter(Boolean);
        const { data: dirMembers } = await supabase
          .from("club_members_directory")
          .select("id, email")
          .in("email", emails);

        const dirIdByEmail = new Map((dirMembers || []).map((d: any) => [d.email.toLowerCase(), d.id]));

        // Get current season levels
        const memberIds = [...dirIdByEmail.values()];
        const { data: seasonLevels } = memberIds.length
          ? await supabase
              .from("membership_yearly_status")
              .select("member_id, apnea_level")
              .eq("season_year", currentSeasonYear)
              .in("member_id", memberIds)
          : { data: [] };

        const levelByMemberId = new Map((seasonLevels || []).map((s: any) => [s.member_id, s.apnea_level]));

        // Patch each reservation's profile.apnea_level
        for (const r of data.reservations as any[]) {
          const email = emailByUserId.get(r.user_id);
          const memberId = email ? dirIdByEmail.get(email) : null;
          const seasonLevel = memberId ? levelByMemberId.get(memberId) : null;
          if (seasonLevel && r.profile) {
            r.profile.apnea_level = seasonLevel;
          }
        }
      }

      // Fetch organizer max depths and max participants if organizer has apnea_level
      if (data && data.organizer?.apnea_level) {
        const { data: levelData } = await supabase
          .from('apnea_levels')
          .select('profondeur_max_eaa, profondeur_max_eao, max_participants_encadrement')
          .eq('code', data.organizer.apnea_level)
          .maybeSingle();

        if (levelData) {
          (data as any).organizer_max_depth_eaa = levelData.profondeur_max_eaa;
          (data as any).organizer_max_depth_eao = levelData.profondeur_max_eao;
          (data as any).organizer_max_participants = levelData.max_participants_encadrement;
        }
      }

      return data as Outing | null;
    },
    enabled: !!outingId && !!user,
  });
};

export interface OutingParticipant {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  member_status: string | null;
  status?: BookingStatus;
  created_at?: string;
}

export const useMyReservations = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-reservations", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("reservations")
        .select(`
          *,
          outing:outings(
            *,
            organizer:profiles!outings_organizer_id_fkey(first_name, last_name),
            location_details:locations(id, name, address, maps_url),
            co_instructors:outing_co_instructors(user_id, profile:profiles(first_name, last_name, avatar_url))
          )
        `)
        .eq("user_id", user.id)
        .neq("status", "annulé")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Filter out reservations for deleted outings
      const filteredReservations = data?.filter(r => r.outing && !r.outing.is_deleted) ?? [];
      
      // Fetch participants for each outing using SECURITY DEFINER function
      const reservationsWithParticipants = await Promise.all(
        filteredReservations.map(async (reservation) => {
          const { data: participants } = await supabase
            .rpc('get_outing_participants', { outing_uuid: reservation.outing_id });
          
          return {
            ...reservation,
            participants: (participants ?? []) as OutingParticipant[],
          };
        })
      );
      
      return reservationsWithParticipants;
    },
    enabled: !!user,
  });
};

export const useCreateReservation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      outingId,
      carpoolOption = "none",
      carpoolSeats = 0,
    }: {
      outingId: string;
      carpoolOption?: CarpoolOption;
      carpoolSeats?: number;
    }) => {
      if (!user) throw new Error("Non connecté");

      // Check if user already has a reservation (including cancelled ones)
      const { data: existingReservation } = await supabase
        .from("reservations")
        .select("id, status")
        .eq("outing_id", outingId)
        .eq("user_id", user.id)
        .maybeSingle();

      // Check current confirmed count
      const { data: outing } = await supabase
        .from("outings")
        .select("max_participants")
        .eq("id", outingId)
        .single();

      const { count } = await supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .eq("outing_id", outingId)
        .eq("status", "confirmé");

      const isFull = (count ?? 0) >= (outing?.max_participants ?? 0);
      const newStatus = isFull ? "en_attente" : "confirmé";

      if (existingReservation) {
        // User has an existing reservation - reactivate it
        if (existingReservation.status === "confirmé") {
          throw new Error("Vous êtes déjà inscrit à cette sortie");
        }
        if (existingReservation.status === "en_attente") {
          throw new Error("Vous êtes déjà sur liste d'attente");
        }
        
        // Reactivate cancelled reservation
        const { error } = await supabase
          .from("reservations")
          .update({
            status: newStatus,
            cancelled_at: null,
            carpool_option: carpoolOption,
            carpool_seats: carpoolSeats,
          })
          .eq("id", existingReservation.id);

        if (error) throw error;
      } else {
        // Create new reservation
        const { error } = await supabase.from("reservations").insert({
          outing_id: outingId,
          user_id: user.id,
          status: newStatus,
          carpool_option: carpoolOption,
          carpool_seats: carpoolSeats,
        });

        if (error) throw error;
      }

      // Send confirmation email in background
      supabase.functions.invoke("send-reservation-confirmation", {
        body: { outingId, type: isFull ? "waitlist" : "registration" },
      }).catch(err => console.error("Error sending confirmation email:", err));

      return { waitlisted: isFull };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["outings"] });
      queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
      if (result?.waitlisted) {
        toast.info("Vous êtes sur liste d'attente");
      } else {
        toast.success("Inscription confirmée !");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de l'inscription");
    },
  });
};

export const useCancelReservation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (outingId: string) => {
      if (!user) throw new Error("Non connecté");

      const { error } = await supabase
        .from("reservations")
        .update({
          status: "annulé",
          cancelled_at: new Date().toISOString(),
        })
        .eq("outing_id", outingId)
        .eq("user_id", user.id);

      if (error) throw error;

      // Send cancellation email in background
      supabase.functions.invoke("send-reservation-confirmation", {
        body: { outingId, type: "cancellation" },
      }).catch(err => console.error("Error sending cancellation email:", err));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outings"] });
      queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
      toast.success("Inscription annulée");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de l'annulation");
    },
  });
};

export const useUpdateReservationCarpool = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      outingId,
      carpoolOption,
      carpoolSeats,
    }: {
      outingId: string;
      carpoolOption: CarpoolOption;
      carpoolSeats: number;
    }) => {
      if (!user) throw new Error("Non connecté");

      const { error } = await supabase
        .from("reservations")
        .update({
          carpool_option: carpoolOption,
          carpool_seats: carpoolSeats,
        })
        .eq("outing_id", outingId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outings"] });
      queryClient.invalidateQueries({ queryKey: ["outing"] });
      queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
      queryClient.invalidateQueries({ queryKey: ["outing-participants"] });
      toast.success("Covoiturage mis à jour");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la mise à jour du covoiturage");
    },
  });
};

export const useUpdateReservationPresence = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reservationId,
      isPresent,
    }: {
      reservationId: string;
      isPresent: boolean;
    }) => {
      const { error } = await supabase
        .from("reservations")
        .update({ is_present: isPresent })
        .eq("id", reservationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outing"] });
      queryClient.invalidateQueries({ queryKey: ["participants-emergency"] });
      toast.success("Présence mise à jour");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la mise à jour");
    },
  });
};

export const useUpdateSessionReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      outingId,
      sessionReport,
    }: {
      outingId: string;
      sessionReport: string;
    }) => {
      const { error } = await supabase
        .from("outings")
        .update({ session_report: sessionReport })
        .eq("id", outingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outing"] });
      queryClient.invalidateQueries({ queryKey: ["outings"] });
      toast.success("Compte-rendu enregistré");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    },
  });
};

export const useCreateOuting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (outing: {
      title: string;
      description?: string;
      date_time: string;
      end_date?: string;
      water_entry_time?: string;
      water_exit_time?: string;
      location: string;
      location_id?: string;
      outing_type: OutingType;
      max_participants: number;
      organizer_id?: string;
      is_staff_only?: boolean;
      carpool_option?: CarpoolOption;
      carpool_seats?: number;
      dive_mode?: "boat" | "shore";
      boat_id?: string;
    }) => {
      if (!outing.organizer_id) throw new Error("Utilisateur non connecté");

      const { data: outingId, error } = await supabase.rpc(
        "create_outing_with_organizer",
        {
          p_title: outing.title,
          p_description: outing.description ?? null,
          p_date_time: outing.date_time,
          p_end_date: outing.end_date ?? null,
          p_water_entry_time: outing.water_entry_time ?? null,
          p_water_exit_time: outing.water_exit_time ?? null,
          p_location: outing.location,
          p_location_id: outing.location_id ?? null,
          p_outing_type: outing.outing_type,
          p_max_participants: outing.max_participants,
          p_organizer_id: outing.organizer_id,
          p_is_staff_only: outing.is_staff_only ?? false,
          p_carpool_option: outing.carpool_option ?? "none",
          p_carpool_seats: outing.carpool_seats ?? 1,
          p_dive_mode: outing.dive_mode ?? null,
          p_boat_id: outing.boat_id ?? null,
        }
      );

      if (error) throw error;

      return { id: outingId as string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outings"] });
      queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
      toast.success("Sortie créée avec succès !");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la création");
    },
  });
};

export const useCancelOuting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ outingId, reason }: { outingId: string; reason?: string }) => {
      // Call the edge function to cancel and notify participants
      const { error: notifyError } = await supabase.functions.invoke("send-outing-notification", {
        body: { outingId, type: "cancellation", reason },
      });

      if (notifyError) {
        console.error("Error sending notifications:", notifyError);
      }

      // Soft delete the outing (mark as deleted for stats)
      const { error: deleteError } = await supabase
        .from("outings")
        .update({ is_deleted: true })
        .eq("id", outingId);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outings"] });
      queryClient.invalidateQueries({ queryKey: ["outing"] });
      toast.success("Sortie annulée et participants notifiés");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de l'annulation");
    },
  });
};

export const useDeleteOuting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (outingId: string) => {
      const { error } = await supabase
        .from("outings")
        .update({ is_deleted: true })
        .eq("id", outingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outings"] });
      toast.success("Sortie supprimée");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la suppression");
    },
  });
};

export const useUpdateOuting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      outingId,
      ...updates
    }: {
      outingId: string;
      title?: string;
      description?: string | null;
      date_time?: string;
      end_date?: string | null;
      water_entry_time?: string | null;
      water_exit_time?: string | null;
      location?: string;
      location_id?: string | null;
      outing_type?: OutingType;
      max_participants?: number;
    }) => {
      const { error } = await supabase
        .from("outings")
        .update(updates)
        .eq("id", outingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outings"] });
      queryClient.invalidateQueries({ queryKey: ["outing"] });
      toast.success("Sortie mise à jour");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la mise à jour");
    },
  });
};

export const useArchiveOuting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (outingId: string) => {
      const { error } = await supabase
        .from("outings")
        .update({ is_archived: true })
        .eq("id", outingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outings"] });
      queryClient.invalidateQueries({ queryKey: ["outing"] });
      toast.success("Sortie validée et archivée");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de l'archivage");
    },
  });
};

export const useLockPOSS = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (outingId: string) => {
      const { error } = await supabase
        .from("outings")
        .update({ is_poss_locked: true })
        .eq("id", outingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outings"] });
      queryClient.invalidateQueries({ queryKey: ["outing"] });
      toast.success("POSS verrouillé - Inscriptions closes");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors du verrouillage");
    },
  });
};

export const useUnlockPOSS = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (outingId: string) => {
      const { error } = await supabase
        .from("outings")
        .update({ is_poss_locked: false })
        .eq("id", outingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outings"] });
      queryClient.invalidateQueries({ queryKey: ["outing"] });
      toast.success("POSS déverrouillé - Inscriptions réouvertes");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors du déverrouillage");
    },
  });
};

export const useCoInstructedOutings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["co-instructed-outings", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("outing_co_instructors")
        .select(`
          outing:outings(
            *,
            organizer:profiles!outings_organizer_id_fkey(first_name, last_name, apnea_level),
            location_details:locations(id, name, address, maps_url),
            co_instructors:outing_co_instructors(user_id, profile:profiles(first_name, last_name)),
            reservations(id, user_id, status, carpool_option, carpool_seats, cancelled_at, is_present, created_at)
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;

      const now = new Date();
      const outings = (data || [])
        .map((d) => d.outing)
        .filter((o): o is NonNullable<typeof o> => !!o && !o.is_deleted)
        .filter((o) => {
          const endDate = o.end_date ? new Date(o.end_date) : new Date(o.date_time);
          return endDate > now;
        });

      const outingsWithCounts = await Promise.all(
        outings.map(async (outing) => {
          const { data: countData } = await supabase
            .rpc("get_outing_confirmed_count", { outing_uuid: outing.id });
          return { ...outing, confirmed_count: countData ?? 0 };
        })
      );

      return outingsWithCounts as Outing[];
    },
    enabled: !!user,
  });
};

// max_participants recalculated automatically by DB trigger trg_recalculate_max_participants
// on INSERT/DELETE in outing_co_instructors (uses membership_yearly_status as source)

export const useAddCoInstructor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ outingId, userId }: { outingId: string; userId: string }) => {
      const { error } = await supabase
        .from("outing_co_instructors")
        .insert({ outing_id: outingId, user_id: userId });
      if (error) throw error;
      // Auto-confirm co-instructor as participant (upsert to avoid duplicate)
      await supabase.from("reservations").upsert(
        { outing_id: outingId, user_id: userId, status: "confirmé" },
        { onConflict: "outing_id,user_id", ignoreDuplicates: false }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outing"] });
      queryClient.invalidateQueries({ queryKey: ["outings"] });
      queryClient.invalidateQueries({ queryKey: ["co-instructed-outings"] });
      toast.success("Co-encadrant ajouté");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de l'ajout");
    },
  });
};

export const useRemoveCoInstructor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ outingId, userId }: { outingId: string; userId: string }) => {
      const { error } = await supabase
        .from("outing_co_instructors")
        .delete()
        .eq("outing_id", outingId)
        .eq("user_id", userId);
      if (error) throw error;
      // Cancel the auto-confirmed reservation when co-instructor is removed
      await supabase
        .from("reservations")
        .update({ status: "annulé", cancelled_at: new Date().toISOString() })
        .eq("outing_id", outingId)
        .eq("user_id", userId)
        .eq("status", "confirmé");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outing"] });
      queryClient.invalidateQueries({ queryKey: ["outings"] });
      queryClient.invalidateQueries({ queryKey: ["co-instructed-outings"] });
      toast.success("Co-encadrant retiré");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la suppression");
    },
  });
};
