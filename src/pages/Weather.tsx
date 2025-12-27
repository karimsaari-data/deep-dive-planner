import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Wind, 
  Waves, 
  Thermometer, 
  Compass, 
  Loader2, 
  Navigation,
  Cloud,
  Sun,
  CloudRain,
  ArrowDown,
  Clock
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

// Marseille coordinates (default location)
const LOCATIONS = [
  { name: "Marseille", lat: 43.2965, lon: 5.3698 },
  { name: "Cassis", lat: 43.2141, lon: 5.5367 },
  { name: "La Ciotat", lat: 43.1748, lon: 5.6048 },
];

interface MarineWeatherData {
  hourly: {
    time: string[];
    wave_height: number[];
    wave_direction: number[];
    wave_period: number[];
    wind_wave_height: number[];
    swell_wave_height: number[];
    swell_wave_direction: number[];
    swell_wave_period: number[];
  };
  hourly_units: {
    wave_height: string;
    wave_period: string;
  };
}

interface WeatherData {
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    weather_code: number[];
  };
  hourly_units: {
    temperature_2m: string;
    wind_speed_10m: string;
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

const Weather = () => {
  const { user, loading: authLoading } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState(LOCATIONS[0]);

  const { data: marineData, isLoading: marineLoading } = useQuery({
    queryKey: ["marine-weather", selectedLocation.lat, selectedLocation.lon],
    queryFn: async (): Promise<MarineWeatherData> => {
      const response = await fetch(
        `https://marine-api.open-meteo.com/v1/marine?latitude=${selectedLocation.lat}&longitude=${selectedLocation.lon}&hourly=wave_height,wave_direction,wave_period,wind_wave_height,swell_wave_height,swell_wave_direction,swell_wave_period&timezone=Europe/Paris&forecast_days=7`
      );
      if (!response.ok) throw new Error("Failed to fetch marine weather");
      return response.json();
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  const { data: weatherData, isLoading: weatherLoading } = useQuery({
    queryKey: ["weather", selectedLocation.lat, selectedLocation.lon],
    queryFn: async (): Promise<WeatherData> => {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${selectedLocation.lat}&longitude=${selectedLocation.lon}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code&timezone=Europe/Paris&forecast_days=7`
      );
      if (!response.ok) throw new Error("Failed to fetch weather");
      return response.json();
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  if (authLoading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const isLoading = marineLoading || weatherLoading;

  // Group data by day
  const getDailyData = () => {
    if (!marineData || !weatherData) return [];

    const days: Array<{
      date: Date;
      avgWaveHeight: number;
      maxWaveHeight: number;
      avgSwellHeight: number;
      avgWindSpeed: number;
      maxWindSpeed: number;
      avgTemp: number;
      windDirection: number;
      waveDirection: number;
      wavePeriod: number;
      weatherCode: number;
      hourlyData: Array<{
        time: string;
        waveHeight: number;
        swellHeight: number;
        windSpeed: number;
        temp: number;
        weatherCode: number;
      }>;
    }> = [];

    for (let i = 0; i < 7; i++) {
      const date = addDays(new Date(), i);
      const dateStr = format(date, "yyyy-MM-dd");
      
      const hourlyIndices = marineData.hourly.time
        .map((t, idx) => ({ t, idx }))
        .filter(({ t }) => t.startsWith(dateStr))
        .map(({ idx }) => idx);

      if (hourlyIndices.length === 0) continue;

      const waveHeights = hourlyIndices.map(i => marineData.hourly.wave_height[i] || 0);
      const swellHeights = hourlyIndices.map(i => marineData.hourly.swell_wave_height[i] || 0);
      const windSpeeds = hourlyIndices.map(i => weatherData.hourly.wind_speed_10m[i] || 0);
      const temps = hourlyIndices.map(i => weatherData.hourly.temperature_2m[i] || 0);

      // Get hourly data for 6h, 9h, 12h, 15h, 18h
      const keyHours = [6, 9, 12, 15, 18];
      const hourlyData = keyHours.map(hour => {
        const hourStr = `${dateStr}T${hour.toString().padStart(2, "0")}:00`;
        const idx = marineData.hourly.time.indexOf(hourStr);
        if (idx === -1) return null;
        return {
          time: `${hour}h`,
          waveHeight: marineData.hourly.wave_height[idx] || 0,
          swellHeight: marineData.hourly.swell_wave_height[idx] || 0,
          windSpeed: weatherData.hourly.wind_speed_10m[idx] || 0,
          temp: weatherData.hourly.temperature_2m[idx] || 0,
          weatherCode: weatherData.hourly.weather_code[idx] || 0,
        };
      }).filter(Boolean) as Array<{
        time: string;
        waveHeight: number;
        swellHeight: number;
        windSpeed: number;
        temp: number;
        weatherCode: number;
      }>;

      days.push({
        date,
        avgWaveHeight: waveHeights.reduce((a, b) => a + b, 0) / waveHeights.length,
        maxWaveHeight: Math.max(...waveHeights),
        avgSwellHeight: swellHeights.reduce((a, b) => a + b, 0) / swellHeights.length,
        avgWindSpeed: windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length,
        maxWindSpeed: Math.max(...windSpeeds),
        avgTemp: temps.reduce((a, b) => a + b, 0) / temps.length,
        windDirection: weatherData.hourly.wind_direction_10m[hourlyIndices[12]] || 0,
        waveDirection: marineData.hourly.wave_direction[hourlyIndices[12]] || 0,
        wavePeriod: marineData.hourly.wave_period[hourlyIndices[12]] || 0,
        weatherCode: weatherData.hourly.weather_code[hourlyIndices[12]] || 0,
        hourlyData,
      });
    }

    return days;
  };

  const dailyData = getDailyData();

  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Waves className="h-8 w-8 text-primary" />
              Météo Marine
            </h1>
            <p className="text-muted-foreground">
              Prévisions sur 7 jours pour planifier vos sorties
            </p>
          </div>

          {/* Location selector */}
          <div className="mb-6">
            <Tabs 
              value={selectedLocation.name} 
              onValueChange={(v) => setSelectedLocation(LOCATIONS.find(l => l.name === v) || LOCATIONS[0])}
            >
              <TabsList>
                {LOCATIONS.map((loc) => (
                  <TabsTrigger key={loc.name} value={loc.name} className="gap-2">
                    <Navigation className="h-4 w-4" />
                    {loc.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : dailyData.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Cloud className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-center text-muted-foreground">
                  Impossible de charger les données météo.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {dailyData.map((day, index) => {
                const windCondition = getWindCondition(day.avgWindSpeed);
                const waveCondition = getWaveCondition(day.avgWaveHeight);
                const isToday = index === 0;

                return (
                  <Card 
                    key={day.date.toISOString()} 
                    className={`overflow-hidden transition-all ${isToday ? "border-primary shadow-lg" : ""}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          {getWeatherIcon(day.weatherCode)}
                          <div>
                            <CardTitle className="text-lg capitalize">
                              {isToday ? "Aujourd'hui" : format(day.date, "EEEE d MMMM", { locale: fr })}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2">
                              <Thermometer className="h-3 w-3" />
                              {day.avgTemp.toFixed(1)}°C
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
                            <p className="font-medium">{day.avgWindSpeed.toFixed(0)} km/h</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Compass className="h-4 w-4 text-primary" />
                          <div>
                            <p className="text-muted-foreground">Direction</p>
                            <p className="font-medium">{getWindDirection(day.windDirection)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Waves className="h-4 w-4 text-primary" />
                          <div>
                            <p className="text-muted-foreground">Houle</p>
                            <p className="font-medium">{day.avgWaveHeight.toFixed(1)} m</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-primary" />
                          <div>
                            <p className="text-muted-foreground">Période</p>
                            <p className="font-medium">{day.wavePeriod.toFixed(0)} s</p>
                          </div>
                        </div>
                      </div>

                      {/* Hourly breakdown */}
                      {day.hourlyData.length > 0 && (
                        <div className="border-t border-border pt-4">
                          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Détail par heure
                          </p>
                          <div className="grid grid-cols-5 gap-2">
                            {day.hourlyData.map((hour) => (
                              <div 
                                key={hour.time} 
                                className="text-center p-2 rounded-lg bg-muted/50"
                              >
                                <p className="text-xs font-medium text-foreground">{hour.time}</p>
                                <div className="my-1">{getWeatherIcon(hour.weatherCode)}</div>
                                <p className="text-xs text-muted-foreground">{hour.temp.toFixed(0)}°</p>
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
              })}
            </div>
          )}

          {/* Legend */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-sm">Légende conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Wind className="h-3 w-3" /> Vent
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge className="bg-green-500 text-white text-xs">Calme &lt;10</Badge>
                    <Badge className="bg-emerald-500 text-white text-xs">Léger 10-20</Badge>
                    <Badge className="bg-yellow-500 text-white text-xs">Modéré 20-30</Badge>
                    <Badge className="bg-orange-500 text-white text-xs">Fort 30-40</Badge>
                    <Badge className="bg-red-500 text-white text-xs">Très fort &gt;40</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Waves className="h-3 w-3" /> Houle
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge className="bg-green-500 text-white text-xs">Plate &lt;0.5m</Badge>
                    <Badge className="bg-emerald-500 text-white text-xs">Peu agitée 0.5-1m</Badge>
                    <Badge className="bg-yellow-500 text-white text-xs">Agitée 1-1.5m</Badge>
                    <Badge className="bg-orange-500 text-white text-xs">Forte 1.5-2.5m</Badge>
                    <Badge className="bg-red-500 text-white text-xs">Très forte &gt;2.5m</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
};

export default Weather;
