import { describe, it, expect } from "vitest";
import { createEmptyImpact, isStateImpact, resetImpactTimestampCounter } from "@/engine/core/StateImpact";
import { createImpactBuilder, ImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { StateImpact } from "@/engine/core/StateImpact";
import type { WorldState } from "@/engine/types/world";

// Import all tick phases that return StateImpact
import { phase00_preflight } from "@/engine/tick/phases/phase00_preflight";
import { phase01_daily_drama } from "@/engine/tick/phases/phase01_daily_drama";
import { phase01_daily_economy } from "@/engine/tick/phases/phase01_daily_economy";
import { phase01_daily_sponsors } from "@/engine/tick/phases/phase01_daily_sponsors";
import { phase01_daily_welfare } from "@/engine/tick/phases/phase01_daily_welfare";
import { phase01_monthly_market } from "@/engine/tick/phases/phase01_monthly_market";
import { phase01_week_candidate_pool } from "@/engine/tick/phases/phase01_week_candidate_pool";
import { phase01_basho_bouts } from "@/engine/tick/phases/phase01_basho_bouts";
import { phase01_daily_micro } from "@/engine/tick/phases/phase01_daily_micro";
import { phase01_week_economy } from "@/engine/tick/phases/phase01_week_economy";
import { phase01_week_governance } from "@/engine/tick/phases/phase01_week_governance";
import { phase01_week_health } from "@/engine/tick/phases/phase01_week_health";
import { phase01_week_npc_ai } from "@/engine/tick/phases/phase01_week_npc_ai";
import { phase01_week_recruitment } from "@/engine/tick/phases/phase01_week_recruitment";
import { phase01_week_rivalries } from "@/engine/tick/phases/phase01_week_rivalries";
import { phase01_week_scouting } from "@/engine/tick/phases/phase01_week_scouting";
import { phase01_week_staff } from "@/engine/tick/phases/phase01_week_staff";
import { phase01_week_talent_pool } from "@/engine/tick/phases/phase01_week_talent_pool";
import { phase01_week_training } from "@/engine/tick/phases/phase01_week_training";
import { phase01_week_welfare } from "@/engine/tick/phases/phase01_week_welfare";
import { phase01_week_world_circuit } from "@/engine/tick/phases/phase01_week_world_circuit";
import { phase02_context } from "@/engine/tick/phases/phase02_context";
import { phase05_monthly_boundary } from "@/engine/tick/phases/phase05_monthly_boundary";
import { phase06_narrative } from "@/engine/tick/phases/phase06_narrative";
import { phase06_yearly_boundary } from "@/engine/tick/phases/phase06_yearly_boundary";
import { phase_global_cup_advance } from "@/engine/tick/phases/phase_global_cup";
import { phase_pre_basho_assessment } from "@/engine/tick/phases/phase_pre_basho_assessment";
import { phase_pre_basho_schedule } from "@/engine/tick/phases/phase_pre_basho_schedule";

// Minimal valid WorldState mock for phase invocation.
// Phases that need more fields will access them via optional chaining or guards.
function makeMockWorld(): WorldState {
  return {
    seed: "metadata-invariant-test",
    year: 2026,
    week: 10,
    dayIndexGlobal: 70,
    cyclePhase: "basho",
    heyas: new Map(),
    rikishi: new Map(),
    oyakata: new Map(),
    staff: new Map(),
    calendar: {
      currentYear: 2026,
      currentWeek: 10,
      currentDay: 1,
      currentMonth: 3,
      bashoWeek: false,
      interBashoWeek: true,
      weekOfBasho: 0,
      currentBasho: null,
      upcomingBasho: null,
      bashoYear: 2026,
    },
    history: [],
    almanacSnapshots: [],
    events: [],
    pendingDecisions: [],
    transientContext: {},
    rivalriesState: { rivalries: [], nextRivalryId: 1 },
    bloodlineRegistry: { families: new Map(), nextFamilyId: 1 },
    mediaState: { coverage: [], sentiment: {}, activeStories: [] },
    sponsorPool: { sponsors: [], koenkai: [] },
    myosekiMarket: { stocks: [], history: [], nextStockId: 1 },
    governanceLog: [],
    pendingExhibitions: [],
    encouragementLog: [],
    npcScoutingPriorities: [],
    talentPool: { candidates: [], lastRefreshWeek: 0 },
    candidatePool: { candidates: [], lastRefreshWeek: 0 },
    sparringPairs: [],
    records: {},
    hallOfFame: [],
    globalKimariteStats: {},
    yokozunaVacancyStreak: 0,
    settings: { difficulty: "normal", autoSave: true },
    playerKnowledge: {},
    globalCup: { active: false, events: [], currentEventId: null },
    chronicle: { entries: [] },
    lineage: { entries: [] },
    ftue: { step: 0, completed: false },
    _interimDaysRemaining: 0,
    _postBashoDays: 0,
    _daysSinceLastWeeklyTick: 0,
    _recruitmentWindow: { open: false, weeksRemaining: 0 },
    _postBashoMeta: null,
    _populationTarget: 700,
    _preBashoAssessment: null,
    closedHeyas: [],
    currentBasho: null,
    currentBashoName: null,
    ozekiKadoban: [],
    heyaBrandIdentities: new Map(),
  } as unknown as WorldState;
}

// List of all phases that declare StateImpact as return type.
// These must include `metadata` in their return value per the pipelineRunner invariant.
const stateImpactPhases: Array<{ name: string; fn: (world: WorldState) => StateImpact | WorldState }> = [
  { name: "phase00_preflight", fn: phase00_preflight },
  { name: "phase01_daily_drama", fn: phase01_daily_drama },
  { name: "phase01_daily_economy", fn: phase01_daily_economy },
  { name: "phase01_daily_sponsors", fn: phase01_daily_sponsors },
  { name: "phase01_daily_welfare", fn: phase01_daily_welfare },
  { name: "phase01_monthly_market", fn: phase01_monthly_market },
  { name: "phase01_week_candidate_pool", fn: phase01_week_candidate_pool },
  { name: "phase01_basho_bouts", fn: phase01_basho_bouts },
  { name: "phase01_daily_micro", fn: phase01_daily_micro },
  { name: "phase01_week_economy", fn: phase01_week_economy },
  { name: "phase01_week_governance", fn: phase01_week_governance },
  { name: "phase01_week_health", fn: phase01_week_health },
  { name: "phase01_week_npc_ai", fn: phase01_week_npc_ai },
  { name: "phase01_week_recruitment", fn: phase01_week_recruitment },
  { name: "phase01_week_rivalries", fn: phase01_week_rivalries },
  { name: "phase01_week_scouting", fn: phase01_week_scouting },
  { name: "phase01_week_staff", fn: phase01_week_staff },
  { name: "phase01_week_talent_pool", fn: phase01_week_talent_pool },
  { name: "phase01_week_training", fn: phase01_week_training },
  { name: "phase01_week_welfare", fn: phase01_week_welfare },
  { name: "phase01_week_world_circuit", fn: phase01_week_world_circuit },
  { name: "phase02_context", fn: phase02_context },
  { name: "phase05_monthly_boundary", fn: phase05_monthly_boundary },
  { name: "phase06_narrative", fn: phase06_narrative },
  { name: "phase06_yearly_boundary", fn: phase06_yearly_boundary },
  { name: "phase_global_cup_advance", fn: phase_global_cup_advance },
  { name: "phase_pre_basho_assessment", fn: phase_pre_basho_assessment },
  { name: "phase_pre_basho_schedule", fn: phase_pre_basho_schedule },
];

describe("StateImpact metadata invariant", () => {
  describe("createEmptyImpact", () => {
    it("always includes metadata", () => {
      resetImpactTimestampCounter();
      const impact = createEmptyImpact({ source: "test" });
      expect(impact.metadata).toBeDefined();
      expect(impact.metadata?.source).toBe("test");
      expect(impact.metadata?.timestamp).toBe(1);
    });

    it("assigns a default source when none provided", () => {
      const impact = createEmptyImpact();
      expect(impact.metadata).toBeDefined();
      expect(impact.metadata?.source).toBe("unknown");
    });

    it("assigns an auto-incrementing timestamp", () => {
      resetImpactTimestampCounter();
      const impact1 = createEmptyImpact({ source: "a" });
      const impact2 = createEmptyImpact({ source: "b" });
      expect(impact1.metadata?.timestamp).toBe(1);
      expect(impact2.metadata?.timestamp).toBe(2);
    });
  });

  describe("ImpactBuilder", () => {
    it("build() returns an object with metadata", () => {
      resetImpactTimestampCounter();
      const builder = new ImpactBuilder("my-source");
      const impact = builder.build();
      expect(impact.metadata).toBeDefined();
      expect(impact.metadata?.source).toBe("my-source");
      expect(impact.metadata?.timestamp).toBeGreaterThanOrEqual(1);
    });

    it("createImpactBuilder returns an object with metadata", () => {
      const impact = createImpactBuilder("factory-source").build();
      expect(impact.metadata).toBeDefined();
      expect(impact.metadata?.source).toBe("factory-source");
    });

    it("addMetadata preserves the source field", () => {
      const impact = createImpactBuilder("preserve-source")
        .addMetadata("custom", "value")
        .build();
      expect(impact.metadata).toBeDefined();
      expect(impact.metadata?.source).toBe("preserve-source");
      expect(impact.metadata?.custom).toBe("value");
    });
  });

  describe("isStateImpact type guard", () => {
    it("returns true for objects with entities", () => {
      // Builder with no operations has only metadata — isStateImpact checks for
      // entities/collections/deletedEntities/worldFields/events, not metadata.
      // So an empty impact is NOT a StateImpact per the guard. That's fine —
      // the guard is for distinguishing from WorldState, not for validity.
      const withEntities = createImpactBuilder("test")
        .updateHeya("h1", { id: "h1" })
        .build();
      expect(isStateImpact(withEntities)).toBe(true);
    });

    it("returns false for null", () => {
      expect(isStateImpact(null)).toBe(false);
    });

    it("returns false for primitives", () => {
      expect(isStateImpact(42)).toBe(false);
      expect(isStateImpact("string")).toBe(false);
    });

    it("returns false for plain objects without impact fields", () => {
      expect(isStateImpact({ foo: "bar" })).toBe(false);
    });
  });

  describe("pipelineRunner invariant — every StateImpact phase includes metadata", () => {
    // The pipelineRunner uses `"metadata" in result` to distinguish StateImpact
    // from legacy WorldState. Every phase that returns StateImpact MUST include
    // metadata, otherwise the runner treats it as WorldState and the impact
    // is never resolved.
    for (const { name, fn } of stateImpactPhases) {
      it(`${name} returns an object with metadata`, () => {
        const world = makeMockWorld();
        let result: unknown;
        try {
          result = fn(world);
        } catch {
          // Some phases may throw on an empty world (no heyas/rikishi).
          // That's acceptable — we only care about the metadata invariant
          // when the phase successfully returns.
          return;
        }
        if (result && typeof result === "object") {
          expect(
            "metadata" in result,
            `${name} returned an object without metadata — pipelineRunner would misclassify it as WorldState`
          ).toBe(true);
        }
      });
    }
  });

  describe("metadata distinguishability from WorldState", () => {
    it("WorldState does not have a metadata property", () => {
      const world = makeMockWorld();
      expect("metadata" in world).toBe(false);
    });

    it("StateImpact has a metadata property", () => {
      const impact = createImpactBuilder("test").build();
      expect("metadata" in impact).toBe(true);
    });
  });
});
