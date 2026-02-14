import { Shield, AlertTriangle, Eye, Radio, Zap, Download, FileText } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
              <AlertTriangle className="h-3 w-3" />
              Lecture obligatoire
            </Badge>
            <Badge variant="secondary">Team Oxygen</Badge>
          </div>
        </div>

        {/* Tabs Navigation */}
        <Tabs defaultValue="prevenir" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="prevenir" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Prévenir</span>
            </TabsTrigger>
            <TabsTrigger value="profondeur" className="gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">En profondeur</span>
            </TabsTrigger>
            <TabsTrigger value="surface" className="gap-2">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">En surface</span>
            </TabsTrigger>
            <TabsTrigger value="alerter" className="gap-2">
              <Radio className="h-4 w-4" />
              <span className="hidden sm:inline">Alerter</span>
            </TabsTrigger>
          </TabsList>

          {/* PRÉVENIR */}
          <TabsContent value="prevenir" className="space-y-6">
            <Card className="border-blue-200 dark:border-blue-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <Shield className="h-5 w-5" />
                  PRÉVENIR
                </CardTitle>
                <CardDescription>
                  La prévention est la clé d'une pratique sûre de l'apnée
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Communiquer */}
                <div>
                  <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <Radio className="h-5 w-5 text-blue-600" />
                    COMMUNIQUER
                  </h3>
                  <ul className="space-y-2 ml-7">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold mt-1">›</span>
                      <span>Indiquer ce que je vais faire : direction, profondeur, durée de l'apnée…</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold mt-1">›</span>
                      <span>Échanger sur mon état physique (froid, fatigue, hydratation…) et mental (appréhension, stress…)</span>
                    </li>
                  </ul>
                </div>

                {/* Surveiller */}
                <div>
                  <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <Eye className="h-5 w-5 text-blue-600" />
                    SURVEILLER
                  </h3>
                  <ul className="space-y-2 ml-7">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold mt-1">›</span>
                      <span>Suivre son binôme en surface et être attentif à tout comportement étrange</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold mt-1">›</span>
                      <span>Lui donner la bouée quand il remonte et rester vigilent, proche de lui durant 30 s</span>
                    </li>
                  </ul>
                </div>

                {/* Automatiser */}
                <div>
                  <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-600" />
                    AUTOMATISER
                  </h3>
                  <ul className="space-y-2 ml-7">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold mt-1">›</span>
                      <span>Faire 3 grandes respirations + OK en regardant son binôme à chaque remontée</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold mt-1">›</span>
                      <span>Stopper son apnée en cas de douleurs ou toutes sensations inhabituelles</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                  <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                    💡 <strong>Rappel :</strong> Ne jamais plonger seul. Le binôme est votre assurance vie.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* INTERVENIR EN PROFONDEUR */}
          <TabsContent value="profondeur" className="space-y-6">
            <Card className="border-amber-200 dark:border-amber-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Zap className="h-5 w-5" />
                  INTERVENIR EN PROFONDEUR
                </CardTitle>
                <CardDescription>
                  Que faire si votre binôme a un problème en immersion ?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 font-bold text-amber-700">
                      1
                    </div>
                    <div>
                      <h4 className="font-bold mb-1">Aller chercher son binôme</h4>
                      <p className="text-sm text-muted-foreground">
                        Descendre immédiatement pour le récupérer s'il ne remonte pas ou semble en difficulté
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 font-bold text-amber-700">
                      2
                    </div>
                    <div>
                      <h4 className="font-bold mb-1">Contrôle des voies aériennes</h4>
                      <p className="text-sm text-muted-foreground">
                        Vérifier que la bouche et le nez sont bien fermés pour éviter toute entrée d'eau
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 font-bold text-amber-700">
                      3
                    </div>
                    <div>
                      <h4 className="font-bold mb-1">Remonter en sécurité</h4>
                      <p className="text-sm text-muted-foreground">
                        Ramener le binôme en surface en contrôlant la vitesse de remontée. Maintenir les voies aériennes fermées.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 font-bold text-amber-700">
                      4
                    </div>
                    <div>
                      <h4 className="font-bold mb-1">Appel à l'aide</h4>
                      <p className="text-sm text-muted-foreground">
                        Une fois en surface, appeler immédiatement de l'aide et passer le relais aux autres membres
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                  <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                    ⚠️ <strong>Important :</strong> Ne jamais tenter une intervention en profondeur si vous n'êtes pas sûr de pouvoir remonter en sécurité.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* INTERVENIR EN SURFACE */}
          <TabsContent value="surface" className="space-y-6">
            <Card className="border-emerald-200 dark:border-emerald-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <Eye className="h-5 w-5" />
                  INTERVENIR EN SURFACE
                </CardTitle>
                <CardDescription>
                  Gestes essentiels en cas de syncope ou malaise en surface
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 font-bold text-emerald-700">
                      1
                    </div>
                    <div>
                      <h4 className="font-bold mb-1">Sortir de l'eau immédiatement</h4>
                      <p className="text-sm text-muted-foreground">
                        Ramener la victime sur le bateau, la bouée ou le bord le plus rapidement possible
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 font-bold text-emerald-700">
                      2
                    </div>
                    <div>
                      <h4 className="font-bold mb-1">Contrôle de la conscience</h4>
                      <p className="text-sm text-muted-foreground">
                        Parler à la victime, la stimuler doucement. Vérifier qu'elle respire normalement
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 font-bold text-emerald-700">
                      3
                    </div>
                    <div>
                      <h4 className="font-bold mb-1">Mise sous oxygène</h4>
                      <p className="text-sm text-muted-foreground">
                        Administrer de l'oxygène à 15 L/min avec un masque haute concentration, même si la victime a repris conscience
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 font-bold text-emerald-700">
                      4
                    </div>
                    <div>
                      <h4 className="font-bold mb-1">Position de sécurité</h4>
                      <p className="text-sm text-muted-foreground">
                        Si inconscient mais respire : PLS (Position Latérale de Sécurité). Si arrêt respiratoire : RCP immédiate
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 font-bold text-emerald-700">
                      5
                    </div>
                    <div>
                      <h4 className="font-bold mb-1">Surveillance continue</h4>
                      <p className="text-sm text-muted-foreground">
                        Maintenir l'oxygénation et surveiller l'état de la victime jusqu'à l'arrivée des secours
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-900">
                  <p className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">
                    💚 <strong>Bon réflexe :</strong> Toujours oxygéner, même en cas de doute. L'oxygène ne peut pas faire de mal.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ALERTER */}
          <TabsContent value="alerter" className="space-y-6">
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <Radio className="h-5 w-5" />
                  ALERTER LES SECOURS
                </CardTitle>
                <CardDescription>
                  Comment déclencher l'alerte efficacement ?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Numéros d'urgence */}
                <div>
                  <h3 className="font-bold text-lg mb-3">📞 Numéros d'urgence</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                      <div className="font-bold text-red-700 dark:text-red-400 mb-1">VHF Canal 16</div>
                      <div className="text-sm text-muted-foreground">Urgence maritime - priorité</div>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                      <div className="font-bold text-red-700 dark:text-red-400 mb-1">CROSS 196</div>
                      <div className="text-sm text-muted-foreground">Depuis un téléphone</div>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                      <div className="font-bold text-red-700 dark:text-red-400 mb-1">SAMU 15</div>
                      <div className="text-sm text-muted-foreground">Urgences médicales</div>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                      <div className="font-bold text-red-700 dark:text-red-400 mb-1">112</div>
                      <div className="text-sm text-muted-foreground">Numéro d'urgence européen</div>
                    </div>
                  </div>
                </div>

                {/* Script d'appel */}
                <div>
                  <h3 className="font-bold text-lg mb-3">📋 Script d'appel d'urgence</h3>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 font-mono text-sm space-y-2">
                    <p className="font-bold text-red-600">ICI [NOM DU BATEAU / LIEU]</p>
                    <p>Position : [COORDONNÉES GPS ou NOM DU SITE]</p>
                    <p>Nature : ACCIDENT D'APNÉE</p>
                    <p>Victime : [ÂGE] ans</p>
                    <p>Conscience : [OUI / NON]</p>
                    <p>Respiration : [OUI / NON]</p>
                    <p className="font-bold text-red-600 mt-2">Je demande une ÉVACUATION MÉDICALE</p>
                  </div>
                </div>

                {/* Informations à préparer */}
                <div>
                  <h3 className="font-bold text-lg mb-3">📝 Informations à préparer</h3>
                  <ul className="space-y-2 ml-7">
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 font-bold mt-1">›</span>
                      <span>Position GPS exacte du site</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 font-bold mt-1">›</span>
                      <span>Nombre de victimes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 font-bold mt-1">›</span>
                      <span>État de conscience et respiration</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 font-bold mt-1">›</span>
                      <span>Gestes de secours déjà effectués (oxygène, RCP...)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 font-bold mt-1">›</span>
                      <span>Conditions météo (vent, houle)</span>
                    </li>
                  </ul>
                </div>

                {/* Organisation */}
                <div>
                  <h3 className="font-bold text-lg mb-3">🎯 Organisation sur le site</h3>
                  <div className="space-y-2">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                      <strong>Personne 1 :</strong> Reste avec la victime et maintient l'oxygénation
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                      <strong>Personne 2 :</strong> Passe l'appel d'urgence et reste en ligne
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                      <strong>Personne 3 :</strong> Guide les secours vers le point d'accès
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                  <p className="text-sm text-red-800 dark:text-red-300 font-medium">
                    🚨 <strong>Règle d'or :</strong> Ne jamais raccrocher avant que les secours ne vous le demandent. Ils peuvent avoir besoin d'informations complémentaires.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer avec téléchargement */}
        <Card className="mt-8 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-blue-600" />
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
