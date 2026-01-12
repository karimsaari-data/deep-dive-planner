import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MemberForSelection {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

/**
 * Hook to fetch members list for encadrant use (historical outing entry).
 * Uses the get_trombinoscope_members RPC which is accessible to authenticated users.
 */
export const useMembersForEncadrant = () => {
  return useQuery({
    queryKey: ["members-for-encadrant"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_trombinoscope_members");

      if (error) throw error;

      // Map to the simplified structure needed for selection
      return (data || []).map((m) => ({
        id: m.id,
        first_name: m.first_name,
        last_name: m.last_name,
        email: m.email,
      })) as MemberForSelection[];
    },
  });
};
