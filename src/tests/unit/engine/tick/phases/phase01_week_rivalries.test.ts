import { describe, it, expect, vi, beforeEach } from "vitest";
import { phase01_week_rivalries } from "../../../../../engine/tick/phases/phase01_week_rivalries";
import { MockFactory } from "../../../../helpers/utils/MockFactory";
import { resolveImpacts } from "../../../../../engine/core/ImpactResolver";
import {
  RIVALRY_DECAY_RATES,
  WEEKS_PER_YEAR,
  MAX_EVENT_AGE_WEEKS,
  RIVALRY_DECAY_THRESHOLDS,
  RIVALRY_PRUNING,
} from "../../../../../constants/engine/time";
import { type EngineEvent } from "../../../../../engine/types/events";

// Mock deriveTone to return a constant since we're testing the decay pipeline
vi.mock("../../../../../engine/systems/narrative/RivalryHeatService", () => ({
  deriveTone: vi.fn().mockReturnValue("respect"),
}));

describe("phase01_week_rivalries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rivalry Decay", () => {
    it("decays heat, closeness, and spite for a recently met pair (SHORT_TERM)", () => {
      const world = MockFactory.createWorld();
      world.calendar = {
        month: 1,
        currentWeek: 10,
        currentDay: 1,
        next: vi.fn(),
        clone: vi.fn() as any,
        cyclePhase: "basho",
      } as any;
      world.rivalriesState = {
        pairs: {
          id1_id2: {
            heat: 50,
            closeness: 30,
            spite: 40,
            meetings: 5,
            lastMetWeek: 8, // 2 weeks ago -> SHORT_TERM
            lastWinnerId: "id1",
            tone: "grudge",
          } as any,
        },
        pairIndex: {},
      } as any;

      const impact = phase01_week_rivalries(world);
      const nextWorld = resolveImpacts(world, [impact]);

      const pair = nextWorld.rivalriesState!.pairs["id1_id2"];
      expect(pair.heat).toBe(50 - RIVALRY_DECAY_RATES.HEAT.SHORT);
      expect(pair.closeness).toBe(30 - RIVALRY_DECAY_RATES.CLOSENESS);
      expect(pair.spite).toBe(40 - RIVALRY_DECAY_RATES.SPITE);
      expect(pair.tone).toBe("respect");
    });

    it("applies MEDIUM_TERM and LONG_TERM decay rates and clamps to zero", () => {
      const world = MockFactory.createWorld();
      world.calendar = {
        month: 1,
        currentWeek: 50,
        currentDay: 1,
        next: vi.fn(),
        clone: vi.fn() as any,
        cyclePhase: "basho",
      } as any;
      world.rivalriesState = {
        pairs: {
          med_pair: {
            heat: 10,
            closeness: 0.1, // will clamp to 0
            spite: 0.1, // will clamp to 0
            meetings: 5,
            lastMetWeek: 40, // 10 weeks ago -> MEDIUM_TERM
            lastWinnerId: "id1",
            tone: "grudge",
          } as any,
          long_pair: {
            heat: 10,
            closeness: 30,
            spite: 40,
            meetings: 5,
            lastMetWeek: 10, // 40 weeks ago -> LONG_TERM
            lastWinnerId: "id1",
            tone: "grudge",
          } as any,
        },
        pairIndex: {},
      } as any;

      const impact = phase01_week_rivalries(world);
      const nextWorld = resolveImpacts(world, [impact]);

      const medPair = nextWorld.rivalriesState!.pairs["med_pair"];
      expect(medPair.heat).toBe(10 - RIVALRY_DECAY_RATES.HEAT.MEDIUM);
      expect(medPair.closeness).toBe(0);
      expect(medPair.spite).toBe(0);

      const longPair = nextWorld.rivalriesState!.pairs["long_pair"];
      expect(longPair.heat).toBe(10 - RIVALRY_DECAY_RATES.HEAT.LONG);
    });

    it("skips decay for cold pairs", () => {
      const world = MockFactory.createWorld();
      world.calendar = {
        month: 1,
        currentWeek: 50,
        currentDay: 1,
        next: vi.fn(),
        clone: vi.fn() as any,
        cyclePhase: "basho",
      } as any;

      const heatThreshold = RIVALRY_PRUNING.MIN_HEAT;
      const meetingThreshold = RIVALRY_PRUNING.MIN_MEETINGS;

      world.rivalriesState = {
        pairs: {
          cold_pair: {
            heat: heatThreshold - 1, // Below minimum
            closeness: 10,
            spite: 10,
            meetings: meetingThreshold - 1, // Below minimum
            lastMetWeek: 50 - RIVALRY_DECAY_THRESHOLDS.LONG_TERM - 1, // Very old
            lastWinnerId: "id1",
            tone: "respect",
          } as any,
        },
        pairIndex: {},
      } as any;

      const impact = phase01_week_rivalries(world);
      const nextWorld = resolveImpacts(world, [impact]);

      // Should be completely untouched
      const coldPair = nextWorld.rivalriesState!.pairs["cold_pair"];
      expect(coldPair).toBeUndefined();
    });
  });

  describe("Event Log Trimming", () => {
    it("trims old standard events but keeps important ones", () => {
      const world = MockFactory.createWorld();
      const currentYear = 2025;
      const currentWeek = 10;
      const currentTotalWeeks = currentYear * WEEKS_PER_YEAR + currentWeek;

      world.year = currentYear;
      world.calendar = { month: 1, currentWeek: currentWeek } as any;

      const staleTotalWeeks = currentTotalWeeks - MAX_EVENT_AGE_WEEKS - 5;
      const staleYear = Math.floor(staleTotalWeeks / WEEKS_PER_YEAR);
      const staleWeek = staleTotalWeeks % WEEKS_PER_YEAR;

      const recentTotalWeeks = currentTotalWeeks - 1;
      const recentYear = Math.floor(recentTotalWeeks / WEEKS_PER_YEAR);
      const recentWeek = recentTotalWeeks % WEEKS_PER_YEAR;

      const oldUnimportantEvent: EngineEvent = {
        id: "old1",
        year: staleYear,
        week: staleWeek,
        category: "welfare",
        importance: "minor",
        type: "MEDICAL_REPORT",
      } as any;

      const oldHeadlineEvent: EngineEvent = {
        id: "old2",
        year: staleYear,
        week: staleWeek,
        category: "welfare",
        importance: "headline", // Should be kept
        type: "MEDICAL_REPORT",
      } as any;

      const oldBashoEvent: EngineEvent = {
        id: "old3",
        year: staleYear,
        week: staleWeek,
        category: "basho", // Should be kept
        importance: "minor",
        type: "BASHO_STATUS",
      } as any;

      const recentUnimportantEvent: EngineEvent = {
        id: "recent1",
        year: recentYear,
        week: recentWeek,
        category: "welfare", // Should be kept because it's recent
        importance: "minor",
        type: "MEDICAL_REPORT",
      } as any;

      world.events = {
        version: "1.0.0",
        log: [oldUnimportantEvent, oldHeadlineEvent, oldBashoEvent, recentUnimportantEvent],
        dedupe: {},
      };

      const impact = phase01_week_rivalries(world);
      const nextWorld = resolveImpacts(world, [impact]);

      const nextLog = nextWorld.events!.log;

      expect(nextLog.length).toBe(3);
      expect(nextLog.map((e) => e.id)).not.toContain("old1");
      expect(nextLog.map((e) => e.id)).toContain("old2");
      expect(nextLog.map((e) => e.id)).toContain("old3");
      expect(nextLog.map((e) => e.id)).toContain("recent1");
    });
  });
});
