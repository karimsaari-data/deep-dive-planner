import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SeasonRecord {
  season_year: number;
  payment_status: boolean;
  medical_certificate_ok: boolean;
  buddies_charter_signed: boolean;
  fsgt_insurance_ok: boolean;
  license_number: string | null;
  apnea_level: string | null;
}

export interface MemberHistory {
  id: string;
  member_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  joined_at: string | null;
  departure_date: string | null;
  seasons: SeasonRecord[];
}

// Vue consolidée multi-saisons : une ligne par adhérent avec toutes ses
// saisons connues (membership_yearly_status), séparée en actifs / partis
// côté composant selon departure_date.
export const useMembershipHistory = () => {
  return useQuery({
    queryKey: ["membership-history"],
    queryFn: async () => {
      const { data: members, error: membersError } = await supabase
        .from("club_members_directory")
        .select("id, member_id, first_name, last_name, email, phone, joined_at, departure_date")
        .order("joined_at", { ascending: true, nullsFirst: false });
      if (membersError) throw membersError;

      const { data: profiles } = await supabase.from("profiles").select("email, avatar_url");
      const avatarByEmail = new Map(
        (profiles || []).map((p) => [p.email?.toLowerCase(), p.avatar_url])
      );

      const { data: statuses, error: statusesError } = await supabase
        .from("membership_yearly_status")
        .select("member_id, season_year, payment_status, medical_certificate_ok, buddies_charter_signed, fsgt_insurance_ok, license_number, apnea_level")
        .order("season_year", { ascending: true });
      if (statusesError) throw statusesError;

      const seasonsByMember = new Map<string, SeasonRecord[]>();
      for (const s of statuses || []) {
        const list = seasonsByMember.get(s.member_id) || [];
        list.push({
          season_year: s.season_year,
          payment_status: s.payment_status,
          medical_certificate_ok: s.medical_certificate_ok,
          buddies_charter_signed: s.buddies_charter_signed,
          fsgt_insurance_ok: s.fsgt_insurance_ok,
          license_number: s.license_number,
          apnea_level: s.apnea_level,
        });
        seasonsByMember.set(s.member_id, list);
      }

      const history: MemberHistory[] = (members || []).map((m) => ({
        ...m,
        avatar_url: avatarByEmail.get(m.email?.toLowerCase()) || null,
        seasons: seasonsByMember.get(m.id) || [],
      }));

      // Already sorted by joined_at ascending (plus anciens en haut) via la requête.
      return {
        active: history.filter((m) => !m.departure_date),
        departed: history.filter((m) => !!m.departure_date),
      };
    },
  });
};
