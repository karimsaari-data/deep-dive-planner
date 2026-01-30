import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Boat {
  id: string;
  name: string;
  registration_number: string | null;
  capacity: number;
  pilot_name: string | null;
  pilot_phone: string | null;
  oxygen_location: string | null;
  home_port: string | null;
  created_at: string;
  updated_at: string;
}

export type BoatInsert = Omit<Boat, "id" | "created_at" | "updated_at">;
export type BoatUpdate = Partial<BoatInsert> & { id: string };

export const useBoats = () => {
  return useQuery({
    queryKey: ["boats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boats")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Boat[];
    },
  });
};

export const useCreateBoat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (boat: BoatInsert) => {
      const { data, error } = await supabase
        .from("boats")
        .insert(boat)
        .select()
        .single();

      if (error) throw error;
      return data as Boat;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boats"] });
      toast.success("Bateau ajouté avec succès");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de l'ajout du bateau");
    },
  });
};

export const useUpdateBoat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: BoatUpdate) => {
      const { data, error } = await supabase
        .from("boats")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Boat;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boats"] });
      toast.success("Bateau mis à jour");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la mise à jour");
    },
  });
};

export const useDeleteBoat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("boats").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boats"] });
      toast.success("Bateau supprimé");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la suppression");
    },
  });
};
