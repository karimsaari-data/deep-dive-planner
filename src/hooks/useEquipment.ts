import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface EquipmentCatalogItem {
  id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface EquipmentInventoryItem {
  id: string;
  catalog_id: string;
  owner_id: string;
  status: "disponible" | "prêté" | "perdu" | "cassé" | "rebuté";
  notes: string | null;
  acquired_at: string;
  created_at: string;
  updated_at: string;
  catalog?: EquipmentCatalogItem;
  owner?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface EquipmentHistoryItem {
  id: string;
  inventory_id: string;
  action_type: string;
  from_user_id: string | null;
  to_user_id: string | null;
  old_status: string | null;
  new_status: string | null;
  notes: string | null;
  created_at: string;
  created_by: string;
  from_user?: { first_name: string; last_name: string };
  to_user?: { first_name: string; last_name: string };
  created_by_user?: { first_name: string; last_name: string };
}

// Hook for equipment catalog (admin)
export const useEquipmentCatalog = () => {
  return useQuery({
    queryKey: ["equipment-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_catalog")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data as EquipmentCatalogItem[];
    },
  });
};

export const useCreateCatalogItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: { name: string; description?: string; photo_url?: string }) => {
      const { data, error } = await supabase
        .from("equipment_catalog")
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-catalog"] });
      toast.success("Article ajouté au catalogue !");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de l'ajout");
    },
  });
};

export const useDeleteCatalogItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("equipment_catalog")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-catalog"] });
      toast.success("Article supprimé du catalogue !");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la suppression");
    },
  });
};

// Hook for user's inventory
export const useMyEquipmentInventory = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-equipment-inventory", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("equipment_inventory")
        .select(`
          *,
          catalog:equipment_catalog(*)
        `)
        .eq("owner_id", user.id)
        .neq("status", "rebuté")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as EquipmentInventoryItem[];
    },
    enabled: !!user,
  });
};

// Hook for global inventory
export const useGlobalEquipmentInventory = () => {
  return useQuery({
    queryKey: ["global-equipment-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_inventory")
        .select(`
          *,
          catalog:equipment_catalog(*),
          owner:profiles!equipment_inventory_owner_id_fkey(id, first_name, last_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as EquipmentInventoryItem[];
    },
  });
};

// Hook to add equipment to inventory
export const useAddToInventory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ catalogId, notes }: { catalogId: string; notes?: string }) => {
      if (!user) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from("equipment_inventory")
        .insert({
          catalog_id: catalogId,
          owner_id: user.id,
          notes,
        })
        .select()
        .single();

      if (error) throw error;

      // Log history
      await supabase.from("equipment_history").insert({
        inventory_id: data.id,
        action_type: "acquisition",
        to_user_id: user.id,
        new_status: "disponible",
        created_by: user.id,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-equipment-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["global-equipment-inventory"] });
      toast.success("Matériel ajouté à votre inventaire !");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de l'ajout");
    },
  });
};

// Hook to transfer equipment
export const useTransferEquipment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ inventoryId, toUserId, notes }: { inventoryId: string; toUserId: string; notes?: string }) => {
      if (!user) throw new Error("Non authentifié");

      // Get current item
      const { data: item, error: fetchError } = await supabase
        .from("equipment_inventory")
        .select("*")
        .eq("id", inventoryId)
        .single();

      if (fetchError) throw fetchError;

      // Update owner
      const { error: updateError } = await supabase
        .from("equipment_inventory")
        .update({ owner_id: toUserId, status: "disponible" })
        .eq("id", inventoryId);

      if (updateError) throw updateError;

      // Log history
      await supabase.from("equipment_history").insert({
        inventory_id: inventoryId,
        action_type: "transfer",
        from_user_id: item.owner_id,
        to_user_id: toUserId,
        old_status: item.status,
        new_status: "disponible",
        notes,
        created_by: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-equipment-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["global-equipment-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-history"] });
      toast.success("Matériel transféré !");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors du transfert");
    },
  });
};

// Hook to decommission equipment
export const useDecommissionEquipment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ inventoryId, status, notes }: { inventoryId: string; status: "perdu" | "cassé" | "rebuté"; notes?: string }) => {
      if (!user) throw new Error("Non authentifié");

      // Get current item
      const { data: item, error: fetchError } = await supabase
        .from("equipment_inventory")
        .select("*")
        .eq("id", inventoryId)
        .single();

      if (fetchError) throw fetchError;

      // Update status
      const { error: updateError } = await supabase
        .from("equipment_inventory")
        .update({ status })
        .eq("id", inventoryId);

      if (updateError) throw updateError;

      // Log history
      await supabase.from("equipment_history").insert({
        inventory_id: inventoryId,
        action_type: "decommission",
        from_user_id: item.owner_id,
        old_status: item.status,
        new_status: status,
        notes,
        created_by: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-equipment-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["global-equipment-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-history"] });
      toast.success("Statut mis à jour !");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la mise à jour");
    },
  });
};

// Hook for equipment history
export const useEquipmentHistory = (inventoryId?: string) => {
  return useQuery({
    queryKey: ["equipment-history", inventoryId],
    queryFn: async () => {
      let query = supabase
        .from("equipment_history")
        .select(`
          *,
          from_user:profiles!equipment_history_from_user_id_fkey(first_name, last_name),
          to_user:profiles!equipment_history_to_user_id_fkey(first_name, last_name),
          created_by_user:profiles!equipment_history_created_by_fkey(first_name, last_name)
        `)
        .order("created_at", { ascending: false });

      if (inventoryId) {
        query = query.eq("inventory_id", inventoryId);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return data as EquipmentHistoryItem[];
    },
  });
};

// Hook to get encadrants for transfer
export const useEncadrants = () => {
  return useQuery({
    queryKey: ["encadrants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("member_status", "Encadrant")
        .order("last_name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });
};
