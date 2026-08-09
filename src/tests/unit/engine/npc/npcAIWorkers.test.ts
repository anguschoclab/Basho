import { describe, it, expect } from "vitest";
import {
  spawnTrainingWorker,
  spawnScoutingWorker,
  spawnPersonnelWorker,
  spawnGlobalWorker,
  type TrainingWorkerContext,
  type ScoutingWorkerContext,
  type PersonnelWorkerContext,
  type GlobalWorkerContext,
} from "@/engine/npcAIWorkers";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";
import type { PerceptionSnapshot, RikishiPerception } from "@/engine/perception";
import type { OyakataStyleProfile } from "@/engine/oyakataStylePreferences";

function makePerception(overrides: Partial<PerceptionSnapshot> = {}): PerceptionSnapshot {
  return {
    generatedAtTick: 0,
    generatedAtYear: 2025,
    statureBand: "established",
    prestigeBand: "respected",
    runwayBand: "comfortable",
    koenkaiBand: "moderate",
    welfareRiskBand: "safe",
    complianceState: "compliant",
    governancePressureBand: "none",
    stableMediaHeatBand: "cold",
    rivalryPressureBand: "dormant",
    rosterStrengthBand: "competitive",
    rosterSize: 5,
    moraleBand: "neutral",
    rikishiPerceptions: [],
    alignmentScore: 100,
    styleBias: "neutral",
    ...overrides,
  } as any;
}

function makeRikishiPerception(overrides: Partial<RikishiPerception> = {}): RikishiPerception {
  return {
    rikishiId: "r1",
    shikona: "Test Rikishi",
    rank: "maegashira" as any,
    style: "oshi" as any,
    healthBand: "good",
    mediaHeatBand: "cold",
    momentum: "steady",
    ageBand: "prime",
    experienceBand: "veteran",
    ...overrides,
  } as any;
}

// ── spawnTrainingWorker ────────────────────────────────────────────────────

