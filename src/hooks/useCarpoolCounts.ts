import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CarpoolCount {
  outing_id: string;
  carpool_count: number;
  available_seats: number;
}

/**
 * Hook to fetch carpool counts for multiple outings at once
 * Returns a map of outing_id -> { carpool_count, available_seats }
 */
export const useCarpoolCounts = (outingIds: string[]) => {
  return useQuery({
    queryKey: ["carpool-counts", outingIds],
    queryFn: async () => {
      if (!outingIds.length) return new Map<string, CarpoolCount>();

      // Fetch all carpools for the given outings
      const { data: carpools, error } = await supabase
        .from("carpools")
        .select("id, outing_id, available_seats")
        .in("outing_id", outingIds);

      if (error) {
        console.warn("Could not fetch carpool counts:", error);
        return new Map<string, CarpoolCount>();
      }

      if (!carpools || carpools.length === 0) {
        return new Map<string, CarpoolCount>();
      }

      // Fetch all passengers for these carpools
      const carpoolIds = carpools.map((c) => c.id);
      const { data: passengers } = await supabase
        .from("carpool_passengers")
        .select("carpool_id")
        .in("carpool_id", carpoolIds);

      // Count passengers per carpool
      const passengersPerCarpool = new Map<string, number>();
      (passengers || []).forEach((p) => {
        passengersPerCarpool.set(
          p.carpool_id,
          (passengersPerCarpool.get(p.carpool_id) || 0) + 1
        );
      });

      // Aggregate by outing
      const countsByOuting = new Map<string, CarpoolCount>();

      carpools.forEach((carpool) => {
        const existing = countsByOuting.get(carpool.outing_id) || {
          outing_id: carpool.outing_id,
          carpool_count: 0,
          available_seats: 0,
        };

        const takenSeats = passengersPerCarpool.get(carpool.id) || 0;
        const remainingSeats = Math.max(0, carpool.available_seats - takenSeats);

        existing.carpool_count += 1;
        existing.available_seats += remainingSeats;

        countsByOuting.set(carpool.outing_id, existing);
      });

      return countsByOuting;
    },
    enabled: outingIds.length > 0,
    staleTime: 30000, // 30 seconds cache
  });
};
