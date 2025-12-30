import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, BarChart3 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import LocationManager from "@/components/admin/LocationManager";
import MemberManager from "@/components/admin/MemberManager";
import EquipmentCatalogManager from "@/components/admin/EquipmentCatalogManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();

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
            <h1 className="text-3xl font-bold text-foreground">Administration</h1>
            <p className="text-muted-foreground">
              Gérez les lieux, le catalogue, les membres et les statistiques
            </p>
          </div>

          <Tabs defaultValue="locations" className="space-y-6">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="locations">Lieux</TabsTrigger>
              <TabsTrigger value="catalog">Catalogue Matériel</TabsTrigger>
              <TabsTrigger value="members">Membres</TabsTrigger>
              <TabsTrigger value="stats">Statistiques</TabsTrigger>
            </TabsList>

            <TabsContent value="locations">
              <LocationManager />
            </TabsContent>

            <TabsContent value="catalog">
              <EquipmentCatalogManager />
            </TabsContent>

            <TabsContent value="members">
              <MemberManager />
            </TabsContent>

            <TabsContent value="stats">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Statistiques du club
                  </CardTitle>
                  <CardDescription>
                    Consultez le tableau de bord annuel avec les métriques de participation et d'encadrement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to="/stats">
                    <Button variant="ocean" className="w-full sm:w-auto">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Accéder aux statistiques
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </Layout>
  );
};

export default Admin;
