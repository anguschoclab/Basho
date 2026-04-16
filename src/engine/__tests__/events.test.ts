/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from "vitest";
import {
  ensureEventsState,
  logEngineEvent,
  queryEvents,
  EventBus,
  tickWeekEvents,
} from "../events";
import type { WorldState } from "../types/world";

const createMockWorld = (): WorldState =>
  ({
    year: 2025,
    week: 1,
    calendar: { year: 2025, month: 1, currentWeek: 1, currentDay: 1 },
    seed: "test-seed",
    events: undefined,
  }) as unknown as WorldState;

describe("events.ts - Core Bus", () => {
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
        type: "TEST_EVENT" as any,
        category: "career",
        title: "Test Event",
        summary: "This is a test event.",
        data: {},
      });

      expect(event.id).toBeDefined();
      expect(event.id.startsWith("EV-")).toBe(true);
      expect(event.type).toBe("TEST_EVENT");
      expect(event.year).toBe(2025);
      expect(event.week).toBe(1);

      expect(world.events?.log.length).toBe(1);
      expect(world.events?.log[0]).toBe(event);
    });

    it("prevents duplicates based on dedupe key", () => {
      const world = createMockWorld();

      const event1 = logEngineEvent(world, {
        type: "TEST_DUPE" as any,
        category: "career",
        title: "Duplicate Me",
        summary: "A test.",
        dedupeKey: "explicit-key-1",
        data: {},
      });

      const event2 = logEngineEvent(world, {
        type: "TEST_DUPE" as any,
        category: "career",
        title: "Duplicate Me Again",
        summary: "Another test.",
        dedupeKey: "explicit-key-1", // Same key!
        data: {},
      });

      expect(world.events?.log.length).toBe(1);
      expect(event2).toBe(event1);
    });

    it("generates predictable default dedupe keys avoiding double logging in same week", () => {
      const world = createMockWorld();

      const event1 = logEngineEvent(world, {
        type: "AUTO_DUPE" as any,
        category: "career",
        title: "Auto",
        summary: "A",
        heyaId: "h1",
        data: {},
      });

      const event2 = logEngineEvent(world, {
        type: "AUTO_DUPE" as any,
        category: "career",
        title: "Auto", // Same title, same type, same heya, same week = same default dedupe key
        summary: "B",
        heyaId: "h1",
        data: {},
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
        type: "E1" as any,
        category: "career",
        title: "T1",
        summary: "S1",
        dedupeKey: "k1",
        data: {},
      });
      world.events!.log[0].year = 2024;

      // Newer event
      logEngineEvent(world, {
        type: "E2" as any,
        category: "basho",
        title: "T2",
        summary: "S2",
        dedupeKey: "k2",
        data: {},
      });

      // Same time event
      logEngineEvent(world, {
        type: "E3" as any,
        category: "career",
        title: "T3",
        summary: "S3",
        dedupeKey: "k3",
        data: {},
      });

      const results = queryEvents(world, {});

      expect(results.length).toBe(3);
      // Newest should be E2/E3 (2025), oldest E1 (2024)
      // Since sorting is newest-first, E1 (2024) should be at index 2 (last)
      expect(results[2].year).toBe(2024);
    });

    it("filters by category", () => {
      const world = createMockWorld();
      logEngineEvent(world, {
        type: "E1" as any,
        category: "injury",
        title: "T1",
        summary: "S1",
        dedupeKey: "k1",
        data: {},
      });
      logEngineEvent(world, {
        type: "E2" as any,
        category: "career",
        title: "T2",
        summary: "S2",
        dedupeKey: "k2",
        data: {},
      });

      const results = queryEvents(world, { category: "injury" });
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((e) => e.type === "E1")).toBe(true);
    });

    it("filters by minImportance", () => {
      const world = createMockWorld();
      logEngineEvent(world, {
        type: "E1" as any,
        category: "injury",
        importance: "minor",
        title: "T1",
        summary: "S1",
        dedupeKey: "k1",
        data: {},
      });
      logEngineEvent(world, {
        type: "E2" as any,
        category: "injury",
        importance: "headline",
        title: "T2",
        summary: "S2",
        dedupeKey: "k2",
        data: {},
      });

      const results = queryEvents(world, { minImportance: "major" });
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((e) => e.type === "E2")).toBe(true);
    });
  });
});

