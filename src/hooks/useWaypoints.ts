import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type WaypointType = "parking" | "water_entry" | "water_exit" | "meeting_point";

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
  };
  return colors[type];
};
