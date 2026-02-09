import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Anchor, Map, TableProperties, Wind, Waves, Clock, Loader2, Thermometer, Sun, Cloud, CloudRain } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import MarineChartMap from "./MarineChartMap";

interface ForecastDaySummary {
  date: Date;
  dayLabel: string;
  avgWindSpeed: number;
  avgWaveHeight: number;
  avgTemp: number;
  avgWaterTemp: number;
  weatherCode: number;
  overallColor: "green" | "orange" | "red";
  windLabel: string;
  waveLabel: string;
}

const getOverallCondition = (avgWind: number, avgWave: number): { color: "green" | "orange" | "red"; } => {
  // Red: strong wind (>=30) OR rough sea (>=1.5m)
  if (avgWind >= 30 || avgWave >= 1.5) return { color: "red" };
  // Orange: moderate wind (>=20) OR moderate sea (>=1.0m)
  if (avgWind >= 20 || avgWave >= 1.0) return { color: "orange" };
  // Green: calm
  return { color: "green" };
};

const getWindLabel = (speed: number): string => {
  if (speed < 10) return "Calme";
  if (speed < 20) return "Léger";
  if (speed < 30) return "Modéré";
  if (speed < 40) return "Fort";
  return "Très fort";
};

const getWaveLabel = (height: number): string => {
  if (height < 0.5) return "Plate";
  if (height < 1) return "Peu agitée";
  if (height < 1.5) return "Agitée";
  if (height < 2.5) return "Forte";
  return "Très forte";
};

const getSmallWeatherIcon = (code: number) => {
  if (code === 0) return <Sun className="h-4 w-4 text-yellow-500" />;
  if (code <= 3) return <Cloud className="h-4 w-4 text-gray-400" />;
  if (code <= 67) return <CloudRain className="h-4 w-4 text-blue-400" />;
  return <Cloud className="h-4 w-4 text-gray-400" />;
};

const conditionDotClass: Record<string, string> = {
  green: "bg-green-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
};

interface WindyWeatherExplorerProps {
  latitude: number;
  longitude: number;
  locationName: string;
  outingDate?: string; // ISO date string - if provided, focuses on that specific date
}

