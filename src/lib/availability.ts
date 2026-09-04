import { AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { labelFormatter, parseOpeningHours, windowForDay, zoneParts, zonedTimeToUtc, type Slot } from "@/lib/time-window";

export { formatSlot, isWithinOpeningHours, parseOpeningHours, zonedDateKey, zonedTimeToUtc } from "@/lib/time-window";
export type { OpeningHours, Slot, TimeWindow } from "@/lib/time-window";

export async function findAvailableSlots(input: { cabinetId: string; openingHours: unknown; timeZone: string; durationMinutes: number; from: Date; to: Date; limit?: number }) {
  const hours = parseOpeningHours(input.openingHours);
  const limit = input.limit ?? 8;
  const booked = await prisma.appointment.findMany({
    where: { cabinetId: input.cabinetId, status: { not: AppointmentStatus.CANCELLED }, startsAt: { lt: input.to }, endsAt: { gt: input.from } },
    select: { startsAt: true, endsAt: true },
  });
  const formatter = labelFormatter(input.timeZone);
  const earliest = new Date(Date.now() + 60 * 60_000);
  const slots: Slot[] = [];

  // Iterate on calendar days, not on 24h steps: Morocco shifts by an hour around
  // Ramadan, and adding 86_400_000 ms would then skip or repeat a local day.
  const first = zoneParts(input.from, input.timeZone);
  const days = Math.ceil((input.to.getTime() - input.from.getTime()) / 86_400_000) + 1;
  for (let dayOffset = 0; dayOffset < days && slots.length < limit; dayOffset += 1) {
    const anchor = new Date(Date.UTC(first.year, first.month - 1, first.day + dayOffset, 12));
    const parts = zoneParts(anchor, input.timeZone);
    const window = windowForDay(parts.weekday, hours);
    if (!window) continue;
    for (let minutes = window.startMinutes; minutes + input.durationMinutes <= window.endMinutes && slots.length < limit; minutes += input.durationMinutes) {
      const startsAt = zonedTimeToUtc(parts.year, parts.month, parts.day, Math.floor(minutes / 60), minutes % 60, input.timeZone);
      const endsAt = new Date(startsAt.getTime() + input.durationMinutes * 60_000);
      if (startsAt < earliest || startsAt < input.from || endsAt > input.to) continue;
      if (booked.some((item) => startsAt < item.endsAt && endsAt > item.startsAt)) continue;
      slots.push({ startsAt, endsAt, label: formatter.format(startsAt) });
    }
  }
  return slots;
}
