import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, User, Clock } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Carpool, useBookCarpool } from "@/hooks/useCarpools";
import { useAuth } from "@/contexts/AuthContext";

// Fix Leaflet marker icon issue
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface CarpoolMapViewProps {
  carpools: Carpool[];
  outingId: string;
  destinationLat?: number;
  destinationLng?: number;
  destinationName?: string;
  isPassenger?: boolean;
  userBookingCarpoolId?: string;
  isPast?: boolean;
}

// Parse lat/lng from Google Maps link
const parseLatLngFromMapsLink = (mapsLink: string | null): { lat: number; lng: number } | null => {
  if (!mapsLink) return null;
  
  // Try various Google Maps URL formats
  // Format 1: q=lat,lng
  let match = mapsLink.match(/q=([\d.-]+),([\d.-]+)/);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }
  
  // Format 2: @lat,lng
  match = mapsLink.match(/@([\d.-]+),([\d.-]+)/);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }
  
  // Format 3: place/lat,lng
  match = mapsLink.match(/place\/([\d.-]+),([\d.-]+)/);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }
  
  return null;
};

const CarpoolMapView = ({
  carpools,
  outingId,
  destinationLat,
  destinationLng,
  destinationName,
  isPassenger = false,
  userBookingCarpoolId,
  isPast = false,
}: CarpoolMapViewProps) => {
  const { user } = useAuth();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const bookCarpool = useBookCarpool();

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedCarpool, setSelectedCarpool] = useState<Carpool | null>(null);
  const hasAutoLocated = useRef(false);

  // Auto-locate user
  useEffect(() => {
    if (hasAutoLocated.current || !navigator.geolocation) return;
    hasAutoLocated.current = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.warn("Geolocation failed:", error);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const defaultCenter: [number, number] = [
      destinationLat || 43.2965,
      destinationLng || 5.3698,
    ];

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [destinationLat, destinationLng]);

  // Update markers
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = L.latLngBounds([]);

    // User position marker (blue)
    if (userLocation) {
      const userIcon = L.divIcon({
        className: "custom-marker",
        html: `<div class="flex items-center justify-center w-10 h-10 bg-blue-500 text-white rounded-full border-3 border-white shadow-lg animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup("<strong>📍 Ma position</strong>");
      markersRef.current.push(userMarker);
      bounds.extend([userLocation.lat, userLocation.lng]);
    }

    // Destination marker (green flag)
    if (destinationLat && destinationLng) {
      const destIcon = L.divIcon({
        className: "custom-marker",
        html: `<div class="flex items-center justify-center w-10 h-10 bg-emerald-500 text-white rounded-full border-3 border-white shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
            <line x1="4" x2="4" y1="22" y2="15"></line>
          </svg>
        </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });

      const destMarker = L.marker([destinationLat, destinationLng], { icon: destIcon })
        .addTo(map)
        .bindPopup(`<strong>🏁 ${destinationName || "Site de plongée"}</strong>`);
      markersRef.current.push(destMarker);
      bounds.extend([destinationLat, destinationLng]);
    }

    // Car markers for each carpool
    carpools.forEach((carpool) => {
      const coords = parseLatLngFromMapsLink(carpool.maps_link);
      if (!coords) return;

      const passengers = carpool.passengers ?? [];
      const remainingSeats = carpool.available_seats - passengers.length;
      const isBooked = carpool.id === userBookingCarpoolId;
      const isOwn = carpool.driver_id === user?.id;

      const bgColor = isBooked ? "bg-primary" : isOwn ? "bg-amber-500" : remainingSeats > 0 ? "bg-ocean-medium" : "bg-muted";

      const carIcon = L.divIcon({
        className: "custom-marker cursor-pointer",
        html: `<div class="flex items-center justify-center w-12 h-12 ${bgColor} text-white rounded-full border-3 border-white shadow-xl transform hover:scale-110 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8c-.3.5-.1 1.2.4 1.5.3.2.6.3 1 .3H5"></path>
            <circle cx="7" cy="17" r="2"></circle>
            <path d="M9 17h6"></path>
            <circle cx="17" cy="17" r="2"></circle>
          </svg>
          ${remainingSeats > 0 ? `<span class="absolute -top-1 -right-1 bg-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">${remainingSeats}</span>` : ""}
        </div>`,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });

      const driverName = carpool.driver
        ? `${carpool.driver.first_name} ${carpool.driver.last_name}`
        : "Conducteur";

      const carMarker = L.marker([coords.lat, coords.lng], { icon: carIcon }).addTo(map);

      carMarker.on("click", () => {
        setSelectedCarpool(carpool);
      });

      markersRef.current.push(carMarker);
      bounds.extend([coords.lat, coords.lng]);
    });

    // Fit bounds if we have multiple points
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [carpools, userLocation, destinationLat, destinationLng, destinationName, userBookingCarpoolId, user?.id]);

  const handleBook = (carpoolId: string) => {
    bookCarpool.mutate({ carpoolId, outingId });
    setSelectedCarpool(null);
  };

  const selectedPassengers = selectedCarpool?.passengers ?? [];
  const selectedRemainingSeats = selectedCarpool
    ? selectedCarpool.available_seats - selectedPassengers.length
    : 0;

  return (
    <div className="relative">
      {/* Map container */}
      <div
        ref={mapContainerRef}
        className="w-full h-[350px] sm:h-[400px] rounded-lg overflow-hidden border border-border"
      />

      {/* Legend */}
      <div className="absolute top-3 left-3 bg-background/95 backdrop-blur-sm rounded-lg p-2 shadow-lg text-xs space-y-1 z-[1000]">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse" />
          <span>Ma position</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-emerald-500 rounded-full" />
          <span>Destination</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-ocean-medium rounded-full" />
          <span>Voiture dispo</span>
        </div>
      </div>

      {/* Selected carpool popup */}
      {selectedCarpool && (
        <div className="absolute bottom-4 left-4 right-4 bg-background rounded-xl shadow-2xl border border-border p-4 z-[1000] animate-fade-in">
          <button
            onClick={() => setSelectedCarpool(null)}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>

          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-12 w-12 ring-2 ring-primary/20">
              <AvatarImage src={selectedCarpool.driver?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {selectedCarpool.driver?.first_name?.[0]}
                {selectedCarpool.driver?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold text-foreground">
                {selectedCarpool.driver?.first_name} {selectedCarpool.driver?.last_name}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  Départ à <strong>{selectedCarpool.departure_time.slice(0, 5)}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm mb-3 p-2 bg-muted/50 rounded-lg">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">{selectedCarpool.meeting_point}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">
              {selectedRemainingSeats > 0 ? (
                <span className="text-primary font-medium">
                  {selectedRemainingSeats} place{selectedRemainingSeats > 1 ? "s" : ""} disponible{selectedRemainingSeats > 1 ? "s" : ""}
                </span>
              ) : (
                <span className="text-destructive font-medium">Complet</span>
              )}
            </span>

            {!isPast && isPassenger && selectedCarpool.driver_id !== user?.id && (
              userBookingCarpoolId === selectedCarpool.id ? (
                <span className="text-sm text-primary font-medium">✓ Réservé</span>
              ) : (
                <Button
                  variant="ocean"
                  size="sm"
                  onClick={() => handleBook(selectedCarpool.id)}
                  disabled={selectedRemainingSeats <= 0 || bookCarpool.isPending}
                >
                  {bookCarpool.isPending ? "..." : "🚗 Réserver"}
                </Button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CarpoolMapView;
