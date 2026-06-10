import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClubCalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string | null;
  isAllDay: boolean;
  location: string | null;
  description: string | null;
}

export const useClubCalendar = () => {
  return useQuery({
    queryKey: ["club-calendar"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-club-calendar");
      if (error) throw error;
      return data as ClubCalendarEvent[];
    },
    staleTime: 60 * 60 * 1000,  // 1h cache
    gcTime: 2 * 60 * 60 * 1000,
    retry: 1,
  });
};
