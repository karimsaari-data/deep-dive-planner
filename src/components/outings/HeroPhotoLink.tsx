import { Link } from "react-router-dom";
import { Camera } from "lucide-react";
import { useRecentOutingPhotos } from "@/hooks/useRecentOutingPhotos";

const TILTS = ["-rotate-6", "rotate-3", "-rotate-2"];
const DELAYS = ["0s", "0.8s", "1.6s"];

const HeroPhotoLink = () => {
  const { data: photos = [] } = useRecentOutingPhotos(3);

  return (
    <Link
      to="/souvenirs"
      className="group relative flex items-center gap-3 overflow-hidden rounded-full border border-white/20 bg-white/10 py-1.5 pl-2 pr-4 text-sm text-white/90 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/20 hover:text-white md:ml-auto"
      aria-label="Voir les photos des sorties"
    >
      {/* Reflet lumineux qui traverse la pastille */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent motion-safe:animate-hero-shine"
      />

      {photos.length > 0 ? (
        <span className="flex -space-x-3 transition-all duration-300 group-hover:-space-x-1">
          {photos.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              loading="lazy"
              className={`h-9 w-9 rounded-lg border-2 border-white/80 object-cover shadow-md transition-transform duration-300 motion-safe:animate-hero-float group-hover:rotate-0 ${TILTS[i % TILTS.length]}`}
              style={{ animationDelay: DELAYS[i % DELAYS.length], zIndex: photos.length - i }}
            />
          ))}
        </span>
      ) : (
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
          <Camera className="h-4 w-4" />
        </span>
      )}

      <span className="font-medium">Photos des sorties</span>
      <Camera className="h-4 w-4 text-cyan-200 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12" />
    </Link>
  );
};

export default HeroPhotoLink;
