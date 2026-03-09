import { describe, it, expect } from "vitest";
import { determineNPCStyleBias, getManagerPersona, makeNPCWeeklyDecision } from "../npcAI";
import { WorldState, Rikishi, Heya, Oyakata, RikishiStats } from "../types";

function createMockWorld(): WorldState {
  return {
    id: "test-world",
    seed: "npc-test-seed",
    year: 2026,
    week: 1,
    cyclePhase: "interim",
    currentBashoName: "hatsu",
    heyas: new Map<string, Heya>([
      ["heya1", { 
        id: "heya1", 
        name: "Oshi Heya", 
        oyakataId: "oya1",
        rikishiIds: ["r1", "r2", "r3"],
        funds: 1000,
        trainingState: {
           intensity: "balanced", focus: "neutral", recovery: "normal", 
           focusRikishi: { protect: [], develop: [], push: [] }
        },
        welfareState: {
           debt: 0, complianceRisk: 0, 
           sanctions: { cashFine: 0, rankPenalties: [], banWeeks: 0 }
        }
      } as unknown as Heya]
    ]),
    rikishi: new Map<string, Rikishi>([
      ["r1", { id: "r1", style: "oshi", heyaId: "heya1", rank: "maegashira" } as unknown as Rikishi],
      ["r2", { id: "r2", style: "oshi", heyaId: "heya1", rank: "juyro" } as unknown as Rikishi],
      ["r3", { id: "r3", style: "yotsu", heyaId: "heya1", rank: "makushita" } as unknown as Rikishi],
    ]),
    oyakata: new Map<string, Oyakata>([
      ["oya1", {
        id: "oya1",
        heyaId: "heya1",
        name: "Test Oyakata",
        archetype: "tyrant",
        traits: { ambition: 90, patience: 20, risk: 80, tradition: 80, compassion: 10 },
        quirks: ["Discipline Hawk", "Cold Pragmatist", "Media Operator"]
      } as unknown as Oyakata]
    ]),
    history: { bashoResults: [], yearEndAwards: [] },
    events: { version: "1.0.0", log: [], dedupe: {} },
    ftue: { hasCompletedTutorial: true },
    calendar: { year: 2026, month: 1, currentWeek: 1, currentDay: 1 },
    dayIndexGlobal: 0,
    almanacSnapshots: [],
    sponsorPool: { sponsors: new Map(), koenkais: new Map() },
    ozekiKadoban: {}
  } as unknown as WorldState;
}

describe("NPC AI System", () => {
  it("should determine correct style bias for a stable", () => {
    const world = createMockWorld();
    const bias = determineNPCStyleBias(world, "heya1");
    // 2 oshi, 1 yotsu -> oshi
    expect(bias).toBe("oshi");

    // Equalize it
    world.rikishi.set("r4", { id: "r4", style: "yotsu", heyaId: "heya1" } as Rikishi);
    world.heyas.get("heya1")!.rikishiIds.push("r4");
    
    const biasEqual = determineNPCStyleBias(world, "heya1");
    expect(biasEqual).toBe("neutral");
  });

  it("should construct a manager persona with correct flags and bands", () => {
    const world = createMockWorld();
    const persona = getManagerPersona(world, "heya1");

    expect(persona.archetype).toBe("tyrant");
    expect(persona.flags.disciplineHawk).toBe(true);
    expect(persona.flags.welfareHawk).toBe(false); // compassion is 10
    expect(persona.riskAppetite).toBeGreaterThan(0.7); // High risk, high ambition
    expect(persona.welfareDiscipline).toBeLessThan(0.3); // Low compassion, high risk
  });

  it("should output a structured weekly decision based on persona and perception", () => {
    const world = createMockWorld();
    
    // Add health state for rikishi to be able to build perception
    world.rikishi.get("r1")!.health = { fatigue: 100, injury: null }; // Exhausted -> fragile
    world.rikishi.get("r1")!.rank = "yokozuna"; // High rank -> needs protection
    world.rikishi.get("r2")!.health = { fatigue: 0, injury: null };
    world.rikishi.get("r3")!.health = { fatigue: 0, injury: null };

    // To prevent error in perception building, ensure rikishi have minimum properties
    for(const r of world.rikishi.values()) {
        r.careerWins = 0; r.careerLosses = 0;
        r.currentBashoWins = 0; r.currentBashoLosses = 0;
        r.condition = r.health?.fatigue === 100 ? 20 : 100;
        r.stats = { strength: 50, technique: 50, speed: 50, stamina: 50, mental: 50, adaptability: 50, balance: 50, weight: 150 } as RikishiStats;
        r.morale = 50;
        r.injuryStatus = { isInjured: false, severity: 0, type: "none", location: "", weeksRemaining: 0, weeksToHeal: 0 };
    }

    const decision = makeNPCWeeklyDecision(world, "heya1");

    expect(decision.heyaId).toBe("heya1");
    expect(decision.archetype).toBe("tyrant");
    
    // R1 is Yokozuna and highly fatigued -> should be in individualProtects
    expect(decision.individualProtects).toContain("r1");
    
    // The tyrant should still push relatively hard unless welfare is critical
    expect(["balanced", "intensive", "punishing", "conservative"]).toContain(decision.trainingIntensity);
    expect(["power", "technique", "speed", "balance", "neutral"]).toContain(decision.trainingFocus);
    
    expect(decision.reasoning.length).toBeGreaterThan(0);
  });
});
