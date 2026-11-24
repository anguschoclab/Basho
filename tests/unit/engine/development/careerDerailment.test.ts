import { describe, it, expect } from "vitest";
import { getEffectiveCeiling } from "@/engine/training/TrainingMath";
import { rollPotential } from "@/engine/generation/CandidateStats";
import { onBoutResolvedInjury } from "@/engine/health/InjuryService";
import { applyPhysicalMaturationTick } from "@/engine/training/WeightJourney";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { mockRikishi } from "@tests/unit/engine/utils";
import { rngForWorld } from "@/engine/core/rng";
import type { WorldState } from "@/engine/types/world";
import type { BoutResult } from "@/engine/types/bout";

/**
 * Busts and derailment — real sumo has both failure modes:
 *  - generated busts: elite-PA recruits who never develop (~12% of elite
 *    talent, FM's wonderkid-flop rate) — a low-PA recruit can't "bust",
 *    he was never supposed to make it
 *  - injury derailment: serious injuries permanently shave the reachable
 *    ceiling and compound on recurrence (the never-recovered-knee career)
 * Scouted PA is untouched — you only learn a kid busted in retrospect.
 */

const basePotential = {
  stats: { power: 90, technique: 90, speed: 90, stamina: 90, mental: 90, adaptability: 90, balance: 90, aggression: 90 } as any,
  heightCm: 190,
  weightKg: 170,
  developmentSpeed: 1.0,
  peakAgeOffset: 0,
  ceilingFraction: 1.0,
  profile: "standard" as const,
};

describe("reachable ceiling — generated busts", () => {
  it("bustFraction truncates the effective stat ceiling", () => {
    const bust = mockRikishi("b", {
      talentSeed: 90,
      stats: { power: 50 } as any,
      potential: { ...basePotential, bustFraction: 0.5 },
    });
    const clean = mockRikishi("c", {
      talentSeed: 90,
      stats: { power: 50 } as any,
      potential: { ...basePotential },
    });
    const bustCeil = getEffectiveCeiling(bust, "power");
    const cleanCeil = getEffectiveCeiling(clean, "power");
    expect(bustCeil).toBeLessThan(cleanCeil);
    expect(bustCeil).toBeLessThanOrEqual(Math.round(90 * 0.5) + 1);
  });

  it("busts only roll on elite-PA packages — ordinary recruits just have ordinary ceilings", () => {
    let eliteBusts = 0;
    let weakBusts = 0;
    const world = MockFactory.createWorld({ seed: "bust-roll" });
    const profile = { statModifiers: {} } as any;
    for (let i = 0; i < 400; i++) {
      const rng = rngForWorld(world, "gen", `bust-${i}`);
      const elite = rollPotential({
        rng,
        rank: "yokozuna",
        profile,
        developmentProfile: "standard",
        nationality: "Japan",
      });
      if ((elite as any).bustFraction != null && (elite as any).bustFraction < 1) eliteBusts++;
      const weak = rollPotential({
        rng,
        rank: "jonokuchi",
        profile,
        developmentProfile: "journeyman",
        nationality: "Japan",
      });
      if ((weak as any).bustFraction != null && (weak as any).bustFraction < 1) weakBusts++;
    }
    expect(eliteBusts).toBeGreaterThan(20); // ~12% of 400 elite rolls
    expect(weakBusts).toBe(0);
  });
});

describe("reachable ceiling — injury derailment", () => {
  const boutResult = (severity: string, victimId: string): BoutResult =>
    ({
      boutId: "b1",
      inBoutInjury: { rikishiId: victimId, area: "knee", severity, triggerEvent: "edge_crisis" },
    }) as any;
  const match = { id: "m1" } as any;

  it("a serious in-bout injury permanently shaves the reachable ceiling", () => {
    const victim = MockFactory.createRikishi("r-west", {
      potential: { ...basePotential },
    });
    const east = MockFactory.createRikishi("r-east");
    const world = MockFactory.createWorld({
      rikishi: new Map([
        [east.id, east],
        [victim.id, victim],
      ]),
    });
    const impact = onBoutResolvedInjury(world, {
      match,
      result: boutResult("serious", victim.id),
      east,
      west: victim,
    });
    const upd = impact.entities?.rikishiUpdates?.get(victim.id);
    const derail = (upd?.potential as any)?.injuryDerailment;
    expect(derail).toBeDefined();
    expect(derail).toBeLessThan(1);
    expect(derail).toBeGreaterThan(0.6);
  });

  it("a moderate injury does not derail", () => {
    const victim = MockFactory.createRikishi("r-west", { potential: { ...basePotential } });
    const east = MockFactory.createRikishi("r-east");
    const world = MockFactory.createWorld({
      rikishi: new Map([
        [east.id, east],
        [victim.id, victim],
      ]),
    });
    const impact = onBoutResolvedInjury(world, {
      match,
      result: boutResult("moderate", victim.id),
      east,
      west: victim,
    });
    const upd = impact.entities?.rikishiUpdates?.get(victim.id);
    expect((upd?.potential as any)?.injuryDerailment).toBeUndefined();
  });

  it("recurring serious injuries compound the derailment", () => {
    const victim = MockFactory.createRikishi("r-west", {
      potential: { ...basePotential, injuryDerailment: 0.9 },
    });
    const east = MockFactory.createRikishi("r-east");
    const world = MockFactory.createWorld({
      rikishi: new Map([
        [east.id, east],
        [victim.id, victim],
      ]),
    });
    const impact = onBoutResolvedInjury(world, {
      match,
      result: boutResult("serious", victim.id),
      east,
      west: victim,
    });
    const derail = (impact.entities?.rikishiUpdates?.get(victim.id)?.potential as any)?.injuryDerailment;
    expect(derail).toBeLessThan(0.9);
  });
});

describe("derailment on the body — natural weight fill", () => {
  it("a derailed teen fills toward the truncated target, not full potential", () => {
    const W: WorldState = MockFactory.createWorld({ seed: "maturation", year: 2025 });
    const HEYA = MockFactory.createHeya("heya-1", { funds: 100000 });
    const r = mockRikishi("teen-1", {
      birthYear: 2025 - 16,
      stats: { height: 170, weight: 95, power: 40 } as any,
      potential: { ...basePotential, weightKg: 150, injuryDerailment: 0.6 },
      injured: false,
    } as any);
    const impact = applyPhysicalMaturationTick(r, HEYA, W);
    const w = impact.entities?.rikishiUpdates?.get("teen-1")?.stats?.weight ?? 95;
    // truncated target = 150 × ~0.68 maturity × 0.6 derail ≈ 61 < current 95
    // → no natural fill for a busted body
    expect(w).toBe(95);
  });
});
