import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type OutingType = "Fosse" | "Mer" | "Piscine" | "Étang";

export interface Outing {
  id: string;
  title: string;
  description: string | null;
  date_time: string;
  location: string;
  organizer_id: string | null;
  outing_type: OutingType;
  max_participants: number;
  created_at: string;
  organizer?: {
    first_name: string;
    last_name: string;
  } | null;
  reservations?: { user_id: string }[];
}

export const useOutings = (typeFilter?: OutingType | null) => {
  return useQuery({
    queryKey: ["outings", typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("outings")
        .select(`
          *,
          organizer:profiles!outings_organizer_id_fkey(first_name, last_name),
          reservations(user_id)
        `)
        .gte("date_time", new Date().toISOString())
        .order("date_time", { ascending: true });

      if (typeFilter) {
        query = query.eq("outing_type", typeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Outing[];
    },
  });
};

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
            organizer:profiles!outings_organizer_id_fkey(first_name, last_name)
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCreateReservation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (outingId: string) => {
      if (!user) throw new Error("Non connecté");

      const { error } = await supabase.from("reservations").insert({
        outing_id: outingId,
        user_id: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outings"] });
      queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
      toast.success("Inscription confirmée !");
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
        .delete()
        .eq("outing_id", outingId)
        .eq("user_id", user.id);

      if (error) throw error;
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

export const useCreateOuting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (outing: {
      title: string;
      description?: string;
      date_time: string;
      location: string;
      outing_type: OutingType;
      max_participants: number;
      organizer_id?: string;
    }) => {
      const { error } = await supabase.from("outings").insert(outing);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outings"] });
      toast.success("Sortie créée avec succès !");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la création");
    },
  });
};
