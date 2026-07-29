import { describe, it, expect } from "vitest";
import {
  ensureEventsState,
  logEngineEvent,
  queryEvents,
  EventBus,
  tickWeekEvents,
} from "@/engine/events";
import { MockFactory } from "../../../helpers/utils/MockFactory";
import type { EngineEventType, EventsState } from "@/engine/types/events";
import type { WorldState } from "@/engine/types/world";

describe("events.test.ts - Core Bus", () => {
  describe("ensureEventsState", () => {
    it("initializes missing events state on world", () => {
      // Create world and manually break type for initialization test
      const world = MockFactory.createWorld() as unknown as WorldState;
      // We use a cast here because the interface says it's required,
      // but we want to test the defensive initialization.
      (world as unknown as { events: unknown }).events = undefined;

      const eventsState = ensureEventsState(world);

      expect(eventsState).toBeDefined();
      expect(eventsState.version).toBe("1.0.0");
      expect(Array.isArray(eventsState.log)).toBe(true);
      expect(eventsState.dedupe).toBeDefined();

      // Modifies original object reference
      expect(world.events).toBe(eventsState);
    });

    it("returns existing events state if already present", () => {
      const world = MockFactory.createWorld();
      const existingState: EventsState = { version: "1.0.0", log: [], dedupe: {} };
      world.events = existingState;

      const eventsState = ensureEventsState(world);
      expect(eventsState).toBe(existingState);
    });
  });

  describe("logEngineEvent", () => {
    it("appends a new event and returns it", () => {
      const world = MockFactory.createWorld();

      const event = logEngineEvent(world, {
        type: "GOVERNANCE_RULING" as EngineEventType,
        category: "career",
        title: "Test Event",
        summary: "This is a test event.",
        data: {},
      });

      expect(event.id).toBeDefined();
      expect(event.id.startsWith("EV-")).toBe(true);
      expect(event.type).toBe("GOVERNANCE_RULING");
      expect(event.year).toBe(world.year);
      expect(event.week).toBe(world.week);

      expect(world.events.log.length).toBe(1);
      expect(world.events.log[0]).toBe(event);
    });

    it("prevents duplicates based on dedupe key", () => {
      const world = MockFactory.createWorld();

      const event1 = logEngineEvent(world, {
        type: "GOVERNANCE_RULING" as EngineEventType,
        category: "career",
        title: "Duplicate Me",
        summary: "A test.",
        dedupeKey: "explicit-key-1",
        data: {},
      });

      const event2 = logEngineEvent(world, {
        type: "GOVERNANCE_RULING" as EngineEventType,
        category: "career",
        title: "Duplicate Me Again",
        summary: "Another test.",
        dedupeKey: "explicit-key-1", // Same key!
        data: {},
      });

      expect(world.events.log.length).toBe(1);
      expect(event2).toBe(event1);
    });

    it("generates predictable default dedupe keys avoiding double logging in same week", () => {
      const world = MockFactory.createWorld();

      const event1 = logEngineEvent(world, {
        type: "GOVERNANCE_RULING" as EngineEventType,
        category: "career",
        title: "Auto",
        summary: "A",
        heyaId: "h1",
        data: {},
      });

      const event2 = logEngineEvent(world, {
        type: "GOVERNANCE_RULING" as EngineEventType,
        category: "career",
        title: "Auto", // Same title, same type, same heya, same week = same default dedupe key
        summary: "B",
        heyaId: "h1",
        data: {},
      });

      expect(world.events.log.length).toBe(1);
      expect(event2).toBe(event1);
    });
  });

  describe("queryEvents", () => {
    it("filters and sorts events newest-first", () => {
      const world = MockFactory.createWorld();
      world.year = 2025;

      // Older event
      logEngineEvent(world, {
        type: "GOVERNANCE_RULING" as EngineEventType,
        category: "career",
        title: "T1",
        summary: "S1",
        dedupeKey: "k1",
        data: {},
      });
      world.events.log[0].year = 2024;

      // Newer event
      logEngineEvent(world, {
        type: "BASHO_STATUS" as EngineEventType,
        category: "basho",
        title: "T2",
        summary: "S2",
        dedupeKey: "k2",
        data: {},
      });

      // Same time event
      logEngineEvent(world, {
        type: "GOVERNANCE_RULING" as EngineEventType,
        category: "career",
        title: "T3",
        summary: "S3",
        dedupeKey: "k3",
        data: {},
      });

      const results = queryEvents(world, {});

      expect(results.length).toBe(3);
      // Newest should be 2025, oldest 2024
      expect(results[2].year).toBe(2024);
    });

    it("filters by category", () => {
      const world = MockFactory.createWorld();
      logEngineEvent(world, {
        type: "GOVERNANCE_RULING" as EngineEventType,
        category: "injury",
        title: "T1",
        summary: "S1",
        dedupeKey: "k1",
        data: {},
      });
      logEngineEvent(world, {
        type: "GOVERNANCE_RULING" as EngineEventType,
        category: "career",
        title: "T2",
        summary: "S2",
        dedupeKey: "k2",
        data: {},
      });

      const results = queryEvents(world, { category: "injury" });
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((e) => e.category === "injury")).toBe(true);
    });

    it("filters by minImportance", () => {
      const world = MockFactory.createWorld();
      logEngineEvent(world, {
        type: "GOVERNANCE_RULING" as EngineEventType,
        category: "injury",
        importance: "minor",
        title: "T1",
        summary: "S1",
        dedupeKey: "k1",
        data: {},
      });
      logEngineEvent(world, {
        type: "GOVERNANCE_RULING" as EngineEventType,
        category: "injury",
        importance: "headline",
        title: "T2",
        summary: "S2",
        dedupeKey: "k2",
        data: {},
      });

      const results = queryEvents(world, { minImportance: "major" });
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((e) => e.importance === "headline")).toBe(true);
    });
  });
});

