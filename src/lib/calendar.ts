/**
 * Helpers to add an outing to an external calendar (Google, Outlook, ICS).
 */

export interface CalendarEvent {
  title: string;
  /** ISO start date/time */
  start: string | Date;
  /** ISO end date/time. Defaults to start + 3h if absent. */
  end?: string | Date | null;
  description?: string | null;
  location?: string | null;
}

const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000; // 3h

const toDate = (value: string | Date): Date =>
  value instanceof Date ? value : new Date(value);

const resolveDates = (event: CalendarEvent): { start: Date; end: Date } => {
  const start = toDate(event.start);
  const end = event.end ? toDate(event.end) : new Date(start.getTime() + DEFAULT_DURATION_MS);
  return { start, end };
};

/** Format a date to the UTC compact form used by calendar URLs/ICS: YYYYMMDDTHHMMSSZ */
const toUTCStamp = (date: Date): string =>
  date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Google Calendar "create event" URL */
export const buildGoogleCalendarUrl = (event: CalendarEvent): string => {
  const { start, end } = resolveDates(event);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toUTCStamp(start)}/${toUTCStamp(end)}`,
  });
  if (event.description) params.set("details", event.description);
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/** Outlook Web "compose event" URL */
export const buildOutlookCalendarUrl = (event: CalendarEvent): string => {
  const { start, end } = resolveDates(event);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
  });
  if (event.description) params.set("body", event.description);
  if (event.location) params.set("location", event.location);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
};

/** Escape special characters per the ICS spec */
const escapeICS = (value: string): string =>
  value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

/** Build the content of an .ics file for the event */
export const buildICS = (event: CalendarEvent): string => {
  const { start, end } = resolveDates(event);
  const uid = `${toUTCStamp(start)}-${Math.random().toString(36).slice(2)}@deep-dive-planner`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Deep Dive Planner//FR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toUTCStamp(new Date())}`,
    `DTSTART:${toUTCStamp(start)}`,
    `DTEND:${toUTCStamp(end)}`,
    `SUMMARY:${escapeICS(event.title)}`,
  ];
  if (event.description) lines.push(`DESCRIPTION:${escapeICS(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeICS(event.location)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
};

/** Trigger a download of the event as an .ics file */
export const downloadICS = (event: CalendarEvent, filename = "sortie.ics"): void => {
  const blob = new Blob([buildICS(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
