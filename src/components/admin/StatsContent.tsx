import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, BarChart3, TrendingUp, Users, Calendar, AlertTriangle, UserCheck, FileDown } from "lucide-react";
import { PDFReportGenerator } from "@/components/pdf/PDFReportGenerator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

const COLORS = ["#0c4a6e", "#0284c7", "#14b8a6", "#22c55e", "#eab308"];
const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

interface ClubStats {
  totalOutings: number;
  avgOccupation: number;
  presenceRate: number;
  totalParticipants: number;
  typeData: Array<{ name: string; value: number }>;
  monthlyData: Array<{ name: string; sorties: number }>;
  organizerData: Array<{ name: string; count: number }>;
  lateCancellationData: Array<{ name: string; count: number; userId: string }>;
  presenceComparisonData: Array<{ name: string; inscrits: number; présents: number }>;
}

interface MemberPresence {
  id: string;
  name: string;
  memberCode: string;
  outings: Array<{ id: string; title: string; date: string; asOrganizer?: boolean }>;
  totalPresences: number;
  isEncadrant: boolean;
}

interface OrganizerMonthly {
  id: string;
  name: string;
  months: number[];
  total: number;
}

interface StatsContentProps {
  isAdmin: boolean;
}

const StatsContent = ({ isAdmin }: StatsContentProps) => {
  // Default to current year
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Generate available years from 2025 to current year + 1
  const availableYears = Array.from(
    { length: Math.max(currentYear + 1 - 2025 + 1, 1) },
    (_, i) => 2025 + i
  );

  // Use RPC function for server-side authorization
  const { data: stats, isLoading } = useQuery({
    queryKey: ["club-stats", selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_club_stats', {
        p_year: selectedYear
      });
      
      if (error) {
        console.error("Error fetching stats:", error);
        throw error;
      }
      
      return data as unknown as ClubStats;
    },
    enabled: isAdmin,
  });

  // Fetch member presences (includes both reservations AND historical outing participants + organizers)
  const { data: memberPresences, isLoading: membersLoading } = useQuery({
    queryKey: ["member-presences", selectedYear],
    queryFn: async () => {
      const startOfYear = `${selectedYear}-01-01T00:00:00`;
      const endOfYear = `${selectedYear}-12-31T23:59:59`;

      // 1. Fetch regular reservations with is_present = true
      const { data: reservations, error } = await supabase
        .from("reservations")
        .select(`
          user_id,
          is_present,
          outing:outings!inner(id, title, date_time)
        `)
        .eq("status", "confirmé")
        .eq("is_present", true)
        .gte("outing.date_time", startOfYear)
        .lte("outing.date_time", endOfYear)
        .lt("outing.date_time", new Date().toISOString());

      if (error) throw error;

      // 2. Fetch historical outing participants
      const { data: historicalParticipants, error: historicalError } = await supabase
        .from("historical_outing_participants")
        .select(`
          member_id,
          outing:outings!inner(id, title, date_time, organizer_id)
        `)
        .gte("outing.date_time", startOfYear)
        .lte("outing.date_time", endOfYear)
        .lt("outing.date_time", new Date().toISOString());

      if (historicalError) throw historicalError;

      // 3. Fetch historical outings for organizer counting
      const { data: historicalOutings, error: historicalOutingsError } = await supabase
        .from("outings")
        .select("id, title, date_time, organizer_id")
        .gte("date_time", startOfYear)
        .lte("date_time", endOfYear)
        .lt("date_time", new Date().toISOString());

      if (historicalOutingsError) throw historicalOutingsError;

      // Get outings that have historical participants (to identify historical outings)
      const historicalOutingIds = new Set(historicalParticipants?.map((hp: any) => hp.outing.id) || []);

      // 4. Fetch profiles for regular members
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, member_code, email, member_status");

      if (profilesError) throw profilesError;

      // 5. Fetch club_members_directory for historical members (including is_encadrant)
      const { data: clubMembers, error: clubMembersError } = await supabase
        .from("club_members_directory")
        .select("id, first_name, last_name, member_id, email, is_encadrant");

      if (clubMembersError) throw clubMembersError;

      const profileMap = new Map(profiles?.map(p => [
        p.id, 
        { name: `${p.first_name} ${p.last_name}`, code: p.member_code || '', email: p.email, isEncadrant: p.member_status === 'Encadrant' }
      ]));
      const clubMemberMap = new Map(clubMembers?.map(m => [
        m.id, 
        { name: `${m.first_name} ${m.last_name}`, code: m.member_id || '', email: m.email, isEncadrant: m.is_encadrant }
      ]));
      // Map email to club member ID for matching organizers
      const emailToClubMemberMap = new Map(clubMembers?.map(m => [m.email.toLowerCase(), m]) || []);

      // Group by member (using member_id from club_members_directory as key for historical)
      const memberMap = new Map<string, MemberPresence>();
      
      // Process regular reservations
      reservations?.forEach((r: any) => {
        const userId = r.user_id;
        if (!memberMap.has(userId)) {
          const profile = profileMap.get(userId);
          memberMap.set(userId, {
            id: userId,
            name: profile?.name || "Inconnu",
            memberCode: profile?.code || "",
            outings: [],
            totalPresences: 0,
            isEncadrant: profile?.isEncadrant || false
          });
        }
        const member = memberMap.get(userId)!;
        member.outings.push({
          id: r.outing.id,
          title: r.outing.title,
          date: r.outing.date_time
        });
        member.totalPresences++;
      });

      // Process historical participants (using club_members_directory member_id as key)
      historicalParticipants?.forEach((hp: any) => {
        const clubMemberId = hp.member_id;
        const clubMember = clubMemberMap.get(clubMemberId);
        const key = `historical_${clubMemberId}`;
        
        if (!memberMap.has(key)) {
          memberMap.set(key, {
            id: key,
            name: clubMember?.name || "Inconnu",
            memberCode: clubMember?.code || "",
            outings: [],
            totalPresences: 0,
            isEncadrant: clubMember?.isEncadrant || false
          });
        }
        const member = memberMap.get(key)!;
        member.outings.push({
          id: hp.outing.id,
          title: hp.outing.title,
          date: hp.outing.date_time
        });
        member.totalPresences++;
      });

      // Process historical outing organizers (add them as participants too)
      historicalOutings?.forEach((outing: any) => {
        // Only process if this outing has historical participants (meaning it's a historical outing)
        if (!historicalOutingIds.has(outing.id)) return;
        if (!outing.organizer_id) return;
        
        // Find the organizer's profile
        const organizerProfile = profileMap.get(outing.organizer_id);
        if (!organizerProfile) return;

        // Check if organizer is already counted in historical participants for this outing
        const organizerClubMember = emailToClubMemberMap.get(organizerProfile.email?.toLowerCase() || '');
        if (organizerClubMember) {
          const organizerKey = `historical_${organizerClubMember.id}`;
          const existingMember = memberMap.get(organizerKey);
          if (existingMember?.outings.some(o => o.id === outing.id)) {
            // Already counted, skip
            return;
          }
          
          // Add organizer to their historical entry
          if (!memberMap.has(organizerKey)) {
            memberMap.set(organizerKey, {
              id: organizerKey,
              name: organizerClubMember.first_name + ' ' + organizerClubMember.last_name,
              memberCode: organizerClubMember.member_id || "",
              outings: [],
              totalPresences: 0,
              isEncadrant: organizerClubMember.is_encadrant
            });
          }
          const member = memberMap.get(organizerKey)!;
          member.outings.push({
            id: outing.id,
            title: outing.title,
            date: outing.date_time,
            asOrganizer: true
          });
          member.totalPresences++;
        }
      });

      return Array.from(memberMap.values()).sort((a, b) => b.totalPresences - a.totalPresences);
    },
    enabled: isAdmin,
  });

  // Fetch organizer monthly stats (includes historical outings)
  const { data: organizerMonthly, isLoading: organizersLoading } = useQuery({
    queryKey: ["organizer-monthly", selectedYear],
    queryFn: async () => {
      const startOfYear = `${selectedYear}-01-01T00:00:00`;
      const endOfYear = `${selectedYear}-12-31T23:59:59`;

      const nowIso = new Date().toISOString();

      const { data: outings, error } = await supabase
        .from("outings")
        .select("id, organizer_id, date_time, title")
        .gte("date_time", startOfYear)
        .lte("date_time", endOfYear)
        .lt("date_time", nowIso);

      if (error) throw error;

      // Fetch historical outing participants with member details.
      // For historical outings, we infer the organizer as the (single) encadrant among participants.
      // This avoids attributing the outing to the admin who entered it.
      const { data: historicalParticipants, error: historicalError } = await supabase
        .from("historical_outing_participants")
        .select(
          `
          outing_id,
          outing:outings!inner(date_time),
          member:club_members_directory(id, first_name, last_name, email, is_encadrant)
        `.trim()
        )
        .gte("outing.date_time", startOfYear)
        .lte("outing.date_time", endOfYear)
        .lt("outing.date_time", nowIso);

      if (historicalError) throw historicalError;

      // Get set of historical outing IDs
      const historicalOutingIds = new Set(historicalParticipants?.map((hp: any) => hp.outing_id) || []);

      const encadrantEmailsByHistoricalOuting = new Map<string, Set<string>>();
      historicalParticipants?.forEach((hp: any) => {
        const member = hp.member;
        const email = member?.email?.toLowerCase();
        if (!email) return;
        if (!member?.is_encadrant) return;

        if (!encadrantEmailsByHistoricalOuting.has(hp.outing_id)) {
          encadrantEmailsByHistoricalOuting.set(hp.outing_id, new Set());
        }
        encadrantEmailsByHistoricalOuting.get(hp.outing_id)!.add(email);
      });

      // If there is exactly 1 encadrant for the historical outing, we treat them as the organizer.
      const inferredOrganizerEmailByOutingId = new Map<string, string>();
      encadrantEmailsByHistoricalOuting.forEach((emails, outingId) => {
        if (emails.size === 1) {
          inferredOrganizerEmailByOutingId.set(outingId, Array.from(emails)[0]);
        }
      });

      // Filter outings: regular outings need 2+ present, historical outings always count
      const validOutings: any[] = [];
      for (const outing of outings || []) {
        const isHistorical = historicalOutingIds.has(outing.id);

        if (isHistorical) {
          validOutings.push(outing);
          continue;
        }

        // Regular outing - needs 2+ present participants
        const { count } = await supabase
          .from("reservations")
          .select("*", { count: "exact", head: true })
          .eq("outing_id", outing.id)
          .eq("status", "confirmé")
          .eq("is_present", true);

        if ((count || 0) >= 2) {
          validOutings.push(outing);
        }
      }

      // Fetch encadrants from club_members_directory
      const { data: clubEncadrants, error: clubError } = await supabase
        .from("club_members_directory")
        .select("id, first_name, last_name, email")
        .eq("is_encadrant", true);

      if (clubError) throw clubError;

      // Fetch profiles for organizer matching
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email");

      if (profilesError) throw profilesError;

      // Create maps for matching
      const profileMap = new Map(
        profiles?.map((p) => [p.id, { name: `${p.first_name} ${p.last_name}`, email: p.email }])
      );
      const emailToEncadrantMap = new Map(clubEncadrants?.map((e) => [e.email.toLowerCase(), e]) || []);

      // Group by organizer and month (use email as key to consolidate)
      const organizerMap = new Map<string, OrganizerMonthly>();

      // Initialize all encadrants from club_members_directory
      clubEncadrants?.forEach((e) => {
        organizerMap.set(e.email.toLowerCase(), {
          id: e.id,
          name: `${e.first_name} ${e.last_name}`,
          months: Array(12).fill(0),
          total: 0,
        });
      });

      validOutings.forEach((o: any) => {
        const isHistorical = historicalOutingIds.has(o.id);

        // Prefer inferred organizer for historical outings
        let emailKey = isHistorical ? inferredOrganizerEmailByOutingId.get(o.id) || "" : "";

        // Fallback to organizer profile (mainly for non-historical outings, or historical without clear encadrant)
        if (!emailKey) {
          const organizerId = (o.organizer_id as string | null) || null;
          const organizerProfile = organizerId ? profileMap.get(organizerId) : undefined;
          emailKey = organizerProfile?.email?.toLowerCase() || "";
        }

        if (!emailKey) return;

        const encadrant = emailToEncadrantMap.get(emailKey);
        if (!encadrant) return;

        if (!organizerMap.has(emailKey)) {
          organizerMap.set(emailKey, {
            id: encadrant.id,
            name: `${encadrant.first_name} ${encadrant.last_name}`,
            months: Array(12).fill(0),
            total: 0,
          });
        }

        const organizer = organizerMap.get(emailKey)!;
        const month = new Date(o.date_time).getMonth();
        organizer.months[month]++;
        organizer.total++;
      });

      return Array.from(organizerMap.values()).sort((a, b) => b.total - a.total);
    },
    enabled: isAdmin,
  });

  // Fetch demographics data from club_members_directory
  const { data: demographicsData, isLoading: demographicsLoading } = useQuery({
    queryKey: ["demographics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_members_directory")
        .select("birth_date, gender, joined_at");

      if (error) throw error;

      // Calculate age distribution
      const now = new Date();
      const ageRanges = {
        "18-25": 0,
        "26-35": 0,
        "36-45": 0,
        "46-55": 0,
        "56-65": 0,
        "65+": 0,
      };

      const genderCount = {
        "Homme": 0,
        "Femme": 0,
        "Autre": 0,
        "Non renseigné": 0,
      };

      let totalAge = 0;
      let ageCount = 0;
      let totalSeniority = 0;
      let seniorityCount = 0;

      data?.forEach((member) => {
        // Age calculation
        if (member.birth_date) {
          const birthDate = new Date(member.birth_date);
          const age = Math.floor((now.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          totalAge += age;
          ageCount++;

          if (age >= 18 && age <= 25) ageRanges["18-25"]++;
          else if (age <= 35) ageRanges["26-35"]++;
          else if (age <= 45) ageRanges["36-45"]++;
          else if (age <= 55) ageRanges["46-55"]++;
          else if (age <= 65) ageRanges["56-65"]++;
          else ageRanges["65+"]++;
        }

        // Gender count
        if (member.gender) {
          if (member.gender in genderCount) {
            genderCount[member.gender as keyof typeof genderCount]++;
          } else {
            genderCount["Autre"]++;
          }
        } else {
          genderCount["Non renseigné"]++;
        }

        // Seniority calculation
        if (member.joined_at) {
          const joinedDate = new Date(member.joined_at);
          const years = (now.getTime() - joinedDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
          totalSeniority += years;
          seniorityCount++;
        }
      });

      const ageData = Object.entries(ageRanges)
        .map(([range, count]) => ({ name: range, value: count }))
        .filter(d => d.value > 0);

      const genderData = Object.entries(genderCount)
        .map(([gender, count]) => ({ name: gender, value: count }))
        .filter(d => d.value > 0);

      return {
        totalMembers: data?.length || 0,
        averageAge: ageCount > 0 ? Math.round(totalAge / ageCount) : 0,
        averageSeniority: seniorityCount > 0 ? Math.round(totalSeniority / seniorityCount * 10) / 10 : 0,
        ageData,
        genderData,
      };
    },
    enabled: isAdmin,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Statistiques du club</h2>
          <p className="text-muted-foreground">
            Tableau de bord annuel
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PDFReportGenerator year={selectedYear} />
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Tableau de bord</TabsTrigger>
          <TabsTrigger value="demographics">Démographie</TabsTrigger>
          <TabsTrigger value="members">Participation</TabsTrigger>
          <TabsTrigger value="organizers">Encadrants</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* KPI Cards */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-card">
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sorties cette année</p>
                      <p className="text-2xl font-bold text-foreground">
                        {stats?.totalOutings ?? 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                      <TrendingUp className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Taux d'occupation</p>
                      <p className="text-2xl font-bold text-foreground">
                        {stats?.avgOccupation ?? 0}%
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                      <UserCheck className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Taux de présence</p>
                      <p className="text-2xl font-bold text-foreground">
                        {stats?.presenceRate ?? 0}%
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ocean-light/10">
                      <Users className="h-6 w-6 text-ocean-light" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total participants</p>
                      <p className="text-2xl font-bold text-foreground">
                        {stats?.totalParticipants ?? 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row 1 */}
              <div className="grid gap-8 lg:grid-cols-2">
                {/* Bar Chart - Outings by Month */}
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle>Sorties par mois</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats?.monthlyData ?? []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                          <YAxis stroke="hsl(var(--muted-foreground))" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                          <Bar
                            dataKey="sorties"
                            fill="hsl(var(--primary))"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Pie Chart - Outings by Type */}
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle>Répartition par type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats?.typeData ?? []}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) =>
                              `${name} (${(percent * 100).toFixed(0)}%)`
                            }
                          >
                            {stats?.typeData?.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row 2 - Presence Comparison full width */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-primary" />
                    Inscrits vs Présents (10 dernières sorties)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats?.presenceComparisonData ?? []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar dataKey="inscrits" fill="#0284c7" radius={[4, 4, 0, 0]} name="Inscrits" />
                        <Bar dataKey="présents" fill="#22c55e" radius={[4, 4, 0, 0]} name="Présents" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Late Cancellations Alert */}
              {stats?.lateCancellationData && stats.lateCancellationData.length > 0 && (
                <Card className="shadow-card border-destructive/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                      Alertes : Annulations de dernière minute (3+)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Membres ayant annulé 3 fois ou plus à moins de 24h d'une sortie
                    </p>
                    <div className="space-y-2">
                      {stats.lateCancellationData.map((member, index) => (
                        <div key={index} className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                          <span className="font-medium text-foreground">{member.name}</span>
                          <Badge variant="destructive">{member.count} annulations</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Demographics Tab */}
        <TabsContent value="demographics">
          {demographicsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Demographics KPIs */}
              <div className="grid gap-6 sm:grid-cols-3">
                <Card className="shadow-card">
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total adhérents</p>
                      <p className="text-2xl font-bold text-foreground">
                        {demographicsData?.totalMembers ?? 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                      <Calendar className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Âge moyen</p>
                      <p className="text-2xl font-bold text-foreground">
                        {demographicsData?.averageAge ?? 0} ans
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                      <TrendingUp className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ancienneté moyenne</p>
                      <p className="text-2xl font-bold text-foreground">
                        {demographicsData?.averageSeniority ?? 0} ans
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid gap-8 lg:grid-cols-2">
                {/* Age Pyramid */}
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Pyramide des âges
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {demographicsData?.ageData?.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Aucune donnée d'âge</p>
                    ) : (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={demographicsData?.ageData ?? []} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                            <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" width={60} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                              }}
                              formatter={(value: number) => [`${value} adhérents`, "Nombre"]}
                            />
                            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Gender Parity Pie Chart */}
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Parité (Mixité)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {demographicsData?.genderData?.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Aucune donnée de genre</p>
                    ) : (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={demographicsData?.genderData ?? []}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={5}
                              dataKey="value"
                              label={({ name, percent }) =>
                                `${name} (${(percent * 100).toFixed(0)}%)`
                              }
                            >
                              {demographicsData?.genderData?.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    entry.name === "Homme" ? "#0284c7" :
                                    entry.name === "Femme" ? "#ec4899" :
                                    entry.name === "Autre" ? "#8b5cf6" :
                                    "#94a3b8"
                                  }
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                              }}
                              formatter={(value: number) => [`${value} adhérents`, "Nombre"]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members">
          {membersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Présences des membres en {selectedYear}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {memberPresences?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Aucune donnée de présence</p>
                ) : (
                  <div className="space-y-2">
                    {memberPresences?.map((member) => (
                      <div key={member.id} className={`flex items-center justify-between border rounded-lg p-3 ${member.isEncadrant ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-mono">{member.memberCode}</Badge>
                          <span className="font-medium text-foreground">{member.name}</span>
                          {member.isEncadrant && (
                            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                              Encadrant
                            </Badge>
                          )}
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                              {member.totalPresences}
                            </Badge>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Sorties de {member.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                              {member.outings.map((outing, idx) => (
                                <div key={`${outing.id}-${idx}`} className="flex items-center justify-between border border-border rounded-lg p-3">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{outing.title}</span>
                                    {outing.asOrganizer && (
                                      <Badge variant="outline" className="text-xs text-primary border-primary">
                                        Encadrant
                                      </Badge>
                                    )}
                                  </div>
                                  <Badge variant="outline">
                                    {new Date(outing.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Organizers Tab */}
        <TabsContent value="organizers">
          {organizersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Sorties organisées par les encadrants en {selectedYear}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {organizerMonthly?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Aucun encadrant</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[150px]">Encadrant</TableHead>
                          <TableHead className="text-center font-bold">Total</TableHead>
                          {MONTHS.map((month) => (
                            <TableHead key={month} className="text-center w-12">{month}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {organizerMonthly?.map((organizer) => (
                          <TableRow key={organizer.id}>
                            <TableCell className="font-medium">{organizer.name}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="default">{organizer.total}</Badge>
                            </TableCell>
                            {organizer.months.map((count, index) => (
                              <TableCell key={index} className="text-center">
                                {count > 0 ? (
                                  <Badge variant="secondary" className="min-w-[24px]">{count}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StatsContent;