describe("spawnTrainingWorker", () => {
  it("returns conservative intensity when welfare risk is critical", () => {
    const ctx: TrainingWorkerContext = {
      perception: makePerception({ welfareRiskBand: "critical" }),
      riskAppetite: 80,
      welfareDiscipline: 50,
      mood: "content",
      tradition: 50,
    };
    const result = spawnTrainingWorker(ctx);
    expect(result.trainingIntensity).toBe("conservative");
    expect(result.reasoning.length).toBe(3);
  });

  it("returns conservative when fragile ratio is high", () => {
    const perceptions = [
      makeRikishiPerception({ rikishiId: "r1", healthBand: "fragile" }),
      makeRikishiPerception({ rikishiId: "r2", healthBand: "worn" }),
      makeRikishiPerception({ rikishiId: "r3", healthBand: "good" }),
    ];
    const ctx: TrainingWorkerContext = {
      perception: makePerception({ rikishiPerceptions: perceptions, rosterSize: 3 }),
      riskAppetite: 80,
      welfareDiscipline: 50,
      mood: "content",
      tradition: 50,
    };
    const result = spawnTrainingWorker(ctx);
    expect(result.trainingIntensity).toBe("conservative");
  });

  it("returns balanced when morale is mutinous", () => {
    const ctx: TrainingWorkerContext = {
      perception: makePerception({ moraleBand: "mutinous" }),
      riskAppetite: 50,
      welfareDiscipline: 50,
      mood: "content",
      tradition: 50,
    };
    const result = spawnTrainingWorker(ctx);
    expect(result.trainingIntensity).toBe("balanced");
  });

  it("returns punishing when riskAppetite is high and welfare is safe", () => {
    const ctx: TrainingWorkerContext = {
      perception: makePerception({ welfareRiskBand: "safe" }),
      riskAppetite: 90,
      welfareDiscipline: 30,
      mood: "content",
      tradition: 50,
    };
    const result = spawnTrainingWorker(ctx);
    expect(result.trainingIntensity).toBe("punishing");
  });

  it("returns punishing when mood is furious", () => {
    const ctx: TrainingWorkerContext = {
      perception: makePerception({ welfareRiskBand: "safe", rosterStrengthBand: "weak" }),
      riskAppetite: 30,
      welfareDiscipline: 30,
      mood: "furious",
      tradition: 50,
    };
    const result = spawnTrainingWorker(ctx);
    expect(result.trainingIntensity).toBe("punishing");
  });

  it("caps intensity at complianceCap when set", () => {
    const ctx: TrainingWorkerContext = {
      perception: makePerception({ welfareRiskBand: "safe" }),
      riskAppetite: 90,
      welfareDiscipline: 30,
      mood: "content",
      complianceCap: "balanced",
      tradition: 50,
    };
    const result = spawnTrainingWorker(ctx);
    expect(result.trainingIntensity).toBe("balanced");
  });

  it("returns focus 'power' for size_matters philosophy", () => {
    const ctx: TrainingWorkerContext = {
      perception: makePerception({ welfareRiskBand: "safe" }),
      riskAppetite: 30,
      welfareDiscipline: 30,
      mood: "content",
      philosophy: "size_matters",
      tradition: 50,
    };
    const result = spawnTrainingWorker(ctx);
    expect(result.trainingFocus).toBe("power");
  });

  it("returns focus 'speed' for innovator philosophy", () => {
    const ctx: TrainingWorkerContext = {
      perception: makePerception({ welfareRiskBand: "safe" }),
      riskAppetite: 30,
      welfareDiscipline: 30,
      mood: "content",
      philosophy: "innovator",
      tradition: 50,
    };
    const result = spawnTrainingWorker(ctx);
    expect(result.trainingFocus).toBe("speed");
  });

  it("returns focus 'technique' for weak roster", () => {
    const ctx: TrainingWorkerContext = {
      perception: makePerception({ rosterStrengthBand: "weak" }),
      riskAppetite: 30,
      welfareDiscipline: 30,
      mood: "content",
      tradition: 50,
    };
    const result = spawnTrainingWorker(ctx);
    expect(result.trainingFocus).toBe("technique");
  });

  it("returns recovery 'high' when welfare risk is critical", () => {
    const ctx: TrainingWorkerContext = {
      perception: makePerception({ welfareRiskBand: "critical" }),
      riskAppetite: 50,
      welfareDiscipline: 50,
      mood: "content",
      tradition: 50,
    };
    const result = spawnTrainingWorker(ctx);
    expect(result.recovery).toBe("high");
  });

  it("returns recovery 'low' when welfare is safe and no fragile rikishi", () => {
    const ctx: TrainingWorkerContext = {
      perception: makePerception({ welfareRiskBand: "safe", rosterSize: 5 }),
      riskAppetite: 50,
      welfareDiscipline: 0.1,
      mood: "content",
      tradition: 50,
    };
    const result = spawnTrainingWorker(ctx);
    expect(result.recovery).toBe("low");
  });

  it("always returns 3 reasoning strings", () => {
    const ctx: TrainingWorkerContext = {
      perception: makePerception(),
      riskAppetite: 50,
      welfareDiscipline: 50,
      mood: "content",
      tradition: 50,
    };
    const result = spawnTrainingWorker(ctx);
    expect(result.reasoning).toHaveLength(3);
    expect(result.reasoning[0]).toContain("[Training Worker]");
    expect(result.reasoning[1]).toContain("[Focus Worker]");
    expect(result.reasoning[2]).toContain("[Recovery Worker]");
  });
});

// ── spawnScoutingWorker ────────────────────────────────────────────────────

