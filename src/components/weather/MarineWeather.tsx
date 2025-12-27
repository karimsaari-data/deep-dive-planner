import { useQuery } from "@tanstack/react-query";
import { Wind, Thermometer, Waves, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MarineWeatherProps {
  latitude: number;
  longitude: number;
  dateTime: string;
}

interface WeatherData {
  temperature: number;
  windSpeed: number;
  windDirection: number;
  waveHeight: number;
}

const getWindDirection = (degrees: number): string => {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
};

const MarineWeather = ({ latitude, longitude, dateTime }: MarineWeatherProps) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["marine-weather", latitude, longitude, dateTime],
    queryFn: async (): Promise<WeatherData> => {
      const date = new Date(dateTime);
      const dateStr = date.toISOString().split("T")[0];
      const hour = date.getHours();

      // Fetch weather and marine data from Open-Meteo
      const [weatherRes, marineRes] = await Promise.all([
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,wind_speed_10m,wind_direction_10m&start_date=${dateStr}&end_date=${dateStr}`
        ),
        fetch(
          `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}&hourly=wave_height&start_date=${dateStr}&end_date=${dateStr}`
        ),
      ]);

      if (!weatherRes.ok) throw new Error("Erreur météo");

      const weatherData = await weatherRes.json();
      let waveHeight = 0;

      if (marineRes.ok) {
        const marineData = await marineRes.json();
        waveHeight = marineData.hourly?.wave_height?.[hour] ?? 0;
      }

      return {
        temperature: weatherData.hourly?.temperature_2m?.[hour] ?? 0,
        windSpeed: weatherData.hourly?.wind_speed_10m?.[hour] ?? 0,
        windDirection: weatherData.hourly?.wind_direction_10m?.[hour] ?? 0,
        waveHeight,
      };
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    enabled: !!latitude && !!longitude,
  });

  if (!latitude || !longitude) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return null;
  }

  return (
    <Card className="shadow-card bg-gradient-to-br from-ocean/10 to-ocean-light/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Waves className="h-5 w-5 text-primary" />
          Météo marine
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center text-center">
            <Thermometer className="h-6 w-6 text-orange-500 mb-1" />
            <span className="text-lg font-bold text-foreground">{data?.temperature}°C</span>
            <span className="text-xs text-muted-foreground">Température</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <Wind className="h-6 w-6 text-sky-500 mb-1" />
            <span className="text-lg font-bold text-foreground">
              {data?.windSpeed} km/h
            </span>
            <span className="text-xs text-muted-foreground">
              Vent {getWindDirection(data?.windDirection ?? 0)}
            </span>
          </div>
          <div className="flex flex-col items-center text-center">
            <Waves className="h-6 w-6 text-primary mb-1" />
            <span className="text-lg font-bold text-foreground">
              {data?.waveHeight?.toFixed(1)} m
            </span>
            <span className="text-xs text-muted-foreground">Houle</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarineWeather;
