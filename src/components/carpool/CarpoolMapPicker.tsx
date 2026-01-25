import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Crosshair, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Fix default marker icons for Leaflet with Vite
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface CarpoolMapPickerProps {
  destinationLat?: number;
  destinationLng?: number;
  destinationName?: string;
  onLocationSelect: (lat: number, lng: number, address: string, mapsLink: string) => void;
  initialMeetingPoint?: { lat: number; lng: number } | null;
}

const CarpoolMapPicker = ({
  destinationLat,
  destinationLng,
  destinationName,
  onLocationSelect,
  initialMeetingPoint,
}: CarpoolMapPickerProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const rdvMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(
    initialMeetingPoint || null
  );

  // Custom icons
  const userIcon = L.divIcon({
    className: "custom-marker",
    html: `<div class="flex items-center justify-center w-8 h-8 bg-blue-500 rounded-full border-2 border-white shadow-lg">
      <span class="text-white text-xs font-bold">MOI</span>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  const destIcon = L.divIcon({
    className: "custom-marker",
    html: `<div class="flex items-center justify-center w-8 h-8 bg-emerald-500 rounded-full border-2 border-white shadow-lg">
      <span class="text-white text-xs">🎯</span>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  const rdvIcon = L.divIcon({
    className: "custom-marker",
    html: `<div class="flex items-center justify-center w-10 h-10 bg-red-500 rounded-full border-3 border-white shadow-xl animate-pulse">
      <span class="text-white text-sm font-bold">RDV</span>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Default center (Marseille)
    const defaultCenter: [number, number] = [43.3, 5.4];
    
    mapRef.current = L.map(mapContainerRef.current).setView(defaultCenter, 10);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(mapRef.current);

    // Click handler
    mapRef.current.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      handleMapClick(lat, lng);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Add destination marker
  useEffect(() => {
    if (!mapRef.current || !destinationLat || !destinationLng) return;

    if (destMarkerRef.current) {
      destMarkerRef.current.remove();
    }

    destMarkerRef.current = L.marker([destinationLat, destinationLng], { icon: destIcon })
      .addTo(mapRef.current)
      .bindPopup(`<b>🏁 ${destinationName || "Destination"}</b>`);
  }, [destinationLat, destinationLng, destinationName]);

  // Update polyline and view when locations change
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing polyline
    if (polylineRef.current) {
      polylineRef.current.remove();
    }

    // Draw line from user to destination
    if (userLocation && destinationLat && destinationLng) {
      polylineRef.current = L.polyline(
        [
          [userLocation.lat, userLocation.lng],
          [destinationLat, destinationLng],
        ],
        {
          color: "#3b82f6",
          weight: 3,
          dashArray: "10, 10",
          opacity: 0.7,
        }
      ).addTo(mapRef.current);

      // Fit bounds to show both points
      const bounds = L.latLngBounds([
        [userLocation.lat, userLocation.lng],
        [destinationLat, destinationLng],
      ]);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    } else if (destinationLat && destinationLng) {
      // Only destination available
      mapRef.current.setView([destinationLat, destinationLng], 12);
    }
  }, [userLocation, destinationLat, destinationLng]);

  // Update user marker
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    } else {
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(mapRef.current)
        .bindPopup("<b>📍 Ma position</b>");
    }
  }, [userLocation]);

  // Handle map click - place RDV marker
  const handleMapClick = (lat: number, lng: number) => {
    if (!mapRef.current) return;

    setSelectedPoint({ lat, lng });

    // Remove existing RDV marker
    if (rdvMarkerRef.current) {
      rdvMarkerRef.current.remove();
    }

    // Add new RDV marker
    rdvMarkerRef.current = L.marker([lat, lng], { icon: rdvIcon })
      .addTo(mapRef.current)
      .bindPopup("<b>🚗 Point de RDV</b>")
      .openPopup();

    // Generate Google Maps link
    const mapsLink = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
    
    // Callback with selection
    onLocationSelect(lat, lng, "Point GPS sélectionné sur la carte", mapsLink);
  };

  // Get user location
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setIsLocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <Card className="border-primary/30">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <span>Cliquez sur la carte pour définir le point de RDV</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGetLocation}
            disabled={isLocating}
            className="gap-1"
          >
            {isLocating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Crosshair className="h-4 w-4" />
            )}
            {isLocating ? "Localisation..." : "Me localiser"}
          </Button>
        </div>

        {/* Map container */}
        <div
          ref={mapContainerRef}
          className="w-full h-64 rounded-lg overflow-hidden border border-border"
          style={{ zIndex: 0 }}
        />

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-blue-500 rounded-full" />
            <span>Ma position</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-emerald-500 rounded-full" />
            <span>Site de plongée</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-500 rounded-full" />
            <span>Point RDV</span>
          </div>
          {userLocation && destinationLat && (
            <div className="flex items-center gap-1">
              <span className="w-4 border-t-2 border-dashed border-blue-500" />
              <span>Trajet</span>
            </div>
          )}
        </div>

        {selectedPoint && (
          <p className="text-xs text-emerald-600 font-medium">
            ✓ Point de RDV sélectionné : {selectedPoint.lat.toFixed(5)}, {selectedPoint.lng.toFixed(5)}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default CarpoolMapPicker;