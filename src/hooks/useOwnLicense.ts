import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OwnLicenseStatus {
  license_number: string | null;
  license_expiry_date: string | null;
  license_document_path: string | null;
  license_uploaded_at: string | null;
}

export const useOwnLicense = (seasonYear: number, memberId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: license, isLoading } = useQuery({
    queryKey: ["own-license", memberId, seasonYear],
    queryFn: async () => {
      if (!memberId) return null;
      const { data, error } = await supabase
        .from("membership_yearly_status")
        .select("license_number, license_expiry_date, license_document_path, license_uploaded_at")
        .eq("member_id", memberId)
        .eq("season_year", seasonYear)
        .maybeSingle();

      if (error) throw error;
      return data as OwnLicenseStatus | null;
    },
    enabled: !!memberId,
  });

  const saveLicense = useMutation({
    mutationFn: async ({
      file,
      licenseNumber,
      expiryDate,
    }: {
      file: File;
      licenseNumber: string;
      expiryDate: string;
    }) => {
      if (!memberId) throw new Error("Fiche adhérent introuvable");

      const ext = file.name.split(".").pop() || "pdf";
      const path = `${memberId}/${seasonYear}/licence.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("licenses")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { error: rpcError } = await supabase.rpc("upsert_own_license", {
        p_season_year: seasonYear,
        p_license_number: licenseNumber,
        p_license_expiry_date: expiryDate,
        p_license_document_path: path,
      });
      if (rpcError) throw rpcError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["own-license", memberId, seasonYear] });
      toast.success("Licence enregistrée");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de l'enregistrement de la licence");
    },
  });

  return { license, isLoading, saveLicense };
};
