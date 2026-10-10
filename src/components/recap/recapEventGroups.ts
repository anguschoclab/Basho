/**
 * recapEventGroups.ts
 *
 * Event-grouping helpers for RecapPage — wrap-phase filtering,
 * narrative grouping, prestige changes, and the shape transform
 * NarrativeSummary expects.
 */

import type { WorldState } from "@/presenters/uiDigest";
import type { EngineEvent } from "@/engine/types/events";
import { getHeya } from "@/presenters/worldAccess";

/** Events belonging to the basho wrap-up phase (optionally one basho). */
export function getBashoWrapEvents(events: EngineEvent[], bashoNumber?: number): EngineEvent[] {
  return events
    .filter(
      (e) =>
        (e.phase === "basho_wrap" ||
          e.category === "basho" ||
          e.category === "career" ||
          e.category === "promotion") &&
        (bashoNumber === undefined || e.bashoNumber === bashoNumber)
    )
    .slice(-50);
}

/** Group wrap-phase events into narrative buckets. */
export function groupEventsByNarrative(events: EngineEvent[]) {
  const groups = {
    yusho: [] as EngineEvent[],
    promotions: [] as EngineEvent[],
    retirements: [] as EngineEvent[],
    injuries: [] as EngineEvent[],
    governance: [] as EngineEvent[],
    ydcAccountability: [] as EngineEvent[],
    pressConference: [] as EngineEvent[],
    sponsors: [] as EngineEvent[],
    other: [] as EngineEvent[],
  };
  for (const e of events) {
    if (e.type.includes("YUSHO") || e.type.includes("CHAMPIONSHIP")) groups.yusho.push(e);
    else if (
      e.category === "promotion" ||
      e.type.includes("PROMOTION") ||
      e.type.includes("DEMOTION")
    )
      groups.promotions.push(e);
    else if (e.type.includes("RETIRE") || e.category === "career") groups.retirements.push(e);
    else if (e.category === "injury") groups.injuries.push(e);
    else if (
      e.type.includes("GOVERNANCE") &&
      e.data?.status &&
      typeof e.data.status === "string" &&
      [
        "praise",
        "warning",
        "demand_reflection",
        "encouragement",
        "absence_criticism",
        "private_cynicism",
      ].includes(e.data.status as string)
    )
      groups.ydcAccountability.push(e);
    else if (e.category === "discipline" || e.type.includes("GOVERNANCE"))
      groups.governance.push(e);
    else if (e.data?.incident === "Post-Basho Press Conference") groups.pressConference.push(e);
    else if (e.category === "sponsor") groups.sponsors.push(e);
    else groups.other.push(e);
  }
  return groups;
}

/** Recent prestige/stature changes resolved to their heya. */
export function getPrestigeChanges(
  world: WorldState
): Array<{ heya: { name: string; prestigeBand: string; reputation: number }; change: string }> {
  const changes: Array<{
    heya: { name: string; prestigeBand: string; reputation: number };
    change: string;
  }> = [];
  if (!world) return changes;
  const prestige_events = (world.events?.log || [])
    .filter(
      (e: EngineEvent) =>
        e.type.includes("PRESTIGE") || e.type.includes("STATURE") || e.category === "milestone"
    )
    .slice(-20);
  for (const e of prestige_events) {
    if (e.heyaId) {
      const heya = getHeya(world, e.heyaId);
      if (heya) changes.push({ heya, change: e.summary });
    }
  }
  return changes;
}

/** Transform EngineEvent groups into the shape expected by NarrativeSummary. */
export function toNarrativeGroupedEvents(groupedEvents: ReturnType<typeof groupEventsByNarrative>) {
  return {
    promotions: groupedEvents.promotions.map((e) => ({
      title: e.title,
      summary: e.summary,
      type: e.type as string,
    })),
    retirements: groupedEvents.retirements.map((e) => ({
      title: e.title,
      summary: e.summary,
    })),
    governance: groupedEvents.governance.map((e) => ({
      title: e.title,
      summary: e.summary,
    })),
    ydcAccountability: groupedEvents.ydcAccountability.map((e) => ({
      title: e.title,
      summary: e.summary,
      status: (e.data?.status as string) ?? "unknown",
      chairmanName: e.data?.chairmanName as string | undefined,
      references: e.data?.references as string[] | undefined,
      publicStatement: e.data?.publicStatement as string | undefined,
      privateSentiment: e.data?.privateSentiment as string | undefined,
    })),
    pressConference: groupedEvents.pressConference.map((e) => ({
      title: e.title,
      summary: e.summary,
      narrative: e.data?.narrative as { text: string; id: string }[] | undefined,
    })),
  };
}
