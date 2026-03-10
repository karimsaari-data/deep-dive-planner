import { Shield, Download } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const Security = () => {
  const handleDownloadPDF = () => {
    const link = document.createElement('a');
    link.href = '/files/Fiche Sécurité  TO2.pdf';
    link.download = 'Fiche_Securite_TO2.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Téléchargement de la fiche sécurité...");
  };

  const securityPages = [
    { id: 1, image: '/files/security/Fiche sécurité_Page_1.png', title: 'Prévenir' },
    { id: 2, image: '/files/security/Fiche sécurité_Page_2.png', title: 'Intervenir en profondeur' },
    { id: 3, image: '/files/security/Fiche sécurité_Page_3.png', title: 'Intervenir en surface' },
    { id: 4, image: '/files/security/Fiche sécurité_Page_4.png', title: 'Alerter' },
  ];

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Sécurité en Apnée</h1>
                <p className="text-muted-foreground">Consignes essentielles pour pratiquer en toute sécurité</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleDownloadPDF} className="gap-2">
              <Download className="h-4 w-4" />
              Télécharger le PDF
            </Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="destructive" className="gap-1">
              <Shield className="h-3 w-3" />
              Lecture obligatoire
            </Badge>
            <Badge variant="secondary">Team Oxygen</Badge>
          </div>
        </div>

        {/* Security Pages as Images */}
        <div className="space-y-8">
          {securityPages.map((page) => (
            <Card key={page.id} className="overflow-hidden shadow-lg">
              <CardContent className="p-0">
                <img
                  src={page.image}
                  alt={`Fiche sécurité - ${page.title}`}
                  className="w-full h-auto object-contain"
                  loading="lazy"
                />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer avec téléchargement */}
        <Card className="mt-8 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="font-bold">Fiche sécurité complète</h3>
                  <p className="text-sm text-muted-foreground">
                    Téléchargez le PDF pour avoir toutes les consignes sous la main
                  </p>
                </div>
              </div>
              <Button onClick={handleDownloadPDF} size="lg" className="gap-2">
                <Download className="h-4 w-4" />
                Télécharger le PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Security;
