import { supabase } from "@/integrations/supabase/client";
import { Outing } from "@/hooks/useOutings";
import { Waypoint } from "@/hooks/useWaypoints";
import { generatePOSS, POSSData, POSSParticipant, POSSLocation, POSSBoat } from "@/components/poss/POSSGenerator";
import { toast } from "sonner";

interface UsePOSSGeneratorParams {
  outing: Outing | null;
  organizerName: string;
}

export const usePOSSGenerator = () => {
  const generate = async ({ outing, organizerName }: UsePOSSGeneratorParams) => {
    if (!outing) {
      toast.error("Données de sortie manquantes");
      return;
    }

    try {
      toast.info("Génération du POSS en cours...");

      // Fetch waypoints for the location
      let waypoints: Waypoint[] = [];
      if (outing.location_id) {
        const { data } = await supabase
          .from("site_waypoints")
          .select("*")
          .eq("site_id", outing.location_id);
        waypoints = (data || []) as Waypoint[];
      }

      // Fetch participant details with emergency contacts
      const confirmedReservations = outing.reservations?.filter(r => r.status === "confirmé") || [];
      const participants: POSSParticipant[] = [];

      // Get organizer's profile to fetch their apnea level
      let organizerApneaLevel: string | null = null;
      if (outing.organizer_id) {
        const { data: organizerProfile } = await supabase
          .from("profiles")
          .select("email, apnea_level")
          .eq("id", outing.organizer_id)
          .single();

        if (organizerProfile) {
          // Try to get the most current apnea level from membership_yearly_status
          const { data: organizerDirectory } = await supabase
            .from("club_members_directory")
            .select("id")
            .eq("email", organizerProfile.email.toLowerCase())
            .single();

          if (organizerDirectory) {
            const currentSeasonYear = new Date().getMonth() >= 8
              ? new Date().getFullYear() + 1
              : new Date().getFullYear();

            const { data: organizerStatus } = await supabase
              .from("membership_yearly_status")
              .select("apnea_level")
              .eq("member_id", organizerDirectory.id)
              .eq("season_year", currentSeasonYear)
              .single();

            organizerApneaLevel = organizerStatus?.apnea_level || organizerProfile.apnea_level;
          } else {
            organizerApneaLevel = organizerProfile.apnea_level;
          }
        }
      }

      if (confirmedReservations.length > 0) {
        // Get emails from profiles
        const profileEmails = confirmedReservations
          .map(r => r.profile?.email)
          .filter(Boolean) as string[];

        if (profileEmails.length > 0) {
          // Get emergency contacts from club_members_directory
          const { data: directory } = await supabase
            .from("club_members_directory")
            .select("id, email, emergency_contact_name, emergency_contact_phone")
            .in("email", profileEmails.map(e => e.toLowerCase()));

          // Get apnea_level from membership_yearly_status (current season)
          const currentSeasonYear = new Date().getMonth() >= 8
            ? new Date().getFullYear() + 1
            : new Date().getFullYear();

          const memberIds = directory?.map(d => d.id) || [];
          const { data: membershipStatuses } = await supabase
            .from("membership_yearly_status")
            .select("member_id, apnea_level")
            .eq("season_year", currentSeasonYear)
            .in("member_id", memberIds.length > 0 ? memberIds : ['00000000-0000-0000-0000-000000000000']);

          const apneaLevelMap = new Map(membershipStatuses?.map(s => [s.member_id, s.apnea_level]) || []);

          const directoryMap = new Map(
            directory?.map(d => [d.email.toLowerCase(), { ...d, apnea_level: apneaLevelMap.get(d.id) }]) || []
          );

          for (const res of confirmedReservations) {
            if (res.profile) {
              const dirEntry = directoryMap.get(res.profile.email.toLowerCase());
              participants.push({
                first_name: res.profile.first_name,
                last_name: res.profile.last_name,
                apnea_level: dirEntry?.apnea_level || res.profile.apnea_level,
                emergency_contact_name: dirEntry?.emergency_contact_name || null,
                emergency_contact_phone: dirEntry?.emergency_contact_phone || null,
              });
            }
          }
        }
      }

      // Build location data
      let locationData: POSSLocation | null = null;
      if (outing.location_details) {
        locationData = {
          name: outing.location_details.name,
          address: outing.location_details.address,
          latitude: outing.location_details.latitude,
          longitude: outing.location_details.longitude,
          maps_url: outing.location_details.maps_url,
          satellite_map_url: outing.location_details.satellite_map_url || null,
          bathymetric_map_url: outing.location_details.bathymetric_map_url || null,
          max_depth: outing.location_details.max_depth || null,
        };
      }

      // Build boat data
      let boatData: POSSBoat | null = null;
      if (outing.boat) {
        boatData = {
          name: outing.boat.name,
          registration_number: outing.boat.registration_number,
          pilot_name: outing.boat.pilot_name,
          pilot_phone: outing.boat.pilot_phone,
          oxygen_location: outing.boat.oxygen_location,
          home_port: outing.boat.home_port,
        };
      }

      // Build POSS data
      const possData: POSSData = {
        outingTitle: outing.title,
        outingDateTime: outing.date_time,
        outingLocation: outing.location,
        diveMode: outing.dive_mode || null,
        location: locationData,
        boat: boatData,
        waypoints,
        participants,
        organizerName,
        organizerLevel: organizerApneaLevel,
        waterEntryTime: outing.water_entry_time || null,
        waterExitTime: outing.water_exit_time || null,
        weather: null, // TODO: integrate weather data from API
      };

      // Generate the PDF
      await generatePOSS(possData);

      toast.success("POSS généré avec succès !");
    } catch (error) {
      console.error("Error generating POSS:", error);
      toast.error("Erreur lors de la génération du POSS");
    }
  };

  return { generate };
};
