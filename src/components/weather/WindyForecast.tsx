import { CloudRain } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  // Build Windy embed URL with km/h wind and Celsius temperature
  const windyUrl = `https://embed.windy.com/embed.html?type=forecast&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=10&overlay=wind&product=ecmwf&level=surface&lat=${latitude}&lon=${longitude}&detailLat=${latitude}&detailLon=${longitude}&marker=true&message=true`;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CloudRain className="h-5 w-5 text-primary" />
          Conditions Météo (Prévisions)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden">
        <iframe
          src={windyUrl}
          title="Prévisions météo Windy"
          className="w-full rounded-b-lg border-t border-border"
          style={{ minHeight: "350px" }}
          frameBorder="0"
          allowFullScreen
        />
      </CardContent>
    </Card>
  );
};

export default WindyForecast;
