import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TrombiMember {
  id: string;
  first_name: string;
  last_name: string;
  apnea_level: string | null;
  board_role: string | null;
  is_encadrant: boolean;
  avatar_url: string | null;
}

// Keywords that define technical instructors/encadrants
const TECHNICAL_KEYWORDS = [
  "BPJEPS",
  "DEJEPS",
  "MEF",
  "Instructeur",
  "Moniteur",
  "IE",
  "Initiateur",
];

// Check if a member has technical qualification
const hasTechnicalQualification = (apneaLevel: string | null): boolean => {
  if (!apneaLevel) return false;
  const levelLower = apneaLevel.toLowerCase();
  return TECHNICAL_KEYWORDS.some((keyword) =>
    levelLower.includes(keyword.toLowerCase())
  );
};

// Get technical weight for sorting (lower = higher priority)
const getTechnicalWeight = (apneaLevel: string | null): number => {
  if (!apneaLevel) return 99;
  const levelLower = apneaLevel.toLowerCase();

  // Top priority: BPJEPS or DEJEPS
  if (levelLower.includes("bpjeps") || levelLower.includes("dejeps")) {
    return 1;
  }
  // Priority 2: MEF2 or Instructeur Regional/National
  if (
    levelLower.includes("mef2") ||
    levelLower.includes("instructeur") ||
    levelLower.includes("encadrant apnée de niveau 2")
  ) {
    return 2;
  }
  // Priority 3: MEF1 or Moniteur
  if (
    levelLower.includes("mef1") ||
    levelLower.includes("moniteur") ||
    levelLower.includes("encadrant apnée de niveau 1")
  ) {
    return 3;
  }
  // Priority 4: IE or Initiateur
  if (levelLower.includes("ie") || levelLower.includes("initiateur")) {
    return 4;
  }
  // Rest
  return 5;
};

export const useTrombinoscope = () => {
  return useQuery({
    queryKey: ["trombinoscope-directory"],
    queryFn: async () => {
      // Fetch members using secure RPC function that only exposes non-sensitive fields
      // including avatar_url from profiles table
      const { data: members, error: membersError } = await supabase.rpc(
        "get_trombinoscope_members"
      );

      if (membersError) throw membersError;

      // Map directly - avatar_url is now included in the RPC result
      const allMembers: TrombiMember[] = (members || []).map((m) => ({
        id: m.id,
        first_name: m.first_name,
        last_name: m.last_name,
        apnea_level: m.apnea_level,
        board_role: m.board_role,
        is_encadrant: m.is_encadrant ?? false,
        avatar_url: m.avatar_url || null,
      }));

      // Hierarchical weights for board roles
      const roleWeights: Record<string, number> = {
        Président: 1,
        "Vice-Président": 2,
        Trésorier: 3,
        Secrétaire: 4,
        "Trésorier Adjoint": 5,
        "Secrétaire Adjoint": 6,
        "Membre du bureau": 7,
      };

      // Separate into 3 categories based on new rules:
      // 1. Bureau: has board_role (sorted by hierarchy, then alphabetically)
      // 2. Encadrants: has TECHNICAL qualification in apnea_level (sorted by technical weight)
      // 3. Membres: the rest
      const bureau = allMembers
        .filter((m) => m.board_role)
        .sort((a, b) => {
          const weightA = roleWeights[a.board_role!] ?? 99;
          const weightB = roleWeights[b.board_role!] ?? 99;
          if (weightA !== weightB) return weightA - weightB;
          return a.last_name.localeCompare(b.last_name, "fr");
        });

      // Bureau member IDs (to exclude from encadrants section)
      const bureauIds = new Set(bureau.map((m) => m.id));

      // Encadrants: filter by technical qualification, exclude bureau members
      const encadrants = allMembers
        .filter(
          (m) => !bureauIds.has(m.id) && hasTechnicalQualification(m.apnea_level)
        )
        .sort((a, b) => {
          const weightA = getTechnicalWeight(a.apnea_level);
          const weightB = getTechnicalWeight(b.apnea_level);
          if (weightA !== weightB) return weightA - weightB;
          return a.last_name.localeCompare(b.last_name, "fr");
        });

      // Encadrant IDs
      const encadrantIds = new Set(encadrants.map((m) => m.id));

      // Membres: everyone else (not bureau, not encadrant)
      const membres = allMembers
        .filter((m) => !bureauIds.has(m.id) && !encadrantIds.has(m.id))
        .sort((a, b) => a.last_name.localeCompare(b.last_name, "fr"));

      return { bureau, encadrants, membres, total: allMembers.length };
    },
  });
};
