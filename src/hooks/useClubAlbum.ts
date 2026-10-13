import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AlbumPhoto {
  url: string;
  outingId: string;
  title: string;
  outingType: string;
  dateTime: string;
  location: string;
}

/** Toutes les photos de sorties du club, visibles par tous les membres connectés. */
export const useClubAlbum = () =>
  useQuery({
    queryKey: ["club-album"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<AlbumPhoto[]> => {
      const { data, error } = await supabase
        .from("outings")
        .select("id, title, outing_type, date_time, location, photos, location_details:locations(name)")
        .eq("is_deleted", false)
        .neq("photos", "{}")
        .order("date_time", { ascending: false });
      if (error) throw error;

      return (data ?? []).flatMap((o) =>
        (o.photos ?? []).filter(Boolean).map((url) => ({
          url,
          outingId: o.id,
          title: o.title,
          outingType: o.outing_type,
          dateTime: o.date_time,
          location: o.location_details?.name || o.location,
        }))
      );
    },
  });
