import { useState, useMemo } from "react";
import { Waves, Loader2, History } from "lucide-react";
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

const Index = () => {
  const [typeFilter, setTypeFilter] = useState<OutingType | null>(null);
  const [showHistoricalForm, setShowHistoricalForm] = useState(false);
  const { data: outings, isLoading, error } = useOutings(typeFilter);
  const { user } = useAuth();
  const { isAdmin, isOrganizer } = useUserRole();
  const { data: isEncadrantFromDirectory } = useIsCurrentUserEncadrant();

  // Fetch carpool counts for all outings
  const outingIds = useMemo(() => outings?.map((o) => o.id) || [], [outings]);
  const { data: carpoolCountsMap } = useCarpoolCounts(outingIds);

  const canUseHistoricalTool = !!user && (isAdmin || isOrganizer || !!isEncadrantFromDirectory);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="hero-gradient relative overflow-hidden py-16 text-foam md:py-24">
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,50 Q25,30 50,50 T100,50 L100,100 L0,100 Z" fill="currentColor" className="animate-wave" />
          </svg>
        </div>
        
        <div className="container relative mx-auto px-4 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-foam/10 backdrop-blur-sm animate-float">
            <Waves className="h-8 w-8 text-foam" />
          </div>
          
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Réserve ta sortie TO2 !</h1>
          
          <p className="mx-auto max-w-2xl text-lg text-foam/80">Association d'apnée éco-engagée de Martigues à Marseille</p>
        </div>
      </section>

      {/* Outings Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Prochaines sorties
              </h2>
              <p className="text-muted-foreground">
                {outings?.length ?? 0} sortie{(outings?.length ?? 0) > 1 ? "s" : ""} à venir
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Historical outing button for encadrants */}
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
              <h3 className="mb-2 text-lg font-medium text-foreground">
                Aucune sortie prévue
              </h3>
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

      {/* Historical Outing Form Modal */}
      <HistoricalOutingForm
        open={showHistoricalForm}
        onOpenChange={setShowHistoricalForm}
      />
    </Layout>
  );
};

export default Index;
