import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TrombiMember {
  id: string;
  first_name: string;
  last_name: string;
  apnea_level: string | null;
  board_role: string | null;
}

// Keywords to detect encadrants in apnea_level
const ENCADRANT_KEYWORDS = ["E1", "E2", "E3", "E4", "MEF1", "MF1", "MF2", "GP"];

const isEncadrant = (level: string | null): boolean => {
  if (!level) return false;
  const upperLevel = level.toUpperCase();
  return ENCADRANT_KEYWORDS.some(keyword => upperLevel.includes(keyword));
};

export const useTrombinoscope = () => {
  return useQuery({
    queryKey: ["trombinoscope-directory"],
    queryFn: async () => {
      // Fetch all members from club_members_directory
      const { data: members, error } = await supabase
        .from("club_members_directory")
        .select("id, first_name, last_name, apnea_level, board_role")
        .order("last_name", { ascending: true });

      if (error) throw error;

      const allMembers: TrombiMember[] = members || [];

      // Separate into 3 categories
      const bureau = allMembers
        .filter((m) => m.board_role)
        .sort((a, b) => a.last_name.localeCompare(b.last_name, "fr"));

      const encadrants = allMembers
        .filter((m) => !m.board_role && isEncadrant(m.apnea_level))
        .sort((a, b) => a.last_name.localeCompare(b.last_name, "fr"));

      const membres = allMembers
        .filter((m) => !m.board_role && !isEncadrant(m.apnea_level))
        .sort((a, b) => a.last_name.localeCompare(b.last_name, "fr"));

      return { bureau, encadrants, membres, total: allMembers.length };
    },
  });
};
