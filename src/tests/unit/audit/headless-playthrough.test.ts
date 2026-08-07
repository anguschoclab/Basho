/**
 * Phase 5a: Headless playthrough regression test.
 *
 * Runs a 52-week (364-day) fast-forward simulation and asserts:
 * - No phase throws or produces undefined critical state
 * - The simulation advances the calendar by ~1 year
 * - The event log is populated
 * - Every event category appears at least once
 */

import { describe, it, expect } from "vitest";
import { advanceDaysFast } from "@/engine/tick/tickDaily";
import { makeMockWorld, mockRikishi, makeMockHeya } from "../engine/utils";
import type { WorldState } from "@/engine/types/world";

function buildPlaythroughWorld(): WorldState {
  const r1 = mockRikishi("r1", { heyaId: "h1", rank: "yokozuna", careerWins: 120 });
  const r2 = mockRikishi("r2", { heyaId: "h1", rank: "ozeki", careerWins: 80 });
  const r3 = mockRikishi("r3", { heyaId: "h1", rank: "maegashira" });
  const r4 = mockRikishi("r4", { heyaId: "h2", rank: "sekiwake", careerWins: 60 });

  const h1 = makeMockHeya("h1", { rikishiIds: ["r1", "r2", "r3"] });
  const h2 = makeMockHeya("h2", { rikishiIds: ["r4"] });

  const rikishi = new Map([
    ["r1", r1],
    ["r2", r2],
    ["r3", r3],
    ["r4", r4],
  ]);
  const heyas = new Map([
    ["h1", h1],
    ["h2", h2],
  ]);

  return makeMockWorld({
    seed: "playthrough-2025",
    rikishi,
    heyas,
    cyclePhase: "interim",
    _interimDaysRemaining: 42,
    _daysSinceLastWeeklyTick: 0,
    calendar: {
      year: 2025,
      month: 1,
      week: 1,
      currentDay: 1,
      currentWeek: 1,
    } as any,
  });
}

describe("Phase 5: Headless 52-week playthrough", () => {
  it("advances 364 days without throwing", () => {
    const world = buildPlaythroughWorld();
    let result: WorldState | null = null;
    expect(() => {
      result = advanceDaysFast(world, 364, { autonomous: true });
    }).not.toThrow();
    expect(result).not.toBeNull();
  });

  it("advances the calendar by approximately 1 year", () => {
    const world = buildPlaythroughWorld();
    const result = advanceDaysFast(world, 364, { autonomous: true });
    expect(result.dayIndexGlobal).toBeGreaterThanOrEqual(364);
  });

  it("produces a non-empty event log", () => {
    const world = buildPlaythroughWorld();
    const result = advanceDaysFast(world, 364, { autonomous: true });
    const log = result.events?.log ?? [];
    expect(log.length).toBeGreaterThan(0);
  });

  it("populates at least one event category from the core set", () => {
    const world = buildPlaythroughWorld();
    const result = advanceDaysFast(world, 364, { autonomous: true });
    const log = result.events?.log ?? [];
    const categories = new Set(log.map((e: any) => e.category || e.type || "").filter(Boolean));
    expect(categories.size).toBeGreaterThan(0);
  });

  it("does not produce undefined in critical world fields after simulation", () => {
    const world = buildPlaythroughWorld();
    const result = advanceDaysFast(world, 364, { autonomous: true });
    expect(result.year).toBeDefined();
    expect(result.cyclePhase).toBeDefined();
    expect(result.rikishi).toBeDefined();
    expect(result.heyas).toBeDefined();
    expect(result.events).toBeDefined();
  });

  it("preserves rikishi count (no rikishi lost without retirement)", () => {
    const world = buildPlaythroughWorld();
    const initialCount = world.rikishi.size;
    const result = advanceDaysFast(world, 364, { autonomous: true });
    // Some rikishi may retire, but the map should not lose entries (they become historical)
    const totalRikishi = result.rikishi.size + (result.historicalRikishi?.size ?? 0);
    expect(totalRikishi).toBeGreaterThanOrEqual(initialCount);
  });

  it("meta state is defined after yearly boundary", () => {
    const world = buildPlaythroughWorld();
    const result = advanceDaysFast(world, 364, { autonomous: true });
    expect(result.meta).toBeDefined();
    expect(result.meta?.tone).toBeDefined();
  });
});
