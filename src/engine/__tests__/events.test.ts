import { describe, it, expect, beforeEach } from "vitest";
import { queryEvents, logEngineEvent, ensureEventsState } from "../events";
import type { WorldState, EngineEvent, EventCategory, EventScope, EventImportance } from "../types";

function createMockWorld(): WorldState {
  return {
    seed: "test-seed",
    calendar: {
      year: 2024,
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

  describe("queryEvents", () => {
    let world: WorldState;

    beforeEach(() => {
      world = createMockWorld();

      // Helper to add events directly for querying tests
      const addEvent = (overrides: Partial<EngineEvent>) => {
        const ev: EngineEvent = {
          id: `evt-${world.events.log.length}`,
          type: "DEFAULT",
          year: 2024,
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
      addEvent({ id: "1", category: "training", scope: "rikishi", heyaId: "h1", rikishiId: "r1", type: "TRAIN_1", importance: "minor", year: 2024, week: 1, day: 1 });
      addEvent({ id: "2", category: "injury", scope: "heya", heyaId: "h1", type: "INJURY_1", importance: "notable", year: 2024, week: 1, day: 2 });
      addEvent({ id: "3", category: "economy", scope: "world", type: "ECON_1", importance: "major", year: 2024, week: 2, day: 1 });
      addEvent({ id: "4", category: "training", scope: "heya", heyaId: "h2", type: "TRAIN_2", importance: "headline", year: 2024, week: 2, day: 2 });
      addEvent({ id: "5", category: "basho", scope: "rikishi", heyaId: "h2", rikishiId: "r2", type: "BASHO_1", importance: "minor", year: 2025, week: 1, day: 1 });
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
      // Newest should be id: "5" (year 2025)
      // Next: id: "4" (year 2024, week 2, day 2)
      // Next: id: "3" (year 2024, week 2, day 1)
      // Next: id: "2" (year 2024, week 1, day 2)
      // Next: id: "1" (year 2024, week 1, day 1)
      const ids = results.map(e => e.id);
      expect(ids).toEqual(["5", "4", "3", "2", "1"]);
    });

    it("should sort newest-first when year/week/day are identical by using reverse ID localeCompare", () => {
      world.events.log = [];
      const addEv = (id: string) => {
        world.events.log.push({
          id,
          type: "SAME_DATE",
          year: 2024,
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
