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
  registrants?: OutingRegistrant[];
}

export interface OutingRegistrant {
  name: string;
  present: boolean;
}

// Outings of the year (RPC, admin only) enriched with the main organizer (encadrant principal).
export const fetchOutingsList = async (year: number): Promise<OutingListItem[]> => {
  const { data, error } = await supabase.rpc("get_outings_list", { p_year: year });
  if (error) throw error;
  const list = (data as unknown as OutingListItem[]) ?? [];
  if (list.length === 0) return list;

  // Organizer is non-blocking: the list still displays if this lookup fails
  const ids = list.map((o) => o.id);
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10));

  const [{ data: organizers }, reservationRows, historicalRows] = await Promise.all([
    supabase
      .from("outings")
      .select("id, organizer:profiles!outings_organizer_id_fkey(first_name, last_name)")
      .in("id", ids),
    // Chunked to stay under the 1000-row API limit
    Promise.all(chunks.map((c) =>
      supabase
        .from("reservations")
        .select("outing_id, is_present, user:profiles!reservations_user_id_fkey(first_name, last_name)")
        .eq("status", "confirmé")
        .in("outing_id", c)
    )),
    Promise.all(chunks.map((c) =>
      supabase
        .from("historical_outing_participants")
        .select("outing_id, member:club_members_directory(first_name, last_name)")
        .in("outing_id", c)
    )),
  ]);

  const registrantsById = new Map<string, OutingRegistrant[]>();
  const addRegistrant = (outingId: string, person: any, present: boolean) => {
    if (!person) return;
    const arr = registrantsById.get(outingId) ?? [];
    arr.push({ name: `${person.first_name} ${person.last_name}`.trim(), present });
    registrantsById.set(outingId, arr);
  };
  reservationRows.forEach((r) => (r.data ?? []).forEach((row: any) => addRegistrant(row.outing_id, row.user, !!row.is_present)));
  historicalRows.forEach((r) => (r.data ?? []).forEach((row: any) => addRegistrant(row.outing_id, row.member, true)));

  const nameById = new Map<string, string>();
  (organizers ?? []).forEach((o: any) => {
    if (o.organizer) nameById.set(o.id, `${o.organizer.first_name} ${o.organizer.last_name}`.trim());
  });

  return list.map((o) => ({
    ...o,
    organizer_name: nameById.get(o.id) ?? null,
    registrants: (registrantsById.get(o.id) ?? []).sort((a, b) => a.name.localeCompare(b.name, "fr")),
  }));
};
