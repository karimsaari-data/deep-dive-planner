import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TrombiMember {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  member_status: string | null;
  apnea_level: string | null;
  outing_count: number;
}

export const useTrombinoscope = () => {
  return useQuery({
    queryKey: ["trombinoscope"],
    queryFn: async () => {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url, member_status, apnea_level");

      if (profilesError) throw profilesError;

      // Fetch reservation counts per user (only confirmed and present)
      const { data: reservations, error: reservationsError } = await supabase
        .from("reservations")
        .select("user_id")
        .eq("status", "confirmé")
        .eq("is_present", true);

      if (reservationsError) throw reservationsError;

      // Count outings per user
      const outingCounts: Record<string, number> = {};
      reservations?.forEach((r) => {
        outingCounts[r.user_id] = (outingCounts[r.user_id] || 0) + 1;
      });

      // Map profiles with outing counts
      const membersWithCounts: TrombiMember[] = (profiles || []).map((p) => ({
        ...p,
        outing_count: outingCounts[p.id] || 0,
      }));

      // Separate encadrants and members
      const encadrants = membersWithCounts
        .filter((m) => m.member_status === "Encadrant")
        .sort((a, b) => b.outing_count - a.outing_count);

      const membres = membersWithCounts
        .filter((m) => m.member_status !== "Encadrant")
        .sort((a, b) => b.outing_count - a.outing_count);

      return { encadrants, membres };
    },
  });
};
