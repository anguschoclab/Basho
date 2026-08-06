 
import { describe, it, expect } from "vitest";
import { applyOyakataIntervention } from "@/engine/actions/OyakataIntervention";
import { makeMockWorld, mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { INTERVENTION_MOTIVATION_BOOST } from "@/constants/engine/generation";

describe("Oyakata Intervention (B2)", () => {
  function makeWorldWithRikishi(overrides: Partial<any> = {}): WorldState {
    const r = mockRikishi("intervene-1", {
      shikona: "Slumping",
      heyaId: "heya-1",
      motivation: 50,
      isKyujo: false,
      injured: false,
      isRetired: false,
      currentLossStreak: 3,
      currentBashoWins: 2,
      currentBashoLosses: 5,
      interventionUsedThisBasho: false,
      frozeUp: false,
      ...overrides,
    } as any);

    return makeMockWorld({
      rikishi: new Map([["intervene-1", r]]) as any,
      cyclePhase: "active_basho",
      currentBasho: {
        year: 2025, bashoNumber: 1, bashoName: "hatsu", day: 7,
        matches: [], standings: {} as any, isActive: true,
      } as any,
      activeRikishiIds: ["intervene-1"],
    } as any) as WorldState;
  }

  it("INTERVENTION_MOTIVATION_BOOST constant is 5", () => {
    expect(INTERVENTION_MOTIVATION_BOOST).toBe(5);
  });

  it("succeeds when rikishi has 2+ consecutive losses and day is 5-13", () => {
    const world = makeWorldWithRikishi({ currentLossStreak: 3 });
    const result = applyOyakataIntervention(world, "intervene-1");
    expect(result.success).toBe(true);
  });

  it("sets interventionUsedThisBasho to true on success", () => {
    const world = makeWorldWithRikishi({ currentLossStreak: 2 });
    const result = applyOyakataIntervention(world, "intervene-1");
    expect(result.success).toBe(true);
    const resolved = resolveImpacts(world, [result.impact]);
    const r = resolved.rikishi.get("intervene-1")!;
    expect(r.interventionUsedThisBasho).toBe(true);
  });

  it("clears frozeUp flag on success", () => {
    const world = makeWorldWithRikishi({ currentLossStreak: 3, frozeUp: true });
    const result = applyOyakataIntervention(world, "intervene-1");
    expect(result.success).toBe(true);
    const resolved = resolveImpacts(world, [result.impact]);
    const r = resolved.rikishi.get("intervene-1")!;
    expect(r.frozeUp).toBe(false);
  });

  it("applies +5 motivation boost on success", () => {
    const world = makeWorldWithRikishi({ currentLossStreak: 3, motivation: 40 });
    const result = applyOyakataIntervention(world, "intervene-1");
    expect(result.success).toBe(true);
    const resolved = resolveImpacts(world, [result.impact]);
    const r = resolved.rikishi.get("intervene-1")!;
    expect(r.motivation).toBe(45);
  });

  it("fails if already used this basho", () => {
    const world = makeWorldWithRikishi({ currentLossStreak: 3, interventionUsedThisBasho: true });
    const result = applyOyakataIntervention(world, "intervene-1");
    expect(result.success).toBe(false);
    expect(result.reason).toContain("already");
  });

  it("fails with less than 2 consecutive losses", () => {
    const world = makeWorldWithRikishi({ currentLossStreak: 1 });
    const result = applyOyakataIntervention(world, "intervene-1");
    expect(result.success).toBe(false);
    expect(result.reason).toContain("loss");
  });

  it("fails outside day 5-13 range (day 4)", () => {
    const r = mockRikishi("intervene-1", {
      shikona: "Slumping", heyaId: "heya-1", motivation: 50,
      isKyujo: false, injured: false, isRetired: false,
      currentLossStreak: 3, currentBashoWins: 0, currentBashoLosses: 4,
      interventionUsedThisBasho: false, frozeUp: false,
    } as any);
    const world = makeMockWorld({
      rikishi: new Map([["intervene-1", r]]) as any,
      cyclePhase: "active_basho",
      currentBasho: { year: 2025, bashoNumber: 1, bashoName: "hatsu", day: 4, matches: [], standings: {} as any, isActive: true } as any,
      activeRikishiIds: ["intervene-1"],
    } as any) as WorldState;
    const result = applyOyakataIntervention(world, "intervene-1");
    expect(result.success).toBe(false);
    expect(result.reason).toContain("day");
  });

  it("fails outside day 5-13 range (day 14)", () => {
    const r = mockRikishi("intervene-1", {
      shikona: "Slumping", heyaId: "heya-1", motivation: 50,
      isKyujo: false, injured: false, isRetired: false,
      currentLossStreak: 3, currentBashoWins: 0, currentBashoLosses: 14,
      interventionUsedThisBasho: false, frozeUp: false,
    } as any);
    const world = makeMockWorld({
      rikishi: new Map([["intervene-1", r]]) as any,
      cyclePhase: "active_basho",
      currentBasho: { year: 2025, bashoNumber: 1, bashoName: "hatsu", day: 14, matches: [], standings: {} as any, isActive: true } as any,
      activeRikishiIds: ["intervene-1"],
    } as any) as WorldState;
    const result = applyOyakataIntervention(world, "intervene-1");
    expect(result.success).toBe(false);
    expect(result.reason).toContain("day");
  });

  it("fails for non-existent rikishi", () => {
    const world = makeWorldWithRikishi();
    const result = applyOyakataIntervention(world, "nonexistent");
    expect(result.success).toBe(false);
    expect(result.reason).toContain("not found");
  });

  it("fails outside active_basho phase", () => {
    const world = makeWorldWithRikishi();
    const offSeason = { ...world, cyclePhase: "interim" as const };
    const result = applyOyakataIntervention(offSeason, "intervene-1");
    expect(result.success).toBe(false);
    expect(result.reason).toContain("basho");
  });

  it("logs GOVERNANCE_RULING event on success", () => {
    const world = makeWorldWithRikishi({ currentLossStreak: 3 });
    const result = applyOyakataIntervention(world, "intervene-1");
    expect(result.success).toBe(true);
    const hasEvent = (result.impact.events ?? []).some(
      (e: any) => e.type === "GOVERNANCE_RULING" && (e.data as any)?.incident === "oyakata_intervention"
    );
    expect(hasEvent).toBe(true);
  });
});
