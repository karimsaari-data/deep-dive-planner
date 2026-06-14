import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  Loader2,
  Users,
  Calendar,
  Sun,
  Waves,
  Droplets,
  Building2,
  Leaf,
  User,
  Share2,
  Copy,
  Check,
  Plus,
  History,
  Dices,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import CreateOutingForm from "@/components/admin/CreateOutingForm";
import HistoricalOutingForm from "@/components/outings/HistoricalOutingForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useOutings, useCoInstructedOutings } from "@/hooks/useOutings";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsCurrentUserEncadrant } from "@/hooks/useIsCurrentUserEncadrant";
import { useAuth } from "@/contexts/AuthContext";
import { useLocations } from "@/hooks/useLocations";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

const MesSorties = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { isOrganizer, isAdmin, loading: roleLoading } = useUserRole();
  const { data: isEncadrantFromDirectory } = useIsCurrentUserEncadrant();
  const { data: outings, isLoading } = useOutings();
  const { data: coInstructedOutings, isLoading: isLoadingCoInstructed } = useCoInstructedOutings();
  const { data: locations } = useLocations();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showHistoricalForm, setShowHistoricalForm] = useState(false);

  const canUseHistoricalTool = !!user && (isOrganizer || !!isEncadrantFromDirectory);

  // Check if we need to pre-fill a location
  const prefilledLocationId = searchParams.get("createFor");

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

  // Auto-show form if createFor param is present
  useEffect(() => {
    if (prefilledLocationId) {
      setShowForm(true);
    }
  }, [prefilledLocationId]);

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate("/auth");
      } else if (!isOrganizer && !isAdmin && !isEncadrantFromDirectory) {
        navigate("/");
      }
    }
  }, [user, isOrganizer, isAdmin, isEncadrantFromDirectory, authLoading, roleLoading, navigate]);

  // Clear prefilled location after form closes
  const handleFormClose = () => {
    setShowForm(false);
    if (prefilledLocationId) {
      setSearchParams({});
    }
  };

  // Get the prefilled location details
  const prefilledLocation = prefilledLocationId 
    ? locations?.find(l => l.id === prefilledLocationId)
    : undefined;

  if (authLoading || roleLoading || isLoading || isLoadingCoInstructed) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isOrganizer && !isAdmin && !isEncadrantFromDirectory) {
    return null;
  }

  // Merge own outings + co-instructed outings (deduplicate by id, sort by date)
  const ownOutings = outings?.filter((outing) => outing.organizer_id === user?.id) || [];
  const ownOutingIds = new Set(ownOutings.map((o) => o.id));
  const coOutings = (coInstructedOutings || []).filter((o) => !ownOutingIds.has(o.id));
  const myOutings = [...ownOutings, ...coOutings].sort(
    (a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime()
  );

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
    <Layout>
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Mes Sorties</h1>
              <p className="text-muted-foreground">Gérez les sorties que vous organisez</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canUseHistoricalTool && (
                <Button
                  onClick={() => setShowHistoricalForm(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <History className="h-4 w-4" />
                  Archives / Saisie passée
                </Button>
              )}

              <Button onClick={() => setShowForm(!showForm)} variant="ocean" className="gap-2">
                <Plus className="h-4 w-4" />
                Nouvelle sortie
              </Button>

              <a
                href="https://oxygen-spin-and-win.lovable.app/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="gap-2">
                  <Dices className="h-4 w-4" />
                  Tirage au sort
                </Button>
              </a>
            </div>
          </div>

          {showForm && (
            <div className="mb-8">
              <CreateOutingForm 
                prefilledLocationId={prefilledLocationId || undefined}
                prefilledLocationName={prefilledLocation?.name}
                onClose={handleFormClose}
              />
            </div>
          )}

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Mes sorties
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : myOutings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Vous n'avez pas encore créé de sortie
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {myOutings.map((outing) => {
                    const confirmedCount = outing.confirmed_count ?? 0;
                    const isCoInstructed = outing.organizer_id !== user?.id;
                    const endDate = outing.end_date ? new Date(outing.end_date) : new Date(outing.date_time);
                    const isPastOuting = endDate < new Date();

                    return (
                      <div
                        key={outing.id}
                        className={`rounded-lg border p-4 transition-colors ${isPastOuting ? "border-orange-200 bg-orange-50/40 hover:bg-orange-50/60 dark:border-orange-900/40 dark:bg-orange-950/20" : "border-border bg-muted/30 hover:bg-muted/50"}`}
                      >
                        <Link to={`/outing/${outing.id}/manage`} className="block">
                          <div className="mb-2 flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <h4 className="font-medium text-foreground">
                                  {outing.title}
                                </h4>
                                {isCoInstructed && (
                                  <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                                    Co-encadrant
                                  </Badge>
                                )}
                                {isPastOuting && (
                                  <Badge className="text-xs bg-orange-100 text-orange-700 border border-orange-300 dark:bg-orange-900/30 dark:text-orange-400">
                                    À clôturer
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(outing.date_time), "d MMMM yyyy 'à' HH'h'mm", {
                                  locale: fr,
                                })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {outing.is_staff_only && (
                                <Badge className="bg-amber-500 text-white text-xs">PRIVÉ STAFF</Badge>
                              )}
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
       </section>

       <HistoricalOutingForm
         open={showHistoricalForm}
         onOpenChange={setShowHistoricalForm}
       />
     </Layout>
   );
};

export default MesSorties;
