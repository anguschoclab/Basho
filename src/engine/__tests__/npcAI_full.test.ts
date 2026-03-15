import { describe, it, expect } from "vitest";
import { determineNPCStyleBias, getManagerPersona, makeNPCWeeklyDecision } from "../npcAI";
import { generateOyakata, OYAKATA_ARCHETYPES, getArchetypeDescription } from "../oyakataPersonalities";
import { getOyakataStyleProfile, type RecruitmentPhilosophy } from "../oyakataStylePreferences";
import { ensureHeyaWelfareState, tickWeek as welfareTickWeek } from "../welfare";
import type { WorldState } from "../types/world";
import type { Rikishi, RikishiStats } from "../types/rikishi";
import type { Heya } from "../types/heya";
import type { Oyakata, OyakataArchetype } from "../types/oyakata";
import type { WelfareState } from "../types/economy";

// ── helpers ──

function makeRikishi(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
  return {
    id, shikona: `Rikishi-${id}`, heyaId: "h1", nationality: "JP",
    height: 180, weight: 140, power: 50, speed: 50, balance: 50,
    technique: 50, aggression: 50, experience: 50, momentum: 0,
    stamina: 100, fatigue: 0, injured: false, injuryWeeksRemaining: 0,
    style: "oshi", archetype: "all_rounder", division: "makuuchi",
    rank: "maegashira", rankNumber: 10, side: "east", birthYear: 1995,
    adaptability: 50, h2h: {}, history: [], personalityTraits: [],
    condition: 90, motivation: 60,
    stats: { strength: 50, speed: 50, technique: 50, balance: 50, weight: 140, stamina: 100, mental: 50, adaptability: 50 } as RikishiStats,
    careerWins: 20, careerLosses: 10, currentBashoWins: 5, currentBashoLosses: 2,
    favoredKimarite: [], weakAgainstStyles: [],
    ...overrides,
  } as unknown as Rikishi;
}

function makeWorld(opts: {
  rikishi?: Map<string, Rikishi>;
  oyakata?: Oyakata;
  heyaOverrides?: Partial<Heya>;
} = {}): WorldState {
  const rMap = opts.rikishi ?? new Map([
    ["r1", makeRikishi("r1")],
    ["r2", makeRikishi("r2", { style: "yotsu" })],
    ["r3", makeRikishi("r3")],
  ]);
  const oya: Oyakata = opts.oyakata ?? {
    id: "oya1", heyaId: "h1", name: "Test Oyakata", age: 55,
    archetype: "tyrant" as OyakataArchetype,
    traits: { ambition: 90, patience: 20, risk: 80, tradition: 80, compassion: 10 },
    quirks: ["Discipline Hawk", "Cold Pragmatist", "Media Operator"],
    managerFlags: { disciplineHawk: true, welfareHawk: false, publicityHawk: true, nepotist: false },
  } as unknown as Oyakata;

  return {
    id: "w1", seed: "npc-test-seed", year: 2026, week: 5,
    cyclePhase: "interim", currentBashoName: "hatsu",
    heyas: new Map([["h1", {
      id: "h1", name: "Test Heya", oyakataId: "oya1",
      rikishiIds: [...rMap.keys()],
      funds: 5000, statureBand: "rising", scandalScore: 0,
      facilities: { training: 50, recovery: 50, nutrition: 50 },
      trainingState: { intensity: "balanced", focus: "neutral", recovery: "normal", focusRikishi: { protect: [], develop: [], push: [] } },
      welfareState: { debt: 0, complianceRisk: 0, sanctions: { cashFine: 0, rankPenalties: [], banWeeks: 0 } },
      ...opts.heyaOverrides,
    } as unknown as Heya]]),
    rikishi: rMap,
    oyakata: new Map([["oya1", oya]]),
    history: { bashoResults: [], yearEndAwards: [] },
    events: { version: "1.0.0", log: [], dedupe: {} },
    ftue: { hasCompletedTutorial: true },
    calendar: { year: 2026, month: 1, currentWeek: 5, currentDay: 1 },
    dayIndexGlobal: 0, almanacSnapshots: [],
    sponsorPool: { sponsors: new Map(), koenkais: new Map() },
    ozekiKadoban: {},
  } as unknown as WorldState;
}

// ═══════════════════════════════════════════════════════════
// Oyakata Personality Generation
// ═══════════════════════════════════════════════════════════

