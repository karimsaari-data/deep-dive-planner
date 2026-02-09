import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type WaypointType = "parking" | "water_entry" | "water_exit" | "meeting_point" | "dive_zone" | "toilet";

export interface Waypoint {
  id: string;
  site_id: string;
  name: string;
  latitude: number;
  longitude: number;
  point_type: WaypointType;
  created_at: string;
}

export type WaypointInsert = Omit<Waypoint, "id" | "created_at">;
export type WaypointUpdate = Partial<WaypointInsert> & { id: string };

export const useWaypoints = (siteId?: string) => {
  return useQuery({
    queryKey: ["waypoints", siteId],
    queryFn: async () => {
      if (!siteId) return [];

      const { data, error } = await supabase
        .from("site_waypoints")
        .select("*")
        .eq("site_id", siteId)
        .order("point_type", { ascending: true });

      if (error) throw error;
      return data as Waypoint[];
    },
    enabled: !!siteId,
  });
};

export const useCreateWaypoint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (waypoint: WaypointInsert) => {
      const { data, error } = await supabase
        .from("site_waypoints")
        .insert(waypoint)
        .select()
        .single();

      if (error) throw error;
      return data as Waypoint;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["waypoints", variables.site_id] });
      toast.success("Point de sécurité ajouté");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de l'ajout du point");
    },
  });
};

export const useDeleteWaypoint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, siteId }: { id: string; siteId: string }) => {
      const { error } = await supabase.from("site_waypoints").delete().eq("id", id);

      if (error) throw error;
      return siteId;
    },
    onSuccess: (siteId) => {
      queryClient.invalidateQueries({ queryKey: ["waypoints", siteId] });
      toast.success("Point de sécurité supprimé");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la suppression");
    },
  });
};

// Helper to get French label for waypoint types
export const getWaypointLabel = (type: WaypointType): string => {
  const labels: Record<WaypointType, string> = {
    parking: "Parking",
    water_entry: "Mise à l'eau",
    water_exit: "Sortie secours",
    meeting_point: "Point de RDV",
    dive_zone: "Zone de plongée",
    toilet: "Toilettes",
  };
  return labels[type];
};

// Helper to get icon color for waypoint types
export const getWaypointColor = (type: WaypointType): string => {
  const colors: Record<WaypointType, string> = {
    parking: "#6366f1", // indigo
    water_entry: "#22c55e", // green
    water_exit: "#ef4444", // red
    meeting_point: "#f59e0b", // amber
    dive_zone: "#0ea5e9", // sky blue
    toilet: "#8b5cf6", // violet
  };
  return colors[type];
};

// Helper to get SVG icon for waypoint types
export const getWaypointIcon = (type: WaypointType): string => {
  const icons: Record<WaypointType, string> = {
    parking: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg>`,
    water_entry: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>`,
    water_exit: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/><path d="M3 5v14"/></svg>`,
    meeting_point: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7 6 13 6 13s6-6 6-13Z"/><circle cx="12" cy="8" r="2"/></svg>`,
    dive_zone: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>`,
    toilet: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><path d="M3 10h18"/><path d="M5 6h14a2 2 0 0 1 2 2v2H3V8a2 2 0 0 1 2-2Z"/><path d="M4 10l1.5 7.5a2 2 0 0 0 2 1.5h9a2 2 0 0 0 2-1.5L20 10"/></svg>`,
  };
  return icons[type];
};
