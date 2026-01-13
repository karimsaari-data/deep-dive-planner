import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to check if the current logged-in user is an "encadrant"
 * based on the club_members_directory (source of truth).
 * Uses a SECURITY DEFINER function to bypass RLS restrictions.
 */
export const useIsCurrentUserEncadrant = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-current-user-encadrant", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase.rpc("is_current_user_encadrant");

      if (error) {
        console.error("Error checking encadrant status:", error);
        return false;
      }

      return data ?? false;
    },
    enabled: !!user?.id,
  });
};
