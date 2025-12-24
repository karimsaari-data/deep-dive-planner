import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, BarChart3, TrendingUp, Users, Calendar, AlertTriangle, UserCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { differenceInHours } from "date-fns";

const COLORS = ["#0c4a6e", "#0284c7", "#14b8a6", "#22c55e", "#eab308"];

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

  const { data: stats, isLoading } = useQuery({
    queryKey: ["enhanced-stats", selectedYear],
    queryFn: async () => {
      const startOfYear = new Date(selectedYear, 0, 1).toISOString();
      const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59).toISOString();

      // Get all outings with reservations
      const { data: outings, error: outingsError } = await supabase
        .from("outings")
        .select(`
          id,
          title,
          outing_type,
          max_participants,
          date_time,
          organizer_id,
          organizer:profiles!outings_organizer_id_fkey(first_name, last_name),
          reservations(id, status, is_present, cancelled_at, user_id)
        `)
        .gte("date_time", startOfYear)
        .lte("date_time", endOfYear);

      if (outingsError) throw outingsError;

      const pastOutings = outings?.filter(o => new Date(o.date_time) < new Date()) ?? [];
      const allOutings = outings ?? [];

      // Total outings
      const totalOutings = allOutings.length;

      // Average occupation rate (confirmed reservations)
      const occupationRates = allOutings.map((o) => {
        const confirmed = o.reservations?.filter(r => r.status === "confirmé").length ?? 0;
        return (confirmed / o.max_participants) * 100;
      });
      const avgOccupation = occupationRates.length > 0
        ? Math.round(occupationRates.reduce((a, b) => a + b, 0) / occupationRates.length)
        : 0;

      // Presence rate (is_present vs confirmed for past outings)
      let totalConfirmed = 0;
      let totalPresent = 0;
      pastOutings.forEach(o => {
        const confirmed = o.reservations?.filter(r => r.status === "confirmé") ?? [];
        totalConfirmed += confirmed.length;
        totalPresent += confirmed.filter(r => r.is_present).length;
      });
      const presenceRate = totalConfirmed > 0 ? Math.round((totalPresent / totalConfirmed) * 100) : 0;

      // Outings by type
      const byType = allOutings.reduce((acc, o) => {
        acc[o.outing_type] = (acc[o.outing_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const typeData = Object.entries(byType)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Monthly data
      const byMonth = allOutings.reduce((acc, o) => {
        const month = new Date(o.date_time).toLocaleString("fr-FR", { month: "short" });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const monthlyData = Object.entries(byMonth).map(([name, sorties]) => ({
        name,
        sorties,
      }));

      // Total participants
      const totalParticipants = allOutings.reduce(
        (acc, o) => acc + (o.reservations?.filter(r => r.status === "confirmé").length ?? 0),
        0
      );

      // Organizer stats (outings per organizer)
      const organizerCounts: Record<string, { name: string; count: number }> = {};
      allOutings.forEach(o => {
        if (o.organizer_id && o.organizer) {
          const name = `${o.organizer.first_name} ${o.organizer.last_name}`;
          if (!organizerCounts[o.organizer_id]) {
            organizerCounts[o.organizer_id] = { name, count: 0 };
          }
          organizerCounts[o.organizer_id].count++;
        }
      });
      const organizerData = Object.values(organizerCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Late cancellations (less than 24h before outing)
      const lateCancellations: Record<string, { name: string; count: number; userId: string }> = {};
      
      // Get all profiles for name lookup
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name");
      
      const profileMap = new Map(profiles?.map(p => [p.id, `${p.first_name} ${p.last_name}`]) ?? []);

      allOutings.forEach(o => {
        const cancelled = o.reservations?.filter(r => 
          r.status === "annulé" && r.cancelled_at
        ) ?? [];
        
        cancelled.forEach(r => {
          const hoursBeforeOuting = differenceInHours(
            new Date(o.date_time), 
            new Date(r.cancelled_at!)
          );
          
          if (hoursBeforeOuting >= 0 && hoursBeforeOuting < 24) {
            const userName = profileMap.get(r.user_id) || "Inconnu";
            if (!lateCancellations[r.user_id]) {
              lateCancellations[r.user_id] = { name: userName, count: 0, userId: r.user_id };
            }
            lateCancellations[r.user_id].count++;
          }
        });
      });

      const lateCancellationData = Object.values(lateCancellations)
        .filter(c => c.count >= 3)
        .sort((a, b) => b.count - a.count);

      // Presence comparison data for chart
      const presenceComparisonData = pastOutings.slice(-10).map(o => {
        const confirmed = o.reservations?.filter(r => r.status === "confirmé").length ?? 0;
        const present = o.reservations?.filter(r => r.status === "confirmé" && r.is_present).length ?? 0;
        return {
          name: o.title.substring(0, 15) + (o.title.length > 15 ? "..." : ""),
          inscrits: confirmed,
          présents: present,
        };
      });

      return {
        totalOutings,
        avgOccupation,
        presenceRate,
        totalParticipants,
        typeData,
        monthlyData,
        organizerData,
        lateCancellationData,
        presenceComparisonData,
      };
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
        </div>
      </section>
    </Layout>
  );
};

export default Stats;
