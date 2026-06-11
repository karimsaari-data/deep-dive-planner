import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Carpool {
  id: string;
  outing_id: string;
  driver_id: string;
  departure_time: string;
  available_seats: number;
  meeting_point: string;
  maps_link: string | null;
  notes: string | null;
  created_at: string;
  driver?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    phone: string | null;
  };
  passengers?: CarpoolPassenger[];
}

export interface CarpoolPassenger {
  id: string;
  carpool_id: string;
  passenger_id: string;
  created_at: string;
  passenger?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
}

export const useCarpools = (outingId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["carpools", outingId],
    queryFn: async () => {
      // Fetch carpools
      const { data: carpools, error } = await supabase
        .from("carpools")
        .select("*")
        .eq("outing_id", outingId)
        .order("departure_time", { ascending: true });

      if (error) throw error;
      if (!carpools || carpools.length === 0) return [];

      // Fetch driver profiles using separate query
      const driverIds = [...new Set(carpools.map((c) => c.driver_id))];
      const { data: drivers, error: driversError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url, phone")
        .in("id", driverIds);

      if (driversError) {
        console.warn("Could not fetch driver profiles:", driversError);
      } else {
        console.log("✅ Drivers fetched:", drivers);
      }

      const driverMap = new Map((drivers || []).map((d) => [d.id, d]));
      console.log("📊 Driver map:", driverMap);

      // Fetch passengers for all carpools
      const carpoolIds = carpools.map((c) => c.id);
      const { data: allPassengers, error: passError } = await supabase
        .from("carpool_passengers")
        .select("*")
        .in("carpool_id", carpoolIds);

      if (passError) {
        console.warn("Could not fetch passengers:", passError);
      }

      // Fetch passenger profiles
      const passengerIds = [...new Set((allPassengers || []).map((p) => p.passenger_id))];
      const { data: passengerProfiles } = passengerIds.length > 0
        ? await supabase.from("profiles").select("id, first_name, last_name, avatar_url").in("id", passengerIds)
        : { data: [] };

      const passengerProfileMap = new Map((passengerProfiles || []).map((p) => [p.id, p] as const));

      // Build the response
      return carpools.map((carpool) => {
        const driver = driverMap.get(carpool.driver_id);
        console.log(`🚗 Carpool ${carpool.id} - driver_id: ${carpool.driver_id}, driver found:`, driver);
        return {
          ...carpool,
          driver: driver ? {
            id: driver.id,
            first_name: driver.first_name,
            last_name: driver.last_name,
            avatar_url: driver.avatar_url,
            phone: driver.phone,
          } : undefined,
          passengers: (allPassengers || [])
            .filter((p) => p.carpool_id === carpool.id)
            .map((p) => ({
              ...p,
              passenger: passengerProfileMap.get(p.passenger_id) || undefined,
            })),
        };
      }) as Carpool[];
    },
    enabled: !!outingId && !!user,
  });
};

export const useUserCarpool = (outingId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-carpool", outingId, user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("carpools")
        .select("*")
        .eq("outing_id", outingId)
        .eq("driver_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Fetch driver profile (the current user's profile)
      const { data: driver } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url, phone")
        .eq("id", user.id)
        .single();

      // Fetch passengers for this carpool
      const { data: passengers } = await supabase
        .from("carpool_passengers")
        .select("*")
        .eq("carpool_id", data.id);

      // Fetch passenger profiles
      const passengerIds = (passengers || []).map((p) => p.passenger_id);
      const { data: passengerProfiles } = passengerIds.length > 0
        ? await supabase.from("profiles").select("id, first_name, last_name, avatar_url").in("id", passengerIds)
        : { data: [] };

      const passengerProfileMap = new Map((passengerProfiles || []).map((p) => [p.id, p]));

      return {
        ...data,
        driver: driver ? {
          id: driver.id,
          first_name: driver.first_name,
          last_name: driver.last_name,
          avatar_url: driver.avatar_url,
          phone: driver.phone,
        } : undefined,
        passengers: (passengers || []).map((p) => ({
          ...p,
          passenger: passengerProfileMap.get(p.passenger_id) || undefined,
        })),
      } as Carpool;
    },
    enabled: !!outingId && !!user,
  });
};

export const useUserCarpoolBooking = (outingId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-carpool-booking", outingId, user?.id],
    queryFn: async () => {
      if (!user) return null;

      // First get carpools for this outing
      const { data: carpools } = await supabase
        .from("carpools")
        .select("id, outing_id, driver_id, departure_time, meeting_point, maps_link")
        .eq("outing_id", outingId);

      if (!carpools || carpools.length === 0) return null;

      const carpoolIds = carpools.map((c) => c.id);

      // Check if user is a passenger in any of these carpools
      const { data: booking, error } = await supabase
        .from("carpool_passengers")
        .select("*")
        .eq("passenger_id", user.id)
        .in("carpool_id", carpoolIds)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      if (!booking) return null;

      // Get the carpool and driver info
      const carpool = carpools.find((c) => c.id === booking.carpool_id);
      if (!carpool) return null;

      const { data: driver } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", carpool.driver_id)
        .single();

      return {
        ...booking,
        carpool: {
          ...carpool,
          driver,
        },
      };
    },
    enabled: !!outingId && !!user,
  });
};

