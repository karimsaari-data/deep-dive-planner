import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Users, Calendar, MapPin, Sun, Waves, Droplets, Building2, Leaf, User, Share2, Copy, Check } from "lucide-react";
import Layout from "@/components/layout/Layout";
import CreateOutingForm from "@/components/admin/CreateOutingForm";
import LocationManager from "@/components/admin/LocationManager";
import MemberManager from "@/components/admin/MemberManager";
import EquipmentCatalogManager from "@/components/admin/EquipmentCatalogManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOutings } from "@/hooks/useOutings";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isOrganizer, isAdmin, loading: roleLoading } = useUserRole();
  const { data: outings, isLoading } = useOutings();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getShareLink = (outingId: string) => {
    return `${window.location.origin}/outing/${outingId}`;
  };

  const handleCopyLink = async (outingId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(getShareLink(outingId));
      setCopiedId(outingId);
      toast.success("Lien copié !");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  const handleShareWhatsApp = (outing: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const text = `${outing.title} - ${format(new Date(outing.date_time), "d MMMM yyyy", { locale: fr })} ${getShareLink(outing.id)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

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
                          const confirmedCount = outing.confirmed_count ?? 0;
                          
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
                            <div
                              key={outing.id}
                              className="rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
                            >
                              <Link to={`/outing/${outing.id}/manage`} className="block">
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
                                      <span>{outing.organizer.first_name} {outing.organizer.last_name}</span>
                                    </div>
                                  )}
                                </div>
                              </Link>
                              
                              {/* Share buttons */}
                              <div className="mt-3 pt-3 border-t border-border/50 flex gap-2">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                                      <Share2 className="h-4 w-4" />
                                      Partager
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80" onClick={(e) => e.stopPropagation()}>
                                    <div className="space-y-3">
                                      <p className="text-sm font-medium">Partager cette sortie</p>
                                      <div className="flex gap-2">
                                        <Input readOnly value={getShareLink(outing.id)} className="flex-1 text-xs" />
                                        <Button variant="ocean" size="icon" onClick={(e) => handleCopyLink(outing.id, e)}>
                                          {copiedId === outing.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                      </div>
                                      <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={(e) => handleShareWhatsApp(outing, e)}
                                      >
                                        Partager sur WhatsApp
                                      </Button>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
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
