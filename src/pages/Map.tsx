import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, Waves, Droplets, Loader2, Plus } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocations } from "@/hooks/useLocations";
import { useUserRole } from "@/hooks/useUserRole";

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
  const { isOrganizer } = useUserRole();
  const navigate = useNavigate();

  // Filter locations with valid coordinates
  const locationsWithCoords = locations?.filter(
    (loc) => loc.latitude && loc.longitude
  ) ?? [];

  // Initialize map with marine chart layers
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 5,
      maxZoom: 19,
    });

    // IGN WMTS - Plan IGN v2 (Open Data, stable)
    const ignLayer = L.tileLayer(
      "https://data.geopf.fr/wmts?" +
        "SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0" +
        "&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2" +
        "&STYLE=normal&TILEMATRIXSET=PM" +
        "&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}" +
        "&FORMAT=image/png",
      {
        attribution: '© <a href="https://geoservices.ign.fr/">IGN</a>',
        maxZoom: 19,
        maxNativeZoom: 18,
      }
    );

    // Esri Ocean Basemap (free, no API key) - with zoom fix
    const esriOceanLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: '© <a href="https://www.esri.com/">Esri</a> Ocean Basemap',
        maxNativeZoom: 13,
        maxZoom: 19,
      }
    );

    // Esri World Imagery Satellite (free, no API key)
    const esriSatelliteLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: '© <a href="https://www.esri.com/">Esri</a> World Imagery',
        maxZoom: 19,
        maxNativeZoom: 18,
      }
    );

    // OpenSeaMap overlay (navigation marks, lighthouses)
    const openSeaMapLayer = L.tileLayer(
      "https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png",
      {
        attribution: '© <a href="https://www.openseamap.org/">OpenSeaMap</a>',
        maxZoom: 19,
        opacity: 0.8,
      }
    );

    // Add default layer (Plan IGN)
    ignLayer.addTo(map);
    openSeaMapLayer.addTo(map);

    // Layer control
    const baseMaps = {
      "Plan IGN": ignLayer,
      "Relief Sous-marin": esriOceanLayer,
      "Satellite": esriSatelliteLayer,
    };

    const overlays = {
      "Balisage maritime (OpenSeaMap)": openSeaMapLayer,
    };

    L.control.layers(baseMaps, overlays, { position: "topright" }).addTo(map);

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

        // Create popup with photo thumbnail
        const photoHtml = location.photo_url 
          ? `<img src="${location.photo_url}" alt="${location.name}" style="width: 100%; height: 80px; object-fit: cover; border-radius: 6px; margin-bottom: 8px;" onerror="this.style.display='none'" />`
          : `<div style="width: 100%; height: 80px; background: linear-gradient(135deg, #0369a1 0%, #0891b2 100%); border-radius: 6px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center;"><span style="color: white; font-size: 12px;">📍 ${location.name}</span></div>`;

        // Button for organizers to create an outing
        const createOutingBtn = isOrganizer 
          ? `<button id="create-outing-${location.id}" style="margin-top: 8px; width: 100%; padding: 6px 12px; background: linear-gradient(135deg, #0369a1 0%, #0891b2 100%); color: white; border: none; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">➕ Organiser une sortie ici</button>`
          : "";

        const popupContent = `
          <div style="min-width: 200px;">
            ${photoHtml}
            <h3 style="font-weight: 600; margin: 0 0 8px 0;">${location.name}</h3>
            ${location.type ? `<span style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${location.type}</span>` : ""}
            ${location.max_depth ? `<span style="background: #e0f2fe; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 4px;">Prof. ${location.max_depth}m</span>` : ""}
            ${location.address ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #64748b;">${location.address}</p>` : ""}
            <div style="margin-top: 8px; display: flex; gap: 8px;">
              <a href="/location/${location.id}" style="display: inline-flex; align-items: center; gap: 4px; color: #0ea5e9; text-decoration: none; font-size: 14px;">ℹ️ Détails</a>
              ${location.maps_url ? `<a href="${location.maps_url}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 4px; color: #0ea5e9; text-decoration: none; font-size: 14px;">📍 Itinéraire</a>` : ""}
            </div>
            ${createOutingBtn}
          </div>
        `;

        const popup = L.popup().setContent(popupContent);
        marker.bindPopup(popup);

        // Add event listener for the create outing button
        marker.on('popupopen', () => {
          const btn = document.getElementById(`create-outing-${location.id}`);
          if (btn) {
            btn.onclick = () => {
              navigate(`/mes-sorties?createFor=${location.id}`);
            };
          }
        });
      }
    });

    // Fit bounds if we have markers
    if (locationsWithCoords.length > 0) {
      const bounds = L.latLngBounds(
        locationsWithCoords.map((loc) => [loc.latitude!, loc.longitude!] as [number, number])
      );
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [locationsWithCoords, mapReady, isOrganizer, navigate]);

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
                        className="rounded-lg border border-border p-3 transition-colors hover:bg-muted/50 hover:border-primary/30"
                      >
                        <Link
                          to={`/location/${location.id}`}
                          className="flex items-start gap-3"
                        >
                          {/* Thumbnail */}
                          <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            {location.photo_url ? (
                              <img 
                                src={location.photo_url} 
                                alt={location.name}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="h-full w-full bg-gradient-to-br from-ocean-deep to-ocean-light flex items-center justify-center">
                                {getTypeIcon(location.type)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {location.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {location.type && (
                                <Badge variant="outline" className="text-xs">
                                  {location.type}
                                </Badge>
                              )}
                              {location.max_depth && (
                                <Badge variant="secondary" className="text-xs">
                                  {location.max_depth}m
                                </Badge>
                              )}
                            </div>
                            {!location.latitude && !location.longitude && (
                              <p className="mt-1 text-xs text-amber-600">
                                GPS manquant
                              </p>
                            )}
                          </div>
                        </Link>
                        {isOrganizer && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-2 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => navigate(`/mes-sorties?createFor=${location.id}`)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Créer une sortie
                          </Button>
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