import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ApneaLevel {
  id: string;
  code: string;
  name: string;
  prerogatives: string | null;
  is_instructor: boolean;
  federation: string | null;
  federation_full_name: string | null;
  created_at: string;
}

export const useApneaLevels = () => {
  return useQuery({
    queryKey: ["apnea-levels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apnea_levels")
        .select("*")
        .order("federation", { ascending: true })
        .order("code", { ascending: true });

      if (error) throw error;
      return data as ApneaLevel[];
    },
  });
};
