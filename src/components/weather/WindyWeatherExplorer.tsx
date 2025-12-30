import { useState, useMemo } from "react";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { CloudRain, Map, TableProperties, Calendar, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WindyWeatherExplorerProps {
  latitude: number;
  longitude: number;
  locationName: string;
}

interface TimeSlot {
  dayOffset: number;
  hour: number;
  label: string;
  dateLabel: string;
}

const WindyWeatherExplorer = ({ latitude, longitude, locationName }: WindyWeatherExplorerProps) => {
  // Default: today at noon
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);
  const [selectedHour, setSelectedHour] = useState(12);

  // Generate 7 days
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(new Date(), i);
      return {
        offset: i,
        date,
        label: i === 0 ? "Aujourd'hui" : format(date, "EEE d", { locale: fr }),
        fullLabel: format(date, "EEEE d MMMM", { locale: fr }),
      };
    });
  }, []);

  // Available hours for selection
  const hours = [6, 9, 12, 15, 18, 21];

  // Calculate timestamp for the selected moment (for Windy map sync)
  const selectedTimestamp = useMemo(() => {
    const selectedDate = addDays(new Date(), selectedDayOffset);
    selectedDate.setHours(selectedHour, 0, 0, 0);
    return Math.floor(selectedDate.getTime() / 1000);
  }, [selectedDayOffset, selectedHour]);

  // Build Windy embed URL for forecast table with km/h wind, Celsius temperature, and waves in meters
  const forecastUrl = `https://embed.windy.com/embed.html?type=forecast&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&metricWave=m&zoom=10&overlay=wind&product=ecmwf&level=surface&lat=${latitude}&lon=${longitude}&detailLat=${latitude}&detailLon=${longitude}&marker=true&message=true`;

  // Build Windy embed URL for map synced to selected time
  const mapUrl = useMemo(() => {
    return `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&metricWave=m&zoom=9&overlay=waves&product=ecmwf&level=surface&lat=${latitude}&lon=${longitude}&marker=true&message=true&timestamp=${selectedTimestamp}`;
  }, [latitude, longitude, selectedTimestamp]);

  const selectedDay = days.find(d => d.offset === selectedDayOffset);

  return (
    <div className="space-y-6">
      {/* Le Sélecteur - Windy Point Forecast */}
      <Card className="shadow-card overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <TableProperties className="h-5 w-5 text-primary" />
            Le Sélecteur - Prévisions 7 jours
          </CardTitle>
          <CardDescription>
            Tableau détaillé Windy pour {locationName} • Vent en km/h, vagues en mètres
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <iframe
            src={forecastUrl}
            title="Prévisions météo Windy - Tableau 7 jours"
            className="w-full border-t border-border"
            style={{ minHeight: "380px", height: "420px" }}
            frameBorder="0"
            allowFullScreen
          />
        </CardContent>
      </Card>

      {/* Sélecteur de jour/heure pour synchroniser la carte */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-primary" />
            Sélectionner un moment
          </CardTitle>
          <CardDescription className="text-sm">
            Cliquez sur un jour et une heure pour synchroniser la carte ci-dessous
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Days selector */}
          <div className="flex flex-wrap gap-2">
            {days.map((day) => (
              <Button
                key={day.offset}
                variant={selectedDayOffset === day.offset ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDayOffset(day.offset)}
                className={cn(
                  "flex-1 min-w-[80px] text-xs sm:text-sm",
                  selectedDayOffset === day.offset && "bg-primary text-primary-foreground"
                )}
              >
                {day.label}
              </Button>
            ))}
          </div>

          {/* Hours selector */}
          <div className="flex flex-wrap gap-2">
            {hours.map((hour) => (
              <Button
                key={hour}
                variant={selectedHour === hour ? "default" : "secondary"}
                size="sm"
                onClick={() => setSelectedHour(hour)}
                className={cn(
                  "flex-1 min-w-[50px]",
                  selectedHour === hour && "bg-primary text-primary-foreground"
                )}
              >
                <Clock className="h-3 w-3 mr-1" />
                {hour}h
              </Button>
            ))}
          </div>

          {/* Selected moment display */}
          <div className="text-center py-2 px-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Carte synchronisée sur :
            </p>
            <p className="font-medium text-foreground capitalize">
              {selectedDay?.fullLabel} à {selectedHour}h00
            </p>
          </div>
        </CardContent>
      </Card>

      {/* L'Explorateur - Windy Interactive Map */}
      <Card className="shadow-card overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5 text-primary" />
            L'Explorateur - Carte interactive
          </CardTitle>
          <CardDescription>
            Visualisation des conditions météo en temps réel • {selectedDay?.fullLabel} à {selectedHour}h00
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <iframe
            key={mapUrl} // Force re-render when URL changes
            src={mapUrl}
            title={`Carte météo Windy - ${selectedDay?.fullLabel} ${selectedHour}h`}
            className="w-full border-t border-border"
            style={{ minHeight: "400px", height: "450px" }}
            frameBorder="0"
            allowFullScreen
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default WindyWeatherExplorer;
