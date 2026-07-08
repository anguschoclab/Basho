import { describe, it, expect, beforeEach } from "vitest";
import { narrativeEventMap } from "@/engine/bard/narrativeEventMap";
import { BardEngine } from "@/engine/bard/BardEngine";
import { rngFromSeed } from "@/engine/rng";
import type { EngineEventType, EventImportance } from "@/engine/types/events";

const VALID_EVENT_TYPES: EngineEventType[] = [
  "BOUT_RESOLVED",
  "RECRUIT_DISCOVERED",
  "MONTHLY_FINANCE_REPORT",
  "MANAGEMENT_DECISION",
  "STRATEGY_SHIFT",
  "RIVALRY_HEAT_SPIKE",
  "SPARRING_RIVALRY_SEEDED",
  "MEDICAL_REPORT",
  "TRAINING_UPDATE",
  "TRAINING_STAT_DELTA",
  "GOVERNANCE_RULING",
  "FINANCIAL_ALERT",
  "AWARD_CONFERRED",
  "LIFECYCLE_EVENT",
  "RETIREMENT_ANNOUNCED",
  "BASHO_STATUS",
  "WELFARE_COMPLIANCE",
  "OYAKATA_MOOD_SHIFT",
  "NPC_MANAGER_DECISION",
  "NARRATIVE_STRATEGY_SHIFT",
  "FACILITY_UPGRADED",
  "FACILITY_DEGRADED",
  "ROSTER_OVERFLOW_RELEASE",
  "PROMOTION_DELIBERATION",
  "GLOBAL_CUP",
  "GLOBAL_CUP_START",
  "GLOBAL_CUP_FINALE",
  "CONSTRUCTION_STARTED",
  "CONSTRUCTION_COMPLETED",
  "KESHO_CREATED",
  "KESHO_UPGRADED",
  "YOKOZUNA_TSUNA_CREATED",
  "KESHO_MAWASHI_CREATED",
  "NARRATIVE_CRISIS_TRIGGERED",
  "MENTOR_MENTEE_BOUT",
  "DECISION_AUTO_RESOLVED",
  "DECISION_RESOLVED",
];

const VALID_IMPORTANCES: EventImportance[] = ["minor", "notable", "major", "headline"];

const EXPECTED_KEYS = [
  "championship_celebration",
  "yokozuna_promotion",
  "retirement_ceremony",
  "underdog_victory",
  "media_spotlight",
  "legacy_milestone",
] as const;

describe("narrativeEventMap", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  describe("structure", () => {
    it("exports entries for all expected event types", () => {
      for (const key of EXPECTED_KEYS) {
        expect(narrativeEventMap[key]).toBeDefined();
      }
    });

    it("each entry has eventType, titlePath, summaryPath, and importance", () => {
      for (const key of EXPECTED_KEYS) {
        const entry = narrativeEventMap[key];
        expect(entry).toBeDefined();
        expect(typeof entry!.eventType).toBe("string");
        expect(typeof entry!.titlePath).toBe("string");
        expect(typeof entry!.summaryPath).toBe("string");
        expect(typeof entry!.importance).toBe("string");
      }
    });

    it("eventType values are valid EngineEventType strings", () => {
      for (const key of EXPECTED_KEYS) {
        const entry = narrativeEventMap[key];
        expect(VALID_EVENT_TYPES).toContain(entry!.eventType);
      }
    });

    it("importance values are valid EventImportance strings", () => {
      for (const key of EXPECTED_KEYS) {
        const entry = narrativeEventMap[key];
        expect(VALID_IMPORTANCES).toContain(entry!.importance);
      }
    });
  });

  describe("template resolution", () => {
    const ctx = {
      shikona: "TestRikishi",
      rikishiId: "r-test",
      heya: "TestHeya",
      heyaId: "heya-test",
    };

    it("all titlePath templates resolve to non-empty text", () => {
      const rng = rngFromSeed("test-map", "narrative", "title");
      for (const key of EXPECTED_KEYS) {
        const entry = narrativeEventMap[key];
        const res = BardEngine.resolve(rng, entry!.titlePath, ctx);
        expect(res.text.length).toBeGreaterThan(0);
      }
    });

    it("all summaryPath templates resolve to non-empty text", () => {
      const rng = rngFromSeed("test-map", "narrative", "summary");
      for (const key of EXPECTED_KEYS) {
        const entry = narrativeEventMap[key];
        const res = BardEngine.resolve(rng, entry!.summaryPath, ctx);
        expect(res.text.length).toBeGreaterThan(0);
      }
    });

    it("no resolved title contains [MISSING: tokens", () => {
      const rng = rngFromSeed("test-map", "narrative", "title-missing");
      for (const key of EXPECTED_KEYS) {
        const entry = narrativeEventMap[key];
        const res = BardEngine.resolve(rng, entry!.titlePath, ctx);
        expect(res.text).not.toContain("[MISSING:");
      }
    });

    it("no resolved summary contains [MISSING: tokens", () => {
      const rng = rngFromSeed("test-map", "narrative", "summary-missing");
      for (const key of EXPECTED_KEYS) {
        const entry = narrativeEventMap[key];
        const res = BardEngine.resolve(rng, entry!.summaryPath, ctx);
        expect(res.text).not.toContain("[MISSING:");
      }
    });

    it("no resolved title has token leakage (% or {{)", () => {
      const rng = rngFromSeed("test-map", "narrative", "title-leak");
      for (const key of EXPECTED_KEYS) {
        const entry = narrativeEventMap[key];
        const res = BardEngine.resolve(rng, entry!.titlePath, ctx);
        expect(res.text).not.toContain("%");
        expect(res.text).not.toContain("{{");
      }
    });

    it("no resolved summary has token leakage (% or {{)", () => {
      const rng = rngFromSeed("test-map", "narrative", "summary-leak");
      for (const key of EXPECTED_KEYS) {
        const entry = narrativeEventMap[key];
        const res = BardEngine.resolve(rng, entry!.summaryPath, ctx);
        expect(res.text).not.toContain("%");
        expect(res.text).not.toContain("{{");
      }
    });
  });
});
