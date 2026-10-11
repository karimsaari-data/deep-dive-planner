import { useEffect, useRef, useState } from "react";
import { getFishLevel, FISH_LEVELS } from "@/hooks/useTrombinoscope";

interface FishLevelCardProps {
  outingsCount: number;
  userId?: string;
  /** false tant que le compteur de sorties n'est pas chargé */
  ready: boolean;
}

const BUBBLES = [
  { left: "8%", size: 10, delay: 0 },
  { left: "22%", size: 6, delay: 120 },
  { left: "38%", size: 12, delay: 240 },
  { left: "55%", size: 8, delay: 80 },
  { left: "70%", size: 14, delay: 200 },
  { left: "84%", size: 7, delay: 320 },
  { left: "93%", size: 10, delay: 160 },
];

const storageKey = (userId: string) =>
  `fish-level-seen:${userId}:${new Date().getFullYear()}`;

const FishLevelCard = ({ outingsCount, userId, ready }: FishLevelCardProps) => {
  const fish = getFishLevel(outingsCount);
  const fishIdx = FISH_LEVELS.indexOf(fish);
  const next = FISH_LEVELS[fishIdx + 1] ?? null;
  const toNext = next ? next.min - outingsCount : 0;
  const progress = next
    ? Math.round(((outingsCount - fish.min) / (next.min - fish.min)) * 100)
    : 100;

  const [celebrating, setCelebrating] = useState(false);
  const [barWidth, setBarWidth] = useState(0);
  const prevIdx = useRef<number | null>(null);

  // Détection du changement de niveau (en session ou depuis la dernière visite)
  useEffect(() => {
    if (!ready) return;

    let levelUp = false;
    if (prevIdx.current !== null) {
      levelUp = fishIdx > prevIdx.current;
    } else if (userId) {
      try {
        const stored = localStorage.getItem(storageKey(userId));
        levelUp = stored !== null && fishIdx > Number(stored);
      } catch {
        /* localStorage indisponible */
      }
    }
    prevIdx.current = fishIdx;

    if (userId) {
      try {
        localStorage.setItem(storageKey(userId), String(fishIdx));
      } catch {
        /* ignore */
      }
    }

    if (levelUp) {
      setCelebrating(true);
      const t = setTimeout(() => setCelebrating(false), 3500);
      return () => clearTimeout(t);
    }
  }, [ready, fishIdx, userId]);

  // Remplissage animé de la barre de progression
  useEffect(() => {
    if (!ready) return;
    const raf = requestAnimationFrame(() => setBarWidth(progress));
    return () => cancelAnimationFrame(raf);
  }, [ready, progress]);

  return (
    <div
      className={`relative mb-6 overflow-hidden rounded-xl border p-4 transition-colors duration-700 ${fish.bg} ${
        celebrating ? "animate-level-up" : ""
      }`}
    >
      {celebrating && (
        <div aria-hidden className="pointer-events-none absolute inset-0 motion-reduce:hidden">
          {BUBBLES.map((b, i) => (
            <span
              key={i}
              className={`absolute bottom-0 rounded-full opacity-0 animate-bubble-rise ${fish.dot}`}
              style={{
                left: b.left,
                width: b.size,
                height: b.size,
                animationDelay: `${b.delay}ms`,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative flex items-center justify-between mb-2">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            Mon niveau {new Date().getFullYear()}
          </p>
          <p className={`flex items-center gap-2 text-xl font-bold ${fish.label}`}>
            <span>{fish.name}</span>
            {celebrating && (
              <span className="inline-block text-2xl animate-emoji-pop motion-reduce:animate-none">
                {fish.emoji}
              </span>
            )}
          </p>
          {celebrating && (
            <p className={`text-xs font-semibold animate-in fade-in duration-500 motion-reduce:animate-none ${fish.label}`}>
              Nouveau niveau débloqué !
            </p>
          )}
        </div>
        <div className="text-right">
          <p
            key={outingsCount}
            className={`text-3xl font-black ${fish.label} ${celebrating ? "animate-emoji-pop motion-reduce:animate-none" : ""}`}
          >
            {outingsCount}
          </p>
          <p className="text-xs text-muted-foreground">sortie{outingsCount !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {next ? (
        <>
          <div className="relative w-full bg-white/60 rounded-full h-2 mb-1.5 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-[width] duration-1000 ease-out ${fish.dot}`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
          <p className="relative text-xs text-muted-foreground">
            Encore <strong>{toNext} sortie{toNext !== 1 ? "s" : ""}</strong> pour atteindre{" "}
            <span className={`font-semibold ${fish.label}`}>{next.name}</span>
          </p>
        </>
      ) : (
        <p className={`relative text-xs font-semibold ${fish.label}`}>🏆 Niveau maximum atteint !</p>
      )}
    </div>
  );
};

export default FishLevelCard;
