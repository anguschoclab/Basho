/**
 * eventLogHelpers.test.ts
 * =======================
 * Contract tests for event deep-link routing and labels.
 * getEventRoute must return canonical nested routes (no legacy aliases).
 */

import { describe, it, expect } from "vitest";
import {
  getEventRoute,
  getLinkLabel,
  getCategoryMeta,
} from "@/components/layout/eventLogHelpers";
import type { EngineEvent } from "@/engine/types/events";

function makeEvent(overrides: Partial<EngineEvent> = {}): EngineEvent {
  return {
    id: "e1",
    type: "BASHO_STATUS",
    year: 2024,
    week: 10,
    phase: "active_basho",
    category: "misc",
    importance: "notable",
    scope: "world",
    title: "Test",
    summary: "Test summary",
    data: {},
    ...overrides,
  } as EngineEvent;
}

describe("getEventRoute", () => {
  it("routes match/bout events to /basho", () => {
    expect(getEventRoute(makeEvent({ category: "match" }))).toBe("/basho");
    expect(getEventRoute(makeEvent({ type: "BOUT_RESOLVED" }))).toBe("/basho");
  });

  it("routes basho recap events to /recap, other basho events to /basho", () => {
    expect(getEventRoute(makeEvent({ category: "basho", type: "BASHO_STATUS" }))).toBe("/basho");
    expect(
      getEventRoute(makeEvent({ category: "basho", type: "NARRATIVE_WRAP" as never }))
    ).toBe("/recap");
  });

  it("routes rikishi-scoped training/injury/career/promotion to the rikishi profile", () => {
    for (const category of ["training", "injury", "career", "promotion"] as const) {
      expect(getEventRoute(makeEvent({ category, rikishiId: "r1" }))).toBe("/rikishi/r1");
    }
  });

  it("routes scouting to the talent pool", () => {
    expect(getEventRoute(makeEvent({ category: "scouting" }))).toBe("/jsa/talent");
  });

  it("routes economy/sponsor to canonical /office/finances (not legacy /economy)", () => {
    expect(getEventRoute(makeEvent({ category: "economy" }))).toBe("/office/finances");
    expect(getEventRoute(makeEvent({ category: "sponsor" }))).toBe("/office/finances");
  });

  it("routes rivalry to canonical /basho/rivalries (not legacy /rivalries)", () => {
    expect(getEventRoute(makeEvent({ category: "rivalry" }))).toBe("/basho/rivalries");
  });

  it("routes discipline to canonical /jsa/governance (not legacy /governance)", () => {
    expect(getEventRoute(makeEvent({ category: "discipline" }))).toBe("/jsa/governance");
  });

  it("routes welfare/facility events to the heya profile when heyaId is present", () => {
    expect(getEventRoute(makeEvent({ category: "welfare", heyaId: "h9" }))).toBe("/stable/h9");
    expect(getEventRoute(makeEvent({ category: "facility", heyaId: "h9" }))).toBe("/stable/h9");
  });

  it("falls back to rikishi/heya scope, then null", () => {
    expect(getEventRoute(makeEvent({ rikishiId: "r7" }))).toBe("/rikishi/r7");
    expect(getEventRoute(makeEvent({ heyaId: "h7" }))).toBe("/stable/h7");
    expect(getEventRoute(makeEvent())).toBeNull();
  });
});

describe("getLinkLabel", () => {
  it("labels match events as bout links", () => {
    expect(getLinkLabel(makeEvent({ category: "match" }))).toBe("View bout →");
  });

  it("labels economy events as finance links", () => {
    expect(getLinkLabel(makeEvent({ category: "economy" }))).toBe("View finances →");
  });

  it("labels discipline events as governance links", () => {
    expect(getLinkLabel(makeEvent({ category: "discipline" }))).toBe("View governance →");
  });

  it("labels heya-scoped events as stable links", () => {
    expect(getLinkLabel(makeEvent({ heyaId: "h1" }))).toBe("View stable →");
  });

  it("labels generic events as details links", () => {
    expect(getLinkLabel(makeEvent())).toBe("View details →");
  });
});

describe("getCategoryMeta", () => {
  it("returns misc meta for unknown categories", () => {
    expect(getCategoryMeta("nonsense").label).toBe("Misc");
  });

  it("labels ai_rival_posture as Rival Posture (not spy-flavored Intel)", () => {
    expect(getCategoryMeta("ai_rival_posture").label).toBe("Rival Posture");
  });
});
