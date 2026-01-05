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
}

export interface ProfileDirectoryUpdate {
  phone?: string | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
}

export const useProfileDirectory = (userEmail: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: directoryProfile, isLoading, error } = useQuery({
    queryKey: ["profile-directory", userEmail],
    queryFn: async () => {
      if (!userEmail) return null;
      
      const { data, error } = await supabase
        .from("club_members_directory")
        .select("id, member_id, first_name, last_name, email, phone, birth_date, address, apnea_level, joined_at, emergency_contact_name, emergency_contact_phone, gender")
        .eq("email", userEmail.toLowerCase())
        .maybeSingle();

      if (error) throw error;
      return data as ProfileDirectoryData | null;
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