describe("Oyakata Personalities", () => {
  it("should have six canonical archetypes", () => {
    const keys = Object.keys(OYAKATA_ARCHETYPES);
    expect(keys).toContain("traditionalist");
    expect(keys).toContain("scientist");
    expect(keys).toContain("gambler");
    expect(keys).toContain("nurturer");
    expect(keys).toContain("tyrant");
    expect(keys).toContain("strategist");
    expect(keys).toHaveLength(6);
  });

  it("should generate an oyakata with valid traits within ±10 of base", () => {
    const oya = generateOyakata("oya-test-1", "h1", "Sensei", 55, "nurturer");
    const base = OYAKATA_ARCHETYPES.nurturer;
    expect(oya.archetype).toBe("nurturer");
    expect(oya.traits.compassion).toBeGreaterThanOrEqual(Math.max(0, base.compassion - 10));
    expect(oya.traits.compassion).toBeLessThanOrEqual(Math.min(100, base.compassion + 10));
    expect(oya.formerShikona.length).toBeGreaterThan(0);
  });

  it("should deterministically generate the same personality for the same id", () => {
    const a = generateOyakata("stable-id", "h1", "Coach", 50);
    const b = generateOyakata("stable-id", "h1", "Coach", 50);
    expect(a.archetype).toBe(b.archetype);
    expect(a.traits).toEqual(b.traits);
  });

  it("should return description for each archetype", () => {
    for (const arch of Object.keys(OYAKATA_ARCHETYPES) as OyakataArchetype[]) {
      const desc = getArchetypeDescription(arch);
      expect(desc.length).toBeGreaterThan(10);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// Oyakata Style Preferences / Recruitment Philosophy
// ═══════════════════════════════════════════════════════════

describe("Oyakata Style Preferences", () => {
  it("should assign a philosophy based on archetype", () => {
    const world = makeWorld();
    const oya = world.oyakata.get("oya1")!;
    const profile = getOyakataStyleProfile(world, oya);
    expect(profile.philosophy).toBeDefined();
    // Tyrant maps to size_matters or style_purist
    expect(["size_matters", "style_purist"]).toContain(profile.philosophy);
  });

  it("should produce stat weights that are all positive", () => {
    const world = makeWorld();
    const oya = world.oyakata.get("oya1")!;
    const profile = getOyakataStyleProfile(world, oya);
    for (const v of Object.values(profile.statWeights)) {
      expect(v).toBeGreaterThan(0);
    }
  });

  it("should vary philosophy by archetype", () => {
    const nurturerWorld = makeWorld({
      oyakata: generateOyakata("oya-nurt", "h1", "Kind Coach", 50, "nurturer"),
    });
    const gamblerWorld = makeWorld({
      oyakata: generateOyakata("oya-gamb", "h1", "Risk Coach", 50, "gambler"),
    });
    const nP = getOyakataStyleProfile(nurturerWorld, nurturerWorld.oyakata.get("oya1") ?? nurturerWorld.oyakata.values().next().value!);
    const gP = getOyakataStyleProfile(gamblerWorld, gamblerWorld.oyakata.values().next().value!);
    // Nurturer → balanced/underdog_hunter; Gambler → underdog_hunter/meta_chaser
    expect(["balanced", "underdog_hunter"]).toContain(nP.philosophy);
    expect(["underdog_hunter", "meta_chaser"]).toContain(gP.philosophy);
  });
});

// ═══════════════════════════════════════════════════════════
// NPC AI — Style Bias
// ═══════════════════════════════════════════════════════════

describe("NPC Style Bias", () => {
  it("should detect dominant style in stable", () => {
    const world = makeWorld();
    // r1 + r3 = oshi, r2 = yotsu → oshi bias
    expect(determineNPCStyleBias(world, "h1")).toBe("oshi");
  });

  it("should return neutral when styles are equal", () => {
    const world = makeWorld({
      rikishi: new Map([
        ["r1", makeRikishi("r1", { style: "oshi" })],
        ["r2", makeRikishi("r2", { style: "yotsu" })],
      ]),
    });
    expect(determineNPCStyleBias(world, "h1")).toBe("neutral");
  });
});

// ═══════════════════════════════════════════════════════════
// NPC AI — Manager Persona
// ═══════════════════════════════════════════════════════════

describe("Manager Persona", () => {
  it("should derive high riskAppetite for tyrant archetype", () => {
    const world = makeWorld();
    const persona = getManagerPersona(world, "h1");
    expect(persona.archetype).toBe("tyrant");
    expect(persona.riskAppetite).toBeGreaterThan(0.7);
  });

  it("should derive low welfareDiscipline for low-compassion oyakata", () => {
    const world = makeWorld();
    const persona = getManagerPersona(world, "h1");
    expect(persona.welfareDiscipline).toBeLessThan(0.3);
  });

  it("should return safe defaults for missing heya", () => {
    const world = makeWorld();
    const persona = getManagerPersona(world, "nonexistent");
    expect(persona.archetype).toBe("unknown");
    expect(persona.riskAppetite).toBe(0.5);
  });
});

// ═══════════════════════════════════════════════════════════
// NPC AI — Weekly Decision
// ═══════════════════════════════════════════════════════════

describe("NPC Weekly Decision", () => {
  it("should output a valid decision with reasoning", () => {
    const world = makeWorld();
    const decision = makeNPCWeeklyDecision(world, "h1");
    expect(decision.heyaId).toBe("h1");
    expect(["conservative", "balanced", "intensive", "punishing"]).toContain(decision.trainingIntensity);
    expect(["power", "speed", "technique", "balance", "neutral"]).toContain(decision.trainingFocus);
    expect(["low", "normal", "high"]).toContain(decision.recovery);
    expect(["none", "passive", "active", "aggressive"]).toContain(decision.scoutingPriority);
    expect(decision.reasoning.length).toBeGreaterThan(0);
  });

  it("should protect fragile wrestlers", () => {
    const world = makeWorld({
      rikishi: new Map([
        ["r1", makeRikishi("r1", { condition: 15, fatigue: 95, rank: "ozeki" })],
        ["r2", makeRikishi("r2")],
      ]),
    });
    const decision = makeNPCWeeklyDecision(world, "h1");
    expect(decision.individualProtects).toContain("r1");
  });

  it("should scale down intensity when roster is fragile", () => {
    const world = makeWorld({
      rikishi: new Map([
        ["r1", makeRikishi("r1", { condition: 20, fatigue: 90 })],
        ["r2", makeRikishi("r2", { condition: 25, fatigue: 85 })],
        ["r3", makeRikishi("r3", { condition: 30, fatigue: 80 })],
      ]),
    });
    const decision = makeNPCWeeklyDecision(world, "h1");
    expect(decision.trainingIntensity).toBe("conservative");
  });
});

// ═══════════════════════════════════════════════════════════
// Welfare Compliance FSM
// ═══════════════════════════════════════════════════════════

describe("Welfare Compliance", () => {
  it("should initialize heya welfare state to compliant", () => {
    const heya = { id: "h1", name: "Test" } as unknown as Heya;
    const ws = ensureHeyaWelfareState(heya);
    expect(ws.complianceState).toBe("compliant");
    expect(ws.welfareRisk).toBeLessThan(20);
  });

  it("should escalate risk when injured rikishi train unprotected at high intensity", () => {
    const world = makeWorld({
      rikishi: new Map([
        ["r1", makeRikishi("r1", { injured: true, injuryWeeksRemaining: 4, condition: 30 } as unknown as any)],
        ["r2", makeRikishi("r2")],
      ]),
    });
    // Set punishing intensity
    const heya = world.heyas.get("h1")!;
    if (!heya.trainingState) heya.trainingState = {};
    // Ensure world-level training state for welfare to read
    world.trainingState = {
      h1: {
        beyaId: "h1",
        activeProfile: { intensity: "punishing", focus: "neutral", styleBias: "neutral", recovery: "low" },
        focusSlots: [], // No protect slot for r1 → negligence
      },
    };

    // Also set injuryStatus on r1 for welfare to detect
    const r1 = world.rikishi.get("r1")!;
    r1.injuryStatus = { isInjured: true, severity: "moderate", type: "strain", location: "knee", weeksRemaining: 4 };

    // Tick multiple weeks to build up risk
    for (let i = 0; i < 6; i++) {
      welfareTickWeek(world);
    }

    const ws = heya.welfareState as WelfareState;
    expect(ws.welfareRisk).toBeGreaterThan(20);
    // Should have escalated past compliant
    expect(["watch", "investigation", "sanctioned"]).toContain(ws.complianceState);
  });
});
