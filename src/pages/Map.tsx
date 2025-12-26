import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, Waves, Droplets, Loader2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocations } from "@/hooks/useLocations";

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Default coordinates for Marseille
const DEFAULT_CENTER: [number, number] = [43.2965, 5.3698];
const DEFAULT_ZOOM = 11;

const getTypeIcon = (type: string | null) => {
  switch (type) {
    case "Mer":
      return <Waves className="h-4 w-4 text-blue-500" />;
    case "Piscine":
    case "Fosse":
      return <Droplets className="h-4 w-4 text-cyan-500" />;
    default:
      return <MapPin className="h-4 w-4 text-primary" />;
  }
};

const Map = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const { data: locations, isLoading } = useLocations();
  const [mapReady, setMapReady] = useState(false);

  // Filter locations with valid coordinates
  const locationsWithCoords = locations?.filter(
    (loc) => loc.latitude && loc.longitude
  ) ?? [];

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapInstanceRef.current = map;
    setMapReady(true);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Add markers when locations change
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;

    // Clear existing markers
    mapInstanceRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        mapInstanceRef.current?.removeLayer(layer);
      }
    });

    // Add new markers
    locationsWithCoords.forEach((location) => {
      if (location.latitude && location.longitude) {
        const marker = L.marker([location.latitude, location.longitude])
          .addTo(mapInstanceRef.current!);

        const popupContent = `
          <div style="min-width: 180px;">
            <h3 style="font-weight: 600; margin: 0 0 8px 0;">${location.name}</h3>
            ${location.type ? `<span style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${location.type}</span>` : ""}
            ${location.address ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #64748b;">${location.address}</p>` : ""}
            ${location.maps_url ? `<a href="${location.maps_url}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 4px; margin-top: 8px; color: #0ea5e9; text-decoration: none; font-size: 14px;">📍 Itinéraire</a>` : ""}
          </div>
        `;

        marker.bindPopup(popupContent);
      }
    });

    // Fit bounds if we have markers
    if (locationsWithCoords.length > 0) {
      const bounds = L.latLngBounds(
        locationsWithCoords.map((loc) => [loc.latitude!, loc.longitude!] as [number, number])
      );
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [locationsWithCoords, mapReady]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Carte des sites</h1>
            <p className="mt-2 text-muted-foreground">
              Visualisez tous les lieux de plongée enregistrés
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Map */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden shadow-card">
                <CardContent className="p-0">
                  <div 
                    ref={mapRef} 
                    className="h-[500px] w-full"
                    style={{ zIndex: 0 }}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Location list */}
            <div>
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Sites enregistrés ({locations?.length ?? 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[440px] overflow-y-auto pr-2">
                    {locations?.map((location) => (
                      <div
                        key={location.id}
                        className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="mt-0.5">
                          {getTypeIcon(location.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {location.name}
                          </p>
                          {location.type && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {location.type}
                            </Badge>
                          )}
                          {location.address && (
                            <p className="mt-1 text-xs text-muted-foreground truncate">
                              {location.address}
                            </p>
                          )}
                          {!location.latitude && !location.longitude && (
                            <p className="mt-1 text-xs text-amber-600">
                              Coordonnées GPS manquantes
                            </p>
                          )}
                        </div>
                        {location.maps_url && (
                          <a
                            href={location.maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Navigation className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {locationsWithCoords.length === 0 && locations && locations.length > 0 && (
            <Card className="mt-6 border-amber-200 bg-amber-50">
              <CardContent className="py-4">
                <p className="text-amber-800">
                  <strong>Info :</strong> Aucun lieu n'a de coordonnées GPS renseignées. 
                  Pour afficher les marqueurs sur la carte, ajoutez les coordonnées latitude/longitude 
                  dans la gestion des lieux (Administration).
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Map;