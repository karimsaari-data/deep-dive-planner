import { useState, useEffect, useCallback, RefObject } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UseMapFullscreenOptions {
  mapInstanceRef: RefObject<L.Map | null>;
}

/**
 * Hook that manages CSS-based fullscreen state for a Leaflet map.
 * Returns isFullscreen state, toggle/exit functions, and a button overlay component.
 */
function useMapFullscreen({ mapInstanceRef }: UseMapFullscreenOptions) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enterFullscreen = useCallback(() => {
    setIsFullscreen(true);
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);
  }, [mapInstanceRef]);

  const exitFullscreen = useCallback(() => {
    setIsFullscreen(false);
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);
  }, [mapInstanceRef]);

  const toggle = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  // Listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        exitFullscreen();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, exitFullscreen]);

  return { isFullscreen, toggle, exitFullscreen, enterFullscreen };
}

interface MapFullscreenButtonsProps {
  isFullscreen: boolean;
  onToggle: () => void;
  onExit: () => void;
}

/**
 * Renders the fullscreen toggle button and mobile exit button.
 * Must be placed inside a positioned (relative/absolute) container.
 */
const MapFullscreenButtons = ({ isFullscreen, onToggle, onExit }: MapFullscreenButtonsProps) => {
  return (
    <>
      {/* Fullscreen toggle button (icon) */}
      <Button
        variant="secondary"
        size="icon"
        className="absolute top-2.5 left-2.5 z-[1000] bg-white shadow-md hover:bg-gray-100"
        onClick={onToggle}
        title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
      >
        {isFullscreen ? (
          <Minimize2 className="h-4 w-4 text-primary" />
        ) : (
          <Maximize2 className="h-4 w-4 text-primary" />
        )}
      </Button>

      {/* Mobile exit button (visible only in fullscreen) */}
      {isFullscreen && (
        <button
          onClick={onExit}
          className="absolute top-2.5 right-2.5 z-[1000] flex items-center gap-1.5 rounded-lg bg-white/90 backdrop-blur-sm px-3 py-2 text-sm font-medium text-gray-700 shadow-md hover:bg-white"
        >
          <X className="h-4 w-4" />
          Quitter
        </button>
      )}
    </>
  );
};

export { useMapFullscreen, MapFullscreenButtons };