describe("spawnScoutingWorker", () => {
  it("returns 'none' priority when runway is desperate", () => {
    const ctx: ScoutingWorkerContext = {
      runwayBand: "desperate",
      rosterSize: 10,
      rosterStrengthBand: "competitive",
      ambition: 80,
      hasSleeperScout: false,
    };
    const result = spawnScoutingWorker(ctx);
    expect(result.priority).toBe("none");
    expect(result.reason).toContain("[Scouting Worker]");
  });

  it("returns 'none' priority when runway is critical", () => {
    const ctx: ScoutingWorkerContext = {
      runwayBand: "critical",
      rosterSize: 10,
      rosterStrengthBand: "competitive",
      ambition: 80,
      hasSleeperScout: false,
    };
    const result = spawnScoutingWorker(ctx);
    expect(result.priority).toBe("none");
  });

  it("returns 'aggressive' when roster is small", () => {
    const ctx: ScoutingWorkerContext = {
      runwayBand: "comfortable",
      rosterSize: 3,
      rosterStrengthBand: "competitive",
      ambition: 50,
      hasSleeperScout: false,
    };
    const result = spawnScoutingWorker(ctx);
    expect(result.priority).toBe("aggressive");
  });

  it("returns 'aggressive' when roster strength is weak", () => {
    const ctx: ScoutingWorkerContext = {
      runwayBand: "comfortable",
      rosterSize: 10,
      rosterStrengthBand: "weak",
      ambition: 50,
      hasSleeperScout: false,
    };
    const result = spawnScoutingWorker(ctx);
    expect(result.priority).toBe("aggressive");
  });

  it("returns 'active' when hasSleeperScout is true", () => {
    const ctx: ScoutingWorkerContext = {
      runwayBand: "comfortable",
      rosterSize: 10,
      rosterStrengthBand: "competitive",
      ambition: 50,
      hasSleeperScout: true,
    };
    const result = spawnScoutingWorker(ctx);
    expect(result.priority).toBe("active");
  });

  it("returns 'active' when ambition >= 75 and roster not dominant", () => {
    const ctx: ScoutingWorkerContext = {
      runwayBand: "comfortable",
      rosterSize: 10,
      rosterStrengthBand: "strong",
      ambition: 80,
      hasSleeperScout: false,
    };
    const result = spawnScoutingWorker(ctx);
    expect(result.priority).toBe("active");
  });

  it("returns 'passive' when roster is dominant", () => {
    const ctx: ScoutingWorkerContext = {
      runwayBand: "comfortable",
      rosterSize: 15,
      rosterStrengthBand: "dominant",
      ambition: 50,
      hasSleeperScout: false,
    };
    const result = spawnScoutingWorker(ctx);
    expect(result.priority).toBe("passive");
  });
});

// ── spawnPersonnelWorker ───────────────────────────────────────────────────

