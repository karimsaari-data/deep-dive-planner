import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PDFMember {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  board_role: string | null;
  is_encadrant: boolean;
  apnea_level: string | null;
}

export interface PDFDemographics {
  totalMembers: number;
  averageAge: number;
  ageData: Array<{ name: string; value: number }>;
  genderData: Array<{ name: string; value: number }>;
  levelData: Array<{ name: string; value: number }>;
}

export interface PDFTopParticipant {
  name: string;
  participations: number;
  memberCode: string;
}

export interface PDFTopEncadrant {
  name: string;
  outingsOrganized: number;
}

export interface PDFTopLocation {
  id: string;
  name: string;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  count: number;
}

export interface PDFEquipmentItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
}

export interface PDFStats {
  totalMembers: number;
  totalOutings: number;
  totalParticipations: number;
}

export interface PDFReportData {
  bureau: PDFMember[];
  allEncadrants: PDFMember[];
  stats: PDFStats;
  demographics: PDFDemographics;
  topParticipants: PDFTopParticipant[];
  topEncadrants: PDFTopEncadrant[];
  topLocations: PDFTopLocation[];
  equipment: {
    items: PDFEquipmentItem[];
    totalValue: number;
  };
}

export const usePDFReportData = (year: number) => {
  return useQuery({
    queryKey: ["pdf-report-data", year],
    queryFn: async (): Promise<PDFReportData> => {
      const startOfYear = `${year}-01-01T00:00:00`;
      const endOfYear = `${year}-12-31T23:59:59`;
      const now = new Date().toISOString();

      // 1. Fetch trombinoscope data
      const { data: trombiData, error: trombiError } = await supabase
        .rpc("get_trombinoscope_members");
      
      if (trombiError) throw trombiError;

      // Role weights for bureau sorting
      const roleWeights: Record<string, number> = {
        "Président": 1,
        "Vice-Président": 2,
        "Trésorier": 3,
        "Secrétaire": 4,
        "Trésorier Adjoint": 5,
        "Secrétaire Adjoint": 6,
        "Membre du bureau": 7,
      };

      const allMembers: PDFMember[] = (trombiData || []).map((m: any) => ({
        id: m.id,
        first_name: m.first_name,
        last_name: m.last_name,
        avatar_url: m.avatar_url || null,
        board_role: m.board_role,
        is_encadrant: m.is_encadrant ?? false,
        apnea_level: m.apnea_level,
      }));

      const bureau = allMembers
        .filter((m) => m.board_role)
        .sort((a, b) => {
          const weightA = roleWeights[a.board_role!] ?? 99;
          const weightB = roleWeights[b.board_role!] ?? 99;
          if (weightA !== weightB) return weightA - weightB;
          return a.last_name.localeCompare(b.last_name, "fr");
        });

      // All encadrants (including bureau members if they are encadrants)
      const allEncadrants = allMembers
        .filter((m) => m.is_encadrant)
        .sort((a, b) => a.last_name.localeCompare(b.last_name, "fr"));

      // 2. Fetch demographics
      const { data: membersDir, error: membersDirError } = await supabase
        .from("club_members_directory")
        .select("birth_date, gender, apnea_level");

      if (membersDirError) throw membersDirError;

      const ageRanges: Record<string, number> = {
        "18-25": 0, "26-35": 0, "36-45": 0, "46-55": 0, "56-65": 0, "65+": 0,
      };
      const genderCount: Record<string, number> = {
        "Homme": 0, "Femme": 0, "Non renseigné": 0,
      };
      const levelCount: Record<string, number> = {};

      let totalAge = 0;
      let ageCount = 0;
      const nowDate = new Date();

      membersDir?.forEach((m) => {
        if (m.birth_date) {
          const birthDate = new Date(m.birth_date);
          const age = Math.floor((nowDate.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          totalAge += age;
          ageCount++;
          if (age >= 18 && age <= 25) ageRanges["18-25"]++;
          else if (age <= 35) ageRanges["26-35"]++;
          else if (age <= 45) ageRanges["36-45"]++;
          else if (age <= 55) ageRanges["46-55"]++;
          else if (age <= 65) ageRanges["56-65"]++;
          else ageRanges["65+"]++;
        }
        if (m.gender === "Homme" || m.gender === "Femme") {
          genderCount[m.gender]++;
        } else {
          genderCount["Non renseigné"]++;
        }
        if (m.apnea_level) {
          levelCount[m.apnea_level] = (levelCount[m.apnea_level] || 0) + 1;
        }
      });

      const demographics: PDFDemographics = {
        totalMembers: membersDir?.length || 0,
        averageAge: ageCount > 0 ? Math.round(totalAge / ageCount) : 0,
        ageData: Object.entries(ageRanges).map(([name, value]) => ({ name, value })).filter(d => d.value > 0),
        genderData: Object.entries(genderCount).map(([name, value]) => ({ name, value })).filter(d => d.value > 0),
        levelData: Object.entries(levelCount)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
      };

      // 3. Fetch stats (outings count, participations)
      const { data: outings, error: outingsError } = await supabase
        .from("outings")
        .select("id, date_time, organizer_id, location, location_id")
        .gte("date_time", startOfYear)
        .lte("date_time", endOfYear)
        .lt("date_time", now);

      if (outingsError) throw outingsError;

      const outingIds = outings?.map(o => o.id) || [];

      // Get historical participants
      const { data: historicalParticipants, error: hpError } = await supabase
        .from("historical_outing_participants")
        .select("outing_id, member_id, member:club_members_directory(is_encadrant, email)")
        .in("outing_id", outingIds.length > 0 ? outingIds : ['00000000-0000-0000-0000-000000000000']);

      if (hpError) throw hpError;

      const historicalOutingIds = new Set(historicalParticipants?.map(hp => hp.outing_id) || []);

      // Get regular reservations with presence
      const { data: reservations, error: resError } = await supabase
        .from("reservations")
        .select("outing_id, user_id, is_present")
        .in("outing_id", outingIds.length > 0 ? outingIds : ['00000000-0000-0000-0000-000000000000'])
        .eq("status", "confirmé")
        .eq("is_present", true);

      if (resError) throw resError;

      // Count valid outings
      const presentCountByOuting = new Map<string, number>();
      reservations?.forEach(r => {
        presentCountByOuting.set(r.outing_id, (presentCountByOuting.get(r.outing_id) || 0) + 1);
      });

      let totalValidOutings = 0;
      let totalParticipations = 0;
      const validOutingIds = new Set<string>();
      const locationCountMap = new Map<string, { name: string; id: string | null; count: number }>();

      outings?.forEach(o => {
        const isHistorical = historicalOutingIds.has(o.id);
        const presentCount = presentCountByOuting.get(o.id) || 0;
        
        if (isHistorical) {
          totalValidOutings++;
          validOutingIds.add(o.id);
          const hpCount = historicalParticipants?.filter(hp => hp.outing_id === o.id).length || 0;
          totalParticipations += hpCount;
        } else if (presentCount >= 2) {
          totalValidOutings++;
          validOutingIds.add(o.id);
          totalParticipations += presentCount;
        }
        
        // Count locations for valid outings
        if (validOutingIds.has(o.id)) {
          const locationKey = o.location_id || o.location;
          const existing = locationCountMap.get(locationKey);
          if (existing) {
            existing.count++;
          } else {
            locationCountMap.set(locationKey, { 
              name: o.location, 
              id: o.location_id,
              count: 1 
            });
          }
        }
      });

      const stats: PDFStats = {
        totalMembers: membersDir?.length || 0,
        totalOutings: totalValidOutings,
        totalParticipations,
      };

      // 4. Top participants
      const participantCountMap = new Map<string, { name: string; count: number; code: string }>();

      const userIds = [...new Set(reservations?.map(r => r.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, member_code, email")
        .in("id", userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      reservations?.forEach(r => {
        const isHistorical = historicalOutingIds.has(r.outing_id);
        const presentCount = presentCountByOuting.get(r.outing_id) || 0;
        
        if (!isHistorical && presentCount < 2) return;
        if (isHistorical) return;
        
        const profile = profileMap.get(r.user_id);
        if (!profile) return;
        
        const key = profile.email?.toLowerCase() || r.user_id;
        const existing = participantCountMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          participantCountMap.set(key, {
            name: `${profile.first_name} ${profile.last_name}`,
            count: 1,
            code: profile.member_code || "",
          });
        }
      });

      const { data: clubMembers } = await supabase
        .from("club_members_directory")
        .select("id, first_name, last_name, member_id, email");

      const clubMemberMap = new Map(clubMembers?.map(m => [m.id, m]) || []);

      historicalParticipants?.forEach(hp => {
        const member = clubMemberMap.get(hp.member_id);
        if (!member) return;
        
        const key = member.email?.toLowerCase() || hp.member_id;
        const existing = participantCountMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          participantCountMap.set(key, {
            name: `${member.first_name} ${member.last_name}`,
            count: 1,
            code: member.member_id || "",
          });
        }
      });

      const topParticipants: PDFTopParticipant[] = Array.from(participantCountMap.values())
        .map(p => ({ name: p.name, participations: p.count, memberCode: p.code }))
        .sort((a, b) => b.participations - a.participations)
        .slice(0, 15);

      // 5. Top encadrants
      const encadrantCountMap = new Map<string, { name: string; count: number }>();

      const encadrantByHistoricalOuting = new Map<string, string>();
      const hpByOuting = new Map<string, any[]>();
      historicalParticipants?.forEach(hp => {
        const existing = hpByOuting.get(hp.outing_id) || [];
        existing.push(hp);
        hpByOuting.set(hp.outing_id, existing);
      });

      hpByOuting.forEach((hps, outingId) => {
        const encadrants = hps.filter((hp: any) => hp.member?.is_encadrant);
        if (encadrants.length === 1) {
          const member = clubMemberMap.get(encadrants[0].member_id);
          if (member) {
            encadrantByHistoricalOuting.set(outingId, member.email?.toLowerCase() || "");
          }
        }
      });

      const organizerIds = [...new Set(outings?.map(o => o.organizer_id).filter(Boolean) || [])];
      const { data: organizerProfiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", organizerIds.length > 0 ? organizerIds : ['00000000-0000-0000-0000-000000000000']);

      const organizerProfileMap = new Map(organizerProfiles?.map(p => [p.id, p]) || []);

      outings?.forEach(o => {
        if (!validOutingIds.has(o.id)) return;
        
        const isHistorical = historicalOutingIds.has(o.id);
        let encadrantEmail = "";
        let encadrantName = "";
        
        if (isHistorical) {
          encadrantEmail = encadrantByHistoricalOuting.get(o.id) || "";
          if (encadrantEmail) {
            const member = clubMembers?.find(m => m.email?.toLowerCase() === encadrantEmail);
            if (member) {
              encadrantName = `${member.first_name} ${member.last_name}`;
            }
          }
        } else {
          const profile = organizerProfileMap.get(o.organizer_id!);
          if (profile) {
            encadrantEmail = profile.email?.toLowerCase() || "";
            encadrantName = `${profile.first_name} ${profile.last_name}`;
          }
        }
        
        if (!encadrantEmail || !encadrantName) return;
        
        const existing = encadrantCountMap.get(encadrantEmail);
        if (existing) {
          existing.count++;
        } else {
          encadrantCountMap.set(encadrantEmail, { name: encadrantName, count: 1 });
        }
      });

      const topEncadrants: PDFTopEncadrant[] = Array.from(encadrantCountMap.values())
        .map(e => ({ name: e.name, outingsOrganized: e.count }))
        .sort((a, b) => b.outingsOrganized - a.outingsOrganized);

      // 6. Top locations with photos
      const { data: locations } = await supabase
        .from("locations")
        .select("id, name, photo_url, latitude, longitude");

      const locationMap = new Map(locations?.map(l => [l.id, l]) || []);

      const topLocations: PDFTopLocation[] = Array.from(locationCountMap.entries())
        .map(([key, data]) => {
          const location = data.id ? locationMap.get(data.id) : null;
          return {
            id: data.id || key,
            name: location?.name || data.name,
            photo_url: location?.photo_url || null,
            latitude: location?.latitude || null,
            longitude: location?.longitude || null,
            count: data.count,
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // 7. Equipment inventory
      const { data: inventory } = await supabase
        .from("equipment_inventory")
        .select(`
          id,
          catalog:equipment_catalog(name, estimated_value)
        `);

      const equipmentMap = new Map<string, { name: string; quantity: number; unitPrice: number }>();
      
      inventory?.forEach((item: any) => {
        if (!item.catalog) return;
        const name = item.catalog.name;
        const price = item.catalog.estimated_value || 0;
        
        const existing = equipmentMap.get(name);
        if (existing) {
          existing.quantity++;
        } else {
          equipmentMap.set(name, { name, quantity: 1, unitPrice: price });
        }
      });

      const equipmentItems: PDFEquipmentItem[] = Array.from(equipmentMap.values())
        .map(e => ({
          name: e.name,
          quantity: e.quantity,
          unitPrice: e.unitPrice,
          totalValue: e.quantity * e.unitPrice,
        }))
        .sort((a, b) => b.totalValue - a.totalValue);

      const totalEquipmentValue = equipmentItems.reduce((sum, e) => sum + e.totalValue, 0);

      return {
        bureau,
        allEncadrants,
        stats,
        demographics,
        topParticipants,
        topEncadrants,
        topLocations,
        equipment: {
          items: equipmentItems.slice(0, 15),
          totalValue: totalEquipmentValue,
        },
      };
    },
    staleTime: 5 * 60 * 1000,
  });
};
