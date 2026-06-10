import { Calendar, MapPin, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClubCalendar, ClubCalendarEvent } from "@/hooks/useClubCalendar";

const CALENDAR_PUBLIC_URL =
  "https://calendar.google.com/calendar/embed?src=5b622c3d759c30b0a6558d985d73259efcba11279c9934ea1a665a34e47b8c07%40group.calendar.google.com&ctz=Europe%2FBrussels";

const isMultiDay = (event: ClubCalendarEvent): boolean => {
  if (!event.endDate || !event.isAllDay) return false;
  const diff = new Date(event.endDate).getTime() - new Date(event.startDate).getTime();
  return diff > 24 * 60 * 60 * 1000;
};

const formatDateRange = (event: ClubCalendarEvent): string => {
  const start = new Date(event.startDate);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", timeZone: "UTC" };

  if (!isMultiDay(event) || !event.endDate) {
    if (event.isAllDay) {
      return start.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
    }
    return start.toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  }

  // End is exclusive for all-day events → subtract 1 day
  const endExclusive = new Date(event.endDate);
  const endInclusive = new Date(endExclusive.getTime() - 24 * 60 * 60 * 1000);
  return `${start.toLocaleDateString("fr-FR", opts)} → ${endInclusive.toLocaleDateString("fr-FR", opts)}`;
};

const ClubCalendarWidget = () => {
  const { data: events, isLoading, error } = useClubCalendar();

  if (isLoading || error || !events || events.length === 0) return null;

  const upcoming = events.slice(0, 6);

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-primary" />
            Agenda du club
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs text-muted-foreground h-7 px-2">
            <a href={CALENDAR_PUBLIC_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3" />
              Voir tout
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-2 space-y-0">
        {upcoming.map((event, idx) => {
          const startDate = new Date(event.startDate);
          const multi = isMultiDay(event);

          return (
            <div
              key={event.id}
              className={`flex items-start gap-3 py-2.5 ${idx < upcoming.length - 1 ? "border-b border-border/40" : ""}`}
            >
              {/* Date badge */}
              <div className="shrink-0 w-10 text-center">
                <p className="text-[10px] font-medium text-muted-foreground uppercase leading-none">
                  {startDate.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" })}
                </p>
                <p className="text-xl font-bold leading-tight text-foreground">
                  {startDate.toLocaleDateString("fr-FR", { day: "numeric", timeZone: "UTC" })}
                </p>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground leading-snug">{event.title}</p>
                  {multi && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                      Plusieurs jours
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{formatDateRange(event)}</p>
                {event.location && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                    <p className="text-xs text-muted-foreground truncate">{event.location}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {events.length > 6 && (
          <p className="text-xs text-center text-muted-foreground pt-2">
            +{events.length - 6} autre{events.length - 6 > 1 ? "s" : ""} événement{events.length - 6 > 1 ? "s" : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ClubCalendarWidget;