const WindyWeatherExplorer = ({ latitude, longitude, locationName, outingDate }: WindyWeatherExplorerProps) => {
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);
  const [selectedHour, setSelectedHour] = useState(10);
  const [mapLayer, setMapLayer] = useState<"wind" | "waves">("wind");

  // Fetch weather + marine data for 7-day summary
  const { data: forecastSummary, isLoading: forecastLoading } = useQuery({
    queryKey: ["forecast-summary", latitude, longitude],
    queryFn: async (): Promise<ForecastDaySummary[]> => {
      const [weatherRes, marineRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,wind_speed_10m,weather_code&timezone=Europe/Paris&forecast_days=7`),
        fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}&hourly=wave_height,sea_surface_temperature&timezone=Europe/Paris&forecast_days=7`),
      ]);
      if (!weatherRes.ok || !marineRes.ok) throw new Error("Failed to fetch forecast");
      const weather = await weatherRes.json();
      const marine = await marineRes.json();

      const summaries: ForecastDaySummary[] = [];
      for (let i = 0; i < 7; i++) {
        const date = addDays(new Date(), i);
        const dateStr = format(date, "yyyy-MM-dd");
        const indices = (weather.hourly.time as string[])
          .map((t: string, idx: number) => ({ t, idx }))
          .filter(({ t }: { t: string }) => t.startsWith(dateStr))
          .map(({ idx }: { idx: number }) => idx);
        if (indices.length === 0) continue;

        const winds = indices.map((j: number) => weather.hourly.wind_speed_10m[j] || 0);
        const temps = indices.map((j: number) => weather.hourly.temperature_2m[j] || 0);
        const waves = indices.map((j: number) => marine.hourly.wave_height[j] || 0);
        const waterTemps = indices.map((j: number) => marine.hourly.sea_surface_temperature?.[j] || 0).filter((t: number) => t > 0);

        const avgWind = winds.reduce((a: number, b: number) => a + b, 0) / winds.length;
        const avgWave = waves.reduce((a: number, b: number) => a + b, 0) / waves.length;
        const avgTemp = temps.reduce((a: number, b: number) => a + b, 0) / temps.length;
        const avgWaterTemp = waterTemps.length > 0 ? waterTemps.reduce((a: number, b: number) => a + b, 0) / waterTemps.length : 0;
        const weatherCode = weather.hourly.weather_code[indices[12]] || weather.hourly.weather_code[indices[0]] || 0;

        const { color } = getOverallCondition(avgWind, avgWave);
        summaries.push({
          date,
          dayLabel: i === 0 ? "Aujourd'hui" : format(date, "EEE d", { locale: fr }),
          avgWindSpeed: avgWind,
          avgWaveHeight: avgWave,
          avgTemp,
          avgWaterTemp,
          weatherCode,
          overallColor: color,
          windLabel: getWindLabel(avgWind),
          waveLabel: getWaveLabel(avgWave),
        });
      }
      return summaries;
    },
    staleTime: 1000 * 60 * 30,
  });

  // If outingDate is provided, compute the offset from today
  const outingDayOffset = useMemo(() => {
    if (!outingDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const outing = new Date(outingDate);
    outing.setHours(0, 0, 0, 0);
    const diffTime = outing.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.min(diffDays, 6)); // Clamp between 0-6
  }, [outingDate]);

  // Initialize selectedDayOffset based on outingDate
  useMemo(() => {
    if (outingDayOffset !== null) {
      setSelectedDayOffset(outingDayOffset);
    }
  }, [outingDayOffset]);

  // Generate 7 days
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(new Date(), i);
      return {
        offset: i,
        date,
        label: i === 0 ? "Auj." : format(date, "EEE d", { locale: fr }),
        fullLabel: format(date, "EEEE d MMMM", { locale: fr }),
      };
    });
  }, []);

  // Morning hours (06h-14h)
  const hours = [6, 8, 10, 12, 14];

  // Calculate timestamp for Windy map
  const selectedTimestamp = useMemo(() => {
    const selectedDate = addDays(new Date(), selectedDayOffset);
    selectedDate.setHours(selectedHour, 0, 0, 0);
    return Math.floor(selectedDate.getTime() / 1000);
  }, [selectedDayOffset, selectedHour]);

  // Build Windy map URL
  const mapUrl = useMemo(() => {
    return `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&metricWave=m&zoom=10&overlay=${mapLayer}&product=ecmwf&level=surface&lat=${latitude}&lon=${longitude}&marker=true&message=true&timestamp=${selectedTimestamp}`;
  }, [latitude, longitude, mapLayer, selectedTimestamp]);

  const selectedDay = days.find(d => d.offset === selectedDayOffset);

  // Determine if we're in "outing mode" (focused on a specific date)
  const isOutingMode = outingDate !== undefined;
  const outingDateFormatted = outingDate ? format(new Date(outingDate), "EEEE d MMMM", { locale: fr }) : null;

  return (
    <Card className="shadow-card overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Waves className="h-5 w-5 text-primary" />
          {isOutingMode ? `Météo - ${locationName}` : `Station Météo - ${locationName}`}
        </CardTitle>
        <CardDescription>
          {isOutingMode && outingDateFormatted
            ? `Prévisions pour le ${outingDateFormatted}`
            : "Prévisions détaillées et carte interactive"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="openmeteo" className="w-full">
          <div className="px-4 pb-2 pt-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="openmeteo" className="flex items-center gap-2">
                <TableProperties className="h-4 w-4" />
                <span className="hidden sm:inline">{isOutingMode ? "Jour J" : "Prévisions 7j"}</span>
                <span className="sm:hidden">{isOutingMode ? "Jour J" : "7j"}</span>
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

          {/* Onglet 1: Tableau synthétique 7 jours */}
          <TabsContent value="openmeteo" className="mt-0 px-4 pb-4">
            {forecastLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : forecastSummary && forecastSummary.length > 0 ? (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 pr-2 font-medium"></th>
                        <th className="text-left py-2 px-1 font-medium">Jour</th>
                        <th className="text-center py-2 px-1 font-medium">
                          <Wind className="h-3 w-3 inline" />
                        </th>
                        <th className="text-center py-2 px-1 font-medium">
                          <Waves className="h-3 w-3 inline" />
                        </th>
                        <th className="text-center py-2 px-1 font-medium">
                          <Thermometer className="h-3 w-3 inline" />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecastSummary.map((day, i) => (
                        <tr key={i} className={cn(
                          "border-b last:border-0",
                          i === 0 && "font-medium"
                        )}>
                          <td className="py-2 pr-2">
                            <span className={cn(
                              "inline-block w-3 h-3 rounded-full",
                              conditionDotClass[day.overallColor]
                            )} />
                          </td>
                          <td className="py-2 px-1">
                            <div className="flex items-center gap-1.5">
                              {getSmallWeatherIcon(day.weatherCode)}
                              <span className="capitalize whitespace-nowrap">{day.dayLabel}</span>
                            </div>
                          </td>
                          <td className="py-2 px-1 text-center whitespace-nowrap">
                            <span className="font-medium">{day.avgWindSpeed.toFixed(0)}</span>
                            <span className="text-muted-foreground ml-0.5">km/h</span>
                          </td>
                          <td className="py-2 px-1 text-center whitespace-nowrap">
                            <span className="font-medium">{day.avgWaveHeight.toFixed(1)}</span>
                            <span className="text-muted-foreground ml-0.5">m</span>
                          </td>
                          <td className="py-2 px-1 text-center whitespace-nowrap">
                            <span>{day.avgTemp.toFixed(0)}°</span>
                            {day.avgWaterTemp > 0 && (
                              <span className="text-cyan-600 ml-1">{day.avgWaterTemp.toFixed(0)}°</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Légende compacte */}
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500" /> Favorable
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-orange-500" /> Modéré
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-red-500" /> Défavorable
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Données indisponibles
              </p>
            )}
          </TabsContent>

          {/* Onglet 2: Carte Windy Interactive */}
          <TabsContent value="map" className="mt-0">
            <div className="px-4 pb-3 space-y-3">
              {/* Layer selector */}
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

              {/* Day selector */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Jour :</p>
                <div className="flex flex-wrap gap-1">
                  {days.map((day) => (
                    <Button
                      key={day.offset}
                      variant={selectedDayOffset === day.offset ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedDayOffset(day.offset)}
                      className={cn(
                        "h-7 text-xs flex-1 min-w-[45px]",
                        selectedDayOffset === day.offset && "bg-primary text-primary-foreground"
                      )}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Morning hours selector (06h-14h) */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Créneau matin (06h-14h) :
                </p>
                <div className="flex gap-1">
                  {hours.map((hour) => (
                    <Button
                      key={hour}
                      variant={selectedHour === hour ? "default" : "secondary"}
                      size="sm"
                      onClick={() => setSelectedHour(hour)}
                      className={cn(
                        "h-7 text-xs flex-1",
                        selectedHour === hour && "bg-primary text-primary-foreground"
                      )}
                    >
                      {hour}h
                    </Button>
                  ))}
                </div>
              </div>

              {/* Selected moment indicator */}
              <div className="text-center py-2 px-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium text-foreground capitalize">
                  🌅 {selectedDay?.fullLabel} à {selectedHour}h00
                </p>
              </div>
            </div>

            <iframe
              key={mapUrl}
              src={mapUrl}
              title={`Carte météo Windy - ${selectedDay?.fullLabel} ${selectedHour}h`}
              className="w-full border-t border-border"
              style={{ minHeight: "400px", height: "450px" }}
              frameBorder="0"
              allowFullScreen
            />
          </TabsContent>

          {/* Onglet 3: Carte Marine */}
          <TabsContent value="marine" className="mt-0">
            <div className="px-4 pb-2">
              <p className="text-xs text-muted-foreground">
                🗺️ Fond IGN Littoral • Surcouche OpenSeaMap (balises, bouées, feux)
              </p>
            </div>
            <MarineChartMap
              latitude={latitude}
              longitude={longitude}
              siteName={locationName}
            />
          </TabsContent>

        </Tabs>
      </CardContent>
    </Card>
  );
};

export default WindyWeatherExplorer;
