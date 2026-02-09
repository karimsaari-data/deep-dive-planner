import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Wind,
  Waves,
  Thermometer,
  Compass,
  Loader2,
  Cloud,
  Sun,
  CloudRain,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface OutingWeatherCardProps {
  latitude: number;
  longitude: number;
  outingDate: string; // ISO date string
}

interface MarineWeatherData {
  hourly: {
    time: string[];
    wave_height: number[];
    wave_direction: number[];
    wave_period: number[];
    swell_wave_height: number[];
    sea_surface_temperature?: number[];
  };
}

interface WeatherData {
  hourly: {
    time: string[];
    temperature_2m: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    weather_code: number[];
  };
}

const getWindDirection = (degrees: number): string => {
  const directions = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
};

const getWindCondition = (speed: number): { label: string; color: string } => {
  if (speed < 10) return { label: "Calme", color: "bg-green-500" };
  if (speed < 20) return { label: "Léger", color: "bg-emerald-500" };
  if (speed < 30) return { label: "Modéré", color: "bg-yellow-500" };
  if (speed < 40) return { label: "Fort", color: "bg-orange-500" };
  return { label: "Très fort", color: "bg-red-500" };
};

const getWaveCondition = (height: number): { label: string; color: string } => {
  if (height < 0.5) return { label: "Plate", color: "bg-green-500" };
  if (height < 1) return { label: "Peu agitée", color: "bg-emerald-500" };
  if (height < 1.5) return { label: "Agitée", color: "bg-yellow-500" };
  if (height < 2.5) return { label: "Forte", color: "bg-orange-500" };
  return { label: "Très forte", color: "bg-red-500" };
};

const getWeatherIcon = (code: number) => {
  if (code === 0) return <Sun className="h-5 w-5 text-yellow-500" />;
  if (code <= 3) return <Cloud className="h-5 w-5 text-gray-500" />;
  if (code <= 67) return <CloudRain className="h-5 w-5 text-blue-500" />;
  return <Cloud className="h-5 w-5 text-gray-500" />;
};

