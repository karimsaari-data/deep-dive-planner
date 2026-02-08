import { useState, useEffect, useCallback, RefObject } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MapFullscreenToggleProps {
  mapContainerRef: RefObject<HTMLDivElement>;
  mapInstanceRef: RefObject<L.Map | null>;
  /** Background class applied to the container in fullscreen mode (default: "bg-white") */
  bgClass?: string;
  /** Original height class on the inner map div to restore when exiting fullscreen */
  originalHeightClass?: string;
  /** Ref to the inner map div whose height toggles between originalHeightClass and h-full */
  mapDivRef?: RefObject<HTMLDivElement>;
}

const FULLSCREEN_CLASSES = ["fixed", "inset-0", "z-[9999]"];

const MapFullscreenToggle = ({
  mapContainerRef,
  mapInstanceRef,
  bgClass = "bg-white",
  originalHeightClass = "h-80",
  mapDivRef,
}: MapFullscreenToggleProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enterFullscreen = useCallback(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    FULLSCREEN_CLASSES.forEach((cls) => container.classList.add(cls));
    container.classList.add(bgClass);

    // Make the inner map div fill the container
    if (mapDivRef?.current) {
      mapDivRef.current.classList.remove(originalHeightClass);
      mapDivRef.current.classList.add("h-full");
    }

    setIsFullscreen(true);

    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);
  }, [mapContainerRef, mapInstanceRef, bgClass, originalHeightClass, mapDivRef]);

  const exitFullscreen = useCallback(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    FULLSCREEN_CLASSES.forEach((cls) => container.classList.remove(cls));
    container.classList.remove(bgClass);

    // Restore original height on the inner map div
    if (mapDivRef?.current) {
      mapDivRef.current.classList.remove("h-full");
      mapDivRef.current.classList.add(originalHeightClass);
    }

    setIsFullscreen(false);

    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);
  }, [mapContainerRef, mapInstanceRef, bgClass, originalHeightClass, mapDivRef]);

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

  return (
    <>
      {/* Fullscreen toggle button (icon) */}
      <Button
        variant="secondary"
        size="icon"
        className="absolute top-2.5 left-2.5 z-[1000] bg-white shadow-md hover:bg-gray-100"
        onClick={toggle}
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
          onClick={exitFullscreen}
          className="absolute top-2.5 right-2.5 z-[1000] flex items-center gap-1.5 rounded-lg bg-white/90 backdrop-blur-sm px-3 py-2 text-sm font-medium text-gray-700 shadow-md hover:bg-white"
        >
          <X className="h-4 w-4" />
          Quitter
        </button>
      )}
    </>
  );
};

export { MapFullscreenToggle };
export type { MapFullscreenToggleProps };
