import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Dernières photos de sorties (galerie souvenirs), pour les vignettes du hero. */
export const useRecentOutingPhotos = (count = 3) =>
  useQuery({
    queryKey: ["recent-outing-photos", count],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outings")
        .select("photos, date_time")
        .eq("is_deleted", false)
        .neq("photos", "{}")
        .order("date_time", { ascending: false })
        .limit(count);
      if (error) throw error;

      // Une photo par sortie (la plus récente) pour varier les vignettes
      return (data ?? [])
        .map((o) => (o.photos ?? [])[0])
        .filter((url): url is string => !!url);
    },
  });
