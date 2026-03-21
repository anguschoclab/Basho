import { describe, it, expect } from "vitest";
import { determineNPCStyleBias, getManagerPersona, makeNPCWeeklyDecision } from "../npcAI";
import { WorldState } from "../types/world";
import { Rikishi, RikishiStats } from "../types/rikishi";
import { Heya } from "../types/heya";
import { Oyakata } from "../types/oyakata";

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
        quirks: ["Discipline Hawk", "Cold Pragmatist", "Media Operator"],
        managerFlags: { disciplineHawk: true, welfareHawk: false, publicityHawk: true, nepotist: false }
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
    world.rikishi.set("r4", { id: "r4", style: "yotsu", heyaId: "heya1" } as unknown as Rikishi);
    world.heyas.get("heya1")!.rikishiIds.push("r4");
    
    const biasEqual = determineNPCStyleBias(world, "heya1");
    expect(biasEqual).toBe("neutral");
  });

  it("should construct a manager persona with correct flags and bands", () => {
    const world = createMockWorld();
    const persona = getManagerPersona(world, "heya1");

    expect(persona.archetype).toBe("tyrant");
    expect(persona.flags).toBeDefined();
    expect(persona.riskAppetite).toBeGreaterThan(0.7); // High risk, high ambition
    expect(persona.welfareDiscipline).toBeLessThan(0.3); // Low compassion, high risk
  });

  it("should output a structured weekly decision based on persona and perception", () => {
    const world = createMockWorld();
    
    // To prevent error in perception building, ensure rikishi have minimum properties
    for(const r of world.rikishi.values()) {
        r.careerWins = 0; r.careerLosses = 0;
        r.currentBashoWins = 0; r.currentBashoLosses = 0;
        r.condition = r.id === "r1" ? 20 : 100;
        r.fatigue = r.id === "r1" ? 100 : 0;
        r.stats = { strength: 50, technique: 50, speed: 50, stamina: 50, mental: 50, adaptability: 50, balance: 50, weight: 150 } as RikishiStats;
        r.motivation = 50;
        r.injuryStatus = { isInjured: false, severity: 0, type: "none", location: "", weeksRemaining: 0, weeksToHeal: 0 };
    }

    world.rikishi.get("r1")!.rank = "yokozuna"; // High rank -> needs protection

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

describe("Monthly Roster Management", () => {
  it("retires aging rikishi and removes them from world state in tickMonthly", () => {
    const world = createMockWorld();

    // Create an old rikishi in heya1
    const oldRikishi = {
      id: "r_old",
      style: "oshi",
      heyaId: "heya1",
      rank: "maegashira",
      birthYear: world.year - 45, // Automatic retirement age
      injuryStatus: { severity: 0 }
    } as unknown as Rikishi;

    world.rikishi.set("r_old", oldRikishi);
    world.heyas.get("heya1")!.rikishiIds.push("r_old");

    // Call tickMonthly
    import("../npcAI").then(m => {
      m.tickMonthly(world);

      // Verify removed from heya and world
      expect(world.heyas.get("heya1")!.rikishiIds).not.toContain("r_old");
      expect(world.rikishi.has("r_old")).toBe(false);
    });
  });

  it("recruits for stables below target size but respects recruitment freezes", () => {
    const world = createMockWorld();

    // Clear heya1 rikishi to trigger recruitment
    const heya1 = world.heyas.get("heya1")!;
    heya1.rikishiIds = [];

    // Add heya2 with a recruitment freeze
    world.heyas.set("heya2", {
      id: "heya2",
      name: "Frozen Heya",
      oyakataId: "oya1",
      rikishiIds: [],
      funds: 1000,
      welfareState: { sanctions: { recruitmentFreezeWeeks: 1 } }
    } as unknown as Heya);

    // Stub talentpool.fillVacanciesForNPC
    import("../talentpool").then(async (talentpool) => {
       const { vi } = await import("vitest");
       let calledWithVacancies: any = null;
       const spy = vi.spyOn(talentpool, "fillVacanciesForNPC").mockImplementation((w, vacancies) => {
         calledWithVacancies = vacancies;
       });

       import("../npcAI").then(m => {
         m.tickMonthly(world);

         expect(calledWithVacancies).toBeDefined();
         expect(calledWithVacancies["heya1"]).toBe(8); // target size is 8
         expect(calledWithVacancies["heya2"]).toBeUndefined(); // Frozen

         spy.mockRestore();
       });
    });
  });

  it("respects global active rikishi cap when recruiting", () => {
    const world = createMockWorld();

    // Create a ton of rikishi to hit the cap
    // heya count is 1. HARD_CAP_ROSTER_SIZE is 30. global cap is 30.
    for (let i = 0; i < 35; i++) {
       world.rikishi.set(`dummy_${i}`, { id: `dummy_${i}`, birthYear: world.year - 20 } as unknown as Rikishi);
    }

    const heya1 = world.heyas.get("heya1")!;
    heya1.rikishiIds = []; // Empty, needs recruits

    import("../talentpool").then(async (talentpool) => {
       const { vi } = await import("vitest");
       let called = false;
       const spy = vi.spyOn(talentpool, "fillVacanciesForNPC").mockImplementation(() => { called = true; });

       import("../npcAI").then(m => {
         m.tickMonthly(world);

         // Should not have been called because 35 >= 30
         expect(called).toBe(false);

         spy.mockRestore();
       });
    });
  });
});
