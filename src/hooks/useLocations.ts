import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Location {
  id: string;
  name: string;
  address: string | null;
  type: string | null;
  maps_url: string | null;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
  max_depth: number | null;
  comments: string | null;
  satellite_map_url: string | null;
  bathymetric_map_url: string | null;
  created_at: string;
}

export const useLocations = () => {
  return useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Location[];
    },
  });
};

export const useCreateLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (location: {
      name: string;
      address?: string;
      type?: string;
      maps_url?: string;
    }) => {
      const { error } = await supabase.from("locations").insert(location);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Lieu créé avec succès !");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la création");
    },
  });
};

export const useUpdateLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      address?: string;
      type?: string;
      maps_url?: string;
      photo_url?: string;
      max_depth?: number;
      comments?: string;
      satellite_map_url?: string;
      bathymetric_map_url?: string;
    }) => {
      const { error } = await supabase
        .from("locations")
        .update(updates)
        .eq("id", id);
      if (error) throw error;

      // If maps_url was updated, extract new coordinates
      if (updates.maps_url) {
        console.log("Maps URL updated, extracting new coordinates...");
        try {
          const { error: fnError } = await supabase.functions.invoke("extract-coordinates", {
            body: { locationId: id, forceUpdate: true },
          });
          if (fnError) {
            console.error("Error extracting coordinates:", fnError);
          }
        } catch (err) {
          console.error("Failed to call extract-coordinates:", err);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Lieu mis à jour !");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la mise à jour");
    },
  });
};

export const useDeleteLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("locations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Lieu supprimé !");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la suppression");
    },
  });
};
