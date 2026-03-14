import { describe, it, expect, beforeEach } from "vitest";
import { queryEvents, logEngineEvent, ensureEventsState, tickWeek, EventBus } from "../events";
import type { WorldState } from "../types/world";
import type { EngineEvent, EventCategory, EventScope, EventImportance } from "../types/events";

function createMockWorld(): WorldState {
  return {
    seed: "test-seed",
    calendar: {
      year: 2025,
      month: 1,
      currentWeek: 1,
      currentDay: 1,
    },
    events: { version: "1.0.0", log: [], dedupe: {} }
  } as unknown as WorldState;
}

describe("Events Engine", () => {
  describe("ensureEventsState", () => {
    it("should initialize events state if it does not exist", () => {
      const world = {} as WorldState;
      const state = ensureEventsState(world);
      expect(state).toBeDefined();
      expect(state.version).toBe("1.0.0");
      expect(state.log).toEqual([]);
      expect(state.dedupe).toEqual({});
      expect(world.events).toBe(state);
    });

    it("should return existing events state if valid", () => {
      const existingState = { version: "1.0.0", log: [], dedupe: {} };
      const world = { events: existingState } as unknown as WorldState;
      const state = ensureEventsState(world);
      expect(state).toBe(existingState);
    });
  });


  describe("EventBus", () => {
    let world: WorldState;

    beforeEach(() => {
      world = createMockWorld();
      world.calendar = {
        year: 2025,
        month: 1,
        currentWeek: 2,
        currentDay: 1,
      };
    });

    it("injury should log an INJURY_OCCURRED event", () => {
      EventBus.injury(world, "r1", "Title", "Summary", { severity: "serious" });
      const ev = world.events.log[0];
      expect(ev.type).toBe("INJURY_OCCURRED");
      expect(ev.category).toBe("injury");
      expect(ev.importance).toBe("headline");
      expect(ev.scope).toBe("rikishi");
      expect(ev.rikishiId).toBe("r1");
      expect(ev.tags).toContain("injury");
    });

    it("recovery should log an INJURY_RECOVERED event", () => {
      EventBus.recovery(world, "r1", "h1", "Summary");
      const ev = world.events.log[0];
      expect(ev.type).toBe("INJURY_RECOVERED");
      expect(ev.category).toBe("injury");
      expect(ev.importance).toBe("notable");
      expect(ev.scope).toBe("rikishi");
      expect(ev.rikishiId).toBe("r1");
      expect(ev.heyaId).toBe("h1");
      expect(ev.tags).toContain("recovery");
    });

    it("governance should log a GOVERNANCE_RULING event", () => {
      EventBus.governance(world, "h1", "Title", "Summary", { ruling: "ok" });
      const ev = world.events.log[0];
      expect(ev.type).toBe("GOVERNANCE_RULING");
      expect(ev.category).toBe("discipline");
      expect(ev.importance).toBe("major"); // Default
      expect(ev.scope).toBe("heya");
      expect(ev.heyaId).toBe("h1");
      expect(ev.tags).toContain("governance");
    });

    it("trainingMilestone should log a TRAINING_MILESTONE event", () => {
      EventBus.trainingMilestone(world, "r1", "h1", "Title", "Summary", { param: 1 });
      const ev = world.events.log[0];
      expect(ev.type).toBe("TRAINING_MILESTONE");
      expect(ev.category).toBe("training");
      expect(ev.importance).toBe("notable");
      expect(ev.scope).toBe("rikishi");
      expect(ev.rikishiId).toBe("r1");
      expect(ev.heyaId).toBe("h1");
      expect(ev.tags).toContain("training");
    });

    it("trainingProfileChanged should log a TRAINING_PROFILE_CHANGED event", () => {
      EventBus.trainingProfileChanged(world, "h1", "Summary");
      const ev = world.events.log[0];
      expect(ev.type).toBe("TRAINING_PROFILE_CHANGED");
      expect(ev.category).toBe("training");
      expect(ev.importance).toBe("minor");
      expect(ev.scope).toBe("heya");
      expect(ev.heyaId).toBe("h1");
      expect(ev.tags).toContain("training");
    });

    it("financialAlert should log a FINANCIAL_ALERT event", () => {
      EventBus.financialAlert(world, "h1", "Title", "Summary", { insolvency: true });
      const ev = world.events.log[0];
      expect(ev.type).toBe("FINANCIAL_ALERT");
      expect(ev.category).toBe("economy");
      expect(ev.importance).toBe("headline");
      expect(ev.scope).toBe("heya");
      expect(ev.heyaId).toBe("h1");
      expect(ev.tags).toContain("economy");
    });

    it("kenshoAwarded should log a KENSHO_AWARDED event", () => {
      EventBus.kenshoAwarded(world, "r1", "h1", 1000, 6);
      const ev = world.events.log[0];
      expect(ev.type).toBe("KENSHO_AWARDED");
      expect(ev.category).toBe("economy");
      expect(ev.phase).toBe("basho_day");
      expect(ev.importance).toBe("notable");
      expect(ev.scope).toBe("rikishi");
      expect(ev.rikishiId).toBe("r1");
      expect(ev.heyaId).toBe("h1");
      expect(ev.data).toEqual({ amount: 1000, envelopes: 6 });
      expect(ev.tags).toContain("kensho");
    });

    it("rivalryEscalated should log a RIVALRY_ESCALATED event", () => {
      EventBus.rivalryEscalated(world, "r1", "r2", "inferno", "bitter", "Summary");
      const ev = world.events.log[0];
      expect(ev.type).toBe("RIVALRY_ESCALATED");
      expect(ev.category).toBe("rivalry");
      expect(ev.importance).toBe("headline");
      expect(ev.scope).toBe("world");
      expect(ev.data).toEqual({ aId: "r1", bId: "r2", heatBand: "inferno", tone: "bitter" });
      expect(ev.tags).toContain("rivalry");
    });

    it("rivalryFormed should log a RIVALRY_FORMED event", () => {
      EventBus.rivalryFormed(world, "r1", "r2", "friendly", "Summary");
      const ev = world.events.log[0];
      expect(ev.type).toBe("RIVALRY_FORMED");
      expect(ev.category).toBe("rivalry");
      expect(ev.importance).toBe("notable");
      expect(ev.scope).toBe("world");
      expect(ev.data).toEqual({ aId: "r1", bId: "r2", tone: "friendly" });
      expect(ev.tags).toContain("rivalry");
    });

    it("retirement should log a RETIREMENT event", () => {
      EventBus.retirement(world, "r1", "h1", "Name", "Reason");
      const ev = world.events.log[0];
      expect(ev.type).toBe("RETIREMENT");
      expect(ev.category).toBe("career");
      expect(ev.importance).toBe("major");
      expect(ev.phase).toBe("basho_wrap");
      expect(ev.scope).toBe("rikishi");
      expect(ev.rikishiId).toBe("r1");
      expect(ev.heyaId).toBe("h1");
      expect(ev.data).toEqual({ reason: "Reason" });
      expect(ev.tags).toContain("retirement");
    });

    it("rookieDebut should log a ROOKIE_DEBUT event", () => {
      EventBus.rookieDebut(world, "r1", "h1", "Name");
      const ev = world.events.log[0];
      expect(ev.type).toBe("ROOKIE_DEBUT");
      expect(ev.category).toBe("career");
      expect(ev.importance).toBe("notable");
      expect(ev.scope).toBe("rikishi");
      expect(ev.rikishiId).toBe("r1");
      expect(ev.heyaId).toBe("h1");
      expect(ev.tags).toContain("debut");
    });

    it("scoutingInvestmentChanged should log a SCOUTING_INVESTMENT_CHANGED event", () => {
      EventBus.scoutingInvestmentChanged(world, "r1", "high");
      const ev = world.events.log[0];
      expect(ev.type).toBe("SCOUTING_INVESTMENT_CHANGED");
      expect(ev.category).toBe("scouting");
      expect(ev.importance).toBe("minor");
      expect(ev.scope).toBe("rikishi");
      expect(ev.rikishiId).toBe("r1");
      expect(ev.data).toEqual({ level: "high" });
      expect(ev.tags).toContain("scouting");
    });

    it("bashoStarted should log a BASHO_STARTED event", () => {
      EventBus.bashoStarted(world, "Hatsu");
      const ev = world.events.log[0];
      expect(ev.type).toBe("BASHO_STARTED");
      expect(ev.category).toBe("basho");
      expect(ev.importance).toBe("headline");
      expect(ev.phase).toBe("basho_day");
      expect(ev.scope).toBe("world");
      expect(ev.data).toEqual({ bashoName: "Hatsu" });
      expect(ev.tags).toContain("basho");
    });

    it("bashoEnded should log a BASHO_ENDED event", () => {
      EventBus.bashoEnded(world, "Hatsu", "r1", "YushoName");
      const ev = world.events.log[0];
      expect(ev.type).toBe("BASHO_ENDED");
      expect(ev.category).toBe("basho");
      expect(ev.importance).toBe("headline");
      expect(ev.phase).toBe("basho_wrap");
      expect(ev.scope).toBe("world");
      expect(ev.data).toEqual({ bashoName: "Hatsu", yushoId: "r1", yushoName: "YushoName" });
      expect(ev.tags).toContain("yusho");
    });

    it("bashoDay should log a BASHO_DAY_ADVANCED event", () => {
      EventBus.bashoDay(world, 15);
      const ev = world.events.log[0];
      expect(ev.type).toBe("BASHO_DAY_ADVANCED");
      expect(ev.category).toBe("basho");
      expect(ev.importance).toBe("major");
      expect(ev.phase).toBe("basho_day");
      expect(ev.scope).toBe("world");
      expect(ev.data).toEqual({ day: 15 });
      expect(ev.tags).toContain("basho");
    });

    it("welfareAlert should log a WELFARE_ALERT event", () => {
      EventBus.welfareAlert(world, "h1", "Title", "Summary", { complianceState: "sanctioned" });
      const ev = world.events.log[0];
      expect(ev.type).toBe("WELFARE_ALERT");
      expect(ev.category).toBe("welfare");
      expect(ev.importance).toBe("headline");
      expect(ev.scope).toBe("heya");
      expect(ev.heyaId).toBe("h1");
      expect(ev.data).toEqual({ complianceState: "sanctioned" });
      expect(ev.tags).toContain("welfare");
    });

    it("boutResult should log a BOUT_RESULT event", () => {
      EventBus.boutResult(world, "r1", "r2", "yorikiri", 5);
      const ev = world.events.log[0];
      expect(ev.type).toBe("BOUT_RESULT");
      expect(ev.category).toBe("basho");
      expect(ev.importance).toBe("minor");
      expect(ev.phase).toBe("basho_day");
      expect(ev.scope).toBe("world");
      expect(ev.data).toEqual({ winnerId: "r1", loserId: "r2", kimarite: "yorikiri", day: 5 });
      expect(ev.tags).toContain("bout");
    });
  });


  describe("logEngineEvent", () => {
    let world: WorldState;

    beforeEach(() => {
      world = createMockWorld();
    });

    it("should log a new event with generated ID and dedupeKey", () => {
      const event = logEngineEvent(world, {
        type: "TEST_EVENT",
        category: "misc" as EventCategory,
        title: "Test Title",
        summary: "Test Summary",
      });

      expect(event).toBeDefined();
      expect(event.id).toMatch(/^evt-[0-9a-f]+$/);
      expect(event.type).toBe("TEST_EVENT");
      expect(event.title).toBe("Test Title");
      expect(event.category).toBe("misc");
      expect(world.events.log).toHaveLength(1);
      expect(world.events.log[0]).toBe(event);
    });

    it("should deduplicate events with the same dedupeKey", () => {
      const params = {
        type: "DEDUPE_EVENT",
        category: "misc" as EventCategory,
        title: "Dedupe Title",
        summary: "Dedupe Summary",
        dedupeKey: "explicit-key"
      };

      const event1 = logEngineEvent(world, params);
      const event2 = logEngineEvent(world, params);

      expect(world.events.log).toHaveLength(1);
      expect(event1).toBe(event2); // returns the same event handle
    });
  });

  describe("tickWeek", () => {
    let world: WorldState;

    beforeEach(() => {
      world = createMockWorld();
      world.calendar!.year = 2025;
      world.calendar!.currentWeek = 1;

      const addEvent = (overrides: Partial<EngineEvent>) => {
        const ev: EngineEvent = {
          id: `evt-${world.events.log.length}`,
          type: "TEST",
          year: 2025,
          week: 1,
          day: 1,
          phase: "weekly",
          category: "misc",
          importance: "minor",
          scope: "world",
          title: "Test",
          summary: "Test",
          data: {},
          truthLevel: "public",
          ...overrides
        };
        world.events.log.push(ev);

        // Also seed dedupe explicitly so we can verify cleanup
        world.events.dedupe[`${ev.year}|${ev.week}|TEST_DEDUPE`] = true;
      };

      // Add a recent event (1 week old)
      addEvent({ year: 2025, week: 52 }); // 1 week old

      // Add an old event (> 52 weeks) that should be trimmed
      addEvent({ year: 2023, week: 50 }); // > 52 weeks old

      // Add an old event that is 'headline' importance (should be kept)
      addEvent({ year: 2023, week: 1, importance: "headline" });

      // Add an old event that is 'career' category (should be kept)
      addEvent({ year: 2023, week: 2, category: "career" });

      // Add an old event that is 'basho' category (should be kept)
      addEvent({ year: 2023, week: 3, category: "basho" });
    });

    it("should return 0 and do nothing if events log is empty", () => {
      world.events.log = [];
      const trimmed = tickWeek(world);
      expect(trimmed).toBe(0);
      expect(world.events.log).toHaveLength(0);
    });

    it("should trim events older than 52 weeks that are not headline, career, or basho", () => {
      expect(world.events.log).toHaveLength(5);

      const trimmed = tickWeek(world);

      expect(trimmed).toBe(1); // Only the 2023 week 50 one should be trimmed
      expect(world.events.log).toHaveLength(4);

      // Ensure the trimmed event is gone
      expect(world.events.log.find(e => e.year === 2023 && e.week === 50)).toBeUndefined();

      // Ensure the preserved events are still there
      expect(world.events.log.find(e => e.year === 2025 && e.week === 52)).toBeDefined(); // Recent
      expect(world.events.log.find(e => e.importance === "headline")).toBeDefined(); // Headline
      expect(world.events.log.find(e => e.category === "career")).toBeDefined(); // Career
      expect(world.events.log.find(e => e.category === "basho")).toBeDefined(); // Basho
    });

    it("should clean up corresponding dedupe keys when trimming events", () => {
      const trimmed = tickWeek(world);

      expect(trimmed).toBe(1);
      // The dedupe key for year 2023, week 50 should be removed
      expect(world.events.dedupe["2023|50|TEST_DEDUPE"]).toBeUndefined();

      // Dedupe keys for other events should remain
      expect(world.events.dedupe["2025|52|TEST_DEDUPE"]).toBe(true);
      expect(world.events.dedupe["2023|1|TEST_DEDUPE"]).toBe(true);
      expect(world.events.dedupe["2023|2|TEST_DEDUPE"]).toBe(true);
      expect(world.events.dedupe["2023|3|TEST_DEDUPE"]).toBe(true);
    });
  });

  describe("queryEvents", () => {
    let world: WorldState;

    beforeEach(() => {
      world = createMockWorld();

      // Helper to add events directly for querying tests
      const addEvent = (overrides: Partial<EngineEvent>) => {
        const ev: EngineEvent = {
          id: `evt-${world.events.log.length}`,
          type: "DEFAULT",
          year: 2025,
          week: 1,
          day: 1,
          phase: "weekly",
          category: "misc" as EventCategory,
          importance: "minor" as EventImportance,
          scope: "world" as EventScope,
          title: "Test",
          summary: "Test",
          data: {},
          truthLevel: "public",
          ...overrides
        };
        world.events.log.push(ev);
      };

      // Populate events with various properties
      addEvent({ id: "1", category: "training", scope: "rikishi", heyaId: "h1", rikishiId: "r1", type: "TRAIN_1", importance: "minor", year: 2025, week: 1, day: 1 });
      addEvent({ id: "2", category: "injury", scope: "heya", heyaId: "h1", type: "INJURY_1", importance: "notable", year: 2025, week: 1, day: 2 });
      addEvent({ id: "3", category: "economy", scope: "world", type: "ECON_1", importance: "major", year: 2025, week: 2, day: 1 });
      addEvent({ id: "4", category: "training", scope: "heya", heyaId: "h2", type: "TRAIN_2", importance: "headline", year: 2025, week: 2, day: 2 });
      addEvent({ id: "5", category: "basho", scope: "rikishi", heyaId: "h2", rikishiId: "r2", type: "BASHO_1", importance: "minor", year: 2026, week: 1, day: 1 });
    });

    it("should return all events if no filters are provided (up to limit)", () => {
      const results = queryEvents(world, {});
      expect(results).toHaveLength(5);
    });

    it("should filter by category", () => {
      const results = queryEvents(world, { category: "training" });
      expect(results).toHaveLength(2);
      expect(results.every(e => e.category === "training")).toBe(true);
    });

    it("should filter by scope", () => {
      const results = queryEvents(world, { scope: "rikishi" });
      expect(results).toHaveLength(2);
      expect(results.every(e => e.scope === "rikishi")).toBe(true);
    });

    it("should filter by heyaId", () => {
      const results = queryEvents(world, { heyaId: "h1" });
      expect(results).toHaveLength(2);
      expect(results.every(e => e.heyaId === "h1")).toBe(true);
    });

    it("should filter by rikishiId", () => {
      const results = queryEvents(world, { rikishiId: "r2" });
      expect(results).toHaveLength(1);
      expect(results[0].rikishiId).toBe("r2");
    });

    it("should filter by types", () => {
      const results = queryEvents(world, { types: ["INJURY_1", "ECON_1"] });
      expect(results).toHaveLength(2);
      const types = results.map(e => e.type);
      expect(types).toContain("INJURY_1");
      expect(types).toContain("ECON_1");
    });

    it("should filter by minImportance", () => {
      // minImportance: "notable" -> "notable", "major", "headline"
      const results = queryEvents(world, { minImportance: "notable" });
      expect(results).toHaveLength(3);
      const importances = results.map(e => e.importance);
      expect(importances).not.toContain("minor");
      expect(importances).toContain("notable");
      expect(importances).toContain("major");
      expect(importances).toContain("headline");
    });

    it("should respect limit parameter", () => {
      const results = queryEvents(world, { limit: 2 });
      expect(results).toHaveLength(2);
    });

    it("should combine multiple filters", () => {
      const results = queryEvents(world, { heyaId: "h1", category: "injury" });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("2");
    });

    it("should sort results newest-first by year, week, day, then reverse id insertion", () => {
      const results = queryEvents(world, {});
      // Newest should be id: "5" (year 2026)
      // Next: id: "4" (year 2025, week 2, day 2)
      // Next: id: "3" (year 2025, week 2, day 1)
      // Next: id: "2" (year 2025, week 1, day 2)
      // Next: id: "1" (year 2025, week 1, day 1)
      const ids = results.map(e => e.id);
      expect(ids).toEqual(["5", "4", "3", "2", "1"]);
    });

    it("should sort newest-first when year/week/day are identical by using reverse ID localeCompare", () => {
      world.events.log = [];
      const addEv = (id: string) => {
        world.events.log.push({
          id,
          type: "SAME_DATE",
          year: 2025,
          week: 1,
          day: 1,
          phase: "weekly",
          category: "misc",
          importance: "minor",
          scope: "world",
          title: "Test",
          summary: "Test",
          data: {},
          truthLevel: "public",
        } as EngineEvent);
      };

      // Add events with same date
      addEv("A");
      addEv("B");
      addEv("C");

      const results = queryEvents(world, {});
      const ids = results.map(e => e.id);
      // Expected reverse ID order if dates are identical: "C", "B", "A"
      expect(ids).toEqual(["C", "B", "A"]);
    });
  });
});
