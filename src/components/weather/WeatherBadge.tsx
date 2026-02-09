import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Wind,
  Waves,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface WeatherBadgeProps {
  latitude: number;
  longitude: number;
  outingDate: string;
}

const getWeatherIcon = (code: number) => {
  if (code === 0) return <Sun className="h-3 w-3 text-yellow-500" />;
  if (code <= 3) return <Cloud className="h-3 w-3 text-gray-300" />;
  if (code <= 55) return <CloudDrizzle className="h-3 w-3 text-blue-300" />;
  if (code <= 67) return <CloudRain className="h-3 w-3 text-blue-400" />;
  if (code <= 77) return <CloudSnow className="h-3 w-3 text-blue-200" />;
  if (code <= 99) return <CloudLightning className="h-3 w-3 text-amber-400" />;
  return <Cloud className="h-3 w-3 text-gray-300" />;
};

interface MarineData {
  hourly: {
    time: string[];
    wave_height: number[];
  };
}

interface WeatherData {
  hourly: {
    time: string[];
    temperature_2m: number[];
    wind_speed_10m: number[];
    weather_code: number[];
  };
}

const WeatherBadge = ({ latitude, longitude, outingDate }: WeatherBadgeProps) => {
  const dateStr = format(new Date(outingDate), "yyyy-MM-dd");
  const now = new Date();
  const outDate = new Date(outingDate);
  const diffDays = (outDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  const isWithinForecast = diffDays <= 7;

  // Hooks always called, but disabled when out of forecast range
  const { data: marineData } = useQuery({
    queryKey: ["marine-weather-outing", latitude, longitude],
    queryFn: async (): Promise<MarineData> => {
      const response = await fetch(
        `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}&hourly=wave_height,wave_direction,wave_period,swell_wave_height,sea_surface_temperature&timezone=Europe/Paris&forecast_days=7`
      );
      if (!response.ok) throw new Error("Failed to fetch marine weather");
      return response.json();
    },
    staleTime: 1000 * 60 * 30,
    enabled: isWithinForecast,
  });

  const { data: weatherData } = useQuery({
    queryKey: ["weather-outing", latitude, longitude],
    queryFn: async (): Promise<WeatherData> => {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code&timezone=Europe/Paris&forecast_days=7`
      );
      if (!response.ok) throw new Error("Failed to fetch weather");
      return response.json();
    },
    staleTime: 1000 * 60 * 30,
    enabled: isWithinForecast,
  });

  if (!isWithinForecast) return null;

  const hourlyIndices = marineData?.hourly?.time
    ?.map((t, idx) => ({ t, idx }))
    .filter(({ t }) => t.startsWith(dateStr))
    .map(({ idx }) => idx) ?? [];

  if (!marineData || !weatherData || hourlyIndices.length === 0) return null;

  const windSpeeds = hourlyIndices.map(i => weatherData.hourly.wind_speed_10m[i] || 0);
  const waveHeights = hourlyIndices.map(i => marineData.hourly.wave_height[i] || 0);

  const avgWind = windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length;
  const maxWind = Math.max(...windSpeeds);
  const maxWave = Math.max(...waveHeights);
  const avgWave = waveHeights.reduce((a, b) => a + b, 0) / waveHeights.length;

  const middayStr = `${dateStr}T12:00`;
  const midIdx = weatherData.hourly.time.indexOf(middayStr);
  const weatherCode = midIdx !== -1 ? weatherData.hourly.weather_code[midIdx] : 0;

  // Severity
  const windSeverity = maxWind >= 35 ? 2 : maxWind >= 20 ? 1 : 0;
  const waveSeverity = maxWave >= 2 ? 2 : maxWave >= 1 ? 1 : 0;
  const codeSeverity = weatherCode >= 68 ? 2 : weatherCode >= 51 ? 1 : 0;
  const severity = Math.max(windSeverity, waveSeverity, codeSeverity);

  const config = severity === 2
    ? { bg: "bg-red-50 border-red-200", text: "text-red-700", icon: AlertTriangle, iconClass: "text-red-500", label: "Défavorable" }
    : severity === 1
    ? { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", icon: AlertTriangle, iconClass: "text-amber-500", label: "À surveiller" }
    : { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", icon: CheckCircle2, iconClass: "text-emerald-500", label: null };

  const StatusIcon = config.icon;

  return (
    <div className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium border ${config.bg}`}>
      <StatusIcon className={`h-3.5 w-3.5 ${config.iconClass}`} />
      {getWeatherIcon(weatherCode)}
      <div className="flex items-center gap-1">
        <Wind className="h-3 w-3 text-muted-foreground" />
        <span className={config.text}>{avgWind.toFixed(0)} km/h</span>
      </div>
      <div className="flex items-center gap-1">
        <Waves className="h-3 w-3 text-muted-foreground" />
        <span className={config.text}>{avgWave.toFixed(1)} m</span>
      </div>
      {config.label && (
        <span className={`ml-auto text-[10px] font-semibold uppercase ${config.text}`}>{config.label}</span>
      )}
    </div>
  );
};

export default WeatherBadge;