describe("events.test.ts - Helpers & Cleanup", () => {
  describe("EventBus", () => {
    it("wraps logEngineEvent correctly for standard domains", () => {
      const world = MockFactory.createWorld();

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

      expect(world.events.log.length).toBe(2);
    });
  });

  describe("tickWeekEvents", () => {
    it("trims old minor events but keeps recent, headline, or career/basho ones", () => {
      const world = MockFactory.createWorld();
      world.year = 2025;
      ensureEventsState(world);
      const events = world.events;

      // 1. Very old, minor, non-career -> Should be trimmed
      events.log.push({
        id: "evt-1",
        type: "TRAINING_MILESTONE" as EngineEventType,
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
      events.dedupe["2020|1|TRAINING_MILESTONE|world|||Old"] = true;

      // 2. Very old, but headline -> Should be kept
      events.log.push({
        id: "evt-2",
        type: "FINANCIAL_ALERT" as EngineEventType,
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
      events.dedupe["2020|1|FINANCIAL_ALERT|world|||Old Headline"] = true;

      // 3. Very old, but career -> Should be kept
      events.log.push({
        id: "evt-3",
        type: "LIFECYCLE_EVENT" as EngineEventType,
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
      events.dedupe["2020|1|LIFECYCLE_EVENT|world|||Old Career"] = true;

      // 4. Recent minor -> Should be kept
      events.log.push({
        id: "evt-4",
        type: "TRAINING_MILESTONE" as EngineEventType,
        category: "training",
        importance: "minor",
        year: 2025,
        week: 1,
        month: 1,
        phase: "weekly",
        scope: "world",
        title: "Recent",
        summary: "Recent",
        data: {},
        tags: [],
        truthLevel: "public",
      });
      events.dedupe["2025|1|TRAINING_MILESTONE|world|||Recent"] = true;

      const trimmed = tickWeekEvents(world);

      expect(trimmed).toBe(1);
      expect(events.log.length).toBe(3);
      expect(events.log.find((e) => e.id === "evt-1")).toBeUndefined();
      expect(events.log.find((e) => e.id === "evt-2")).toBeDefined();
      expect(events.log.find((e) => e.id === "evt-3")).toBeDefined();
      expect(events.log.find((e) => e.id === "evt-4")).toBeDefined();

      // Check dedupe cleanup
      expect(events.dedupe["2020|1|TRAINING_MILESTONE|world|||Old"]).toBeUndefined();
    });
  });

  describe("EventBus - Expanded Factories", () => {
    it("emits OYAKATA_MOOD_SHIFT via oyakataMoodShift factory", () => {
      const world = MockFactory.createWorld();
      EventBus.oyakataMoodShift(world, "h1", { oldMood: "content", newMood: "furious" });

      const events = queryEvents(world, { category: "narrative" });
      expect(events.length).toBe(1);
      expect(events[0].type).toBe("OYAKATA_MOOD_SHIFT");
      expect(events[0].data?.newMood).toBe("furious");
    });

    it("emits NPC_MANAGER_DECISION via managementDecision factory", () => {
      const world = MockFactory.createWorld();
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
      const world = MockFactory.createWorld();
      EventBus.facilityUpdate(world, "h1", { axis: "training", newLevel: 50 }, "UPGRADED");

      const events = queryEvents(world, { category: "facility" });
      expect(events.length).toBe(1);
      expect(events[0].type).toBe("FACILITY_UPGRADED");
      expect(events[0].data?.axis).toBe("training");
    });

    it("emits LIFECYCLE_EVENT via lifecycleAction factory", () => {
      const world = MockFactory.createWorld();
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

    it("emits GOVERNANCE_RULING via governanceRuling factory", () => {
      const world = MockFactory.createWorld();
      EventBus.governanceRuling(world, "h1", {
        decision: "ban",
        reason: "Scandal",
        incident: "drugs",
      });

      const events = queryEvents(world, { category: "discipline" });
      expect(events.length).toBe(1);
      expect(events[0].type).toBe("GOVERNANCE_RULING");
    });

    it("governanceRuling event has correct heyaId in scope", () => {
      const world = MockFactory.createWorld();
      EventBus.governanceRuling(world, "h1", {
        decision: "suspension",
        reason: "Misconduct",
        incident: "assault",
      });

      const events = queryEvents(world, { category: "discipline" });
      expect(events.length).toBe(1);
      expect(events[0].scope).toBe("heya");
      expect(events[0].heyaId).toBe("h1");
    });

    it("governanceRuling event title and summary are non-empty strings", () => {
      const world = MockFactory.createWorld();
      EventBus.governanceRuling(world, "h1", {
        decision: "warning",
        reason: "Tardiness",
        incident: "discipline",
      });

      const events = queryEvents(world, { category: "discipline" });
      expect(events.length).toBe(1);
      expect(typeof events[0].title).toBe("string");
      expect(events[0].title.length).toBeGreaterThan(0);
      expect(typeof events[0].summary).toBe("string");
      expect(events[0].summary.length).toBeGreaterThan(0);
    });

    it("governanceRuling enriches context with heya name and oyakata name", () => {
      const world = MockFactory.createWorld({
        heyas: new Map([
          ["h1", MockFactory.createHeya("h1", { name: "Isegahama", oyakataId: "o1" })],
        ]),
        oyakata: new Map([
          ["o1", { id: "o1", name: "Master Isegahama", shikona: "Isegahama-Oyakata" } as any],
        ]),
      });
      EventBus.governanceRuling(world, "h1", {
        decision: "ban",
        reason: "Scandal",
        incident: "drugs",
      });

      const events = queryEvents(world, { category: "discipline" });
      expect(events.length).toBe(1);
      expect(events[0].data?.heya).toBe("Isegahama");
      expect(events[0].data?.oyakata).toBe("Master Isegahama");
    });
  });
});
