import { Shield } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FicheSecuriteGenerator } from "@/components/pdf/FicheSecuriteGenerator";

const Security = () => {
  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Fiche Sécurité Team Oxygen</h1>
                <p className="text-muted-foreground">Consignes essentielles pour pratiquer en toute sécurité</p>
              </div>
            </div>
            <FicheSecuriteGenerator />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="destructive" className="gap-1">
              <Shield className="h-3 w-3" />
              Lecture obligatoire
            </Badge>
            <Badge variant="secondary">Team Oxygen</Badge>
            <Badge variant="outline">🌿 Be an Eco Explorer</Badge>
          </div>
        </div>

        {/* Tagline */}
        <Card className="mb-6 bg-gradient-to-r from-blue-950 via-blue-900 to-cyan-800 text-white border-0">
          <CardContent className="pt-5 pb-5 text-center">
            <p className="text-lg font-semibold italic text-cyan-200">
              « Prendre soin de soi, des autres et de la mer »
            </p>
          </CardContent>
        </Card>

        {/* Sections */}
        <div className="space-y-5">
          <Section
            number="1"
            title="Prendre soin de soi"
            subtitle="Sécurité individuelle"
            color="blue"
          >
            <div className="grid md:grid-cols-2 gap-3">
              <Item label="Écoute & modération">
                Être à l'écoute de soi et raisonnable. Nous sommes notre première sécurité.
              </Item>
              <Item label="Préparation mentale">
                Engager la pratique de l'apnée dans un état relaxé.
              </Item>
              <Item label="Philosophie de pratique">
                Ne pas rechercher la performance à tout prix, mais être dans une volonté de progression.
              </Item>
              <Item label="Hydratation">
                Penser à bien s'hydrater avant et après chaque plongée.
              </Item>
            </div>
          </Section>

          <Section
            number="2"
            title="Équipement Obligatoire & Check-list Matériel"
            subtitle="À vérifier avant chaque sortie"
            color="red"
          >
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                  Équipement requis par apnéiste
                </p>
                <ul className="space-y-2">
                  {[
                    { icon: "🦵", label: "Palmes" },
                    { icon: "🤿", label: "Masque" },
                    { icon: "🌊", label: "Tuba" },
                    { icon: "🩱", label: "Combinaison (néoprène refendu recommandé)" },
                    { icon: "⚖️", label: "Ceinture de plombs" },
                    { icon: "💧", label: "Gourde d'eau — obligatoire sur toutes les sorties" },
                  ].map((item) => (
                    <li
                      key={item.label}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 text-sm"
                    >
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
                    ✓ Check avant départ
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Faire un check matos avant de quitter la maison et d'aller à l'eau.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                  <p className="text-sm font-semibold text-green-800 dark:text-green-300 mb-1">
                    ✓ Adaptation météo
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Choisir le matériel en fonction des conditions météo et de l'activité ciblée.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border-2 border-red-500">
                  <div className="flex gap-2 items-start">
                    <span className="text-lg">⚠️</span>
                    <div>
                      <p className="text-sm font-bold text-red-700 dark:text-red-400 mb-1">
                        RÈGLE STRICTE
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-400">
                        En cas de manquement à l'un de ces éléments,{" "}
                        <strong>le refus de sortir en mer sera appliqué immédiatement.</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <Section
            number="3"
            title="Organisation, Ponctualité & Respect des engagements"
            color="teal"
          >
            <div className="grid md:grid-cols-2 gap-3">
              <Item label="Respect des horaires">
                Les horaires de la sortie doivent être scrupuleusement respectés, en intégrant
                systématiquement une marge de sécurité.
              </Item>
              <Item label="Anticipation des annulations">
                Afin de garantir la bonne organisation et le respect des encadrants, on évite les
                annulations à moins de 24 heures de la sortie.
              </Item>
            </div>
          </Section>

          <Section
            number="4"
            title="Prendre soin de son binôme"
            subtitle="Sécurité collective"
            color="purple"
          >
            <div className="grid md:grid-cols-2 gap-3">
              <Item label="Niveau équivalent">
                Les binômes doivent être de même niveau pour garantir une sécurité optimale.
              </Item>
              <Item label="Responsabilité">
                Prendre son rôle de binôme aussi sérieusement que ses propres apnées.
              </Item>
              <Item label="Communication">
                Bien communiquer avec son binôme — avant, pendant et après les plongées.
              </Item>
              <Item label="Cohésion">
                Garder un esprit d'équipe et de partage en toutes circonstances.
              </Item>
            </div>
          </Section>

          <Section
            number="5"
            title="Respect de l'environnement & Encadrement"
            subtitle="Éco-responsabilité"
            color="green"
          >
            <div className="grid md:grid-cols-2 gap-3">
              <Item label="Consignes encadrant">
                Rester vigilant quant aux dangers liés à la mer et bien respecter les consignes de
                l'encadrant.
              </Item>
              <Item label="Éco-responsabilité">
                Respecter la faune et la flore — nous sommes des invités dans leur milieu.
              </Item>
            </div>
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center gap-4">
              <span className="text-3xl">🌿</span>
              <div>
                <p className="font-bold text-emerald-800 dark:text-emerald-300">BE AN ECO EXPLORER</p>
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  Chaque plongée est une opportunité de protéger et observer notre environnement marin.
                  Zéro déchet, zéro impact, maximum de respect.
                </p>
              </div>
            </div>
          </Section>
        </div>

        {/* Footer download */}
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
              <FicheSecuriteGenerator />
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

const colorMap: Record<string, string> = {
  blue: "bg-blue-600",
  red: "bg-red-600",
  teal: "bg-teal-600",
  purple: "bg-purple-700",
  green: "bg-emerald-600",
};

const Section = ({
  number,
  title,
  subtitle,
  color,
  children,
}: {
  number: string;
  title: string;
  subtitle?: string;
  color: string;
  children: React.ReactNode;
}) => (
  <Card className="overflow-hidden">
    <div className={`${colorMap[color]} px-5 py-3 flex items-center gap-3`}>
      <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
        {number}
      </div>
      <div>
        <h2 className="text-white font-bold text-base leading-tight">{title}</h2>
        {subtitle && (
          <p className="text-white/80 text-xs">{subtitle}</p>
        )}
      </div>
    </div>
    <CardContent className="pt-4 pb-5">{children}</CardContent>
  </Card>
);

const Item = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex gap-2">
    <div className="w-1 rounded-full bg-cyan-500 flex-shrink-0 mt-1" />
    <p className="text-sm">
      <span className="font-semibold text-foreground">{label} : </span>
      <span className="text-muted-foreground">{children}</span>
    </p>
  </div>
);

export default Security;
