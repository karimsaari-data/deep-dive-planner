import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Camera } from "lucide-react";
import { useRecentOutingPhotos } from "@/hooks/useRecentOutingPhotos";

const SLIDE_INTERVAL_MS = 3200;

const HeroPhotoLink = () => {
  const { data: photos = [] } = useRecentOutingPhotos(6);
  const [current, setCurrent] = useState(0);

  // Slideshow : pas de défilement si une seule photo ou si l'utilisateur réduit les animations
  useEffect(() => {
    if (photos.length < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setCurrent((c) => (c + 1) % photos.length), SLIDE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [photos.length]);

  return (
    <Link
      to="/album"
      className="group relative flex items-center gap-3 overflow-hidden rounded-full border border-white/20 bg-white/10 py-1.5 pl-1.5 pr-4 text-sm text-white/90 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/20 hover:text-white active:scale-95 md:ml-auto"
      aria-label="Voir l'album photos du club"
    >
      {/* Reflet lumineux qui traverse la pastille */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/3 z-10 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent motion-safe:animate-hero-shine"
      />

      {photos.length > 0 ? (
        <span className="relative h-11 w-16 shrink-0 overflow-hidden rounded-full shadow-md ring-2 ring-white/70">
          {photos.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              loading={i === 0 ? "eager" : "lazy"}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
                i === current ? "opacity-100 motion-safe:animate-hero-kenburns" : "opacity-0"
              }`}
            />
          ))}
          {/* Barre de progression de la diapo en cours */}
          {photos.length > 1 && (
            <span
              key={current}
              aria-hidden
              className="absolute bottom-0 left-0 h-0.5 w-full origin-left bg-cyan-200/90 motion-safe:animate-hero-progress"
              style={{ animationDuration: `${SLIDE_INTERVAL_MS}ms` }}
            />
          )}
        </span>
      ) : (
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
          <Camera className="h-4 w-4" />
        </span>
      )}

      <span className="font-medium">Album photos</span>
      <Camera className="h-4 w-4 text-cyan-200 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12" />
    </Link>
  );
};

export default HeroPhotoLink;
