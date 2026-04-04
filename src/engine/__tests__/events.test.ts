import { describe, it, expect } from "vitest";
import {
  ensureEventsState,
  logEngineEvent,
  queryEvents,
  EventBus,
  tickWeekEvents
} from "../events";
import type { WorldState } from "../types/world";
import type { EngineEvent } from "../types/events";

describe("events.ts - Core Bus", () => {
  const createMockWorld = (): WorldState => ({
    year: 2025,
    week: 1,
    calendar: { year: 2025, month: 1, currentWeek: 1, currentDay: 1 },
    seed: "test-seed",
    events: undefined
  } as unknown as WorldState);

  describe("ensureEventsState", () => {
    it("initializes missing events state on world", () => {
      const world = createMockWorld();
      const eventsState = ensureEventsState(world);

      expect(eventsState).toBeDefined();
      expect(eventsState.version).toBe("1.0.0");
      expect(Array.isArray(eventsState.log)).toBe(true);
      expect(eventsState.dedupe).toBeDefined();

      // Modifies original object reference
      expect(world.events).toBe(eventsState);
    });

    it("returns existing events state if already present", () => {
      const world = createMockWorld();
      world.events = { version: "1.0.0", log: [], dedupe: {} };

      const eventsState = ensureEventsState(world);
      expect(eventsState).toBe(world.events);
    });
  });

  describe("logEngineEvent", () => {
    it("appends a new event and returns it", () => {
      const world = createMockWorld();

      const event = logEngineEvent(world, {
        type: "TEST_EVENT",
        category: "career",
        title: "Test Event",
        summary: "This is a test event.",
      });

      expect(event.id).toBeDefined();
      expect(event.id.startsWith("evt-")).toBe(true);
      expect(event.type).toBe("TEST_EVENT");
      expect(event.year).toBe(2025);
      expect(event.week).toBe(1);

      expect(world.events?.log.length).toBe(1);
      expect(world.events?.log[0]).toBe(event);
    });

    it("prevents duplicates based on dedupe key", () => {
      const world = createMockWorld();

      const event1 = logEngineEvent(world, {
        type: "TEST_DUPE",
        category: "career",
        title: "Duplicate Me",
        summary: "A test.",
        dedupeKey: "explicit-key-1"
      });

      const event2 = logEngineEvent(world, {
        type: "TEST_DUPE",
        category: "career",
        title: "Duplicate Me Again",
        summary: "Another test.",
        dedupeKey: "explicit-key-1" // Same key!
      });

      expect(world.events?.log.length).toBe(1);
      expect(event2).toBe(event1);
    });

    it("generates predictable default dedupe keys avoiding double logging in same week", () => {
       const world = createMockWorld();

       const event1 = logEngineEvent(world, {
         type: "AUTO_DUPE",
         category: "career",
         title: "Auto",
         summary: "A",
         heyaId: "h1"
       });

       const event2 = logEngineEvent(world, {
         type: "AUTO_DUPE",
         category: "career",
         title: "Auto", // Same title, same type, same heya, same week = same default dedupe key
         summary: "B",
         heyaId: "h1"
       });

       expect(world.events?.log.length).toBe(1);
       expect(event2).toBe(event1);
    });
  });

  describe("queryEvents", () => {
    it("filters and sorts events newest-first", () => {
      const world = createMockWorld();

      // Older event
      logEngineEvent(world, {
        type: "E1", category: "career", title: "T1", summary: "S1", dedupeKey: "k1"
      });
      world.events!.log[0].year = 2024;

      // Newer event
      logEngineEvent(world, {
        type: "E2", category: "basho", title: "T2", summary: "S2", dedupeKey: "k2"
      });

      // Same time event
      logEngineEvent(world, {
        type: "E3", category: "career", title: "T3", summary: "S3", dedupeKey: "k3"
      });

      const results = queryEvents(world, {});

      expect(results.length).toBe(3);
      // Newest should be E2/E3 (2025), oldest E1 (2024)
      expect(results[2].type).toBe("E1");
    });

    it("filters by category", () => {
      const world = createMockWorld();
      logEngineEvent(world, { type: "E1", category: "injury", title: "T1", summary: "S1", dedupeKey: "k1" });
      logEngineEvent(world, { type: "E2", category: "career", title: "T2", summary: "S2", dedupeKey: "k2" });

      const results = queryEvents(world, { category: "injury" });
      expect(results.length).toBe(1);
      expect(results[0].type).toBe("E1");
    });

    it("filters by minImportance", () => {
      const world = createMockWorld();
      logEngineEvent(world, { type: "E1", category: "injury", importance: "minor", title: "T1", summary: "S1", dedupeKey: "k1" });
      logEngineEvent(world, { type: "E2", category: "injury", importance: "headline", title: "T2", summary: "S2", dedupeKey: "k2" });

      const results = queryEvents(world, { minImportance: "major" });
      expect(results.length).toBe(1);
      expect(results[0].type).toBe("E2");
    });
  });
});

