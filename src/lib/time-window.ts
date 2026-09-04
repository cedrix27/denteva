export type TimeWindow = { startMinutes: number; endMinutes: number };
export type OpeningHours = { weekdays: TimeWindow | null; saturday: TimeWindow | null; sunday: TimeWindow | null };
export type Slot = { startsAt: Date; endsAt: Date; label: string };

/**
 * Morocco leaves UTC+1 for UTC+0 during Ramadan, so the offset cannot be hardcoded.
 * Everything below derives it from the IANA zone for the exact instant considered.
 */
export function zoneParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone, hour12: false, weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), hour: Number(parts.hour) % 24, minute: Number(parts.minute), second: Number(parts.second), weekday: String(parts.weekday) };
}

function offsetMinutes(date: Date, timeZone: string) {
  const parts = zoneParts(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return (asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60_000;
}

/** Builds the UTC instant matching a wall-clock time in `timeZone`. */
export function zonedTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone: string) {
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  const firstGuess = new Date(naive - offsetMinutes(new Date(naive), timeZone) * 60_000);
  return new Date(naive - offsetMinutes(firstGuess, timeZone) * 60_000);
}

export function zonedDateKey(date: Date, timeZone: string) {
  const parts = zoneParts(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

/** Accepts "09:00 – 18:00", "09:00-18:00", "9h - 18h"; anything closed-looking yields null. */
function parseWindow(value: unknown): TimeWindow | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized || /ferm|closed|repos/.test(normalized)) return null;
  const match = normalized.match(/(\d{1,2})\s*[:h]\s*(\d{2})?\s*\D{1,3}\s*(\d{1,2})\s*[:h]\s*(\d{2})?/);
  if (!match) return null;
  const startMinutes = Number(match[1]) * 60 + Number(match[2] ?? 0);
  const endMinutes = Number(match[3]) * 60 + Number(match[4] ?? 0);
  if (startMinutes >= endMinutes || endMinutes > 24 * 60) return null;
  return { startMinutes, endMinutes };
}

export function parseOpeningHours(value: unknown): OpeningHours {
  const source = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return { weekdays: parseWindow(source.weekdays), saturday: parseWindow(source.saturday), sunday: parseWindow(source.sunday) };
}

export function windowForDay(weekday: string, hours: OpeningHours) {
  if (weekday === "Sat") return hours.saturday;
  if (weekday === "Sun") return hours.sunday;
  return hours.weekdays;
}

export const labelFormatter = (timeZone: string) => new Intl.DateTimeFormat("fr-FR", { timeZone, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/**
 * Free slots between `from` and `to`, honouring the cabinet's opening hours and
 * excluding anything overlapping a non-cancelled appointment.
 */
/** Re-validates a slot server-side; the model's proposal is never trusted. */
export function isWithinOpeningHours(startsAt: Date, durationMinutes: number, openingHours: unknown, timeZone: string) {
  const hours = parseOpeningHours(openingHours);
  const parts = zoneParts(startsAt, timeZone);
  const window = windowForDay(parts.weekday, hours);
  if (!window) return false;
  const minutes = parts.hour * 60 + parts.minute;
  return minutes >= window.startMinutes && minutes + durationMinutes <= window.endMinutes;
}

export function formatSlot(date: Date, timeZone: string) {
  return labelFormatter(timeZone).format(date);
}
