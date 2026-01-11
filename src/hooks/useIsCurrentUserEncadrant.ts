import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to check if the current logged-in user is an "encadrant"
 * based on the club_members_directory (source of truth).
 * This checks if the user's email exists in the directory with is_encadrant = true.
 */
export const useIsCurrentUserEncadrant = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-current-user-encadrant", user?.email],
    queryFn: async () => {
      if (!user?.email) return false;

      const { data, error } = await supabase
        .from("club_members_directory")
        .select("is_encadrant")
        .eq("email", user.email.toLowerCase())
        .maybeSingle();

      if (error) {
        console.error("Error checking encadrant status:", error);
        return false;
      }

      return data?.is_encadrant ?? false;
    },
    enabled: !!user?.email,
  });
};
