import { describe, it, expect } from "vitest";
import { applyWeightJourneyTick, shouldEnterWeightJourney } from "@/engine/training/WeightJourney";
import { mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";

function makeWorld(heyaFunds = 100000): WorldState {
  return {
    seed: "test-weight-journey",
    year: 2025,
    week: 1,
    dayIndexGlobal: 1,
    cyclePhase: "interim",
    heyas: new Map(),
    rikishi: new Map(),
    oyakata: new Map(),
    activeRikishiIds: new Set(),
  } as any;
}

function makeHeya(funds = 100000): Heya {
  return {
    id: "heya-1",
    name: "Test Heya",
    funds,
  } as any;
}

describe("Weight Journey System (B3)", () => {
  it("shouldEnterWeightJourney returns true when current weight is significantly below target", () => {
    const r = mockRikishi("wj-1", {
      stats: { weight: 100 } as any,
      potential: { weightKg: 130 } as any,
    } as any);
    expect(shouldEnterWeightJourney(r)).toBe(true);
  });

  it("shouldEnterWeightJourney returns false when weight is close to target", () => {
    const r = mockRikishi("wj-2", {
      stats: { weight: 125 } as any,
      potential: { weightKg: 130 } as any,
    } as any);
    expect(shouldEnterWeightJourney(r)).toBe(false);
  });

  it("shouldEnterWeightJourney returns false when no potential set", () => {
    const r = mockRikishi("wj-3", {
      stats: { weight: 100 } as any,
    } as any);
    expect(shouldEnterWeightJourney(r)).toBe(false);
  });

  it("applyWeightJourneyTick increases progressKg when nutrition adequate", () => {
    const r = mockRikishi("wj-4", {
      stats: { weight: 100, power: 50, balance: 50 } as any,
      potential: { weightKg: 130 } as any,
      weightJourney: { targetKg: 130, progressKg: 0, stalled: false, phases: ["bulking"] },
      injured: false,
    } as any);
    const heya = makeHeya(100000);
    const world = makeWorld();

    const impact = applyWeightJourneyTick(r, heya, world);
    const updates = impact.entities?.rikishiUpdates?.get("wj-4");
    expect(updates).toBeDefined();
    expect(updates!.weightJourney!.progressKg).toBeGreaterThan(0);
  });

  it("applyWeightJourneyTick stalls when heya funds below threshold", () => {
    const r = mockRikishi("wj-5", {
      stats: { weight: 100, power: 50, balance: 50 } as any,
      potential: { weightKg: 130 } as any,
      weightJourney: { targetKg: 130, progressKg: 5, stalled: false, phases: ["bulking"] },
      injured: false,
    } as any);
    const heya = makeHeya(100); // Very low funds
    const world = makeWorld();

    const impact = applyWeightJourneyTick(r, heya, world);
    const updates = impact.entities?.rikishiUpdates?.get("wj-5");
    expect(updates).toBeDefined();
    expect(updates!.weightJourney!.stalled).toBe(true);
    expect(updates!.weightJourney!.progressKg).toBe(5); // No increase
  });

  it("applyWeightJourneyTick stalls when injured", () => {
    const r = mockRikishi("wj-6", {
      stats: { weight: 100, power: 50, balance: 50 } as any,
      potential: { weightKg: 130 } as any,
      weightJourney: { targetKg: 130, progressKg: 5, stalled: false, phases: ["bulking"] },
      injured: true,
    } as any);
    const heya = makeHeya(100000);
    const world = makeWorld();

    const impact = applyWeightJourneyTick(r, heya, world);
    const updates = impact.entities?.rikishiUpdates?.get("wj-6");
    expect(updates).toBeDefined();
    expect(updates!.weightJourney!.stalled).toBe(true);
  });

  it("applyWeightJourneyTick triggers breakthrough at targetKg — +3 power, +2 balance, weight_milestone event", () => {
    const r = mockRikishi("wj-7", {
      stats: { weight: 100, power: 50, balance: 50 } as any,
      potential: { weightKg: 130 } as any,
      weightJourney: { targetKg: 9.5, progressKg: 9, stalled: false, phases: ["bulking"] },
      injured: false,
    } as any);
    const heya = makeHeya(100000);
    const world = makeWorld();

    const impact = applyWeightJourneyTick(r, heya, world);
    const updates = impact.entities?.rikishiUpdates?.get("wj-7");
    expect(updates).toBeDefined();
    expect(updates!.weightJourney!.progressKg).toBeGreaterThanOrEqual(9.5);
    expect(updates!.stats?.power).toBe(53); // +3
    expect(updates!.stats?.balance).toBe(52); // +2
    // Check for weight_milestone event
    const events = impact.events ?? [];
    const milestoneEvent = events.find((e: any) => e.data?.eventId === "weight_milestone");
    expect(milestoneEvent).toBeDefined();
  });

  it("applyWeightJourneyTick does nothing for rikishi without weightJourney and not eligible", () => {
    const r = mockRikishi("wj-8", {
      stats: { weight: 125 } as any,
      potential: { weightKg: 130 } as any,
    } as any);
    const heya = makeHeya(100000);
    const world = makeWorld();

    const impact = applyWeightJourneyTick(r, heya, world);
    const updates = impact.entities?.rikishiUpdates?.get("wj-8");
    expect(updates).toBeUndefined();
  });

  it("applyWeightJourneyTick auto-enters bulking when eligible but no journey started", () => {
    const r = mockRikishi("wj-9", {
      stats: { weight: 100, power: 50, balance: 50 } as any,
      potential: { weightKg: 130 } as any,
      injured: false,
    } as any);
    const heya = makeHeya(100000);
    const world = makeWorld();

    const impact = applyWeightJourneyTick(r, heya, world);
    const updates = impact.entities?.rikishiUpdates?.get("wj-9");
    expect(updates).toBeDefined();
    expect(updates!.weightJourney).toBeDefined();
    expect(updates!.weightJourney!.targetKg).toBe(130);
    expect(updates!.weightJourney!.phases).toContain("bulking");
  });
});
