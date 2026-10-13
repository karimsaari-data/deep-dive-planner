import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Camera, ChevronLeft, ChevronRight, Loader2, MapPin } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useClubAlbum } from "@/hooks/useClubAlbum";

const Album = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: photos = [], isLoading } = useClubAlbum();
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<string | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const types = useMemo(() => Array.from(new Set(photos.map((p) => p.outingType))), [photos]);
  const years = useMemo(
    () => Array.from(new Set(photos.map((p) => String(new Date(p.dateTime).getFullYear())))),
    [photos]
  );

  const filtered = useMemo(
    () =>
      photos.filter(
        (p) =>
          (!typeFilter || p.outingType === typeFilter) &&
          (!yearFilter || String(new Date(p.dateTime).getFullYear()) === yearFilter)
      ),
    [photos, typeFilter, yearFilter]
  );

  const step = useCallback(
    (dir: 1 | -1) =>
      setOpenIndex((i) => (i === null || filtered.length === 0 ? i : (i + dir + filtered.length) % filtered.length)),
    [filtered.length]
  );

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, step]);

  if (authLoading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  const current = openIndex !== null ? filtered[openIndex] : null;

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-sm transition-all duration-200 active:scale-95 ${
      active
        ? "border-primary bg-primary text-primary-foreground shadow-sm"
        : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary/5"
    }`;

  return (
    <Layout>
      <section className="relative overflow-hidden py-12 text-white" style={{ background: "var(--gradient-hero)" }}>
        <div className="container relative mx-auto px-4 md:px-10">
          <p className="mb-2 animate-slide-up text-xs font-semibold uppercase tracking-widest text-white/45 [animation-fill-mode:both]">
            Team Oxygen • Album du club
          </p>
          <h1 className="mb-2 animate-slide-up text-3xl font-bold tracking-widest [animation-delay:100ms] [animation-fill-mode:both] md:text-4xl">
            Album photos
          </h1>
          <p className="flex animate-slide-up items-center gap-2 text-sm text-white/60 [animation-delay:200ms] [animation-fill-mode:both]">
            <Camera className="h-4 w-4" />
            {photos.length} photo{photos.length > 1 ? "s" : ""} des sorties du club
          </p>
        </div>
      </section>

      <section className="py-8">
        <div className="container mx-auto px-4">
          {photos.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <button className={chip(!typeFilter && !yearFilter)} onClick={() => { setTypeFilter(null); setYearFilter(null); }}>
                Toutes
              </button>
              {types.map((t) => (
                <button key={t} className={chip(typeFilter === t)} onClick={() => setTypeFilter(typeFilter === t ? null : t)}>
                  {t}
                </button>
              ))}
              <span className="mx-1 h-5 w-px bg-border" />
              {years.map((y) => (
                <button key={y} className={chip(yearFilter === y)} onClick={() => setYearFilter(yearFilter === y ? null : y)}>
                  {y}
                </button>
              ))}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
              <Camera className="mx-auto mb-4 h-12 w-12 opacity-50" />
              Aucune photo pour le moment.
            </div>
          ) : (
            <div className="columns-2 gap-3 md:columns-3 lg:columns-4">
              {filtered.map((p, i) => (
                <button
                  key={`${p.outingId}-${p.url}`}
                  onClick={() => setOpenIndex(i)}
                  className="group relative mb-3 block w-full animate-slide-up overflow-hidden rounded-xl bg-muted shadow-card [animation-fill-mode:both] [break-inside:avoid]"
                  style={{ animationDelay: `${Math.min(i, 15) * 50}ms` }}
                  aria-label={`${p.title} – agrandir la photo`}
                >
                  <img
                    src={p.url}
                    alt={p.title}
                    loading="lazy"
                    className="w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/80 to-transparent p-3 text-left text-xs text-white transition-transform duration-300 group-hover:translate-y-0">
                    <p className="font-medium">{p.title}</p>
                    <p className="text-white/70">{format(new Date(p.dateTime), "d MMM yyyy", { locale: fr })}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <Dialog open={current !== null} onOpenChange={(open) => !open && setOpenIndex(null)}>
        <DialogContent className="max-w-4xl border-0 bg-black/95 p-2 text-white [&>button]:text-white">
          {current && (
            <div className="relative">
              <DialogTitle className="sr-only">{current.title}</DialogTitle>
              <img
                key={current.url}
                src={current.url}
                alt={current.title}
                className="max-h-[75vh] w-full animate-fade-in rounded object-contain"
              />
              {filtered.length > 1 && (
                <>
                  <button
                    onClick={() => step(-1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 transition hover:bg-black/70 active:scale-90"
                    aria-label="Photo précédente"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={() => step(1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 transition hover:bg-black/70 active:scale-90"
                    aria-label="Photo suivante"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
              <div className="px-2 pb-1 pt-3 text-sm">
                <p className="font-medium">{current.title}</p>
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-white/60">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(current.dateTime), "d MMMM yyyy", { locale: fr })}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {current.location}
                  </span>
                  <span className="ml-auto">
                    {(openIndex ?? 0) + 1} / {filtered.length}
                  </span>
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Album;
