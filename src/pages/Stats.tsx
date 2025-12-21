import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, BarChart3, TrendingUp, Users, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const COLORS = ["#0c4a6e", "#0284c7", "#14b8a6", "#22c55e"];

const Stats = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      // Get all outings with reservations count
      const { data: outings, error: outingsError } = await supabase
        .from("outings")
        .select(`
          id,
          outing_type,
          max_participants,
          date_time,
          reservations(id)
        `);

      if (outingsError) throw outingsError;

      const currentYear = new Date().getFullYear();
      const outingsThisYear = outings?.filter(
        (o) => new Date(o.date_time).getFullYear() === currentYear
      ) ?? [];

      // Total outings
      const totalOutings = outingsThisYear.length;

      // Average occupation rate
      const occupationRates = outingsThisYear.map((o) => {
        const reservations = o.reservations?.length ?? 0;
        return (reservations / o.max_participants) * 100;
      });
      const avgOccupation = occupationRates.length > 0
        ? Math.round(occupationRates.reduce((a, b) => a + b, 0) / occupationRates.length)
        : 0;

      // Outings by type
      const byType = outingsThisYear.reduce((acc, o) => {
        acc[o.outing_type] = (acc[o.outing_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const typeData = Object.entries(byType)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Monthly data
      const byMonth = outingsThisYear.reduce((acc, o) => {
        const month = new Date(o.date_time).toLocaleString("fr-FR", { month: "short" });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const monthlyData = Object.entries(byMonth).map(([name, sorties]) => ({
        name,
        sorties,
      }));

      // Total participants
      const totalParticipants = outingsThisYear.reduce(
        (acc, o) => acc + (o.reservations?.length ?? 0),
        0
      );

      return {
        totalOutings,
        avgOccupation,
        totalParticipants,
        typeData,
        monthlyData,
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Statistiques</h1>
            <p className="text-muted-foreground">
              Tableau de bord annuel du club
            </p>
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

                <Card className="shadow-card">
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                      <BarChart3 className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Type populaire</p>
                      <p className="text-2xl font-bold text-foreground">
                        {stats?.typeData?.[0]?.name ?? "-"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
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
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Stats;
