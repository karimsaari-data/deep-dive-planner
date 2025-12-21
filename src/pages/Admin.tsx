import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Users, Calendar } from "lucide-react";
import Layout from "@/components/layout/Layout";
import CreateOutingForm from "@/components/admin/CreateOutingForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOutings } from "@/hooks/useOutings";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isOrganizer, loading: roleLoading } = useUserRole();
  const { data: outings, isLoading } = useOutings();

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate("/auth");
      } else if (!isOrganizer) {
        navigate("/");
      }
    }
  }, [user, isOrganizer, authLoading, roleLoading, navigate]);

  if (authLoading || roleLoading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isOrganizer) {
    return null;
  }

  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Administration</h1>
            <p className="text-muted-foreground">
              Gérez les sorties et visualisez les inscriptions
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Create Outing Form */}
            <div>
              <CreateOutingForm />
            </div>

            {/* Outings List with Participants */}
            <div>
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Sorties à venir
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : outings?.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Aucune sortie prévue
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {outings?.slice(0, 5).map((outing) => (
                        <div
                          key={outing.id}
                          className="rounded-lg border border-border bg-muted/30 p-4"
                        >
                          <div className="mb-2 flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-foreground">
                                {outing.title}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(outing.date_time), "d MMMM yyyy", {
                                  locale: fr,
                                })}
                              </p>
                            </div>
                            <Badge variant="secondary">{outing.outing_type}</Badge>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-primary" />
                            <span className="font-medium">
                              {outing.reservations?.length ?? 0}/{outing.max_participants}
                            </span>
                            <span className="text-muted-foreground">inscrits</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Admin;
