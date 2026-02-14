import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ApneaLevel {
  id: string;
  code: string;
  name: string;
  prerogatives: string | null;
  is_instructor: boolean;
  federation: string | null;
  federation_full_name: string | null;
  profondeur_max_eaa: number | null;
  profondeur_max_eao: number | null;
  max_participants_encadrement: number | null;
  created_at: string;
}

export const useApneaLevels = () => {
  return useQuery({
    queryKey: ["apnea-levels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apnea_levels")
        .select("*")
        .order("federation", { ascending: true })
        .order("code", { ascending: true });

      if (error) throw error;
      return data as ApneaLevel[];
    },
  });
};

export const useCreateApneaLevel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (level: {
      code: string;
      name: string;
      prerogatives?: string;
      is_instructor?: boolean;
      federation?: string;
      federation_full_name?: string;
      profondeur_max_eaa?: number | null;
      profondeur_max_eao?: number | null;
      max_participants_encadrement?: number | null;
    }) => {
      const { error } = await supabase.from("apnea_levels").insert(level);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apnea-levels"] });
      toast.success("Niveau créé avec succès");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la création");
    },
  });
};

export const useUpdateApneaLevel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      code?: string;
      name?: string;
      prerogatives?: string | null;
      is_instructor?: boolean;
      federation?: string | null;
      federation_full_name?: string | null;
      profondeur_max_eaa?: number | null;
      profondeur_max_eao?: number | null;
      max_participants_encadrement?: number | null;
    }) => {
      const { error } = await supabase
        .from("apnea_levels")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apnea-levels"] });
      toast.success("Niveau mis à jour");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la mise à jour");
    },
  });
};

export const useDeleteApneaLevel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("apnea_levels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apnea-levels"] });
      toast.success("Niveau supprimé");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la suppression");
    },
  });
};
