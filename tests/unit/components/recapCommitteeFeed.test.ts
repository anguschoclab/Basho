/**
 * Recap committee feed — committee deliberation events (banzuke + sansho)
 * must survive the wrap-phase filter and surface in the recap's narrative
 * groups so the post-basho recap shows the committee's votes.
 */
import { describe, it, expect } from "vitest";
import type { EngineEvent } from "@/engine/types/events";
import {
  getBashoWrapEvents,
  groupEventsByNarrative,
  toNarrativeGroupedEvents,
} from "@/components/recap/recapEventGroups";

function makeEvent(overrides: Partial<EngineEvent> = {}): EngineEvent {
  return {
    id: "e1",
    type: "BASHO_STATUS",
    year: 2024,
    week: 10,
    phase: "weekly",
    category: "misc",
    importance: "notable",
    scope: "world",
    title: "Test",
    summary: "Test summary",
    data: {},
    ...overrides,
  } as EngineEvent;
}

describe("recap committee feed", () => {
  it("surfaces banzuke committee deliberations as committee items", () => {
    const ev = makeEvent({
      type: "BASHO_STATUS",
      category: "banzuke_committee",
      phase: "weekly",
      bashoNumber: 3,
      title: "Banzuke Committee",
      summary: "Banzuke committee (4–1): double-digit wins warrant extra rise.",
      data: {
        status: "committee_deliberation",
        votesFor: 4,
        votesAgainst: 1,
        adjustment: 1,
      },
    });

    const wrap = getBashoWrapEvents([ev], 3);
    expect(wrap).toHaveLength(1);

    const grouped = groupEventsByNarrative(wrap);
    expect(grouped.committee).toHaveLength(1);

    const narrative = toNarrativeGroupedEvents(grouped);
    expect(narrative.committee?.[0]?.summary).toContain("4–1");
    expect(narrative.committee?.[0]?.title).toBe("Banzuke Committee");
  });

  it("surfaces sansho committee selections alongside banzuke items", () => {
    const banzukeEv = makeEvent({
      id: "b1",
      type: "BASHO_STATUS",
      category: "banzuke_committee",
      bashoNumber: 3,
      data: { status: "committee_deliberation" },
    });
    const sanshoEv = makeEvent({
      id: "s1",
      type: "AWARD_CONFERRED",
      category: "economy",
      bashoNumber: 3,
      title: "Sansho Committee",
      summary: "Sansho committee (5–0) selects Hoshoryu for Shukun-sho.",
      data: { status: "sansho_committee" },
    });

    const wrap = getBashoWrapEvents([banzukeEv, sanshoEv], 3);
    const grouped = groupEventsByNarrative(wrap);
    expect(grouped.committee).toHaveLength(2);
  });

  it("does not leak unrelated economy events into the committee bucket", () => {
    const ev = makeEvent({
      type: "FINANCIAL_ALERT",
      category: "economy",
      bashoNumber: 3,
      data: { status: "monthly_report" },
    });
    const grouped = groupEventsByNarrative(getBashoWrapEvents([ev], 3));
    expect(grouped.committee).toHaveLength(0);
  });
});
