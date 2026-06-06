import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TrombiMember {
  id: string;
  first_name: string;
  last_name: string;
  apnea_level: string | null;
  board_role: string | null;
  is_encadrant: boolean;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  outings_count: number;
}

export interface FishLevel {
  name: string;
  min: number;
  ring: string;       // Tailwind ring color class
  shadow: string;     // Tailwind shadow color class
  label: string;      // color for badge text
  bg: string;         // badge bg
  dot: string;        // filled dot color for legend
}

export const FISH_LEVELS: FishLevel[] = [
  { name: "Inactif",    min: 0,  ring: "ring-gray-300",    shadow: "shadow-gray-300/40",    label: "text-gray-500",    bg: "bg-gray-100",    dot: "bg-gray-300"    },
  { name: "Castagnole", min: 1,  ring: "ring-blue-400",    shadow: "shadow-blue-400/40",    label: "text-blue-600",    bg: "bg-blue-50",     dot: "bg-blue-400"    },
  { name: "Girelle",    min: 4,  ring: "ring-cyan-400",    shadow: "shadow-cyan-400/40",    label: "text-cyan-600",    bg: "bg-cyan-50",     dot: "bg-cyan-400"    },
  { name: "Rouget",     min: 8,  ring: "ring-orange-500",  shadow: "shadow-orange-500/40",  label: "text-orange-600",  bg: "bg-orange-50",   dot: "bg-orange-500"  },
  { name: "Poulpe",     min: 13, ring: "ring-fuchsia-500", shadow: "shadow-fuchsia-500/40", label: "text-fuchsia-700", bg: "bg-fuchsia-50",  dot: "bg-fuchsia-500" },
  { name: "Barracuda",  min: 20, ring: "ring-red-500",     shadow: "shadow-red-500/40",     label: "text-red-700",     bg: "bg-red-50",      dot: "bg-red-500"     },
  { name: "Mérou",      min: 30, ring: "ring-amber-400",   shadow: "shadow-amber-400/40",   label: "text-amber-700",   bg: "bg-amber-50",    dot: "bg-amber-400"   },
];

export const getFishLevel = (count: number): FishLevel => {
  for (let i = FISH_LEVELS.length - 1; i >= 0; i--) {
    if (count >= FISH_LEVELS[i].min) return FISH_LEVELS[i];
  }
  return FISH_LEVELS[0];
};

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

      // Fetch current year presence counts
      const currentYear = new Date().getFullYear();
      const startOfYear = `${currentYear}-01-01T00:00:00`;
      const endOfYear = `${currentYear}-12-31T23:59:59`;
      const nowIso = new Date().toISOString();

      // Presences from regular reservations (user_id → profiles.email)
      const { data: reservationPresences } = await supabase
        .from("reservations")
        .select("user_id, outing:outings!inner(date_time)")
        .eq("status", "confirmé")
        .eq("is_present", true)
        .gte("outing.date_time", startOfYear)
        .lte("outing.date_time", endOfYear)
        .lt("outing.date_time", nowIso);

      // Profiles to map user_id → email
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email");

      const profileEmailById = new Map((profiles || []).map((p) => [p.id, p.email?.toLowerCase() || ""]));

      // Count presences per email
      const countByEmail = new Map<string, number>();
      (reservationPresences || []).forEach((r: any) => {
        const email = profileEmailById.get(r.user_id);
        if (email) countByEmail.set(email, (countByEmail.get(email) || 0) + 1);
      });

      // Historical outing participants for current year
      const { data: historicalPresences } = await supabase
        .from("historical_outing_participants")
        .select("member_id, outing:outings!inner(date_time), member:club_members_directory(email)")
        .gte("outing.date_time", startOfYear)
        .lte("outing.date_time", endOfYear)
        .lt("outing.date_time", nowIso);

      (historicalPresences || []).forEach((hp: any) => {
        const email = hp.member?.email?.toLowerCase();
        if (email) countByEmail.set(email, (countByEmail.get(email) || 0) + 1);
      });

      // Map directly - avatar_url is now included in the RPC result
      const allMembers: TrombiMember[] = (members || []).map((m) => ({
        id: m.id,
        first_name: m.first_name,
        last_name: m.last_name,
        apnea_level: m.apnea_level,
        board_role: m.board_role,
        is_encadrant: m.is_encadrant ?? false,
        email: m.email || null,
        phone: (m as { phone?: string }).phone || null,
        avatar_url: m.avatar_url || null,
        outings_count: countByEmail.get(m.email?.toLowerCase() || "") || 0,
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

      // Bureau member IDs (for excluding from Membres section)
      const bureauIds = new Set(bureau.map((m) => m.id));

      // Encadrants: filter by is_encadrant field
      // Bureau members who are also encadrants will appear in BOTH sections
      // apnea_level is only used for sorting, not filtering
      const encadrants = allMembers
        .filter((m) => m.is_encadrant)
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