describe("events.ts - Helpers & Cleanup", () => {
  describe("EventBus", () => {
    it("wraps logEngineEvent correctly for standard domains", () => {
      const world = createMockWorld();

      const injuryEvent = EventBus.medicalReportBase(
        world,
        {
          rikishiId: "r1",
          heyaId: "h1",
          shikona: "Test",
          status: "injury",
          score: 5,
        },
        "headline"
      );
      expect(injuryEvent.category).toBe("injury");
      expect(injuryEvent.importance).toBe("headline");

      const bashoEvent = EventBus.bashoStatus(world, {
        status: "started",
        day: 1,
        reason: "hatsu",
      });
      expect(bashoEvent.type).toBe("BASHO_STATUS");
      expect(bashoEvent.data?.status).toBe("started");

      expect(world.events?.log.length).toBe(2);
    });
  });

  describe("tickWeekEvents", () => {
    it("trims old minor events but keeps recent, headline, or career/basho ones", () => {
      const world = createMockWorld();
      ensureEventsState(world);

      // 1. Very old, minor, non-career -> Should be trimmed
      world.events!.log.push({
        id: "evt-1",
        type: "TRAINING_MILESTONE" as any,
        category: "training",
        importance: "minor",
        year: 2020,
        week: 1,
        month: 1,
        phase: "weekly",
        scope: "world",
        title: "Old",
        summary: "Old",
        data: {},
        tags: [],
        truthLevel: "public",
      });
      world.events!.dedupe["2020|1|TRAINING_MILESTONE|world|||Old"] = true;

      // 2. Very old, but headline -> Should be kept
      world.events!.log.push({
        id: "evt-2",
        type: "FINANCIAL_ALERT",
        category: "economy",
        importance: "headline",
        year: 2020,
        week: 1,
        month: 1,
        phase: "weekly",
        scope: "world",
        title: "Old Headline",
        summary: "Old",
        data: {},
        tags: [],
        truthLevel: "public",
      });
      world.events!.dedupe["2020|1|FINANCIAL_ALERT|world|||Old Headline"] = true;

      // 3. Very old, but career -> Should be kept
      world.events!.log.push({
        id: "evt-3",
        type: "RETIREMENT" as any,
        category: "career",
        importance: "minor",
        year: 2020,
        week: 1,
        month: 1,
        phase: "weekly",
        scope: "world",
        title: "Old Career",
        summary: "Old",
        data: {},
        tags: [],
        truthLevel: "public",
      });
      world.events!.dedupe["2020|1|RETIREMENT|world|||Old Career"] = true;

      // 4. Recent minor -> Should be kept
      world.events!.log.push({
        id: "evt-4",
        type: "TRAINING_MILESTONE" as any,
        category: "training",
        importance: "minor",
        year: 2025,
        week: 1,
        month: 1,
        phase: "weekly",
        scope: "world", // Same as current year
        title: "Recent",
        summary: "Recent",
        data: {},
        tags: [],
        truthLevel: "public",
      });
      world.events!.dedupe["2025|1|TRAINING_MILESTONE|world|||Recent"] = true;

      const trimmed = tickWeekEvents(world);

      expect(trimmed).toBe(1);
      expect(world.events!.log.length).toBe(3);
      expect(world.events!.log.find((e) => e.id === "evt-1")).toBeUndefined();
      expect(world.events!.log.find((e) => e.id === "evt-2")).toBeDefined();
      expect(world.events!.log.find((e) => e.id === "evt-3")).toBeDefined();
      expect(world.events!.log.find((e) => e.id === "evt-4")).toBeDefined();

      // Check dedupe cleanup
      expect(world.events!.dedupe["2020|1|TRAINING_MILESTONE|world|||Old"]).toBeUndefined();
    });
  });

  describe("EventBus - Expanded Factories", () => {
    it("emits OYAKATA_MOOD_SHIFT via oyakataMoodShift factory", () => {
      const world = createMockWorld();
      EventBus.oyakataMoodShift(world, "h1", { oldMood: "content", newMood: "furious" });

      const events = queryEvents(world, { category: "narrative" });
      expect(events.length).toBe(1);
      expect(events[0].type).toBe("OYAKATA_MOOD_SHIFT");
      expect(events[0].data?.newMood).toBe("furious");
    });

    it("emits NPC_MANAGER_DECISION via managementDecision factory", () => {
      const world = createMockWorld();
      EventBus.managementDecision(
        world,
        "h1",
        { intensity: "punishing", reasoning: "Test" },
        "notable"
      );

      const events = queryEvents(world, { category: "training" });
      expect(events.length).toBe(1);
      expect(events[0].type).toBe("NPC_MANAGER_DECISION");
      expect(events[0].importance).toBe("notable");
    });

    it("emits FACILITY_UPGRADED via facilityUpdate factory", () => {
      const world = createMockWorld();
      EventBus.facilityUpdate(world, "h1", { axis: "training", newLevel: 50 }, "UPGRADED");

      const events = queryEvents(world, { category: "facility" });
      expect(events.length).toBe(1);
      expect(events[0].type).toBe("FACILITY_UPGRADED");
      expect(events[0].data?.axis).toBe("training");
    });

    it("emits LIFECYCLE_EVENT via lifecycleAction factory", () => {
      const world = createMockWorld();
      EventBus.lifecycleAction(
        world,
        { rikishiId: "r1", status: "naturalization" },
        "naturalization"
      );

      const events = queryEvents(world, { category: "career" });
      expect(events.length).toBe(1);
      expect(events[0].type).toBe("LIFECYCLE_EVENT");
      expect(events[0].data?.status).toBe("naturalization");
    });
  });
});
