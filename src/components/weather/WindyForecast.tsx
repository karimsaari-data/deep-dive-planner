import { CloudRain, Map, TableProperties } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface WindyForecastProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
}

const WindyForecast = ({ latitude, longitude }: WindyForecastProps) => {
  if (!latitude || !longitude) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudRain className="h-5 w-5 text-primary" />
            Conditions Météo (Prévisions)
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

  // Build Windy embed URL for forecast with km/h wind, Celsius temperature, and waves in meters
  const forecastUrl = `https://embed.windy.com/embed.html?type=forecast&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&metricWave=m&zoom=10&overlay=wind&product=ecmwf&level=surface&lat=${latitude}&lon=${longitude}&detailLat=${latitude}&detailLon=${longitude}&marker=true&message=true`;

  // Build Windy embed URL for map with waves overlay
  const mapUrl = `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&metricWave=m&zoom=10&overlay=waves&product=ecmwf&level=surface&lat=${latitude}&lon=${longitude}&marker=true&message=true`;

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <CloudRain className="h-5 w-5 text-primary" />
          Conditions Météo (Prévisions)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="forecast" className="w-full">
          <div className="px-4 pb-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="forecast" className="flex items-center gap-2">
                <TableProperties className="h-4 w-4" />
                <span className="hidden sm:inline">Prévisions 7j</span>
                <span className="sm:hidden">7 jours</span>
              </TabsTrigger>
              <TabsTrigger value="map" className="flex items-center gap-2">
                <Map className="h-4 w-4" />
                <span className="hidden sm:inline">Carte interactive</span>
                <span className="sm:hidden">Carte</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="forecast" className="mt-0">
            <iframe
              src={forecastUrl}
              title="Prévisions météo Windy - Tableau 7 jours"
              className="w-full rounded-b-lg border-t border-border"
              style={{ minHeight: "350px", height: "400px" }}
              frameBorder="0"
              allowFullScreen
            />
          </TabsContent>
          
          <TabsContent value="map" className="mt-0">
            <iframe
              src={mapUrl}
              title="Carte météo Windy - Vagues et Vent"
              className="w-full rounded-b-lg border-t border-border"
              style={{ minHeight: "350px", height: "400px" }}
              frameBorder="0"
              allowFullScreen
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default WindyForecast;
