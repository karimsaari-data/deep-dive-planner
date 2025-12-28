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
  created_at: string;
  is_deleted?: boolean;
  is_archived?: boolean;
  confirmed_count?: number; // Real count from SECURITY DEFINER function
  organizer?: {
    first_name: string;
    last_name: string;
  } | null;
  location_details?: {
    id: string;
    name: string;
    address: string | null;
    maps_url: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  reservations?: Reservation[];
}

export const useOutings = (typeFilter?: OutingType | null) => {
  return useQuery({
    queryKey: ["outings", typeFilter],
    queryFn: async () => {
      const now = new Date();
      
      let query = supabase
        .from("outings")
        .select(`
          *,
          organizer:profiles!outings_organizer_id_fkey(first_name, last_name),
          location_details:locations(id, name, address, maps_url, latitude, longitude, photo_url, max_depth),
          reservations(id, user_id, status, carpool_option, carpool_seats, cancelled_at, is_present, created_at)
        `)
        .eq("is_deleted", false)
        .order("date_time", { ascending: true });

      if (typeFilter) {
        query = query.eq("outing_type", typeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Filter outings: only show future outings where end_date (or date_time) is in the future
      const upcomingOutings = data?.filter(outing => {
        const endDate = outing.end_date ? new Date(outing.end_date) : new Date(outing.date_time);
        return endDate > now;
      }) ?? [];
      
      // Fetch real confirmed counts using SECURITY DEFINER function (bypasses RLS)
      const outingsWithCounts = await Promise.all(
        upcomingOutings.map(async (outing) => {
          const { data: countData } = await supabase
            .rpc('get_outing_confirmed_count', { outing_uuid: outing.id });
          return {
            ...outing,
            confirmed_count: countData ?? 0,
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
          organizer:profiles!outings_organizer_id_fkey(first_name, last_name),
          location_details:locations(id, name, address, maps_url, latitude, longitude, photo_url, max_depth),
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
            location_details:locations(id, name, address, maps_url)
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
      location: string;
      location_id?: string;
      outing_type: OutingType;
      max_participants: number;
      organizer_id?: string;
    }) => {
      // Create the outing
      const { data: newOuting, error } = await supabase
        .from("outings")
        .insert(outing)
        .select("id")
        .single();
      
      if (error) throw error;

      // Auto-register the organizer
      if (outing.organizer_id && newOuting) {
        const { error: reservationError } = await supabase
          .from("reservations")
          .insert({
            outing_id: newOuting.id,
            user_id: outing.organizer_id,
            status: "confirmé",
            carpool_option: "none",
            carpool_seats: 0,
          });

        if (reservationError) {
          console.error("Error auto-registering organizer:", reservationError);
        }
      }

      return newOuting;
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
