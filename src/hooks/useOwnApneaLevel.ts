import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OwnApneaLevelStatus {
  apnea_level: string | null;
  level_card_path: string | null;
  level_card_uploaded_at: string | null;
}

export const useOwnApneaLevel = (seasonYear: number, memberId: string | undefined, userEmail?: string) => {
  const queryClient = useQueryClient();

  const { data: levelStatus } = useQuery({
    queryKey: ["own-apnea-level", memberId, seasonYear],
    queryFn: async () => {
      if (!memberId) return null;
      const { data, error } = await supabase
        .from("membership_yearly_status")
        .select("apnea_level, level_card_path, level_card_uploaded_at")
        .eq("member_id", memberId)
        .eq("season_year", seasonYear)
        .maybeSingle();

      if (error) throw error;
      return data as OwnApneaLevelStatus | null;
    },
    enabled: !!memberId,
  });

  const saveLevel = useMutation({
    mutationFn: async ({ file, level }: { file: File; level: string }) => {
      if (!memberId) throw new Error("Fiche adhérent introuvable");

      const ext = file.name.split(".").pop() || "pdf";
      const path = `${memberId}/${seasonYear}/niveau.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("licenses")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      // RPC absente des types générés
      const { error: rpcError } = await (supabase.rpc as any)("upsert_own_apnea_level", {
        p_season_year: seasonYear,
        p_apnea_level: level,
        p_level_card_path: path,
      });
      if (rpcError) throw rpcError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["own-apnea-level", memberId, seasonYear] });
      queryClient.invalidateQueries({ queryKey: ["profile-directory", userEmail] });
      toast.success("Niveau mis à jour");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la mise à jour du niveau");
    },
  });

  return { levelStatus, saveLevel };
};
