import { Anchor, CloudRain, Map, TableProperties, Waves, Wind } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import MarineChartMap from "./MarineChartMap";

interface WindyForecastProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  outingDate?: string; // ISO date string of the outing
  siteName?: string; // Name of the dive site for map marker
}

const WindyForecast = ({ latitude, longitude, outingDate, siteName }: WindyForecastProps) => {
  const [mapLayer, setMapLayer] = useState<"wind" | "waves">("wind");

  if (!latitude || !longitude) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudRain className="h-5 w-5 text-primary" />
            Prévisions Météo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            Coordonnées GPS manquantes pour générer la météo
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate morning time window (06:00-14:00) for the outing date
  const getTimelineParams = () => {
    if (!outingDate) return "";
    
    const date = new Date(outingDate);
    // Set to 06:00 AM on the outing date (morning start)
    const morningStart = new Date(date);
    morningStart.setHours(6, 0, 0, 0);
    
    // Set to 10:00 AM as the default view (middle of morning session)
    const defaultTime = new Date(date);
    defaultTime.setHours(10, 0, 0, 0);
    
    // Windy uses Unix timestamp in milliseconds
    const timestamp = defaultTime.getTime();
    
    return `&timestamp=${timestamp}`;
  };

  // Build Windy embed URL for forecast with km/h wind, Celsius temperature, and waves in meters
  const forecastUrl = `https://embed.windy.com/embed.html?type=forecast&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&metricWave=m&zoom=10&overlay=wind&product=ecmwf&level=surface&lat=${latitude}&lon=${longitude}&detailLat=${latitude}&detailLon=${longitude}&marker=true&message=true`;

  // Build Windy embed URL for interactive map with selected layer and morning timeline
  const mapUrl = `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&metricWave=m&zoom=11&overlay=${mapLayer}&product=ecmwf&level=surface&lat=${latitude}&lon=${longitude}&marker=true&message=true${getTimelineParams()}`;

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <CloudRain className="h-5 w-5 text-primary" />
          Prévisions Météo
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="forecast" className="w-full">
          <div className="px-4 pb-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="forecast" className="flex items-center gap-2">
                <TableProperties className="h-4 w-4" />
                <span className="hidden sm:inline">Prévisions 7j</span>
                <span className="sm:hidden">7j</span>
              </TabsTrigger>
              <TabsTrigger value="map" className="flex items-center gap-2">
                <Map className="h-4 w-4" />
                <span className="hidden sm:inline">Carte Météo</span>
                <span className="sm:hidden">Météo</span>
              </TabsTrigger>
              <TabsTrigger value="marine" className="flex items-center gap-2">
                <Anchor className="h-4 w-4" />
                <span className="hidden sm:inline">Carte Marine</span>
                <span className="sm:hidden">Marine</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="forecast" className="mt-0">
            <div className="px-4 pb-2">
              <p className="text-xs text-muted-foreground">
                Vent en km/h • Vagues en mètres • Glissez la timeline pour voir l'évolution
              </p>
            </div>
            <iframe
              src={forecastUrl}
              title="Prévisions météo Windy - Tableau 7 jours"
              className="w-full rounded-b-lg border-t border-border"
              style={{ minHeight: "380px", height: "420px" }}
              frameBorder="0"
              allowFullScreen
            />
          </TabsContent>
          
          <TabsContent value="map" className="mt-0">
            <div className="px-4 pb-2 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Couche :</span>
                <div className="flex gap-1">
                  <Button
                    variant={mapLayer === "wind" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setMapLayer("wind")}
                  >
                    <Wind className="h-3 w-3" />
                    Vents
                  </Button>
                  <Button
                    variant={mapLayer === "waves" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setMapLayer("waves")}
                  >
                    <Waves className="h-3 w-3" />
                    Vagues
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                🌅 Créneau matin (06h-14h) • Glissez la timeline pour voir l'évolution des conditions
              </p>
            </div>
            <iframe
              key={mapLayer} // Force re-render when layer changes
              src={mapUrl}
              title="Carte météo Windy - Temps réel"
              className="w-full rounded-b-lg border-t border-border"
              style={{ minHeight: "380px", height: "420px" }}
              frameBorder="0"
              allowFullScreen
            />
          </TabsContent>

          <TabsContent value="marine" className="mt-0">
            <div className="px-4 pb-2">
              <p className="text-xs text-muted-foreground">
                🗺️ Fond IGN Littoral • Surcouche OpenSeaMap (balises, bouées, feux)
              </p>
            </div>
            <MarineChartMap
              latitude={latitude}
              longitude={longitude}
              siteName={siteName}
            />
          </TabsContent>

        </Tabs>
      </CardContent>
    </Card>
  );
};

export default WindyForecast;
