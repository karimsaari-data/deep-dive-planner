import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MembershipYearlyStatus {
  id: string;
  member_id: string;
  season_year: number;
  payment_status: boolean;
  medical_certificate_ok: boolean;
  buddies_charter_signed: boolean;
  fsgt_insurance_ok: boolean;
  is_encadrant: boolean;
  board_role: string | null;
  apnea_level: string | null;
  license_number: string | null;
  created_at: string;
  updated_at: string;
}

export type StatusField = 
  | "payment_status" 
  | "medical_certificate_ok" 
  | "buddies_charter_signed" 
  | "fsgt_insurance_ok"
  | "is_encadrant"
  | "board_role"
  | "apnea_level"
  | "license_number";

// Get current season year (2025 for season 2024/2025, etc.)
export const getCurrentSeasonYear = (): number => {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const year = now.getFullYear();
  // Season starts in September (month 8)
  // If we're before September, we're in the previous season year
  return month >= 8 ? year + 1 : year;
};

export const getSeasonLabel = (year: number): string => {
  return `${year - 1}/${year}`;
};

export const getAvailableSeasons = (): number[] => {
  const currentSeason = getCurrentSeasonYear();
  // Show current season + 2 previous seasons
  return [currentSeason, currentSeason - 1, currentSeason - 2];
};

export const useMembershipYearlyStatus = (seasonYear: number) => {
  const queryClient = useQueryClient();

  // Fetch all membership statuses for the selected season
  const { data: statuses, isLoading } = useQuery({
    queryKey: ["membership-yearly-status", seasonYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("membership_yearly_status")
        .select("*")
        .eq("season_year", seasonYear);

      if (error) throw error;
      return data as MembershipYearlyStatus[];
    },
  });

  // Get status for a specific member
  const getStatusForMember = (memberId: string): MembershipYearlyStatus | undefined => {
    return statuses?.find((s) => s.member_id === memberId);
  };

  // Upsert status (create if doesn't exist, update if exists)
  const upsertStatus = useMutation({
    mutationFn: async ({
      memberId,
      field,
      value,
    }: {
      memberId: string;
      field: StatusField;
      value: boolean | string | null;
    }) => {
      const existing = statuses?.find((s) => s.member_id === memberId);

      if (existing) {
        // Update existing record
        const { data, error } = await supabase
          .from("membership_yearly_status")
          .update({ [field]: value })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new record with the field set
        const newStatus = {
          member_id: memberId,
          season_year: seasonYear,
          payment_status: false,
          medical_certificate_ok: false,
          buddies_charter_signed: false,
          fsgt_insurance_ok: false,
          is_encadrant: false,
          board_role: null as string | null,
          apnea_level: null as string | null,
          license_number: null as string | null,
          [field]: value,
        };

        const { data, error } = await supabase
          .from("membership_yearly_status")
          .insert(newStatus)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership-yearly-status", seasonYear] });
    },
  });

  // Batch upsert for multiple fields at once
  const upsertStatusBatch = useMutation({
    mutationFn: async ({
      memberId,
      updates,
    }: {
      memberId: string;
      updates: Partial<MembershipYearlyStatus>;
    }) => {
      const existing = statuses?.find((s) => s.member_id === memberId);

      if (existing) {
        const { data, error } = await supabase
          .from("membership_yearly_status")
          .update(updates)
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const newStatus = {
          member_id: memberId,
          season_year: seasonYear,
          payment_status: false,
          medical_certificate_ok: false,
          buddies_charter_signed: false,
          fsgt_insurance_ok: false,
          is_encadrant: false,
          board_role: null,
          apnea_level: null,
          license_number: null,
          ...updates,
        };

        const { data, error } = await supabase
          .from("membership_yearly_status")
          .insert(newStatus)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership-yearly-status", seasonYear] });
    },
  });

  // Delete status for a single member for the current season
  const deleteMemberStatus = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("membership_yearly_status")
        .delete()
        .eq("member_id", memberId)
        .eq("season_year", seasonYear);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership-yearly-status", seasonYear] });
    },
  });

  // Delete all statuses for the current season
  const deleteAllStatusForSeason = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("membership_yearly_status")
        .delete()
        .eq("season_year", seasonYear);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership-yearly-status", seasonYear] });
    },
  });

  return {
    statuses,
    isLoading,
    getStatusForMember,
    upsertStatus,
    upsertStatusBatch,
    deleteMemberStatus,
    deleteAllStatusForSeason,
  };
};
