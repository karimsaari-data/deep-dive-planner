import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProfileDirectoryData {
  id: string;
  member_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  birth_date: string | null;
  address: string | null;
  apnea_level: string | null;
  joined_at: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  gender: string | null;
  is_encadrant: boolean;
}

export interface ProfileDirectoryUpdate {
  phone?: string | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
}

// Get current season year
const getCurrentSeasonYear = (): number => {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  return month >= 8 ? year + 1 : year;
};

export const useProfileDirectory = (userEmail: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: directoryProfile, isLoading, error } = useQuery({
    queryKey: ["profile-directory", userEmail],
    queryFn: async () => {
      if (!userEmail) return null;
      
      // Fetch base directory data
      const { data: dirData, error: dirError } = await supabase
        .from("club_members_directory")
        .select("id, member_id, first_name, last_name, email, phone, birth_date, address, joined_at, emergency_contact_name, emergency_contact_phone, gender")
        .eq("email", userEmail.toLowerCase())
        .maybeSingle();

      if (dirError) throw dirError;
      if (!dirData) return null;

      // Fetch seasonal data from membership_yearly_status
      const currentSeason = getCurrentSeasonYear();
      const { data: statusData } = await supabase
        .from("membership_yearly_status")
        .select("apnea_level, is_encadrant")
        .eq("member_id", dirData.id)
        .eq("season_year", currentSeason)
        .maybeSingle();

      return {
        ...dirData,
        apnea_level: statusData?.apnea_level || null,
        is_encadrant: statusData?.is_encadrant ?? false,
      } as ProfileDirectoryData;
    },
    enabled: !!userEmail,
  });

  const updateDirectoryProfile = useMutation({
    mutationFn: async (updates: ProfileDirectoryUpdate) => {
      if (!directoryProfile) throw new Error("Profil non trouvé dans le fichier adhérents");

      const { error } = await supabase
        .from("club_members_directory")
        .update(updates)
        .eq("id", directoryProfile.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-directory", userEmail] });
      toast.success("Informations mises à jour");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la mise à jour");
    },
  });

  return {
    directoryProfile,
    isLoading,
    error,
    updateDirectoryProfile,
  };
};
