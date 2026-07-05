import { describe, it, expect } from "vitest";
import { spawnPersonnelWorker } from "@/engine/npcAIWorkers";
import { SeededRNG } from "@/engine/rng";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { RikishiPerception } from "@/engine/perception";
import type { Id } from "@/engine/types/common";

function makeRikishi(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
  return {
    id,
    shikona: `Rikishi-${id}`,
    heyaId: "h1",
    injured: false,
    isKyujo: false,
    injuryWeeksRemaining: 0,
    injuryStatus: undefined,
    style: "yotsu",
    rank: "maegashira",
    division: "makuuchi",
    side: "east",
    stats: {
      power: 50,
      speed: 50,
      technique: 50,
      balance: 50,
      weight: 140,
      stamina: 50,
      mental: 50,
      adaptability: 50,
      experience: 50,
      aggression: 50,
      achievements: {
        kinboshiEarned: 0,
        ginboshiEarned: 0,
        kinboshiConceded: 0,
        ginboshiConceded: 0,
        specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
      },
    },
    ...overrides,
  } as Rikishi;
}

function makePerception(rikishiId: Id): RikishiPerception {
  return {
    rikishiId,
    shikona: `Rikishi-${rikishiId}`,
    rank: "maegashira",
    style: "yotsu",
    healthBand: "good",
    mediaHeatBand: "cold",
    momentum: "steady",
    ageBand: "prime",
    experienceBand: "veteran",
    weightBand: "powerful",
    heightBand: "tall",
  } as RikishiPerception;
}

function makeWorld(rikishiList: Rikishi[]): WorldState {
  const rikishiMap = new Map<string, Rikishi>();
  for (const r of rikishiList) rikishiMap.set(r.id, r);
  return {
    seed: "test-seed",
    year: 2025,
    week: 10,
    rikishi: rikishiMap,
    heyas: new Map(),
    oyakata: new Map(),
    activeRikishiIds: new Set(rikishiList.map((r) => r.id)),
    historicalRikishi: new Map(),
    events: { log: [], headlines: [] } as never,
    meta: { tone: "classic", drift: {} },
    globalKimariteStats: {},
  } as unknown as WorldState;
}

