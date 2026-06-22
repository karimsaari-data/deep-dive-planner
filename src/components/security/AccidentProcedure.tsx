import {
  HeartPulse,
  ClipboardList,
  UserCog,
  ShieldCheck,
  Landmark,
  Search,
  Clock,
  AlertTriangle,
  Phone,
  ExternalLink,
  FileText,
  FolderArchive,
  Lock,
  Download,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FicheAccidentGenerator } from "@/components/pdf/FicheAccidentGenerator";

/** Couleurs par étape — classes Tailwind littérales (pas de concaténation dynamique) */
const colorMap: Record<
  string,
  { bar: string; ring: string; badge: string; timing: string }
> = {
  red: {
    bar: "bg-red-600",
    ring: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800",
    timing: "text-red-600 dark:text-red-400",
  },
  orange: {
    bar: "bg-orange-500",
    ring: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    badge: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800",
    timing: "text-orange-600 dark:text-orange-400",
  },
  green: {
    bar: "bg-green-600",
    ring: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    badge: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800",
    timing: "text-green-600 dark:text-green-400",
  },
  blue: {
    bar: "bg-blue-600",
    ring: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
    timing: "text-blue-600 dark:text-blue-400",
  },
  purple: {
    bar: "bg-purple-700",
    ring: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    badge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800",
    timing: "text-purple-600 dark:text-purple-400",
  },
  teal: {
    bar: "bg-teal-600",
    ring: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
    badge: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-800",
    timing: "text-teal-600 dark:text-teal-400",
  },
};

type Step = {
  number: number;
  color: keyof typeof colorMap;
  icon: typeof HeartPulse;
  title: string;
  bullets: string[];
  timingLabel: string;
  timingDetail: string;
};

const steps: Step[] = [
  {
    number: 1,
    color: "red",
    icon: HeartPulse,
    title: "Sécuriser – Alerter – Porter secours",
    bullets: [
      "Sécuriser la zone et la victime.",
      "Alerter les secours (15 / 112 / CROSS selon le lieu).",
      "Prendre en charge la victime selon ses besoins en attendant les secours.",
    ],
    timingLabel: "Immédiat",
    timingDetail: "Avant tout, la santé de la victime.",
  },
  {
    number: 2,
    color: "orange",
    icon: ClipboardList,
    title: "Faire un compte-rendu écrit immédiatement",
    bullets: [
      "Date, heure, lieu.",
      "Personnes présentes (noms, fonctions).",
      "Déroulement chronologique des faits.",
      "Conditions (météo, mer, matériel, profils des participants).",
      "Prise en charge effectuée et évolution.",
      "Si possible : diagnostic médical connu.",
    ],
    timingLabel: "Immédiat",
    timingDetail: "Tant que les souvenirs sont frais.",
  },
  {
    number: 3,
    color: "green",
    icon: UserCog,
    title: "Informer le président de l'association",
    bullets: ["Lui transmettre tous les éléments et le compte-rendu."],
    timingLabel: "Dès que possible",
    timingDetail: "Dans la journée.",
  },
  {
    number: 4,
    color: "blue",
    icon: ShieldCheck,
    title: "Déclarer l'accident à l'assurance FSGT",
    bullets: [
      "Obligation pour tout accident corporel d'un licencié FSGT.",
      "Remplir le formulaire de déclaration d'accident.",
      "À envoyer à l'assurance dans les 5 jours ouvrés.",
    ],
    timingLabel: "Sous 5 jours ouvrés",
    timingDetail: "Maximum.",
  },
  {
    number: 5,
    color: "purple",
    icon: Landmark,
    title: "Déclarer ou informer le SDJES",
    bullets: [
      "Obligation sous 48 h en cas d'accident corporel grave ou d'incident grave.",
      "À faire si : hospitalisation, passage aux urgences, détresse respiratoire importante, oxygénothérapie, intervention des secours (15, pompiers, CROSS…), risque vital avéré.",
      "En cas de doute : contacter le SDJES pour avis.",
    ],
    timingLabel: "Sous 48 heures",
    timingDetail:
      "Maximum. SDJES = Service Départemental à la Jeunesse, à l'Engagement et aux Sports.",
  },
  {
    number: 6,
    color: "teal",
    icon: Search,
    title: "Analyser l'événement et agir",
    bullets: [
      "Identifier les causes et facteurs favorisants.",
      "Mettre en place des actions correctives.",
      "Conserver le compte-rendu et tous les documents.",
    ],
    timingLabel: "Dans les jours suivants",
    timingDetail: "Pour progresser et prévenir.",
  },
];

const emergencyNumbers = [
  { number: "15", label: "SAMU", desc: "Urgences médicales" },
  { number: "18", label: "Pompiers", desc: "Secours & incendie" },
  { number: "112", label: "Urgences", desc: "Numéro européen" },
  { number: "196", label: "CROSS", desc: "Secours en mer" },
];

const declarations = [
  {
    title: "Déclaration d'accident FSGT",
    desc: "Formulaire à remplir pour tout accident corporel d'un licencié FSGT, à envoyer à l'assurance sous 5 jours ouvrés.",
    href: "https://www.fsgt.org",
    cta: "Espace assurance FSGT",
  },
  {
    title: "Déclaration SDJES",
    desc: "Déclaration obligatoire sous 48 h en cas d'accident grave (hospitalisation, urgences, risque vital…).",
    href: "https://www.education.gouv.fr/les-services-departementaux-de-la-jeunesse-de-l-engagement-et-des-sports-sdjes-307510",
    cta: "Contacts SDJES",
  },
];

