import { supabase } from "@/integrations/supabase/client";

export interface OutingListItem {
  id: string;
  title: string;
  date_time: string;
  end_date: string | null;
  outing_type: string;
  max_participants: number;
  is_past: boolean;
  participant_count: number;
  organizer_name?: string | null;
}

// Outings of the year (RPC, admin only) enriched with the main organizer (encadrant principal).
export const fetchOutingsList = async (year: number): Promise<OutingListItem[]> => {
  const { data, error } = await supabase.rpc("get_outings_list", { p_year: year });
  if (error) throw error;
  const list = (data as unknown as OutingListItem[]) ?? [];
  if (list.length === 0) return list;

  // Organizer is non-blocking: the list still displays if this lookup fails
  const { data: organizers } = await supabase
    .from("outings")
    .select("id, organizer:profiles!outings_organizer_id_fkey(first_name, last_name)")
    .in("id", list.map((o) => o.id));

  const nameById = new Map<string, string>();
  (organizers ?? []).forEach((o: any) => {
    if (o.organizer) nameById.set(o.id, `${o.organizer.first_name} ${o.organizer.last_name}`.trim());
  });

  return list.map((o) => ({ ...o, organizer_name: nameById.get(o.id) ?? null }));
};
