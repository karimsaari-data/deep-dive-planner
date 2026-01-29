import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MarineMiniMapProps {
  latitude: number;
  longitude: number;
  siteName?: string;
}

const MarineMiniMap = ({ latitude, longitude, siteName }: MarineMiniMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map with high zoom and scroll disabled
    const map = L.map(mapRef.current, {
      center: [latitude, longitude],
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
      mapInstanceRef.current.setView([latitude, longitude], 15);
    }
  }, [latitude, longitude]);

  return (
    <div
      ref={mapRef}
      className="w-full h-64 rounded-lg shadow-card"
      style={{ minHeight: "256px" }}
    />
  );
};

export default MarineMiniMap;
