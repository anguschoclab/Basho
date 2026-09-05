/**
 * bashoProjections.nakabi.test.ts — tests projection exposes nakabi state on day 8.
 * Plan Feature 4 Test-First Protocol item 1.
 */
import { describe, it, expect } from "vitest";
import { projectBashoUIDigest } from "@/presenters/projections/bashoProjections";
import { isNakabiDay } from "@/engine/systems/basho/NakabiService";
import type { WorldState } from "@/engine/types/world";

function makeWorld(day: number): WorldState {
  return {
    seed: "nakabi-test",
    year: 2026,
    month: 1,
    week: 1,
    playerHeyaId: "h1",
    heyas: new Map([["h1", { id: "h1", name: "Test" }]]),
    rikishi: new Map(),
    activeRikishiIds: [],
    currentBasho: {
      bashoId: "2026-01",
      year: 2026,
      month: 1,
      day,
      phase: "active_basho",
      division: "makuuchi",
      bouts: [],
    },
    events: { log: [] },
  } as any;
}

describe("bashoProjections nakabi", () => {
  it("isNakabiDay returns true for day 8", () => {
    expect(isNakabiDay(8)).toBe(true);
  });

  it("isNakabiDay returns false for non-day-8", () => {
    expect(isNakabiDay(1)).toBe(false);
    expect(isNakabiDay(7)).toBe(false);
    expect(isNakabiDay(9)).toBe(false);
    expect(isNakabiDay(15)).toBe(false);
  });

  it("projectBashoUIDigest exposes isNakabiDay flag", () => {
    const world = makeWorld(8);
    const digest = projectBashoUIDigest(world);
    expect(digest).not.toBeNull();
    expect(digest?.isNakabiDay).toBe(true);
  });

  it("projectBashoUIDigest exposes isNakabiDay=false on non-nakabi days", () => {
    const world = makeWorld(5);
    const digest = projectBashoUIDigest(world);
    expect(digest).not.toBeNull();
    expect(digest?.isNakabiDay).toBe(false);
  });
});