const OutingWeatherCard = ({ latitude, longitude, outingDate }: OutingWeatherCardProps) => {
  const { data: marineData, isLoading: marineLoading } = useQuery({
    queryKey: ["marine-weather-outing", latitude, longitude],
    queryFn: async (): Promise<MarineWeatherData> => {
      const response = await fetch(
        `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}&hourly=wave_height,wave_direction,wave_period,swell_wave_height,sea_surface_temperature&timezone=Europe/Paris&forecast_days=7`
      );
      if (!response.ok) throw new Error("Failed to fetch marine weather");
      return response.json();
    },
    staleTime: 1000 * 60 * 30,
  });

  const { data: weatherData, isLoading: weatherLoading } = useQuery({
    queryKey: ["weather-outing", latitude, longitude],
    queryFn: async (): Promise<WeatherData> => {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code&timezone=Europe/Paris&forecast_days=7`
      );
      if (!response.ok) throw new Error("Failed to fetch weather");
      return response.json();
    },
    staleTime: 1000 * 60 * 30,
  });

  const isLoading = marineLoading || weatherLoading;

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!marineData || !weatherData) return null;

  // Extract data for the outing date
  const dateStr = format(new Date(outingDate), "yyyy-MM-dd");
  const dateLabel = format(new Date(outingDate), "EEEE d MMMM", { locale: fr });

  const hourlyIndices = marineData.hourly.time
    .map((t, idx) => ({ t, idx }))
    .filter(({ t }) => t.startsWith(dateStr))
    .map(({ idx }) => idx);

  if (hourlyIndices.length === 0) return null;

  const waveHeights = hourlyIndices.map(i => marineData.hourly.wave_height[i] || 0);
  const windSpeeds = hourlyIndices.map(i => weatherData.hourly.wind_speed_10m[i] || 0);
  const temps = hourlyIndices.map(i => weatherData.hourly.temperature_2m[i] || 0);
  const waterTemps = hourlyIndices.map(i => marineData.hourly.sea_surface_temperature?.[i] || 0);

  const avgWaveHeight = waveHeights.reduce((a, b) => a + b, 0) / waveHeights.length;
  const avgWindSpeed = windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length;
  const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
  const validWaterTemps = waterTemps.filter(t => t > 0);
  const avgWaterTemp = validWaterTemps.length > 0
    ? validWaterTemps.reduce((a, b) => a + b, 0) / validWaterTemps.length
    : 0;
  const windDirection = weatherData.hourly.wind_direction_10m[hourlyIndices[12]] || 0;
  const wavePeriod = marineData.hourly.wave_period[hourlyIndices[12]] || 0;
  const weatherCode = weatherData.hourly.weather_code[hourlyIndices[12]] || 0;

  // Hourly data for key hours
  const keyHours = [6, 9, 12, 15, 18];
  const hourlyData = keyHours.map(hour => {
    const hourStr = `${dateStr}T${hour.toString().padStart(2, "0")}:00`;
    const idx = marineData.hourly.time.indexOf(hourStr);
    if (idx === -1) return null;
    return {
      time: `${hour}h`,
      waveHeight: marineData.hourly.wave_height[idx] || 0,
      windSpeed: weatherData.hourly.wind_speed_10m[idx] || 0,
      temp: weatherData.hourly.temperature_2m[idx] || 0,
      waterTemp: marineData.hourly.sea_surface_temperature?.[idx] || 0,
      weatherCode: weatherData.hourly.weather_code[idx] || 0,
    };
  }).filter(Boolean) as Array<{
    time: string;
    waveHeight: number;
    windSpeed: number;
    temp: number;
    waterTemp: number;
    weatherCode: number;
  }>;

  const windCondition = getWindCondition(avgWindSpeed);
  const waveCondition = getWaveCondition(avgWaveHeight);

  // Check if outing is today
  const today = format(new Date(), "yyyy-MM-dd");
  const isToday = dateStr === today;

  return (
    <Card className={`overflow-hidden shadow-card ${isToday ? "border-primary" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            {getWeatherIcon(weatherCode)}
            <div>
              <CardTitle className="text-lg capitalize">
                {isToday ? "Aujourd'hui" : dateLabel}
              </CardTitle>
              <CardDescription className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Thermometer className="h-3 w-3" />
                  Air {avgTemp.toFixed(1)}°C
                </span>
                {avgWaterTemp > 0 && (
                  <span className="flex items-center gap-1 text-cyan-600">
                    <Waves className="h-3 w-3" />
                    Eau {avgWaterTemp.toFixed(1)}°C
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge className={`${windCondition.color} text-white`}>
              <Wind className="h-3 w-3 mr-1" />
              {windCondition.label}
            </Badge>
            <Badge className={`${waveCondition.color} text-white`}>
              <Waves className="h-3 w-3 mr-1" />
              {waveCondition.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Wind className="h-4 w-4 text-primary" />
            <div>
              <p className="text-muted-foreground">Vent moyen</p>
              <p className="font-medium">{avgWindSpeed.toFixed(0)} km/h</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Compass className="h-4 w-4 text-primary" />
            <div>
              <p className="text-muted-foreground">Direction</p>
              <p className="font-medium">{getWindDirection(windDirection)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Waves className="h-4 w-4 text-primary" />
            <div>
              <p className="text-muted-foreground">Houle</p>
              <p className="font-medium">{avgWaveHeight.toFixed(1)} m</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-primary" />
            <div>
              <p className="text-muted-foreground">Période</p>
              <p className="font-medium">{wavePeriod.toFixed(0)} s</p>
            </div>
          </div>
        </div>

        {/* Hourly breakdown */}
        {hourlyData.length > 0 && (
          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Détail par heure
            </p>
            <div className="grid grid-cols-5 gap-2">
              {hourlyData.map((hour) => (
                <div
                  key={hour.time}
                  className="text-center p-2 rounded-lg bg-muted/50"
                >
                  <p className="text-xs font-medium text-foreground">{hour.time}</p>
                  <div className="my-1">{getWeatherIcon(hour.weatherCode)}</div>
                  <p className="text-xs text-muted-foreground">{hour.temp.toFixed(0)}°</p>
                  {hour.waterTemp > 0 && (
                    <p className="text-xs text-cyan-600 font-medium">{hour.waterTemp.toFixed(0)}° 💧</p>
                  )}
                  <p className="text-xs text-primary font-medium">{hour.windSpeed.toFixed(0)} km/h</p>
                  <p className="text-xs text-blue-500">{hour.waveHeight.toFixed(1)} m</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OutingWeatherCard;
