import { useState, useEffect, useRef, useCallback } from "react";
import { Trash2, Plus, Download, Camera } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWaypoints, useCreateWaypoint, useDeleteWaypoint, WaypointType, getWaypointLabel, getWaypointColor, getWaypointIcon } from "@/hooks/useWaypoints";
import { toast } from "sonner";
import html2canvas from "html2canvas";

interface SatelliteWaypointEditorProps {
  siteId: string;
  siteName?: string;
  siteLat?: number | null;
  siteLng?: number | null;
  onMapReady?: (map: L.Map, markers: React.MutableRefObject<L.Marker[]>) => void;
}

// All waypoint types for the main satellite map
const SATELLITE_POINT_TYPES: WaypointType[] = ["parking", "water_entry", "water_exit", "meeting_point", "dive_zone", "toilet"];

const SatelliteWaypointEditor = ({ siteId, siteName, siteLat, siteLng, onMapReady }: SatelliteWaypointEditorProps) => {
  const { data: waypoints, isLoading } = useWaypoints(siteId);
  const createWaypoint = useCreateWaypoint();
  const deleteWaypoint = useDeleteWaypoint();
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const tempMarkerRef = useRef<L.Marker | null>(null);
  
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [newPointType, setNewPointType] = useState<WaypointType>("parking");
  const [newPointName, setNewPointName] = useState("");
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Pre-fill name when point type changes
  useEffect(() => {
    if (isAddingMode) {
      setNewPointName(getWaypointLabel(newPointType));
    }
  }, [newPointType, isAddingMode]);

  // Initialize map with satellite layer
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    
    const defaultLat = siteLat || 43.3;
    const defaultLng = siteLng || 5.4;

    const map = L.map(mapRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 17,
      scrollWheelZoom: true,
    });

    // Esri World Imagery (Satellite) as default layer
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Esri, Maxar, Earthstar Geographics",
        maxNativeZoom: 17,
        maxZoom: 19,
      }
    ).addTo(map);

    mapInstanceRef.current = map;
    onMapReady?.(map, markersRef);

    // Click handler for adding points
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (tempMarkerRef.current) {
        map.removeLayer(tempMarkerRef.current);
      }
      
      const tempMarker = L.marker([e.latlng.lat, e.latlng.lng], {
        icon: L.divIcon({
          className: "temp-marker",
          html: `<div style="width: 24px; height: 24px; background: #9333ea; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
      }).addTo(map);
      
      tempMarkerRef.current = tempMarker;
      setClickedCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      setIsAddingMode(true);
      setNewPointName(getWaypointLabel(newPointType));
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [siteLat, siteLng]);

  // Update markers when waypoints change
  useEffect(() => {
    if (!mapInstanceRef.current || !waypoints) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current?.removeLayer(marker);
    });
    markersRef.current = [];

    // Add markers for each waypoint
    waypoints.forEach(waypoint => {
      const color = getWaypointColor(waypoint.point_type);
      const iconChar = getWaypointIcon(waypoint.point_type);
      const isDiveZone = waypoint.point_type === 'dive_zone';
      
      const marker = L.marker([waypoint.latitude, waypoint.longitude], {
        icon: L.divIcon({
          className: "waypoint-marker",
          html: isDiveZone 
            ? `<div style="
                background: rgba(14, 165, 233, 0.4);
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 3px solid #0ea5e9;
                box-shadow: 0 0 12px rgba(14, 165, 233, 0.5);
                font-size: 16px;
              ">${iconChar}</div>`
            : `<div style="
                background: ${color}; 
                width: 28px; 
                height: 28px; 
                border-radius: 50%; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                border: 3px solid white; 
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                color: white;
                font-weight: bold;
                font-size: 12px;
              ">${iconChar}</div>`,
          iconSize: isDiveZone ? [40, 40] : [28, 28],
          iconAnchor: isDiveZone ? [20, 20] : [14, 14],
        }),
      }).addTo(mapInstanceRef.current);

      marker.bindPopup(`
        <strong>${getWaypointLabel(waypoint.point_type)}</strong><br/>
        ${waypoint.name}<br/>
        <small>${waypoint.latitude.toFixed(5)}, ${waypoint.longitude.toFixed(5)}</small>
      `);

      markersRef.current.push(marker);
    });
  }, [waypoints]);

  // Center map on site when it changes
  useEffect(() => {
    if (mapInstanceRef.current && siteLat && siteLng) {
      mapInstanceRef.current.setView([siteLat, siteLng], 17);
    }
  }, [siteLat, siteLng]);

  const handleAddWaypoint = () => {
    if (!clickedCoords || !newPointName.trim()) return;

    createWaypoint.mutate({
      site_id: siteId,
      name: newPointName.trim(),
      latitude: clickedCoords.lat,
      longitude: clickedCoords.lng,
      point_type: newPointType,
    }, {
      onSuccess: () => {
        setIsAddingMode(false);
        setClickedCoords(null);
        setNewPointName("");
        if (tempMarkerRef.current && mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(tempMarkerRef.current);
          tempMarkerRef.current = null;
        }
      }
    });
  };

  const handleCancel = () => {
    setIsAddingMode(false);
    setClickedCoords(null);
    setNewPointName("");
    if (tempMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(tempMarkerRef.current);
      tempMarkerRef.current = null;
    }
  };

  const handleCaptureHD = useCallback(async () => {
    if (!mapContainerRef.current) return;
    
    setIsCapturing(true);
    toast.info("Génération de l'image HD en cours...");
    
    try {
      // Hide Leaflet controls and tile borders temporarily
      const controls = mapContainerRef.current.querySelectorAll('.leaflet-control-container');
      controls.forEach(ctrl => (ctrl as HTMLElement).style.display = 'none');
      const tiles = mapContainerRef.current.querySelectorAll('.leaflet-tile');
      tiles.forEach(tile => {
        (tile as HTMLElement).style.outline = 'none';
        (tile as HTMLElement).style.border = 'none';
      });
      // Force a small delay for style application
      await new Promise(r => setTimeout(r, 100));

      const canvas = await html2canvas(mapContainerRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2, // HD quality
        backgroundColor: null,
      });

      // Restore controls and tile styles
      controls.forEach(ctrl => (ctrl as HTMLElement).style.display = '');
      tiles.forEach(tile => {
        (tile as HTMLElement).style.outline = '';
        (tile as HTMLElement).style.border = '';
      });
      
      // Download the image
      const link = document.createElement('a');
      link.download = `carte-satellite-${siteName || siteId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success("Image Satellite HD téléchargée !");
    } catch (error) {
      console.error("Capture error:", error);
      toast.error("Erreur lors de la capture de l'image");
    } finally {
      setIsCapturing(false);
    }
  }, [siteId, siteName]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">🛰️ Carte Satellite - Points de sécurité GPS</Label>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Cliquez sur la carte pour ajouter un point de sécurité. La vue satellite permet un positionnement précis.
      </p>

      <div ref={mapContainerRef}>
        <div
          ref={mapRef}
          className="w-full h-[50vh] rounded-lg shadow-sm border border-border"
        />
      </div>

      {/* HD Capture Button */}
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={handleCaptureHD}
        disabled={isCapturing}
      >
        <Camera className="h-4 w-4" />
        {isCapturing ? "Génération en cours..." : "Sauvegarder l'image Satellite HD"}
      </Button>

      {/* Add new waypoint form */}
      {isAddingMode && clickedCoords && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
          <p className="text-sm font-medium">
            Nouveau point à {clickedCoords.lat.toFixed(5)}, {clickedCoords.lng.toFixed(5)}
          </p>
          
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Type de point</Label>
              <Select 
                value={newPointType} 
                onValueChange={(v) => setNewPointType(v as WaypointType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SATELLITE_POINT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getWaypointLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nom / Description</Label>
              <Input
                value={newPointName}
                onChange={(e) => setNewPointName(e.target.value)}
                placeholder="Ex: Parking principal"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="ocean"
              size="sm"
              onClick={handleAddWaypoint}
              disabled={!newPointName.trim() || createWaypoint.isPending}
            >
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Annuler
            </Button>
          </div>
        </div>
      )}


      {isLoading && (
        <p className="text-sm text-muted-foreground">Chargement des points...</p>
      )}
    </div>
  );
};

export default SatelliteWaypointEditor;