export const AccidentProcedure = () => {
  return (
    <div className="space-y-6">
      {/* Bandeau priorité absolue */}
      <Card className="border-0 bg-gradient-to-r from-red-700 via-red-600 to-orange-600 text-white">
        <CardContent className="flex items-center justify-center gap-3 py-4 text-center">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-base font-bold uppercase tracking-wide">
            La sécurité des personnes est la priorité absolue
          </p>
          <AlertTriangle className="h-5 w-5 shrink-0" />
        </CardContent>
      </Card>

      {/* Télécharger PDF */}
      <div className="flex justify-end">
        <FicheAccidentGenerator />
      </div>

      {/* Étapes */}
      <div className="space-y-4">
        {steps.map((step) => {
          const c = colorMap[step.color];
          const Icon = step.icon;
          return (
            <Card key={step.number} className="overflow-hidden">
              <div className="grid md:grid-cols-[auto_1fr_auto]">
                {/* Numéro + icône */}
                <div className={`${c.bar} flex flex-row items-center gap-3 px-4 py-3 md:flex-col md:justify-center md:py-5`}>
                  <span className="text-3xl font-extrabold text-white leading-none">
                    {step.number}
                  </span>
                  <Icon className="h-7 w-7 text-white" />
                </div>

                {/* Contenu */}
                <CardContent className="py-4">
                  <h3 className="mb-2 text-lg font-bold uppercase leading-tight text-foreground">
                    {step.title}
                  </h3>
                  <ul className="space-y-1.5">
                    {step.bullets.map((b, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${c.bar}`} />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                {/* Délai */}
                <div className={`flex flex-col justify-center gap-1 border-t px-4 py-3 md:border-l md:border-t-0 md:min-w-[180px]`}>
                  <div className={`flex items-center gap-1.5 font-bold ${c.timing}`}>
                    <Clock className="h-4 w-4" />
                    <span className="uppercase text-sm">{step.timingLabel}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{step.timingDetail}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Numéros d'urgence */}
      <Card>
        <CardContent className="pt-5">
          <div className="mb-3 flex items-center gap-2">
            <Phone className="h-5 w-5 text-red-600" />
            <h3 className="font-bold">Numéros d'urgence</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {emergencyNumbers.map((n) => (
              <a
                key={n.number}
                href={`tel:${n.number}`}
                className="rounded-lg border p-3 text-center transition-colors hover:bg-muted/50"
              >
                <div className="text-2xl font-extrabold text-red-600">{n.number}</div>
                <div className="text-sm font-semibold">{n.label}</div>
                <div className="text-xs text-muted-foreground">{n.desc}</div>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Accident grave + Rappels */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-red-300 dark:border-red-800">
          <CardContent className="pt-5">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h3 className="font-bold text-red-700 dark:text-red-400">
                Accident grave : qu'est-ce que c'est ?
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Exemples : hospitalisation, passage aux urgences, détresse respiratoire,
              oxygénothérapie, intervention des secours (15, pompiers, CROSS…), risque vital avéré.
            </p>
            <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">
              En cas de doute, déclarez et demandez conseil — mieux vaut déclarer une fois de trop que pas assez.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <h3 className="mb-2 font-bold">Rappels importants</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "Seul un compte-rendu écrit et daté protège l'association et les encadrants.",
                "Même si la victime va bien aujourd'hui, déclarez l'accident à l'assurance.",
                "Conservez tous les documents (compte-rendu, mails, certificats médicaux, déclarations…).",
                "La transparence et la réactivité sont essentielles.",
              ].map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Déclarations & documents */}
      <Card>
        <CardContent className="pt-5">
          <div className="mb-1 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="font-bold">Déclarations d'accident & documents</h3>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Liens vers les organismes pour effectuer les déclarations. Les formulaires PDF
            pourront être déposés ici une fois fournis.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {declarations.map((d) => (
              <a
                key={d.title}
                href={d.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="mb-1 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{d.title}</span>
                </div>
                <p className="mb-3 flex-1 text-xs text-muted-foreground">{d.desc}</p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                  {d.cta}
                  <ExternalLink className="h-3.5 w-3.5" />
                </span>
              </a>
            ))}

            {/* Placeholder pour le formulaire PDF à venir */}
            <div className="flex flex-col items-start rounded-lg border border-dashed p-4 text-muted-foreground">
              <div className="mb-1 flex items-center gap-2">
                <FolderArchive className="h-4 w-4" />
                <span className="font-semibold">Formulaire FSGT (PDF)</span>
              </div>
              <p className="mb-3 flex-1 text-xs">
                Emplacement prêt à recevoir le formulaire officiel de déclaration d'accident
                une fois le fichier fourni.
              </p>
              <Button variant="outline" size="sm" className="gap-2" disabled>
                <Download className="h-3.5 w-3.5" />
                Bientôt disponible
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bandeau de bas de page */}
      <Card className="border-0 bg-gradient-to-r from-blue-950 via-blue-900 to-cyan-800 text-white">
        <CardContent className="flex items-center justify-center gap-3 py-4 text-center">
          <Lock className="h-5 w-5 shrink-0 text-cyan-300" />
          <p className="text-sm font-semibold">
            La prévention, l'anticipation et la déclaration protègent tout le monde :
            la victime, les encadrants et l'association.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
