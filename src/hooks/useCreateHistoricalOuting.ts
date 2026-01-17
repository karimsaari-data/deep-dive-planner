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
  organizer_id: string; // Profile ID (for outings table)
  organizer_member_id: string; // club_members_directory ID (for historical participants)
  participant_member_ids: string[]; // IDs from club_members_directory
}

/**
 * Hook to create a historical outing with participants from club_members_directory.
 * This is used by encadrants to record past outings.
 * Participants are stored in historical_outing_participants table,
 * NOT in reservations, since they may not have app accounts.
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

      // 2. Create historical_outing_participants entries
      // These are linked to club_members_directory, NOT to profiles
      // Always include the organizer as a participant
      const allParticipantIds = new Set(data.participant_member_ids);
      if (data.organizer_member_id) {
        allParticipantIds.add(data.organizer_member_id);
      }
      
      if (allParticipantIds.size > 0) {
        const participants = Array.from(allParticipantIds).map((memberId) => ({
          outing_id: newOuting.id,
          member_id: memberId,
        }));

        const { error: participantsError } = await supabase
          .from("historical_outing_participants")
          .insert(participants);

        if (participantsError) {
          console.error("Error creating historical participants:", participantsError);
          // Don't throw - outing is created, just log the error
        }
      }

      return {
        outingId: newOuting.id,
        participantsCount: data.participant_member_ids.length,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["outings"] });
      queryClient.invalidateQueries({ queryKey: ["archived-outings"] });
      
      toast.success(`Sortie historique ajoutée aux archives avec ${result.participantsCount} participants`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de la création de la sortie");
    },
  });
};
