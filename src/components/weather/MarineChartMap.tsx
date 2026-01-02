import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MarineChartMapProps {
  latitude: number;
  longitude: number;
  siteName?: string;
}

const MarineChartMap = ({ latitude, longitude, siteName }: MarineChartMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current, {
      center: [latitude, longitude],
      zoom: 12,
      minZoom: 5,
      maxZoom: 18,
    });

    mapInstanceRef.current = map;

    // IGN WMTS - SCAN Express Standard (data.geopf.fr - no API key required)
    const ignLayer = L.tileLayer(
      "https://data.geopf.fr/wmts?" +
        "SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0" +
        "&LAYER=GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN-EXPRESS.STANDARD" +
        "&STYLE=normal&TILEMATRIXSET=PM" +
        "&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}" +
        "&FORMAT=image/jpeg",
      {
        attribution: '© <a href="https://geoservices.ign.fr/">IGN</a>',
        maxZoom: 18,
        maxNativeZoom: 16,
      }
    );

    // Esri Ocean Basemap (free, no API key)
    const esriOceanLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: '© <a href="https://www.esri.com/">Esri</a> Ocean Basemap',
        maxZoom: 18,
        maxNativeZoom: 13,
      }
    );

    // OpenSeaMap overlay (navigation markers, buoys, lights)
    const openSeaMapOverlay = L.tileLayer(
      "https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png",
      {
        attribution: '© <a href="https://www.openseamap.org/">OpenSeaMap</a>',
        maxZoom: 18,
        opacity: 1,
      }
    );

    // Set default layer
    ignLayer.addTo(map);
    openSeaMapOverlay.addTo(map);

    // Layer control
    const baseMaps = {
      "Vue IGN Littoral": ignLayer,
      "Vue Relief Sous-marin (Esri)": esriOceanLayer,
    };

    const overlays = {
      "Balises & Navigation (OpenSeaMap)": openSeaMapOverlay,
    };

    L.control.layers(baseMaps, overlays, { position: "topright" }).addTo(map);

    // Custom marker icon
    const markerIcon = L.divIcon({
      html: `<div style="
        background: hsl(210, 100%, 50%);
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>`,
      className: "custom-marker",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12],
    });

    // Add marker with popup
    const marker = L.marker([latitude, longitude], { icon: markerIcon }).addTo(map);
    marker.bindPopup(
      `<div style="text-align: center; font-weight: 500;">
        📍 ${siteName || "Site de plongée"}
      </div>`
    );

    // Ensure OpenSeaMap stays on top when switching base layers
    map.on("baselayerchange", () => {
      if (map.hasLayer(openSeaMapOverlay)) {
        openSeaMapOverlay.bringToFront();
      }
    });

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
      mapInstanceRef.current.setView([latitude, longitude], 12);
    }
  }, [latitude, longitude]);

  return (
    <div className="relative">
      <div
        ref={mapRef}
        className="w-full rounded-b-lg"
        style={{ height: "420px" }}
      />
      <div className="absolute bottom-2 left-2 z-[1000] bg-background/90 backdrop-blur-sm rounded px-2 py-1 text-xs text-muted-foreground">
        Cliquez sur le contrôleur ↗ pour changer de fond de carte
      </div>
    </div>
  );
};

export default MarineChartMap;
