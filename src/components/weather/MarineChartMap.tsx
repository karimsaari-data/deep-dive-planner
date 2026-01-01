import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MarineChartMapProps {
  latitude: number;
  longitude: number;
}

const MarineChartMap = ({ latitude, longitude }: MarineChartMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    // Initialize map centered on the location
    const map = L.map(mapContainer.current, {
      center: [latitude, longitude],
      zoom: 12,
      zoomControl: true,
      minZoom: 1,
      maxZoom: 19,
    });

    mapRef.current = map;

    // Base layer - OpenStreetMap
    const osmLayer = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
        maxNativeZoom: 19,
      }
    );

    // SHOM/IGN Bathymetry layer via Géoportail WMTS
    // Using the SHOM marine charts layer from data.shom.fr
    const shomBathyLayer = L.tileLayer(
      "https://services.data.shom.fr/INSPIRE/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=RASTER_MARINE_3857_WMTS&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=3857&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
      {
        attribution: "© SHOM - Service Hydrographique et Océanographique de la Marine",
        // Many WMTS sources stop providing new tiles at some zoom levels.
        // maxNativeZoom keeps the layer visible by upscaling tiles beyond that level.
        maxNativeZoom: 18,
        maxZoom: 19,
        minZoom: 1,
        opacity: 1,
      }
    );

    // Alternative: GEBCO bathymetry layer (global coverage)
    const gebcoLayer = L.tileLayer(
      "https://tiles.arcgis.com/tiles/C8EMgrsFcRFL6LrL/arcgis/rest/services/GEBCO_basemap_NCEI/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "© GEBCO - General Bathymetric Chart of the Oceans",
        // This tileset officially exposes LOD 0–10. Beyond that, we upscale.
        maxNativeZoom: 10,
        maxZoom: 19,
        minZoom: 0,
        opacity: 1,
      }
    );

    // Esri Ocean Basemap - shows depth contours and seafloor nature
    const esriOceanLayer = L.tileLayer(
      "https://services.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "© Esri, GEBCO, NOAA, National Geographic, DeLorme, NAVTEQ, Geonames.org",
        maxNativeZoom: 16,
        maxZoom: 19,
        minZoom: 0,
        opacity: 1,
      }
    );

    // Esri Ocean Reference (labels for the ocean basemap)
    const esriOceanRefLayer = L.tileLayer(
      "https://services.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "",
        maxNativeZoom: 16,
        maxZoom: 19,
        minZoom: 0,
        opacity: 1,
      }
    );

    // OpenSeaMap nautical overlay
    const openSeaMapLayer = L.tileLayer(
      "https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png",
      {
        attribution: "© OpenSeaMap contributors",
        maxNativeZoom: 18,
        maxZoom: 19,
        minZoom: 1,
        opacity: 0.8,
      }
    );

    // Create base layers group
    const baseLayers = {
      "Carte Marine Esri": L.layerGroup([esriOceanLayer, esriOceanRefLayer]),
      "Bathymétrie GEBCO": gebcoLayer,
      "Cartes SHOM": shomBathyLayer,
      "OpenStreetMap": osmLayer,
    };

    // Create overlay layers
    const overlays = {
      "Marques nautiques (OpenSeaMap)": openSeaMapLayer,
    };

    // Add default layer (Esri Ocean with nautical marks)
    (baseLayers["Carte Marine Esri"] as unknown as L.Layer).addTo(map);
    openSeaMapLayer.addTo(map);

    // Add layer control
    L.control.layers(baseLayers, overlays, { position: "topright" }).addTo(map);

    // Add scale control
    L.control.scale({ 
      position: "bottomleft", 
      metric: true, 
      imperial: false,
      maxWidth: 200 
    }).addTo(map);

    // Add marker for the outing location
    const customIcon = L.divIcon({
      html: `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground shadow-lg border-2 border-background">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>`,
      className: "",
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    L.marker([latitude, longitude], { icon: customIcon })
      .addTo(map)
      .bindPopup("<strong>Lieu de plongée</strong>");

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [latitude, longitude]);

  return (
    <div 
      ref={mapContainer} 
      className="w-full rounded-lg" 
      style={{ height: "420px" }}
    />
  );
};

export default MarineChartMap;
