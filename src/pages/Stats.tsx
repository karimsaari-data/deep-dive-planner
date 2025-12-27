import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, BarChart3, TrendingUp, Users, Calendar, AlertTriangle, UserCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
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
  outings: Array<{ id: string; title: string; date: string }>;
  totalPresences: number;
}

interface OrganizerMonthly {
  id: string;
  name: string;
  months: number[];
  total: number;
}

const Stats = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [selectedYear, setSelectedYear] = useState(2025);

  // Generate available years from 2025 to current year + 1
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from(
    { length: Math.max(currentYear + 1 - 2025 + 1, 1) },
    (_, i) => 2025 + i
  );

  // Use RPC function for server-side authorization
  const { data: stats, isLoading, error } = useQuery({
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

  // Fetch member presences
  const { data: memberPresences, isLoading: membersLoading } = useQuery({
    queryKey: ["member-presences", selectedYear],
    queryFn: async () => {
      const startOfYear = `${selectedYear}-01-01T00:00:00`;
      const endOfYear = `${selectedYear}-12-31T23:59:59`;

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

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name");

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.id, `${p.first_name} ${p.last_name}`]));

      // Group by user
      const memberMap = new Map<string, MemberPresence>();
      reservations?.forEach((r: any) => {
        const userId = r.user_id;
        if (!memberMap.has(userId)) {
          memberMap.set(userId, {
            id: userId,
            name: profileMap.get(userId) || "Inconnu",
            outings: [],
            totalPresences: 0
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

      return Array.from(memberMap.values()).sort((a, b) => b.totalPresences - a.totalPresences);
    },
    enabled: isAdmin,
  });

  // Fetch organizer monthly stats
  const { data: organizerMonthly, isLoading: organizersLoading } = useQuery({
    queryKey: ["organizer-monthly", selectedYear],
    queryFn: async () => {
      const startOfYear = `${selectedYear}-01-01T00:00:00`;
      const endOfYear = `${selectedYear}-12-31T23:59:59`;

      const { data: outings, error } = await supabase
        .from("outings")
        .select("id, organizer_id, date_time, title")
        .gte("date_time", startOfYear)
        .lte("date_time", endOfYear)
        .lt("date_time", new Date().toISOString())
        .not("organizer_id", "is", null);

      if (error) throw error;

      // Filter outings with at least 2 present participants
      const validOutings: any[] = [];
      for (const outing of outings || []) {
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

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("member_status", "Encadrant");

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.id, `${p.first_name} ${p.last_name}`]));

      // Group by organizer and month
      const organizerMap = new Map<string, OrganizerMonthly>();
      
      // Initialize all encadrants
      profiles?.forEach(p => {
        organizerMap.set(p.id, {
          id: p.id,
          name: `${p.first_name} ${p.last_name}`,
          months: Array(12).fill(0),
          total: 0
        });
      });

      validOutings.forEach((o: any) => {
        const organizerId = o.organizer_id;
        if (!organizerMap.has(organizerId)) {
          organizerMap.set(organizerId, {
            id: organizerId,
            name: profileMap.get(organizerId) || "Inconnu",
            months: Array(12).fill(0),
            total: 0
          });
        }
        const organizer = organizerMap.get(organizerId)!;
        const month = new Date(o.date_time).getMonth();
        organizer.months[month]++;
        organizer.total++;
      });

      return Array.from(organizerMap.values()).sort((a, b) => b.total - a.total);
    },
    enabled: isAdmin,
  });

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate("/auth");
      } else if (!isAdmin) {
        navigate("/");
      }
    }
  }, [user, isAdmin, authLoading, roleLoading, navigate]);

  if (authLoading || roleLoading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Statistiques</h1>
              <p className="text-muted-foreground">
                Tableau de bord annuel du club
              </p>
            </div>
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
          </div>

          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dashboard">Tableau de bord</TabsTrigger>
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

                  {/* Charts Row 2 */}
                  <div className="grid gap-8 lg:grid-cols-2">
                    {/* Presence Comparison */}
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

                    {/* Organizer Stats */}
                    <Card className="shadow-card">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-primary" />
                          Sorties par encadrant
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {stats?.organizerData?.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8">Aucune donnée</p>
                        ) : (
                          <div className="space-y-3 max-h-[280px] overflow-y-auto">
                            {stats?.organizerData?.map((org, index) => (
                              <div key={index} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                                <span className="font-medium text-foreground">{org.name}</span>
                                <Badge variant="secondary">{org.count} sorties</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

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
                          <div key={member.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                            <span className="font-medium text-foreground">{member.name}</span>
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
                                  {member.outings.map((outing) => (
                                    <div key={outing.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                                      <span className="font-medium">{outing.title}</span>
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
      </section>
    </Layout>
  );
};

export default Stats;
