import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Wind,
  Waves,
  Thermometer,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface WeatherSummaryBannerProps {
  latitude: number;
  longitude: number;
  outingDate: string;
}

const getWeatherIcon = (code: number) => {
  if (code === 0) return <Sun className="h-4 w-4 text-yellow-500" />;
  if (code <= 3) return <Cloud className="h-4 w-4 text-gray-400" />;
  if (code <= 55) return <CloudDrizzle className="h-4 w-4 text-blue-400" />;
  if (code <= 67) return <CloudRain className="h-4 w-4 text-blue-500" />;
  if (code <= 77) return <CloudSnow className="h-4 w-4 text-blue-200" />;
  if (code <= 99) return <CloudLightning className="h-4 w-4 text-amber-500" />;
  return <Cloud className="h-4 w-4 text-gray-400" />;
};

const getWindColor = (speed: number): string => {
  if (speed < 10) return "text-green-600";
  if (speed < 20) return "text-emerald-600";
  if (speed < 30) return "text-yellow-600";
  if (speed < 40) return "text-orange-600";
  return "text-red-600";
};

const getWaveColor = (height: number): string => {
  if (height < 0.5) return "text-green-600";
  if (height < 1) return "text-emerald-600";
  if (height < 1.5) return "text-yellow-600";
  if (height < 2.5) return "text-orange-600";
  return "text-red-600";
};

const getTempColor = (temp: number): string => {
  if (temp < 8) return "text-blue-500";
  if (temp < 14) return "text-cyan-600";
  if (temp < 20) return "text-emerald-600";
  if (temp < 28) return "text-orange-500";
  return "text-red-500";
};

interface MarineWeatherData {
  hourly: {
    time: string[];
    wave_height: number[];
    sea_surface_temperature?: number[];
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

const WeatherSummaryBanner = ({ latitude, longitude, outingDate }: WeatherSummaryBannerProps) => {
  // Use the same queryKeys and API params as OutingWeatherCard to share cache
  const { data: marineData } = useQuery({
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
  });

  const dateStr = format(new Date(outingDate), "yyyy-MM-dd");
  const today = format(new Date(), "yyyy-MM-dd");
  const isToday = dateStr === today;
  const dateLabel = isToday
    ? "Aujourd'hui"
    : format(new Date(outingDate), "EEEE d MMM", { locale: fr });

  // Check if data is available for this date
  const hourlyIndices = marineData?.hourly?.time
    ?.map((t, idx) => ({ t, idx }))
    .filter(({ t }) => t.startsWith(dateStr))
    .map(({ idx }) => idx) ?? [];

  const noData = !marineData || !weatherData || hourlyIndices.length === 0;

  if (noData) {
    return (
      <div className="flex items-center gap-3 flex-wrap text-sm bg-muted/50 rounded-lg px-4 py-2.5 border border-border">
        <div className="flex items-center gap-1.5 font-medium">
          <Cloud className="h-4 w-4 text-gray-400" />
          <span className="capitalize">{dateLabel}</span>
        </div>
        <span className="text-muted-foreground">|</span>
        <span className="text-muted-foreground text-xs">Prévisions disponibles 7 jours avant la sortie</span>
      </div>
    );
  }

  // Average over the day
  const windSpeeds = hourlyIndices.map(i => weatherData.hourly.wind_speed_10m[i] || 0);
  const waveHeights = hourlyIndices.map(i => marineData.hourly.wave_height[i] || 0);
  const temps = hourlyIndices.map(i => weatherData.hourly.temperature_2m[i] || 0);

  const avgWind = windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length;
  const maxWind = Math.max(...windSpeeds);
  const avgWave = waveHeights.reduce((a, b) => a + b, 0) / waveHeights.length;
  const maxWave = Math.max(...waveHeights);
  const middayStr = `${dateStr}T12:00`;
  const midIdx = weatherData.hourly.time.indexOf(middayStr);
  const weatherCode = midIdx !== -1 ? weatherData.hourly.weather_code[midIdx] : 0;
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);

  // Assess overall conditions severity: "good" | "caution" | "bad"
  // Wind: <20 good, 20-35 caution, >35 bad
  // Waves: <1 good, 1-2 caution, >2 bad
  // Weather code: 0-3 good, 4-67 caution (rain/drizzle), 68+ bad (snow/thunderstorm)
  const windSeverity = maxWind >= 35 ? 2 : maxWind >= 20 ? 1 : 0;
  const waveSeverity = maxWave >= 2 ? 2 : maxWave >= 1 ? 1 : 0;
  const codeSeverity = weatherCode >= 68 ? 2 : weatherCode >= 51 ? 1 : 0;
  const overallSeverity = Math.max(windSeverity, waveSeverity, codeSeverity);

  const severityConfig = overallSeverity === 2
    ? {
        bg: "bg-red-50 dark:bg-red-950/30",
        border: "border-red-300 dark:border-red-800",
        icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
        label: "Conditions défavorables",
        labelClass: "text-red-600 dark:text-red-400 font-semibold",
      }
    : overallSeverity === 1
    ? {
        bg: "bg-amber-50 dark:bg-amber-950/30",
        border: "border-amber-300 dark:border-amber-800",
        icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
        label: "Conditions à surveiller",
        labelClass: "text-amber-600 dark:text-amber-400 font-semibold",
      }
    : {
        bg: "bg-emerald-50 dark:bg-emerald-950/20",
        border: "border-emerald-300 dark:border-emerald-800",
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
        label: null,
        labelClass: "",
      };

  return (
    <div className={`rounded-lg px-4 py-2.5 border ${severityConfig.bg} ${severityConfig.border}`}>
      <div className="flex items-center gap-3 flex-wrap text-sm">
        <div className="flex items-center gap-1.5 font-medium">
          {severityConfig.icon}
          <span className="capitalize">{dateLabel}</span>
        </div>
        <span className="text-muted-foreground">|</span>
        <div className="flex items-center gap-1">
          <Wind className="h-3.5 w-3.5 text-muted-foreground" />
          <span className={getWindColor(avgWind)}>{avgWind.toFixed(0)} km/h</span>
          {maxWind >= 20 && (
            <span className={`text-xs ${getWindColor(maxWind)}`}>(raf. {maxWind.toFixed(0)})</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Waves className="h-3.5 w-3.5 text-muted-foreground" />
          <span className={getWaveColor(avgWave)}>{avgWave.toFixed(1)} m</span>
          {maxWave >= 1 && (
            <span className={`text-xs ${getWaveColor(maxWave)}`}>(max {maxWave.toFixed(1)})</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Thermometer className="h-3.5 w-3.5 text-muted-foreground" />
          <span className={getTempColor((minTemp + maxTemp) / 2)}>
            {minTemp.toFixed(0)}° / {maxTemp.toFixed(0)}°
          </span>
        </div>
      </div>
      {severityConfig.label && (
        <p className={`text-xs mt-1.5 ${severityConfig.labelClass}`}>
          {severityConfig.label}
          {windSeverity >= 2 && " — Vent fort"}
          {waveSeverity >= 2 && " — Houle importante"}
          {codeSeverity >= 2 && " — Orage/neige"}
          {windSeverity === 1 && overallSeverity < 2 && " — Vent modéré"}
          {waveSeverity === 1 && overallSeverity < 2 && " — Houle modérée"}
        </p>
      )}
    </div>
  );
};

export default WeatherSummaryBanner;
