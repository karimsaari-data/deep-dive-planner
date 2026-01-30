import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useWaypoints, getWaypointLabel, getWaypointColor, Waypoint } from "@/hooks/useWaypoints";

interface MarineMiniMapProps {
  latitude: number;
  longitude: number;
  siteName?: string;
  siteId?: string;
}

const MarineMiniMap = ({ latitude, longitude, siteName, siteId }: MarineMiniMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const waypointMarkersRef = useRef<L.Marker[]>([]);
  
  const { data: waypoints } = useWaypoints(siteId);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Offset center southward so marker appears at top, showing more coast/sea below
    const offsetLatitude = latitude - 0.008;

    // Initialize map with high zoom and scroll disabled
    const map = L.map(mapRef.current, {
      center: [offsetLatitude, longitude],
      zoom: 15,
      minZoom: 10,
      maxZoom: 19,
      scrollWheelZoom: false,
      dragging: true,
    });

    mapInstanceRef.current = map;

    // ONLY use IGN/SHOM Marine Chart layer - no layer control
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

    // Custom red marker icon for dive site
    const markerIcon = L.divIcon({
      html: `<div style="
        background: hsl(0, 84%, 60%);
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      "></div>`,
      className: "custom-marker",
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -10],
    });

    // Add marker at dive site location
    const marker = L.marker([latitude, longitude], { icon: markerIcon }).addTo(map);
    marker.bindPopup(
      `<div style="text-align: center; font-weight: 500;">
        🤿 ${siteName || "Site de plongée"}
      </div>`
    );

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude, siteName]);

  // Update map center if coordinates change
  useEffect(() => {
    if (mapInstanceRef.current) {
      const offsetLatitude = latitude - 0.008;
      mapInstanceRef.current.setView([offsetLatitude, longitude], 15);
    }
  }, [latitude, longitude]);

  // Add waypoint markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing waypoint markers
    waypointMarkersRef.current.forEach(marker => {
      mapInstanceRef.current?.removeLayer(marker);
    });
    waypointMarkersRef.current = [];

    if (!waypoints || waypoints.length === 0) return;

    // Add markers for each waypoint
    waypoints.forEach((waypoint: Waypoint) => {
      const color = getWaypointColor(waypoint.point_type);
      const label = getWaypointLabel(waypoint.point_type);
      const iconChar = waypoint.point_type === 'parking' ? 'P' 
        : waypoint.point_type === 'water_entry' ? '↓' 
        : waypoint.point_type === 'water_exit' ? '✚' 
        : '●';

      const waypointIcon = L.divIcon({
        html: `<div style="
          background: ${color};
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
        ">${iconChar}</div>`,
        className: "waypoint-marker",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
      });

      const marker = L.marker([waypoint.latitude, waypoint.longitude], { icon: waypointIcon })
        .addTo(mapInstanceRef.current!);
      
      marker.bindPopup(`<strong>${label}</strong><br/>${waypoint.name}`);
      waypointMarkersRef.current.push(marker);
    });
  }, [waypoints]);

  return (
    <div
      ref={mapRef}
      className="w-full h-80 rounded-lg shadow-card"
      style={{ minHeight: "320px" }}
    />
  );
};

export default MarineMiniMap;
