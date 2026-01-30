import { useState, useEffect, useRef } from "react";
import { MapPin, Trash2, Plus, Car, Flag, Cross } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWaypoints, useCreateWaypoint, useDeleteWaypoint, WaypointType, getWaypointLabel, getWaypointColor } from "@/hooks/useWaypoints";

interface WaypointEditorProps {
  siteId: string;
  siteLat?: number | null;
  siteLng?: number | null;
}

const WaypointEditor = ({ siteId, siteLat, siteLng }: WaypointEditorProps) => {
  const { data: waypoints, isLoading } = useWaypoints(siteId);
  const createWaypoint = useCreateWaypoint();
  const deleteWaypoint = useDeleteWaypoint();
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const tempMarkerRef = useRef<L.Marker | null>(null);
  
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [newPointType, setNewPointType] = useState<WaypointType>("parking");
  const [newPointName, setNewPointName] = useState("");
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    
    const defaultLat = siteLat || 43.3;
    const defaultLng = siteLng || 5.4;

    const map = L.map(mapRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 15,
      scrollWheelZoom: true,
    });

    // Standard layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Click handler for adding points
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (tempMarkerRef.current) {
        map.removeLayer(tempMarkerRef.current);
      }
      
      const tempMarker = L.marker([e.latlng.lat, e.latlng.lng], {
        icon: L.divIcon({
          className: "temp-marker",
          html: `<div style="width: 20px; height: 20px; background: #9333ea; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      }).addTo(map);
      
      tempMarkerRef.current = tempMarker;
      setClickedCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      setIsAddingMode(true);
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
      const label = getWaypointLabel(waypoint.point_type);
      
      const marker = L.marker([waypoint.latitude, waypoint.longitude], {
        icon: L.divIcon({
          className: "waypoint-marker",
          html: `
            <div style="
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
            ">
              ${waypoint.point_type === 'parking' ? 'P' : waypoint.point_type === 'water_entry' ? '↓' : waypoint.point_type === 'water_exit' ? '✚' : '●'}
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).addTo(mapInstanceRef.current);

      marker.bindPopup(`
        <strong>${label}</strong><br/>
        ${waypoint.name}
      `);

      markersRef.current.push(marker);
    });
  }, [waypoints]);

  // Center map on site when it changes
  useEffect(() => {
    if (mapInstanceRef.current && siteLat && siteLng) {
      mapInstanceRef.current.setView([siteLat, siteLng], 15);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Points de sécurité GPS</Label>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Cliquez sur la carte pour ajouter un point de sécurité (Parking, Mise à l'eau, Sortie secours, Point de RDV).
      </p>

      <div
        ref={mapRef}
        className="w-full h-64 rounded-lg shadow-sm border border-border"
      />

      {/* Add new waypoint form */}
      {isAddingMode && clickedCoords && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
          <p className="text-sm font-medium">
            Nouveau point à {clickedCoords.lat.toFixed(5)}, {clickedCoords.lng.toFixed(5)}
          </p>
          
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Type de point</Label>
              <Select value={newPointType} onValueChange={(v) => setNewPointType(v as WaypointType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parking">Parking</SelectItem>
                  <SelectItem value="water_entry">Mise à l'eau</SelectItem>
                  <SelectItem value="water_exit">Sortie secours</SelectItem>
                  <SelectItem value="meeting_point">Point de RDV</SelectItem>
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

      {/* List of existing waypoints */}
      {waypoints && waypoints.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm">Points existants</Label>
          <div className="space-y-2">
            {waypoints.map((waypoint) => (
              <div
                key={waypoint.id}
                className="flex items-center justify-between rounded border border-border bg-muted/30 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: getWaypointColor(waypoint.point_type) }}
                  />
                  <span className="text-sm font-medium">
                    {getWaypointLabel(waypoint.point_type)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    – {waypoint.name}
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

      {isLoading && (
        <p className="text-sm text-muted-foreground">Chargement des points...</p>
      )}
    </div>
  );
};

export default WaypointEditor;
