import { useState, useMemo } from "react";
import { Waves, Loader2, History, ExternalLink } from "lucide-react";
import Layout from "@/components/layout/Layout";
import OutingCard from "@/components/outings/OutingCard";
import OutingFilters from "@/components/outings/OutingFilters";
import { useOutings, OutingType } from "@/hooks/useOutings";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsCurrentUserEncadrant } from "@/hooks/useIsCurrentUserEncadrant";
import { Button } from "@/components/ui/button";
import HistoricalOutingForm from "@/components/outings/HistoricalOutingForm";
import { useCarpoolCounts } from "@/hooks/useCarpoolCounts";
import LandingPage from "@/pages/LandingPage";
import ActivePollsBanner from "@/components/sondages/ActivePollsBanner";
import ClubCalendarWidget from "@/components/calendar/ClubCalendarWidget";

const Index = () => {
  // ── Tous les hooks en premier (règle des hooks React) ─────────────
  const [typeFilter, setTypeFilter] = useState<OutingType | null>(null);
  const [showHistoricalForm, setShowHistoricalForm] = useState(false);

  const { user } = useAuth();
  const { isAdmin, isOrganizer } = useUserRole();
  const { data: isEncadrantFromDirectory } = useIsCurrentUserEncadrant();
  const { data: outings, isLoading, error } = useOutings(typeFilter);

  const outingIds = useMemo(() => outings?.map((o) => o.id) || [], [outings]);
  const { data: carpoolCountsMap } = useCarpoolCounts(outingIds);

  // ── Garde : non authentifié → landing page ────────────────────────
  if (!user) return <LandingPage />;

  const canUseHistoricalTool = isAdmin || isOrganizer || !!isEncadrantFromDirectory;

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-14 text-white md:py-20" style={{ background: "var(--gradient-hero)" }}>
        {/* Rayons de lumière – mêmes que la landing */}
        <svg className="absolute inset-0 h-full w-full pointer-events-none opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="hero-ray" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#a8dcf0" stopOpacity="1" />
              <stop offset="100%" stopColor="#a8dcf0" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points="43,0 49,0 65,100 28,100" fill="url(#hero-ray)" />
          <polygon points="47,0 51,0 56,100 43,100" fill="url(#hero-ray)" />
          <polygon points="51,0 55,0 72,100 56,100" fill="url(#hero-ray)" />
        </svg>

        <div className="container relative mx-auto px-4 md:px-10">
          <p className="mb-2 text-xs font-semibold tracking-widest text-white/45 uppercase" style={{ letterSpacing: "0.22em" }}>
            Association d'apnée • Côte bleue – Marseille
          </p>
          <h1 className="mb-3 text-3xl font-bold tracking-widest text-white md:text-4xl" style={{ letterSpacing: "0.1em" }}>
            Prochaines sorties
          </h1>
          <div className="flex items-center gap-2 text-white/60">
            <Waves className="h-4 w-4" />
            <span className="text-sm">Team Oxygen</span>
          </div>
        </div>
      </section>

      <ActivePollsBanner />

      {/* Outings Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Prochaines sorties</h2>
              <p className="text-muted-foreground">
                {outings?.length ?? 0} sortie{(outings?.length ?? 0) > 1 ? "s" : ""} à venir
              </p>
            </div>

            <div className="flex items-center gap-3">
              {canUseHistoricalTool && (
                <Button
                  variant="outline"
                  onClick={() => setShowHistoricalForm(true)}
                  className="gap-2"
                >
                  <History className="h-4 w-4" />
                  Archives / Saisie passée
                </Button>
              )}
              <Button asChild variant="outline" className="gap-2">
                <a href="https://clean-data-collector.lovable.app" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Caractérisation
                </a>
              </Button>
              <OutingFilters activeFilter={typeFilter} onFilterChange={setTypeFilter} />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
              <p className="text-destructive">
                Une erreur est survenue lors du chargement des sorties.
              </p>
            </div>
          ) : outings?.length === 0 ? (
            <div className="rounded-lg border border-border bg-muted/50 p-12 text-center">
              <Waves className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 text-lg font-medium text-foreground">Aucune sortie prévue</h3>
              <p className="text-muted-foreground">
                {typeFilter
                  ? `Pas de sortie "${typeFilter}" prévue pour le moment.`
                  : "Revenez bientôt pour découvrir nos prochaines aventures !"}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {outings?.map((outing) => (
                <OutingCard
                  key={outing.id}
                  outing={outing}
                  carpoolInfo={carpoolCountsMap?.get(outing.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Club calendar from Google Calendar */}
      <section className="pb-10">
        <div className="container mx-auto px-4 max-w-lg">
          <ClubCalendarWidget />
        </div>
      </section>

      {/* Historical Outing Form Modal */}
      <HistoricalOutingForm
        open={showHistoricalForm}
        onOpenChange={setShowHistoricalForm}
      />
    </Layout>
  );
};

export default Index;