describe("spawnPersonnelWorker", () => {
  it("protects fragile rikishi", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1" });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", heya]]),
    });
    const ctx: PersonnelWorkerContext = {
      rikishiPerceptions: [makeRikishiPerception({ rikishiId: "r1", healthBand: "fragile" })],
      welfareDiscipline: 50,
      world,
    };
    const result = spawnPersonnelWorker(ctx);
    expect(result.protectIds).toContain("r1");
  });

  it("protects worn high-rank rikishi", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1", rank: "ozeki" });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", heya]]),
    });
    const ctx: PersonnelWorkerContext = {
      rikishiPerceptions: [
        makeRikishiPerception({ rikishiId: "r1", healthBand: "worn", rank: "ozeki" as any }),
      ],
      welfareDiscipline: 30,
      world,
    };
    const result = spawnPersonnelWorker(ctx);
    expect(result.protectIds).toContain("r1");
  });

  it("withdraws seriously injured rikishi", () => {
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      injured: true,
      isKyujo: false,
      injuryWeeksRemaining: 4,
      injuryStatus: { severity: "serious" } as any,
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", heya]]),
    });
    const ctx: PersonnelWorkerContext = {
      rikishiPerceptions: [makeRikishiPerception({ rikishiId: "r1" })],
      welfareDiscipline: 50,
      world,
    };
    const result = spawnPersonnelWorker(ctx);
    expect(result.withdrawalIds).toContain("r1");
  });

  it("does not withdraw already kyujo rikishi", () => {
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      injured: true,
      isKyujo: true,
      injuryWeeksRemaining: 4,
      injuryStatus: { severity: "serious" } as any,
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", heya]]),
    });
    const ctx: PersonnelWorkerContext = {
      rikishiPerceptions: [makeRikishiPerception({ rikishiId: "r1" })],
      welfareDiscipline: 50,
      world,
    };
    const result = spawnPersonnelWorker(ctx);
    expect(result.withdrawalIds).not.toContain("r1");
  });

  it("assigns individualPushes for style-matched healthy rikishi with style_purist philosophy", () => {
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      style: "oshi",
      combatProfile: {
        archetype: "pusher" as any,
        familyPreferences: { push: 25, belt: 25, trick: 25, speed: 25 },
        preferredGrip: "none",
        preferredGripDepth: "standard",
        statModifiers: {},
        counterFamily: "push",
        archetypeBehavior: {
          tachiaiSpeedBonus: 0,
          lateralMovementBonus: 0,
          edgeEscapeBonus: 0,
          beltTorqueBonus: 0,
          pushVelocityBonus: 0,
        },
      },
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", heya]]),
    });
    const styleProfile: OyakataStyleProfile = {
      philosophy: "style_purist",
      preferredArchetypes: ["pusher" as any],
      preferredStyle: "oshi",
      statWeights: { power: 1, speed: 1, technique: 1, size: 1, potential: 1 },
      description: "test",
    };
    const ctx: PersonnelWorkerContext = {
      rikishiPerceptions: [makeRikishiPerception({ rikishiId: "r1", healthBand: "peak" })],
      welfareDiscipline: 50,
      styleProfile,
      world,
    };
    const result = spawnPersonnelWorker(ctx);
    expect(result.individualPushes).toContain("r1");
  });

  it("assigns individualDevelops for partial style match", () => {
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      style: "oshi",
      combatProfile: {
        archetype: "grappler" as any,
        familyPreferences: { push: 25, belt: 25, trick: 25, speed: 25 },
        preferredGrip: "none",
        preferredGripDepth: "standard",
        statModifiers: {},
        counterFamily: "push",
        archetypeBehavior: {
          tachiaiSpeedBonus: 0,
          lateralMovementBonus: 0,
          edgeEscapeBonus: 0,
          beltTorqueBonus: 0,
          pushVelocityBonus: 0,
        },
      },
    });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", heya]]),
    });
    const styleProfile: OyakataStyleProfile = {
      philosophy: "balanced",
      preferredArchetypes: ["pusher" as any],
      preferredStyle: "oshi",
      statWeights: { power: 1, speed: 1, technique: 1, size: 1, potential: 1 },
      description: "test",
    };
    const ctx: PersonnelWorkerContext = {
      rikishiPerceptions: [makeRikishiPerception({ rikishiId: "r1", healthBand: "good" })],
      welfareDiscipline: 0.5,
      styleProfile,
      world,
    };
    const result = spawnPersonnelWorker(ctx);
    expect(result.individualDevelops).toContain("r1");
  });

  it("limits individualPushes to 3", () => {
    const perceptions: RikishiPerception[] = [];
    const rikishiMap = new Map();
    for (let i = 0; i < 5; i++) {
      const id = `r${i}`;
      const r = mockRikishi(id, { heyaId: "h1", style: "oshi" });
      rikishiMap.set(id, r);
      perceptions.push(makeRikishiPerception({ rikishiId: id, healthBand: "peak" }));
    }
    const heya = makeMockHeya("h1", { rikishiIds: perceptions.map((p) => p.rikishiId) });
    const world = makeMockWorld({ rikishi: rikishiMap, heyas: new Map([["h1", heya]]) });
    const styleProfile: OyakataStyleProfile = {
      philosophy: "style_purist",
      preferredArchetypes: ["pusher" as any],
      preferredStyle: "oshi",
      statWeights: { power: 1, speed: 1, technique: 1, size: 1, potential: 1 },
      description: "test",
    };
    const ctx: PersonnelWorkerContext = {
      rikishiPerceptions: perceptions,
      welfareDiscipline: 50,
      styleProfile,
      world,
    };
    const result = spawnPersonnelWorker(ctx);
    expect(result.individualPushes.length).toBeLessThanOrEqual(3);
  });
});

// ── spawnGlobalWorker ──────────────────────────────────────────────────────

