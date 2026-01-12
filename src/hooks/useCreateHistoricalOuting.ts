import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OutingType } from "./useOutings";

interface HistoricalOutingData {
  title: string;
  date_time: string;
  end_date?: string;
  location: string;
  location_id?: string;
  outing_type: OutingType;
  organizer_id: string;
  participant_member_ids: string[]; // IDs from club_members_directory
}

/**
 * Hook to create a historical outing with all participants marked as present.
 * This is used by encadrants to record past outings.
 * No email notifications are sent.
 */
export const useCreateHistoricalOuting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: HistoricalOutingData) => {
      // 1. Create the outing (archived immediately since it's historical)
      const { data: newOuting, error: outingError } = await supabase
        .from("outings")
        .insert({
          title: data.title,
          date_time: data.date_time,
          end_date: data.end_date,
          location: data.location,
          location_id: data.location_id || null,
          outing_type: data.outing_type,
          organizer_id: data.organizer_id,
          max_participants: Math.max(data.participant_member_ids.length, 10),
          is_archived: true, // Mark as archived/completed
          is_deleted: false,
          is_staff_only: false,
        })
        .select("id")
        .single();

      if (outingError) throw outingError;
      if (!newOuting) throw new Error("Failed to create outing");

      // 2. Get profile IDs for the selected members (by matching email)
      // First, get the emails of selected members from club_members_directory
      const { data: selectedMembers, error: membersError } = await supabase
        .from("club_members_directory")
        .select("email")
        .in("id", data.participant_member_ids);

      if (membersError) throw membersError;

      const memberEmails = selectedMembers?.map((m) => m.email.toLowerCase()) || [];

      // Then, get profile IDs that match those emails
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email");

      if (profilesError) throw profilesError;

      // Create a map of email -> profile id
      const emailToProfileId = new Map<string, string>();
      profiles?.forEach((p) => {
        if (p.email) {
          emailToProfileId.set(p.email.toLowerCase(), p.id);
        }
      });

      // Filter to only members with registered profiles
      const participantProfileIds = memberEmails
        .map((email) => emailToProfileId.get(email))
        .filter((id): id is string => !!id);

      // 3. Create reservations for all participants (confirmed + present)
      if (participantProfileIds.length > 0) {
        const reservations = participantProfileIds.map((userId) => ({
          outing_id: newOuting.id,
          user_id: userId,
          status: "confirmé" as const,
          is_present: true,
          carpool_option: "none" as const,
          carpool_seats: 0,
        }));

        const { error: reservationError } = await supabase
          .from("reservations")
          .insert(reservations);

        if (reservationError) {
          console.error("Error creating reservations:", reservationError);
          // Don't throw - outing is created, just log the error
        }
      }

      return {
        outingId: newOuting.id,
        participantsCount: participantProfileIds.length,
        totalSelected: data.participant_member_ids.length,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["outings"] });
      queryClient.invalidateQueries({ queryKey: ["archived-outings"] });
      
      if (result.participantsCount < result.totalSelected) {
        toast.success(
          `Sortie historique ajoutée avec ${result.participantsCount} participants (${result.totalSelected - result.participantsCount} membres non inscrits à l'app)`
        );
      } else {
        toast.success(`Sortie historique ajoutée avec ${result.participantsCount} participants`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la création de la sortie");
    },
  });
};