describe("events.ts - Helpers & Cleanup", () => {
  const createMockWorld = (): WorldState => ({
    year: 2025,
    week: 1,
    calendar: { year: 2025, month: 1, currentWeek: 1, currentDay: 1 },
    seed: "test-seed",
    events: undefined
  } as unknown as WorldState);

  describe("EventBus", () => {
    it("wraps logEngineEvent correctly for standard domains", () => {
      const world = createMockWorld();

      const injuryEvent = EventBus.injury(world, "r1", "Hurt", "He hurt his leg", { severity: "serious" });
      expect(injuryEvent.category).toBe("injury");
      expect(injuryEvent.importance).toBe("headline");

      const bashoEvent = EventBus.bashoStarted(world, "hatsu");
      expect(bashoEvent.type).toBe("BASHO_STARTED");
      expect(bashoEvent.data?.bashoName).toBe("hatsu");

      expect(world.events?.log.length).toBe(2);
    });
  });

  describe("tickWeekEvents", () => {
    it("trims old minor events but keeps recent, headline, or career/basho ones", () => {
      const world = createMockWorld();
      ensureEventsState(world);

      // 1. Very old, minor, non-career -> Should be trimmed
      world.events!.log.push({
        id: "evt-1", type: "OLD_MINOR", category: "training", importance: "minor",
        year: 2020, week: 1, month: 1, phase: "weekly", scope: "world",
        title: "Old", summary: "Old", data: {}, tags: [], truthLevel: "public"
      });
      world.events!.dedupe["2020|1|OLD_MINOR|world|||Old"] = true;

      // 2. Very old, but headline -> Should be kept
      world.events!.log.push({
        id: "evt-2", type: "OLD_HEADLINE", category: "economy", importance: "headline",
        year: 2020, week: 1, month: 1, phase: "weekly", scope: "world",
        title: "Old Headline", summary: "Old", data: {}, tags: [], truthLevel: "public"
      });
      world.events!.dedupe["2020|1|OLD_HEADLINE|world|||Old Headline"] = true;

      // 3. Very old, but career -> Should be kept
      world.events!.log.push({
        id: "evt-3", type: "OLD_CAREER", category: "career", importance: "minor",
        year: 2020, week: 1, month: 1, phase: "weekly", scope: "world",
        title: "Old Career", summary: "Old", data: {}, tags: [], truthLevel: "public"
      });
      world.events!.dedupe["2020|1|OLD_CAREER|world|||Old Career"] = true;

      // 4. Recent minor -> Should be kept
      world.events!.log.push({
        id: "evt-4", type: "RECENT_MINOR", category: "training", importance: "minor",
        year: 2025, week: 1, month: 1, phase: "weekly", scope: "world", // Same as current year
        title: "Recent", summary: "Recent", data: {}, tags: [], truthLevel: "public"
      });
      world.events!.dedupe["2025|1|RECENT_MINOR|world|||Recent"] = true;

      const trimmed = tickWeekEvents(world);

      expect(trimmed).toBe(1);
      expect(world.events!.log.length).toBe(3);
      expect(world.events!.log.find(e => e.id === "evt-1")).toBeUndefined();
      expect(world.events!.log.find(e => e.id === "evt-2")).toBeDefined();
      expect(world.events!.log.find(e => e.id === "evt-3")).toBeDefined();
      expect(world.events!.log.find(e => e.id === "evt-4")).toBeDefined();

      // Check dedupe cleanup
      expect(world.events!.dedupe["2020|1|OLD_MINOR|world|||Old"]).toBeUndefined();
      // Even though we keep headline/career, dedupe keys might still get cleaned depending on implementation logic.
      // But it definitely cleans the trimmed one.
    });
  });
});
