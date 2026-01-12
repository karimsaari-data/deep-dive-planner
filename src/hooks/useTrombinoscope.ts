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

export const useTrombinoscope = () => {
  return useQuery({
    queryKey: ["trombinoscope-directory"],
    queryFn: async () => {
      // Fetch members using secure RPC function that only exposes non-sensitive fields
      const { data: members, error: membersError } = await supabase
        .rpc("get_trombinoscope_members");

      if (membersError) throw membersError;

      // Fetch all profiles to get avatar_url (matched by email)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("email, avatar_url");

      if (profilesError) throw profilesError;

      // Create a map of email -> avatar_url for quick lookup
      const avatarMap = new Map<string, string | null>();
      profiles?.forEach((p) => {
        if (p.email) {
          avatarMap.set(p.email.toLowerCase(), p.avatar_url);
        }
      });

      // Merge avatar_url into members
      const allMembers: TrombiMember[] = (members || []).map((m) => ({
        id: m.id,
        first_name: m.first_name,
        last_name: m.last_name,
        apnea_level: m.apnea_level,
        board_role: m.board_role,
        is_encadrant: m.is_encadrant ?? false,
        avatar_url: avatarMap.get((m as any).email?.toLowerCase()) || null,
      }));

      // Hierarchical weights for board roles
      const roleWeights: Record<string, number> = {
        "Président": 1,
        "Vice-Président": 2,
        "Trésorier": 3,
        "Secrétaire": 4,
        "Trésorier Adjoint": 5,
        "Secrétaire Adjoint": 6,
        "Membre du bureau": 7,
      };

      // Separate into 3 categories based on new rules:
      // 1. Bureau: has board_role (sorted by hierarchy, then alphabetically)
      // 2. Encadrants: is_encadrant = true AND no board_role
      // 3. Membres: the rest
      const bureau = allMembers
        .filter((m) => m.board_role)
        .sort((a, b) => {
          const weightA = roleWeights[a.board_role!] ?? 99;
          const weightB = roleWeights[b.board_role!] ?? 99;
          if (weightA !== weightB) return weightA - weightB;
          return a.last_name.localeCompare(b.last_name, "fr");
        });

      const encadrants = allMembers
        .filter((m) => !m.board_role && m.is_encadrant)
        .sort((a, b) => a.last_name.localeCompare(b.last_name, "fr"));

      const membres = allMembers
        .filter((m) => !m.board_role && !m.is_encadrant)
        .sort((a, b) => a.last_name.localeCompare(b.last_name, "fr"));

      return { bureau, encadrants, membres, total: allMembers.length };
    },
  });
};
