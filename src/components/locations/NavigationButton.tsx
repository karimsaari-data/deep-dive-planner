import { MapPin, Navigation, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavigationButtonProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  mapsUrl?: string | null;
  variant?: "icon" | "full";
  className?: string;
}

const NavigationButton = ({ 
  latitude, 
  longitude, 
  mapsUrl,
  variant = "full",
  className 
}: NavigationButtonProps) => {
  const hasCoordinates = latitude && longitude;

  const openNavigation = (app: "google" | "waze") => {
    if (!hasCoordinates) {
      // Fallback to maps_url if no coordinates
      if (mapsUrl) {
        window.open(mapsUrl, "_blank");
      }
      return;
    }
    
    if (app === "google") {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
        "_blank"
      );
    } else {
      window.open(
        `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`,
        "_blank"
      );
    }
  };

  // If no coordinates and no maps_url, don't render anything
  if (!hasCoordinates && !mapsUrl) return null;

  // If only maps_url available, simple link
  if (!hasCoordinates && mapsUrl) {
    return (
      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={className}>
        <Button variant="outline" size={variant === "icon" ? "icon" : "default"} className="gap-2">
          <Navigation className="h-4 w-4" />
          {variant === "full" && "Y aller"}
        </Button>
      </a>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ocean" size={variant === "icon" ? "icon" : "default"} className={className}>
          <Navigation className="h-4 w-4" />
          {variant === "full" && <span className="ml-2">Y aller</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => openNavigation("google")} className="gap-2 cursor-pointer">
          <Compass className="h-4 w-4" />
          Google Maps
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openNavigation("waze")} className="gap-2 cursor-pointer">
          <MapPin className="h-4 w-4" />
          Waze
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NavigationButton;