describe("spawnGlobalWorker", () => {
  it("returns empty reasoning when no invitations for heya", () => {
    const world = makeMockWorld();
    const ctx: GlobalWorkerContext = {
      heyaId: "h1",
      ambition: 60,
      riskAppetite: 50,
      perception: makePerception(),
      pendingExhibitions: [],
      world,
    };
    const result = spawnGlobalWorker(ctx);
    expect(result.acceptedExhibitionId).toBeUndefined();
    expect(result.reasoning).toEqual([]);
  });

  it("declines when no healthy rikishi available", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1", injured: true });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", heya]]),
    });
    const ctx: GlobalWorkerContext = {
      heyaId: "h1",
      ambition: 80,
      riskAppetite: 50,
      perception: makePerception({
        rikishiPerceptions: [makeRikishiPerception({ rikishiId: "r1" })],
      }),
      pendingExhibitions: [
        {
          id: "e1",
          heyaId: "h1",
          prestige: 80,
          region: "Mongolia",
          dominantStyle: "oshi",
          expiresAtWeek: 10,
        },
      ],
      world,
    };
    const result = spawnGlobalWorker(ctx);
    expect(result.acceptedExhibitionId).toBeUndefined();
    expect(result.reasoning.some((r) => r.includes("No healthy"))).toBe(true);
  });

  it("accepts exhibition when ambition > 40 and rank met", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1", rank: "maegashira", power: 80 });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", heya]]),
    });
    const ctx: GlobalWorkerContext = {
      heyaId: "h1",
      ambition: 60,
      riskAppetite: 50,
      perception: makePerception({
        rikishiPerceptions: [makeRikishiPerception({ rikishiId: "r1" })],
      }),
      pendingExhibitions: [
        {
          id: "e1",
          heyaId: "h1",
          prestige: 60,
          region: "Mongolia",
          dominantStyle: "oshi",
          requiresRank: "maegashira",
          expiresAtWeek: 10,
        },
      ],
      world,
    };
    const result = spawnGlobalWorker(ctx);
    expect(result.acceptedExhibitionId).toBe("e1");
    expect(result.rikishiId).toBe("r1");
  });

  it("accepts when prestige > 50 even with low ambition", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1", rank: "maegashira", power: 80 });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", heya]]),
    });
    const ctx: GlobalWorkerContext = {
      heyaId: "h1",
      ambition: 20,
      riskAppetite: 50,
      perception: makePerception({
        rikishiPerceptions: [makeRikishiPerception({ rikishiId: "r1" })],
      }),
      pendingExhibitions: [
        {
          id: "e1",
          heyaId: "h1",
          prestige: 70,
          region: "East_Asia",
          dominantStyle: "yotsu",
          expiresAtWeek: 10,
        },
      ],
      world,
    };
    const result = spawnGlobalWorker(ctx);
    expect(result.acceptedExhibitionId).toBe("e1");
  });

  it("declines when rank requirement not met", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1", rank: "makushita", power: 80 });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", heya]]),
    });
    const ctx: GlobalWorkerContext = {
      heyaId: "h1",
      ambition: 80,
      riskAppetite: 50,
      perception: makePerception({
        rikishiPerceptions: [makeRikishiPerception({ rikishiId: "r1" })],
      }),
      pendingExhibitions: [
        {
          id: "e1",
          heyaId: "h1",
          prestige: 80,
          region: "Mongolia",
          dominantStyle: "oshi",
          requiresRank: "juryo",
          expiresAtWeek: 10,
        },
      ],
      world,
    };
    const result = spawnGlobalWorker(ctx);
    expect(result.acceptedExhibitionId).toBeUndefined();
  });

  it("handles exhibitions with only required fields (no optional fields)", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1", rank: "maegashira", power: 80 });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", heya]]),
    });
    const ctx: GlobalWorkerContext = {
      heyaId: "h1",
      ambition: 60,
      riskAppetite: 50,
      perception: makePerception({
        rikishiPerceptions: [makeRikishiPerception({ rikishiId: "r1" })],
      }),
      pendingExhibitions: [
        { id: "e1", heyaId: "h1", prestige: 60, region: "Mongolia", expiresAtWeek: 10 },
      ],
      world,
    };
    const result = spawnGlobalWorker(ctx);
    expect(result.acceptedExhibitionId).toBe("e1");
  });

  it("does not match exhibitions with different heyaId", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1", rank: "maegashira", power: 80 });
    const heya = makeMockHeya("h1", { rikishiIds: ["r1"] });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      heyas: new Map([["h1", heya]]),
    });
    const ctx: GlobalWorkerContext = {
      heyaId: "h1",
      ambition: 60,
      riskAppetite: 50,
      perception: makePerception({
        rikishiPerceptions: [makeRikishiPerception({ rikishiId: "r1" })],
      }),
      pendingExhibitions: [
        { id: "e1", heyaId: "h2", prestige: 60, region: "Mongolia", expiresAtWeek: 10 },
      ],
      world,
    };
    const result = spawnGlobalWorker(ctx);
    expect(result.acceptedExhibitionId).toBeUndefined();
    expect(result.reasoning).toEqual([]);
  });
});
