import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CALENDAR_ID = "5b622c3d759c30b0a6558d985d73259efcba11279c9934ea1a665a34e47b8c07@group.calendar.google.com";
const ICS_URL = `https://calendar.google.com/calendar/ical/${encodeURIComponent(CALENDAR_ID)}/public/basic.ics`;

interface CalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string | null;
  isAllDay: boolean;
  location: string | null;
  description: string | null;
}

function parseICSDate(dateStr: string): Date {
  if (dateStr.length === 8) {
    // All-day: YYYYMMDD — treat as UTC midnight
    return new Date(Date.UTC(
      parseInt(dateStr.slice(0, 4)),
      parseInt(dateStr.slice(4, 6)) - 1,
      parseInt(dateStr.slice(6, 8))
    ));
  }
  // DateTime: YYYYMMDDTHHMMSS[Z] or floating
  const year = parseInt(dateStr.slice(0, 4));
  const month = parseInt(dateStr.slice(4, 6)) - 1;
  const day = parseInt(dateStr.slice(6, 8));
  const hour = parseInt(dateStr.slice(9, 11));
  const min = parseInt(dateStr.slice(11, 13));
  const sec = parseInt(dateStr.slice(13, 15) || "0");

  if (dateStr.endsWith("Z")) {
    return new Date(Date.UTC(year, month, day, hour, min, sec));
  }
  // Floating/local — treat as Europe/Paris (UTC+2 in summer, approximate)
  return new Date(Date.UTC(year, month, day, hour - 2, min, sec));
}

function unescapeICS(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function parseICS(icsText: string): CalendarEvent[] {
  // Unfold folded lines (CRLF + whitespace = continuation)
  const unfolded = icsText.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const lines = unfolded.split(/\r\n|\n/);

  const events: CalendarEvent[] = [];
  let inEvent = false;
  let props: Record<string, string> = {};

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      props = {};
    } else if (line === "END:VEVENT") {
      inEvent = false;

      try {
        const uid = props["UID"] || crypto.randomUUID();
        const summary = unescapeICS(props["SUMMARY"] || "Événement");
        const location = props["LOCATION"] ? unescapeICS(props["LOCATION"]) : null;
        const description = props["DESCRIPTION"] ? unescapeICS(props["DESCRIPTION"]) : null;

        // DTSTART: prefer VALUE=DATE key, fall back to bare DTSTART
        const dtstartRaw = props["DTSTART;VALUE=DATE"] ?? props["DTSTART"];
        if (!dtstartRaw) continue;

        const isAllDay = dtstartRaw.length === 8 || !!props["DTSTART;VALUE=DATE"];
        const startDate = parseICSDate(dtstartRaw);

        const dtendRaw = props["DTEND;VALUE=DATE"] ?? props["DTEND"];
        const endDate = dtendRaw ? parseICSDate(dtendRaw) : null;

        events.push({
          id: uid,
          title: summary,
          startDate: startDate.toISOString(),
          endDate: endDate?.toISOString() ?? null,
          isAllDay,
          location,
          description,
        });
      } catch (e) {
        console.warn("Failed to parse VEVENT:", e);
      }
    } else if (inEvent) {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;

      const propKey = line.slice(0, colonIdx);
      const propValue = line.slice(colonIdx + 1);

      // Store with full key (e.g. "DTSTART;VALUE=DATE") AND bare name (e.g. "DTSTART")
      props[propKey] = propValue;
      const bareName = propKey.split(";")[0];
      if (bareName !== propKey && !props[bareName]) {
        props[bareName] = propValue;
      }
    }
  }

  return events;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const response = await fetch(ICS_URL, {
      headers: { "User-Agent": "MyOxygen-TeamOxygen/1.0" },
    });

    if (!response.ok) {
      throw new Error(`Google Calendar returned ${response.status}`);
    }

    const icsText = await response.text();
    const events = parseICS(icsText);

    // Keep events from 7 days ago to 6 months ahead
    const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const future = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);

    const filtered = events
      .filter((e) => {
        const start = new Date(e.startDate);
        return start >= past && start <= future;
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    return new Response(JSON.stringify(filtered), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("get-club-calendar error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
