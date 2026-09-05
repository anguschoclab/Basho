/**
 * holidayDigestProjections.ts — projects holiday return digest for Dashboard.
 *
 * Reads HOLIDAY_RETURN events from the event log to surface a digest
 * of what happened while the player was on holiday.
 */
import type { WorldState } from "../../engine/types/world";

export interface HolidayDigestDTO {
  returnEventId: string;
  target: string;
  daysAdvanced: number;
  summary: string;
  incidents: Array<{
    type: string;
    description: string;
    heyaId?: string;
  }>;
}

export function selectHolidayDigest(world: WorldState): HolidayDigestDTO | null {
  const log = world.events?.log ?? [];

  // Find the most recent holiday return event
  for (let i = log.length - 1; i >= 0; i--) {
    const event = log[i];
    const data = event.data as unknown as Record<string, unknown>;
    if (data?.eventId === "holiday_return" || data?.status === "holiday_return") {
      const incidents = (data.incidents as Array<Record<string, unknown>>) ?? [];
      return {
        returnEventId: event.data?.eventId as string ?? "holiday_return",
        target: (data.target as string) ?? "—",
        daysAdvanced: (data.daysAdvanced as number) ?? 0,
        summary: (data.summary as string) ?? "Holiday completed.",
        incidents: incidents.map((inc) => ({
          type: (inc.type as string) ?? "info",
          description: (inc.description as string) ?? "",
          heyaId: inc.heyaId as string | undefined,
        })),
      };
    }
  }

  return null;
}
