import { useState, useEffect, useRef, useCallback } from "react";
import { Trash2, Plus, Camera, Waves } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWaypoints, useCreateWaypoint, useDeleteWaypoint, getWaypointLabel, getWaypointColor, getWaypointIcon } from "@/hooks/useWaypoints";
import { toast } from "sonner";
import html2canvas from "html2canvas";

interface BathymetricMapEditorProps {
  siteId: string;
  siteName?: string;
  siteLat?: number | null;
  siteLng?: number | null;
}

const BathymetricMapEditor = ({ siteId, siteName, siteLat, siteLng }: BathymetricMapEditorProps) => {
  const { data: waypoints } = useWaypoints(siteId);
  const createWaypoint = useCreateWaypoint();
  const deleteWaypoint = useDeleteWaypoint();
  
  // Filter only dive_zone waypoints
  const diveZoneWaypoints = waypoints?.filter(w => w.point_type === 'dive_zone') || [];
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const tempMarkerRef = useRef<L.Marker | null>(null);
  
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [newPointName, setNewPointName] = useState("Zone de plongée");
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Initialize map with SHOM bathymetric layer
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    
    const defaultLat = siteLat || 43.3;
    const defaultLng = siteLng || 5.4;

    // Offset center to show more sea (marker at top)
    const offsetLat = defaultLat - 0.006;

    const map = L.map(mapRef.current, {
      center: [offsetLat, defaultLng],
      zoom: 15,
      scrollWheelZoom: true,
    });

    // SHOM / IGN Coastal Chart (Bathymetric)
    L.tileLayer(
      "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0" +
        "&LAYER=GEOGRAPHICALGRIDSYSTEMS.COASTALMAPS" +
        "&STYLE=normal&TILEMATRIXSET=PM" +
        "&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
      {
        attribution: '© <a href="https://www.shom.fr/">IGN - SHOM</a>',
        maxNativeZoom: 18,
        maxZoom: 19,
      }
    ).addTo(map);

    mapInstanceRef.current = map;

    // Click handler for adding dive zone points only
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (tempMarkerRef.current) {
        map.removeLayer(tempMarkerRef.current);
      }
      
      const tempMarker = L.marker([e.latlng.lat, e.latlng.lng], {
        icon: L.divIcon({
          className: "temp-marker",
          html: `<div style="
            width: 36px; 
            height: 36px; 
            background: rgba(14, 165, 233, 0.5); 
            border: 3px solid #0ea5e9; 
            border-radius: 50%; 
            box-shadow: 0 0 12px rgba(14, 165, 233, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
          ">🤿</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        }),
      }).addTo(map);
      
      tempMarkerRef.current = tempMarker;
      setClickedCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      setIsAddingMode(true);
      setNewPointName("Zone de plongée");
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [siteLat, siteLng]);

  // Update markers when waypoints change - numbered white badges for visibility on SHOM
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current?.removeLayer(marker);
    });
    markersRef.current = [];

    // Add numbered markers for dive_zone waypoints
    diveZoneWaypoints.forEach((waypoint, index) => {
      const zoneNumber = index + 1;
      const marker = L.marker([waypoint.latitude, waypoint.longitude], {
        icon: L.divIcon({
          className: "dive-zone-numbered-marker",
          html: `<div style="
            background: white;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 4px solid #0ea5e9;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4), 0 0 0 2px white;
            font-size: 18px;
            font-weight: 700;
            color: #0369a1;
            font-family: system-ui, sans-serif;
          ">${zoneNumber}</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        }),
      }).addTo(mapInstanceRef.current);

      marker.bindPopup(`
        <strong>Zone ${zoneNumber}</strong><br/>
        ${waypoint.name}<br/>
        <small>${waypoint.latitude.toFixed(5)}, ${waypoint.longitude.toFixed(5)}</small>
      `);

      markersRef.current.push(marker);
    });
  }, [diveZoneWaypoints]);

  // Center map on site when it changes
  useEffect(() => {
    if (mapInstanceRef.current && siteLat && siteLng) {
      const offsetLat = siteLat - 0.006;
      mapInstanceRef.current.setView([offsetLat, siteLng], 15);
    }
  }, [siteLat, siteLng]);

  const handleAddWaypoint = () => {
    if (!clickedCoords || !newPointName.trim()) return;

    createWaypoint.mutate({
      site_id: siteId,
      name: newPointName.trim(),
      latitude: clickedCoords.lat,
      longitude: clickedCoords.lng,
      point_type: "dive_zone",
    }, {
      onSuccess: () => {
        setIsAddingMode(false);
        setClickedCoords(null);
        setNewPointName("Zone de plongée");
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
    setNewPointName("Zone de plongée");
    if (tempMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(tempMarkerRef.current);
      tempMarkerRef.current = null;
    }
  };

  const handleCaptureHD = useCallback(async () => {
    if (!mapContainerRef.current) return;
    
    setIsCapturing(true);
    toast.info("Génération de l'image bathymétrique HD...");
    
    try {
      // Hide Leaflet controls temporarily
      const controls = mapContainerRef.current.querySelectorAll('.leaflet-control-container');
      controls.forEach(ctrl => (ctrl as HTMLElement).style.display = 'none');
      
      const canvas = await html2canvas(mapContainerRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2, // HD quality
        backgroundColor: null,
      });
      
      // Restore controls
      controls.forEach(ctrl => (ctrl as HTMLElement).style.display = '');
      
      // Download the image
      const link = document.createElement('a');
      link.download = `carte-bathymetrique-${siteName || siteId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success("Image Bathymétrique HD téléchargée !");
    } catch (error) {
      console.error("Capture error:", error);
      toast.error("Erreur lors de la capture de l'image");
    } finally {
      setIsCapturing(false);
    }
  }, [siteId, siteName]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Waves className="h-5 w-5 text-ocean" />
        <Label className="text-base font-medium">Carte Bathymétrique (Zone de plongée)</Label>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Carte marine SHOM avec les profondeurs. Cliquez pour définir la zone d'immersion.
      </p>

      <div ref={mapContainerRef}>
        <div
          ref={mapRef}
          className="w-full h-80 rounded-lg shadow-sm border border-ocean/30"
        />
        
        {/* Legend for PDF capture - shows numbered zones */}
        {diveZoneWaypoints.length > 0 && (
          <div className="mt-2 p-3 bg-white rounded-lg border border-ocean/20 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Légende des zones</p>
            {diveZoneWaypoints.map((waypoint, index) => (
              <div key={waypoint.id} className="flex items-center gap-2 text-sm">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white border-2 border-sky-500 text-sky-700 font-bold text-xs">
                  {index + 1}
                </span>
                <span className="font-medium">{waypoint.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* HD Capture Button */}
      <Button
        variant="outline"
        className="w-full gap-2 border-ocean/50 text-ocean hover:bg-ocean/10"
        onClick={handleCaptureHD}
        disabled={isCapturing}
      >
        <Camera className="h-4 w-4" />
        {isCapturing ? "Génération en cours..." : "Sauvegarder l'image Bathymétrique HD"}
      </Button>

      {/* Add new dive zone form */}
      {isAddingMode && clickedCoords && (
        <div className="rounded-lg border border-ocean/30 bg-ocean/5 p-4 space-y-3">
          <p className="text-sm font-medium">
            🤿 Zone de plongée à {clickedCoords.lat.toFixed(5)}, {clickedCoords.lng.toFixed(5)}
          </p>
          
          <div>
            <Label>Nom / Description</Label>
            <Input
              value={newPointName}
              onChange={(e) => setNewPointName(e.target.value)}
              placeholder="Ex: Zone de plongée principale"
            />
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

      {/* List of dive zone waypoints with numbers and delete */}
      {diveZoneWaypoints.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm">Zones de plongée définies (gestion)</Label>
          <div className="space-y-2">
            {diveZoneWaypoints.map((waypoint, index) => (
              <div
                key={waypoint.id}
                className="flex items-center justify-between rounded border border-ocean/20 bg-ocean/5 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white border-2 border-sky-500 text-sky-700 font-bold text-sm">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium">
                    {waypoint.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({waypoint.latitude.toFixed(4)}, {waypoint.longitude.toFixed(4)})
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => deleteWaypoint.mutate({ id: waypoint.id, siteId })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BathymetricMapEditor;
