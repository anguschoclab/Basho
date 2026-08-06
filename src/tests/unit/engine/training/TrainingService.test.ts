import { describe, it, expect, beforeEach } from "vitest";
import { applyWeeklyTraining, ensureHeyaTrainingState } from "@/engine/systems/training/TrainingService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { WorldState, ActiveModifiers } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";

describe("TrainingService.applyWeeklyTraining", () => {
  let world: WorldState;

   
  function makeHeya(id: string, isPlayer: boolean): any {
    return {
      id,
      name: `${id} name`,
      oyakataId: `oy-${id}`,
      rikishiIds: [],
      bankBalance: 1000,
      funds: 1000,
      reputation: 50,
      prestige: 50,
      scandalScore: 0,
      statureBand: "mid",
      prestigeBand: "mid",
      facilitiesBand: "mid",
      koenkaiBand: "mid",
      runwayBand: "mid",
      facilities: { training: 50, recovery: 50, nutrition: 50 },
      isPlayerOwned: isPlayer,
    };
  }

  function makeRikishi(id: string, heyaId: string): Rikishi {
    return MockFactory.createRikishi(id, {
      heyaId,
      birthYear: 2000,
      stats: {
        strength: 50,
        speed: 50,
        technique: 50,
        weight: 140,
        stamina: 50,
        mental: 50,
        adaptability: 50,
        balance: 50,
        experience: 10,
        power: 50,
        aggression: 50,
         
      } as any,
    });
  }

  function makeActiveModifiers(overrides: Partial<ActiveModifiers> = {}): ActiveModifiers {
    return {
      facilityGrowthMult: 1.025,
      nutritionMult: 1.0,
      degeikoMult: 1.0,
      styleDriftMults: {
        power: 1.0,
        speed: 1.0,
        technique: 1.0,
        balance: 1.0,
        stamina: 1.0,
        mental: 1.0,
      },
      recoveryMultiplier: 1.0,
      financialPenalty: false,
      moraleBoost: false,
      ...overrides,
    };
  }

  function buildWorld(am?: ActiveModifiers): WorldState {
    const pr = makeRikishi("r-player", "heya-player");
    const nr = makeRikishi("r-npc", "heya-npc");

    const rikishiMap = new Map<string, Rikishi>();
    rikishiMap.set("r-player", pr);
    rikishiMap.set("r-npc", nr);

     
    const heyasMap = new Map<string, any>();
    heyasMap.set("heya-player", makeHeya("heya-player", true));
    heyasMap.set("heya-npc", makeHeya("heya-npc", false));

    const w = MockFactory.createWorld({
      playerHeyaId: "heya-player",
      rikishi: rikishiMap,
      heyas: heyasMap,
      activeRikishiIds: new Set(["r-player", "r-npc"]),
      year: 2026,
      week: 1,
    });

    if (am) {
      w.transientContext = { activeModifiers: am };
    }

    ensureHeyaTrainingState(w, "heya-player");
    ensureHeyaTrainingState(w, "heya-npc");
    return w;
  }

  beforeEach(() => {
    world = buildWorld(makeActiveModifiers());
  });

  it("uses calculateGains for player heya rikishi when activeModifiers are present", () => {
    const impact = applyWeeklyTraining(world);
    const updated = resolveImpacts(world, [impact]);

    const updatedPlayer = updated.rikishi.get("r-player")!;
    expect(updatedPlayer).toBeDefined();
    const newPower = updatedPlayer.stats?.power ?? 50;
    expect(newPower).not.toBe(50);
  });

  it("falls back to calculateGrowthVector for NPC heya rikishi", () => {
    const impact = applyWeeklyTraining(world);
    const updated = resolveImpacts(world, [impact]);

    const updatedNpc = updated.rikishi.get("r-npc")!;
    expect(updatedNpc).toBeDefined();
    const newPower = updatedNpc.stats?.power ?? 50;
    expect(newPower).not.toBe(50);
  });

  it("applies morale boost from activeModifiers to player heya rikishi", () => {
    const wNeutral = buildWorld(makeActiveModifiers({ moraleBoost: false }));
    const impactNeutral = applyWeeklyTraining(wNeutral);
    const updatedNeutral = resolveImpacts(wNeutral, [impactNeutral]);
    const neutralPower = updatedNeutral.rikishi.get("r-player")!.stats?.power ?? 50;

    const wBoost = buildWorld(makeActiveModifiers({ moraleBoost: true }));
    const impactBoost = applyWeeklyTraining(wBoost);
    const updatedBoost = resolveImpacts(wBoost, [impactBoost]);
    const boostPower = updatedBoost.rikishi.get("r-player")!.stats?.power ?? 50;

    expect(boostPower).toBeGreaterThan(neutralPower);
  });

  it("applies financial penalty from activeModifiers to player heya rikishi", () => {
    const wNeutral = buildWorld(makeActiveModifiers({ financialPenalty: false }));
    const impactNeutral = applyWeeklyTraining(wNeutral);
    const updatedNeutral = resolveImpacts(wNeutral, [impactNeutral]);
    const neutralPower = updatedNeutral.rikishi.get("r-player")!.stats?.power ?? 50;

    const wPenalty = buildWorld(makeActiveModifiers({ financialPenalty: true }));
    const impactPenalty = applyWeeklyTraining(wPenalty);
    const updatedPenalty = resolveImpacts(wPenalty, [impactPenalty]);
    const penaltyPower = updatedPenalty.rikishi.get("r-player")!.stats?.power ?? 50;

    expect(penaltyPower).toBeLessThan(neutralPower);
  });

  it("falls back to calculateGrowthVector when activeModifiers is not set", () => {
    const w = buildWorld(undefined);
    const impact = applyWeeklyTraining(w);
    const updated = resolveImpacts(w, [impact]);

    const updatedPlayer = updated.rikishi.get("r-player")!;
    const newPower = updatedPlayer.stats?.power ?? 50;
    expect(newPower).not.toBe(50);
  });
});
