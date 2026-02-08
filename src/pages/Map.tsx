import { useEffect, useRef, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, Waves, Droplets, Loader2, Plus, Crosshair, Search, X } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocations, useCreateLocation, Location } from "@/hooks/useLocations";
import { useUserRole } from "@/hooks/useUserRole";
import { useMapFullscreen, MapFullscreenButtons } from "@/components/map/MapFullscreenToggle";
import { toast } from "sonner";

// Haversine formula to calculate distance between two GPS points (in km)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

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

// Custom marker icons based on POSS status
const createLocationIcon = (hasPOSS: boolean) => {
  const color = hasPOSS ? '#16a34a' : '#dc2626'; // green-600 / red-600
  const glowColor = hasPOSS ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)';
  return L.divIcon({
    className: 'custom-location-marker',
    html: `<div style="width:28px;height:28px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 8px ${glowColor}, 0 2px 4px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

const Map = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const tempMarkerRef = useRef<L.Marker | null>(null);
  const hasInitialFit = useRef(false);
  const { data: locations, isLoading } = useLocations();
  const createLocation = useCreateLocation();
  const [mapReady, setMapReady] = useState(false);
  const [userPosition, setUserPosition] = useState<{ lat: number; lon: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { isOrganizer } = useUserRole();
  const { isFullscreen, toggle: toggleFullscreen, exitFullscreen } = useMapFullscreen({ mapInstanceRef });
  const navigate = useNavigate();

  // State for create location dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationType, setNewLocationType] = useState<string>("");
  const [newLocationMaxDepth, setNewLocationMaxDepth] = useState("");

  // Filter locations with valid coordinates
  const locationsWithCoords = locations?.filter(
    (loc) => loc.latitude && loc.longitude
  ) ?? [];

  // Sort locations by distance from user
  const sortedLocations = useMemo(() => {
    if (!locations) return [];
    if (!userPosition) return locations;
    
    return [...locations].sort((a, b) => {
      if (!a.latitude || !a.longitude) return 1;
      if (!b.latitude || !b.longitude) return -1;
      
      const distA = calculateDistance(userPosition.lat, userPosition.lon, a.latitude, a.longitude);
      const distB = calculateDistance(userPosition.lat, userPosition.lon, b.latitude, b.longitude);
      return distA - distB;
    });
  }, [locations, userPosition]);

  // Filter locations based on search query
  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return sortedLocations;
    const query = searchQuery.toLowerCase();
    return sortedLocations.filter((location) =>
      location.name.toLowerCase().includes(query) ||
      location.address?.toLowerCase().includes(query) ||
      location.type?.toLowerCase().includes(query)
    );
  }, [sortedLocations, searchQuery]);

  // Get user position on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserPosition({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          console.log("Geolocation not available:", error.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // Function to center map on user position
  const centerOnUser = () => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas disponible sur cet appareil");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserPosition({ lat: latitude, lon: longitude });
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 14);
          
          // Add or update user marker
          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([latitude, longitude]);
          } else {
            const userIcon = L.divIcon({
              className: 'user-location-marker',
              html: `<div style="width: 20px; height: 20px; background: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            });
            userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon })
              .addTo(mapInstanceRef.current)
              .bindPopup("📍 Vous êtes ici");
          }
        }
        
        toast.success("Position trouvée");
        setIsLocating(false);
      },
      (error) => {
        toast.error("Impossible de récupérer votre position");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Remove temporary marker
  const removeTempMarker = () => {
    if (tempMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(tempMarkerRef.current);
      tempMarkerRef.current = null;
    }
    setClickedCoords(null);
  };

  // Handle map click for organizers
  const handleMapClick = (e: L.LeafletMouseEvent) => {
    if (!isOrganizer || !mapInstanceRef.current) return;

    const { lat, lng } = e.latlng;
    
    // Remove existing temp marker
    removeTempMarker();

    // Create temporary marker with popup
    const tempIcon = L.divIcon({
      className: 'temp-location-marker',
      html: `<div style="width: 32px; height: 32px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 16px;">+</span>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    tempMarkerRef.current = L.marker([lat, lng], { icon: tempIcon })
      .addTo(mapInstanceRef.current);

    // Create popup content with button
    const popupContent = document.createElement('div');
    popupContent.innerHTML = `
      <div style="min-width: 180px; text-align: center;">
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;">
          ${lat.toFixed(5)}, ${lng.toFixed(5)}
        </p>
        <button id="create-location-btn" style="
          width: 100%;
          padding: 8px 16px;
          background: linear-gradient(135deg, #0369a1 0%, #0891b2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        ">
          ➕ Créer un lieu ici
        </button>
      </div>
    `;

    const popup = L.popup({ closeOnClick: false })
      .setContent(popupContent);

    tempMarkerRef.current.bindPopup(popup).openPopup();

    // Add click handler for the button
    setTimeout(() => {
      const btn = document.getElementById('create-location-btn');
      if (btn) {
        btn.onclick = () => {
          setClickedCoords({ lat, lng });
          setShowCreateDialog(true);
          tempMarkerRef.current?.closePopup();
        };
      }
    }, 50);

    setClickedCoords({ lat, lng });
  };

  // Handle create location form submit
  const handleCreateLocation = async () => {
    if (!clickedCoords || !newLocationName.trim()) {
      toast.error("Le nom du lieu est obligatoire");
      return;
    }

    try {
      await createLocation.mutateAsync({
        name: newLocationName.trim(),
        type: newLocationType || undefined,
        max_depth: newLocationMaxDepth ? parseFloat(newLocationMaxDepth) : undefined,
        latitude: clickedCoords.lat,
        longitude: clickedCoords.lng,
      });

      // Reset form and close dialog
      setShowCreateDialog(false);
      setNewLocationName("");
      setNewLocationType("");
      setNewLocationMaxDepth("");
      removeTempMarker();
      toast.success("Lieu créé avec succès !");
    } catch (error) {
      console.error("Error creating location:", error);
    }
  };

  // Initialize map with marine chart layers
  useEffect(() => {
    if (isLoading) return;
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 5,
      maxZoom: 19,
    });

    // Option 1: Plan Standard (OpenStreetMap) - DEFAULT
    const osmLayer = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }
    );

    // Option 2: Vue Satellite (Esri World Imagery)
    const esriSatelliteLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: '© <a href="https://www.esri.com/">Esri</a> World Imagery',
        maxNativeZoom: 17,
        maxZoom: 19,
      }
    );

    // Option 3: Carte Marine (SHOM/IGN - Géoplateforme)
    const marineLayer = L.tileLayer(
      "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0" +
        "&LAYER=GEOGRAPHICALGRIDSYSTEMS.COASTALMAPS" +
        "&STYLE=normal&TILEMATRIXSET=PM" +
        "&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
      {
        attribution: '© <a href="https://www.shom.fr/">IGN - SHOM</a>',
        maxNativeZoom: 18,
        maxZoom: 19,
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

    // Add default layer (Plan Standard)
    osmLayer.addTo(map);
    openSeaMapLayer.addTo(map);

    // Layer control
    const baseMaps = {
      "Plan Standard": osmLayer,
      "Vue Satellite": esriSatelliteLayer,
      "Carte Marine (SHOM/IGN)": marineLayer,
    };

    const overlays = {
      "Balisage maritime (OpenSeaMap)": openSeaMapLayer,
    };

    L.control.layers(baseMaps, overlays, { position: "topright" }).addTo(map);

    // Add scale control
    L.control.scale({ metric: true, imperial: false, position: "bottomleft" }).addTo(map);

    // Add click handler for organizers
    map.on("click", handleMapClick);

    mapInstanceRef.current = map;
    setMapReady(true);

    // Fix for gray/white screen on first load - force resize after mount
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 150);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (userMarkerRef.current) {
        userMarkerRef.current = null;
      }
      if (tempMarkerRef.current) {
        tempMarkerRef.current = null;
      }
    };
  }, [isLoading, isOrganizer]);

  // Add markers when locations change
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;

    // Clear existing markers
    mapInstanceRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker && layer !== userMarkerRef.current && layer !== tempMarkerRef.current) {
        mapInstanceRef.current?.removeLayer(layer);
      }
    });

    // Add new markers
    locationsWithCoords.forEach((location) => {
      if (location.latitude && location.longitude) {
        const hasPOSS = location.satellite_map_url !== null || location.bathymetric_map_url !== null;
        const icon = createLocationIcon(hasPOSS);
        const marker = L.marker([location.latitude, location.longitude], { icon })
          .addTo(mapInstanceRef.current!);

        // Create popup with photo thumbnail
        const photoHtml = location.photo_url 
          ? `<img src="${location.photo_url}" alt="${location.name}" style="width: 100%; height: 80px; object-fit: cover; border-radius: 6px; margin-bottom: 8px;" onerror="this.style.display='none'" />`
          : `<div style="width: 100%; height: 80px; background: linear-gradient(135deg, #0369a1 0%, #0891b2 100%); border-radius: 6px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center;"><span style="color: white; font-size: 12px;">📍 ${location.name}</span></div>`;

        // Button for organizers to create an outing
        const createOutingBtn = isOrganizer 
          ? `<button id="create-outing-${location.id}" style="margin-top: 8px; width: 100%; padding: 6px 12px; background: linear-gradient(135deg, #0369a1 0%, #0891b2 100%); color: white; border: none; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">➕ Organiser une sortie ici</button>`
          : "";

        const possStatusHtml = hasPOSS
          ? `<span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 4px;">✓ POSS</span>`
          : `<span style="background: #fef2f2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 4px;">Sans carto</span>`;

        const popupContent = `
          <div style="min-width: 200px;">
            ${photoHtml}
            <h3 style="font-weight: 600; margin: 0 0 8px 0;">${location.name}</h3>
            ${location.type ? `<span style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${location.type}</span>` : ""}
            ${location.max_depth ? `<span style="background: #e0f2fe; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 4px;">Prof. ${location.max_depth}m</span>` : ""}
            ${possStatusHtml}
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

    // Fit bounds only on initial load
    if (!hasInitialFit.current && locationsWithCoords.length > 0) {
      const bounds = L.latLngBounds(
        locationsWithCoords.map((loc) => [loc.latitude!, loc.longitude!] as [number, number])
      );
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      hasInitialFit.current = true;
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
              {isOrganizer && " • Cliquez sur la carte pour ajouter un lieu"}
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Map */}
          <div className="lg:col-span-2">
              <Card className={`overflow-hidden shadow-card relative ${isFullscreen ? "fixed inset-0 z-[9999] bg-white" : ""}`} ref={mapContainerRef}>
                <CardContent className="p-0 h-full">
                  <div
                    ref={mapRef}
                    className={`w-full ${isFullscreen ? "h-screen" : "h-[500px]"}`}
                    style={{ zIndex: 0 }}
                  />
                  {/* Geolocation button */}
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-20 right-2.5 z-[1000] bg-white shadow-md hover:bg-gray-100"
                    onClick={centerOnUser}
                    disabled={isLocating}
                    title="Ma position"
                  >
                    {isLocating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Crosshair className="h-4 w-4 text-primary" />
                    )}
                  </Button>
                  {/* CSS Fullscreen toggle */}
                  <MapFullscreenButtons
                    isFullscreen={isFullscreen}
                    onToggle={toggleFullscreen}
                    onExit={exitFullscreen}
                  />
                </CardContent>
                {/* Legend */}
                <div className="absolute bottom-2 left-2 z-[1000] flex flex-wrap gap-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-green-600 border border-white shadow-sm" />
                    <span>Lieu validé (POSS)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-600 border border-white shadow-sm" />
                    <span>Lieu sans cartographie</span>
                  </div>
                </div>
              </Card>
            </div>

            <div>
              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Sites enregistrés ({locations?.length ?? 0})
                  </CardTitle>
                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un site..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {filteredLocations.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        {searchQuery ? `Aucun site trouvé pour "${searchQuery}"` : "Aucun site enregistré"}
                      </p>
                    ) : filteredLocations.map((location) => {
                      const distance = userPosition && location.latitude && location.longitude
                        ? calculateDistance(userPosition.lat, userPosition.lon, location.latitude, location.longitude)
                        : null;
                      
                      return (
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
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium text-foreground truncate">
                                  {location.name}
                                </p>
                                {distance !== null && (
                                  <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                                    📍 {distance < 1 ? `${(distance * 1000).toFixed(0)} m` : `${distance.toFixed(1)} km`}
                                  </span>
                                )}
                              </div>
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
                      );
                    })}
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

      {/* Create Location Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) removeTempMarker();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Créer un nouveau lieu
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {clickedCoords && (
              <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                <strong>Coordonnées GPS :</strong><br />
                Latitude : {clickedCoords.lat.toFixed(6)}<br />
                Longitude : {clickedCoords.lng.toFixed(6)}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="location-name">Nom du lieu *</Label>
              <Input
                id="location-name"
                placeholder="Ex: Calanque de Sormiou"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location-type">Type</Label>
              <Select value={newLocationType} onValueChange={setNewLocationType}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mer">Mer</SelectItem>
                  <SelectItem value="Piscine">Piscine</SelectItem>
                  <SelectItem value="Fosse">Fosse</SelectItem>
                  <SelectItem value="Étang">Étang</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location-depth">Profondeur max (m)</Label>
              <Input
                id="location-depth"
                type="number"
                placeholder="Ex: 25"
                value={newLocationMaxDepth}
                onChange={(e) => setNewLocationMaxDepth(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                removeTempMarker();
              }}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleCreateLocation}
              disabled={!newLocationName.trim() || createLocation.isPending}
            >
              {createLocation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Créer le lieu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Map;
