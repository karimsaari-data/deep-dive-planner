import { supabase } from "@/integrations/supabase/client";
import { Outing, resolveCurrentSeasonApneaLevels } from "@/hooks/useOutings";
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

      // Get organizer's phone, current-season apnea level and encadrement depth limits
      let organizerApneaLevel: string | null = null;
      let organizerLevelName: string | null = null;
      let organizerMaxDepthEaa: number | null = null;
      let organizerMaxDepthEao: number | null = null;
      let organizerPhone: string | null = null;
      if (outing.organizer_id) {
        const { data: organizerProfile } = await supabase
          .from("profiles")
          .select("phone")
          .eq("id", outing.organizer_id)
          .single();
        organizerPhone = organizerProfile?.phone || null;

        const seasonLevels = await resolveCurrentSeasonApneaLevels([outing.organizer_id]);
        organizerApneaLevel = seasonLevels.get(outing.organizer_id) || null;

        if (organizerApneaLevel) {
          const { data: levelData } = await supabase
            .from("apnea_levels")
            .select("name, profondeur_max_eaa, profondeur_max_eao")
            .eq("code", organizerApneaLevel)
            .maybeSingle();

          if (levelData) {
            organizerLevelName = levelData.name;
            organizerMaxDepthEaa = levelData.profondeur_max_eaa;
            organizerMaxDepthEao = levelData.profondeur_max_eao;
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
                group_number: res.group_number,
              });
            }
          }
        }
      }

      // Build co-instructors list with their personal phone (from profiles)
      const coInstructors: POSSData["coInstructors"] = [];
      if (outing.co_instructors && outing.co_instructors.length > 0) {
        const coIds = outing.co_instructors.map((c) => c.user_id);
        const { data: coProfiles } = await supabase
          .from("profiles")
          .select("id, phone")
          .in("id", coIds);
        const coPhoneMap = new Map(coProfiles?.map((p) => [p.id, p.phone]) || []);

        for (const co of outing.co_instructors) {
          if (!co.profile) continue;
          coInstructors.push({
            name: `${co.profile.first_name} ${co.profile.last_name}`,
            level: co.profile.apnea_level,
            phone: coPhoneMap.get(co.user_id) || null,
          });
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
        outingType: outing.outing_type,
        diveMode: outing.dive_mode || null,
        location: locationData,
        boat: boatData,
        waypoints,
        participants,
        organizerName,
        organizerLevel: organizerApneaLevel,
        organizerLevelName,
        organizerMaxDepthEaa,
        organizerMaxDepthEao,
        organizerPhone,
        coInstructors,
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