export const useCreateCarpool = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      outingId,
      departureTime,
      availableSeats,
      meetingPoint,
      mapsLink,
      notes,
    }: {
      outingId: string;
      departureTime: string;
      availableSeats: number;
      meetingPoint: string;
      mapsLink?: string;
      notes?: string;
    }) => {
      if (!user) throw new Error("Non connecté");

      const { data, error } = await supabase
        .from("carpools")
        .insert({
          outing_id: outingId,
          driver_id: user.id,
          departure_time: departureTime,
          available_seats: availableSeats,
          meeting_point: meetingPoint,
          maps_link: mapsLink || null,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["carpools", variables.outingId] });
      queryClient.invalidateQueries({ queryKey: ["user-carpool", variables.outingId] });
      toast.success("Votre trajet a été créé !");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la création du trajet");
    },
  });
};

export const useUpdateCarpool = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      carpoolId,
      outingId,
      ...updates
    }: {
      carpoolId: string;
      outingId: string;
      departureTime?: string;
      availableSeats?: number;
      meetingPoint?: string;
      mapsLink?: string | null;
      notes?: string | null;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (updates.departureTime !== undefined) updateData.departure_time = updates.departureTime;
      if (updates.availableSeats !== undefined) updateData.available_seats = updates.availableSeats;
      if (updates.meetingPoint !== undefined) updateData.meeting_point = updates.meetingPoint;
      if (updates.mapsLink !== undefined) updateData.maps_link = updates.mapsLink;
      if (updates.notes !== undefined) updateData.notes = updates.notes;

      const { error } = await supabase
        .from("carpools")
        .update(updateData)
        .eq("id", carpoolId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["carpools", variables.outingId] });
      queryClient.invalidateQueries({ queryKey: ["user-carpool", variables.outingId] });
      toast.success("Trajet mis à jour");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la mise à jour");
    },
  });
};

export const useDeleteCarpool = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ carpoolId, outingId }: { carpoolId: string; outingId: string }) => {
      const { error } = await supabase
        .from("carpools")
        .delete()
        .eq("id", carpoolId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["carpools", variables.outingId] });
      queryClient.invalidateQueries({ queryKey: ["user-carpool", variables.outingId] });
      queryClient.invalidateQueries({ queryKey: ["user-carpool-booking", variables.outingId] });
      toast.success("Trajet supprimé");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la suppression");
    },
  });
};

export const useBookCarpool = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ carpoolId, outingId }: { carpoolId: string; outingId: string }) => {
      if (!user) throw new Error("Non connecté");

      // Check if already booked in another carpool
      const { data: existingBooking } = await supabase
        .from("carpool_passengers")
        .select(`
          id,
          carpool:carpools!inner(outing_id)
        `)
        .eq("passenger_id", user.id)
        .eq("carpool.outing_id", outingId)
        .maybeSingle();

      if (existingBooking) {
        throw new Error("Vous êtes déjà inscrit dans un covoiturage pour cette sortie");
      }

      // Check available seats
      const { data: carpool, error: carpoolError } = await supabase
        .from("carpools")
        .select(`
          available_seats,
          passengers:carpool_passengers(id)
        `)
        .eq("id", carpoolId)
        .single();

      if (carpoolError) throw carpoolError;

      const takenSeats = carpool.passengers?.length ?? 0;
      if (takenSeats >= carpool.available_seats) {
        throw new Error("Plus de places disponibles dans ce véhicule");
      }

      const { error } = await supabase
        .from("carpool_passengers")
        .insert({
          carpool_id: carpoolId,
          passenger_id: user.id,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["carpools", variables.outingId] });
      queryClient.invalidateQueries({ queryKey: ["user-carpool-booking", variables.outingId] });
      toast.success("Place réservée !");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la réservation");
    },
  });
};

export const useCancelCarpoolBooking = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ bookingId, outingId }: { bookingId: string; outingId: string }) => {
      if (!user) throw new Error("Non connecté");

      const { error } = await supabase
        .from("carpool_passengers")
        .delete()
        .eq("id", bookingId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["carpools", variables.outingId] });
      queryClient.invalidateQueries({ queryKey: ["user-carpool-booking", variables.outingId] });
      toast.success("Réservation annulée");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de l'annulation");
    },
  });
};