describe("spawnPersonnelWorker — withdrawal logic", () => {
  // No Math.random mock needed — the worker now uses RNGRegistry with the world seed.
  // We control the RNG output by choosing specific world seeds.

  it("serious injury + >2 weeks → always withdraws regardless of risk tolerance", () => {
    const r = makeRikishi("r1", {
      injured: true,
      injuryWeeksRemaining: 3,
      injuryStatus: { type: "muscle", severity: "serious", weeksRemaining: 3 } as never,
    });
    const world = makeWorld([r]);
    const result = spawnPersonnelWorker({
      rikishiPerceptions: [makePerception("r1")],
      welfareDiscipline: 50,
      world,
      riskTolerance: 90, // high risk tolerance — should still withdraw
    });
    expect(result.withdrawalIds).toContain("r1");
  });

  it("serious injury + ≤2 weeks → no withdrawal", () => {
    const r = makeRikishi("r1", {
      injured: true,
      injuryWeeksRemaining: 2,
      injuryStatus: { type: "muscle", severity: "serious", weeksRemaining: 2 } as never,
    });
    const world = makeWorld([r]);
    const result = spawnPersonnelWorker({
      rikishiPerceptions: [makePerception("r1")],
      welfareDiscipline: 50,
      world,
      riskTolerance: 10,
    });
    expect(result.withdrawalIds).not.toContain("r1");
  });

  it("moderate injury + >1 week + low risk tolerance → withdraws when RNG < threshold", () => {
    // riskTolerance = 20 → withdraws when rng > 0.2
    // Use a seed that produces a value > 0.2 for this rikishi/week combination
    // "test-seed" with npcPersonnel::withdraw::r1::10 should be deterministic
    const r = makeRikishi("r1", {
      injured: true,
      injuryWeeksRemaining: 2,
      injuryStatus: { type: "muscle", severity: "moderate", weeksRemaining: 2 } as never,
    });
    const world = makeWorld([r]);
    // Check what the RNG produces — if > 0.2, withdrawal happens
    const rng = new SeededRNG("test-seed::npcPersonnel::npcPersonnel::withdraw::r1::10");
    const rngVal = rng.next();
    const riskTolerance = 20;
    const shouldWithdraw = rngVal > riskTolerance / 100;
    const result = spawnPersonnelWorker({
      rikishiPerceptions: [makePerception("r1")],
      welfareDiscipline: 50,
      world,
      riskTolerance,
    });
    if (shouldWithdraw) {
      expect(result.withdrawalIds).toContain("r1");
    } else {
      expect(result.withdrawalIds).not.toContain("r1");
    }
  });

  it("moderate injury + >1 week + high risk tolerance → does not withdraw when RNG < threshold", () => {
    // riskTolerance = 90 → withdraws only when rng > 0.9
    const r = makeRikishi("r1", {
      injured: true,
      injuryWeeksRemaining: 2,
      injuryStatus: { type: "muscle", severity: "moderate", weeksRemaining: 2 } as never,
    });
    const world = makeWorld([r]);
    const rng = new SeededRNG("test-seed::npcPersonnel::npcPersonnel::withdraw::r1::10");
    const rngVal = rng.next();
    const riskTolerance = 90;
    const shouldWithdraw = rngVal > riskTolerance / 100;
    const result = spawnPersonnelWorker({
      rikishiPerceptions: [makePerception("r1")],
      welfareDiscipline: 50,
      world,
      riskTolerance,
    });
    if (shouldWithdraw) {
      expect(result.withdrawalIds).toContain("r1");
    } else {
      expect(result.withdrawalIds).not.toContain("r1");
    }
  });

  it("moderate injury + ≤1 week → no withdrawal", () => {
    const r = makeRikishi("r1", {
      injured: true,
      injuryWeeksRemaining: 1,
      injuryStatus: { type: "muscle", severity: "moderate", weeksRemaining: 1 } as never,
    });
    const world = makeWorld([r]);
    const result = spawnPersonnelWorker({
      rikishiPerceptions: [makePerception("r1")],
      welfareDiscipline: 50,
      world,
      riskTolerance: 10,
    });
    expect(result.withdrawalIds).not.toContain("r1");
  });

  it("non-injured rikishi → no withdrawal", () => {
    const r = makeRikishi("r1", { injured: false });
    const world = makeWorld([r]);
    const result = spawnPersonnelWorker({
      rikishiPerceptions: [makePerception("r1")],
      welfareDiscipline: 50,
      world,
      riskTolerance: 10,
    });
    expect(result.withdrawalIds).not.toContain("r1");
  });

  it("already-kyujo rikishi → no withdrawal", () => {
    const r = makeRikishi("r1", {
      injured: true,
      isKyujo: true,
      injuryWeeksRemaining: 3,
      injuryStatus: { type: "muscle", severity: "serious", weeksRemaining: 3 } as never,
    });
    const world = makeWorld([r]);
    const result = spawnPersonnelWorker({
      rikishiPerceptions: [makePerception("r1")],
      welfareDiscipline: 50,
      world,
      riskTolerance: 10,
    });
    expect(result.withdrawalIds).not.toContain("r1");
  });

  it("default riskTolerance (50) with moderate injury — deterministic for same seed", () => {
    const r = makeRikishi("r1", {
      injured: true,
      injuryWeeksRemaining: 2,
      injuryStatus: { type: "muscle", severity: "moderate", weeksRemaining: 2 } as never,
    });
    const world = makeWorld([r]);
    const rng = new SeededRNG("test-seed::npcPersonnel::npcPersonnel::withdraw::r1::10");
    const rngVal = rng.next();
    const shouldWithdraw = rngVal > 0.5;
    const result = spawnPersonnelWorker({
      rikishiPerceptions: [makePerception("r1")],
      welfareDiscipline: 50,
      world,
      // riskTolerance not passed → defaults to 50
    });
    if (shouldWithdraw) {
      expect(result.withdrawalIds).toContain("r1");
    } else {
      expect(result.withdrawalIds).not.toContain("r1");
    }
  });

  it("is deterministic — same seed produces same withdrawal decision", () => {
    const r = makeRikishi("r1", {
      injured: true,
      injuryWeeksRemaining: 2,
      injuryStatus: { type: "muscle", severity: "moderate", weeksRemaining: 2 } as never,
    });
    const world1 = makeWorld([r]);
    const world2 = makeWorld([r]);
    const result1 = spawnPersonnelWorker({
      rikishiPerceptions: [makePerception("r1")],
      welfareDiscipline: 50,
      world: world1,
      riskTolerance: 50,
    });
    const result2 = spawnPersonnelWorker({
      rikishiPerceptions: [makePerception("r1")],
      welfareDiscipline: 50,
      world: world2,
      riskTolerance: 50,
    });
    expect(result1.withdrawalIds).toEqual(result2.withdrawalIds);
  });

  it("withdrawal reasoning includes shikona and severity", () => {
    const r = makeRikishi("r1", {
      injured: true,
      injuryWeeksRemaining: 3,
      injuryStatus: { type: "muscle", severity: "serious", weeksRemaining: 3 } as never,
    });
    const world = makeWorld([r]);
    const result = spawnPersonnelWorker({
      rikishiPerceptions: [makePerception("r1")],
      welfareDiscipline: 50,
      world,
      riskTolerance: 50,
    });
    const reasoning = result.reasoning.find((r) => r.includes("[Withdrawal Worker]"));
    expect(reasoning).toBeDefined();
    expect(reasoning).toContain("Rikishi-r1");
    expect(reasoning).toContain("serious");
  });
});
