import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Users, Calendar, MapPin, Sun, Waves, Droplets, Building2, Leaf, User } from "lucide-react";
import Layout from "@/components/layout/Layout";
import CreateOutingForm from "@/components/admin/CreateOutingForm";
import LocationManager from "@/components/admin/LocationManager";
import MemberManager from "@/components/admin/MemberManager";
import EquipmentCatalogManager from "@/components/admin/EquipmentCatalogManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOutings } from "@/hooks/useOutings";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "react-router-dom";

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isOrganizer, isAdmin, loading: roleLoading } = useUserRole();
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
              Gérez les sorties, lieux et membres
            </p>
          </div>

          <Tabs defaultValue="outings" className="space-y-6">
            <TabsList>
              <TabsTrigger value="outings">Sorties</TabsTrigger>
              <TabsTrigger value="locations">Lieux</TabsTrigger>
              {isAdmin && <TabsTrigger value="catalog">Catalogue Matériel</TabsTrigger>}
              {isAdmin && <TabsTrigger value="members">Membres</TabsTrigger>}
            </TabsList>

            <TabsContent value="outings">
              <div className="grid gap-8 lg:grid-cols-2">
                <CreateOutingForm />

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
                        {outings
                          ?.filter((outing) => isAdmin || outing.organizer_id === user?.id)
                          .slice(0, 5)
                          .map((outing) => {
                          const confirmedCount = outing.reservations?.filter(r => r.status === "confirmé").length ?? 0;
                          
                          // Weather/type icons based on outing type
                          const getTypeIcon = (type: string) => {
                            switch (type) {
                              case "Mer": return <Waves className="h-4 w-4 text-primary" />;
                              case "Fosse": return <Droplets className="h-4 w-4 text-blue-500" />;
                              case "Piscine": return <Building2 className="h-4 w-4 text-cyan-500" />;
                              case "Étang": return <Leaf className="h-4 w-4 text-emerald-500" />;
                              case "Dépollution": return <Leaf className="h-4 w-4 text-green-600" />;
                              default: return <Sun className="h-4 w-4 text-yellow-500" />;
                            }
                          };
                          
                          return (
                            <Link
                              key={outing.id}
                              to={`/outing/${outing.id}`}
                              className="block rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
                            >
                              <div className="mb-2 flex items-start justify-between">
                                <div>
                                  <h4 className="font-medium text-foreground">
                                    {outing.title}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {format(new Date(outing.date_time), "d MMMM yyyy 'à' HH'h'mm", {
                                      locale: fr,
                                    })}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getTypeIcon(outing.outing_type)}
                                  <Badge variant="secondary">{outing.outing_type}</Badge>
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm">
                                  <Users className="h-4 w-4 text-primary" />
                                  <span className="font-medium">
                                    {confirmedCount}/{outing.max_participants}
                                  </span>
                                  <span className="text-muted-foreground">inscrits</span>
                                </div>
                                
                                {outing.organizer && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <User className="h-3.5 w-3.5" />
                                    <span>Organisateur : {outing.organizer.first_name} {outing.organizer.last_name}</span>
                                  </div>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="locations">
              <LocationManager />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="catalog">
                <EquipmentCatalogManager />
              </TabsContent>
            )}

            {isAdmin && (
              <TabsContent value="members">
                <MemberManager />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </section>
    </Layout>
  );
};

export default Admin;
