import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Renvoie l'ensemble des user_id dont la licence (saison en cours) n'est pas saisie.
export const useMissingLicenseUserIds = (userIds: string[], enabled = true) => {
  const ids = [...new Set(userIds)].sort();

  return useQuery({
    queryKey: ["license-status", ids],
    queryFn: async () => {
      // RPC absente des types auto-générés (types.ts non éditable à la main)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("get_users_license_status", {
        p_user_ids: ids,
      });
      if (error) throw error;
      return new Set<string>(
        ((data ?? []) as { user_id: string; has_license: boolean }[])
          .filter((r) => !r.has_license)
          .map((r) => r.user_id)
      );
    },
    enabled: enabled && ids.length > 0,
    staleTime: 60_000,
  });
};
