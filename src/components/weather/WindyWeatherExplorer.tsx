import { useState, useMemo } from "react";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Anchor, Map, TableProperties, Wind, Waves, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import MarineChartMap from "./MarineChartMap";

interface WindyWeatherExplorerProps {
  latitude: number;
  longitude: number;
  locationName: string;
}

const WindyWeatherExplorer = ({ latitude, longitude, locationName }: WindyWeatherExplorerProps) => {
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);
  const [selectedHour, setSelectedHour] = useState(10);
  const [mapLayer, setMapLayer] = useState<"wind" | "waves">("wind");

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

  return (
    <Card className="shadow-card overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Waves className="h-5 w-5 text-primary" />
          Station Météo - {locationName}
        </CardTitle>
        <CardDescription>
          Prévisions détaillées et carte interactive
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="openmeteo" className="w-full">
          <div className="px-4 pb-2 pt-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="openmeteo" className="flex items-center gap-2">
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

          {/* Onglet 1: Données Open-Meteo - scrollable vers le bas */}
          <TabsContent value="openmeteo" className="mt-0 px-4 pb-4">
            <p className="text-xs text-muted-foreground mb-3">
              Données Open-Meteo détaillées • Vent en km/h • Vagues en mètres
            </p>
            <p className="text-sm text-muted-foreground text-center py-8 border rounded-lg bg-muted/30">
              ⬇️ Les données détaillées Open-Meteo sont affichées ci-dessous
            </p>
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
