import { describe, it, expect, beforeEach } from "vitest";
import { queryEvents, logEngineEvent, ensureEventsState, EventBus, tickWeek } from "../events";
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

  describe("EventBus", () => {
    let world: WorldState;

    beforeEach(() => {
      world = createMockWorld();
    });

    it("should log an injury event", () => {
      const event = EventBus.injury(world, "rikishi-1", "Sprained Ankle", "Ankle sprain during practice.", { severity: "moderate" });
      expect(event.type).toBe("INJURY_OCCURRED");
      expect(event.category).toBe("injury");
      expect(event.scope).toBe("rikishi");
      expect(event.rikishiId).toBe("rikishi-1");
      expect(event.importance).toBe("major"); // moderate severity
      expect(event.title).toBe("Sprained Ankle");
      expect(event.summary).toBe("Ankle sprain during practice.");
      expect(event.data?.severity).toBe("moderate");
      expect(event.tags).toContain("injury");
    });

    it("should log a severe injury event", () => {
      const event = EventBus.injury(world, "rikishi-2", "Broken Leg", "Leg break during bout.", { severity: "serious" });
      expect(event.importance).toBe("headline");
    });

    it("should log a minor injury event", () => {
      const event = EventBus.injury(world, "rikishi-3", "Scratch", "Small scratch.", { severity: "minor" });
      expect(event.importance).toBe("notable");
    });

    it("should log a recovery event", () => {
      const event = EventBus.recovery(world, "rikishi-1", "heya-1", "Fully recovered.");
      expect(event.type).toBe("INJURY_RECOVERED");
      expect(event.category).toBe("injury");
      expect(event.scope).toBe("rikishi");
      expect(event.rikishiId).toBe("rikishi-1");
      expect(event.heyaId).toBe("heya-1");
      expect(event.importance).toBe("notable");
      expect(event.title).toBe("Recovery complete");
      expect(event.summary).toBe("Fully recovered.");
      expect(event.tags).toContain("injury");
      expect(event.tags).toContain("recovery");
    });

    it("should log a governance event", () => {
      const event = EventBus.governance(world, "heya-1", "Fined", "Heya fined for poor conduct.", { amount: 50000 });
      expect(event.type).toBe("GOVERNANCE_RULING");
      expect(event.category).toBe("discipline");
      expect(event.scope).toBe("heya");
      expect(event.heyaId).toBe("heya-1");
      expect(event.importance).toBe("major"); // default
      expect(event.title).toBe("Fined");
      expect(event.summary).toBe("Heya fined for poor conduct.");
      expect(event.data?.amount).toBe(50000);
      expect(event.tags).toContain("governance");
    });

    it("should log a training milestone event", () => {
      const event = EventBus.trainingMilestone(world, "rikishi-1", "heya-1", "Strength Up", "Increased strength.");
      expect(event.type).toBe("TRAINING_MILESTONE");
      expect(event.category).toBe("training");
      expect(event.scope).toBe("rikishi");
      expect(event.rikishiId).toBe("rikishi-1");
      expect(event.heyaId).toBe("heya-1");
      expect(event.importance).toBe("notable");
      expect(event.title).toBe("Strength Up");
      expect(event.summary).toBe("Increased strength.");
      expect(event.tags).toContain("training");
    });

    it("should log a training profile changed event", () => {
      const event = EventBus.trainingProfileChanged(world, "heya-1", "Focus changed to endurance.");
      expect(event.type).toBe("TRAINING_PROFILE_CHANGED");
      expect(event.category).toBe("training");
      expect(event.scope).toBe("heya");
      expect(event.heyaId).toBe("heya-1");
      expect(event.importance).toBe("minor");
      expect(event.title).toBe("Training profile updated");
      expect(event.summary).toBe("Focus changed to endurance.");
      expect(event.tags).toContain("training");
    });

    it("should log a financial alert event", () => {
      const event = EventBus.financialAlert(world, "heya-1", "Low Funds", "Running out of money.");
      expect(event.type).toBe("FINANCIAL_ALERT");
      expect(event.category).toBe("economy");
      expect(event.scope).toBe("heya");
      expect(event.heyaId).toBe("heya-1");
      expect(event.importance).toBe("major");
      expect(event.title).toBe("Low Funds");
      expect(event.summary).toBe("Running out of money.");
      expect(event.tags).toContain("economy");
    });

    it("should log a headline financial alert event", () => {
      const event = EventBus.financialAlert(world, "heya-1", "Bankrupt", "Insolvent.", { insolvency: true });
      expect(event.importance).toBe("headline");
    });

    it("should log a kensho awarded event", () => {
      const event = EventBus.kenshoAwarded(world, "rikishi-1", "heya-1", 300000, 5);
      expect(event.type).toBe("KENSHO_AWARDED");
      expect(event.category).toBe("economy");
      expect(event.phase).toBe("basho_day");
      expect(event.scope).toBe("rikishi");
      expect(event.rikishiId).toBe("rikishi-1");
      expect(event.heyaId).toBe("heya-1");
      expect(event.importance).toBe("notable");
      expect(event.title).toBe("Kensho prize money");
      expect(event.summary).toBe("5 envelopes awarded (¥300,000).");
      expect(event.data?.amount).toBe(300000);
      expect(event.data?.envelopes).toBe(5);
      expect(event.tags).toContain("economy");
      expect(event.tags).toContain("kensho");
    });

    it("should log a minor kensho awarded event", () => {
      const event = EventBus.kenshoAwarded(world, "rikishi-1", "heya-1", 60000, 1);
      expect(event.importance).toBe("minor");
      expect(event.summary).toBe("1 envelope awarded (¥60,000).");
    });

    it("should log a rivalry escalated event", () => {
      const event = EventBus.rivalryEscalated(world, "rikishi-1", "rikishi-2", "hot", "fierce", "Tensions rise.");
      expect(event.type).toBe("RIVALRY_ESCALATED");
      expect(event.category).toBe("rivalry");
      expect(event.scope).toBe("world");
      expect(event.importance).toBe("major"); // hot
      expect(event.title).toBe("Rivalry intensifies (hot)");
      expect(event.summary).toBe("Tensions rise.");
      expect(event.data?.aId).toBe("rikishi-1");
      expect(event.data?.bId).toBe("rikishi-2");
      expect(event.data?.heatBand).toBe("hot");
      expect(event.data?.tone).toBe("fierce");
      expect(event.tags).toContain("rivalry");
    });

    it("should log an inferno rivalry escalated event", () => {
      const event = EventBus.rivalryEscalated(world, "r1", "r2", "inferno", "fierce", "Wow!");
      expect(event.importance).toBe("headline");
    });

    it("should log a default rivalry escalated event", () => {
      const event = EventBus.rivalryEscalated(world, "r1", "r2", "warm", "friendly", "Hmm.");
      expect(event.importance).toBe("notable");
    });

    it("should log a rivalry formed event", () => {
      const event = EventBus.rivalryFormed(world, "rikishi-1", "rikishi-2", "respectful", "A new rivalry starts.");
      expect(event.type).toBe("RIVALRY_FORMED");
      expect(event.category).toBe("rivalry");
      expect(event.scope).toBe("world");
      expect(event.importance).toBe("notable");
      expect(event.title).toBe("New rivalry emerges");
      expect(event.summary).toBe("A new rivalry starts.");
      expect(event.data?.aId).toBe("rikishi-1");
      expect(event.data?.bId).toBe("rikishi-2");
      expect(event.data?.tone).toBe("respectful");
      expect(event.tags).toContain("rivalry");
    });

    it("should log a retirement event", () => {
      const event = EventBus.retirement(world, "rikishi-1", "heya-1", "Taro", "Injury");
      expect(event.type).toBe("RETIREMENT");
      expect(event.category).toBe("career");
      expect(event.phase).toBe("basho_wrap");
      expect(event.scope).toBe("rikishi");
      expect(event.rikishiId).toBe("rikishi-1");
      expect(event.heyaId).toBe("heya-1");
      expect(event.importance).toBe("major");
      expect(event.title).toBe("Taro retires");
      expect(event.summary).toBe("Retirement reason: Injury.");
      expect(event.data?.reason).toBe("Injury");
      expect(event.tags).toContain("lifecycle");
      expect(event.tags).toContain("retirement");
    });

    it("should log a rookie debut event", () => {
      const event = EventBus.rookieDebut(world, "rikishi-1", "heya-1", "Jiro");
      expect(event.type).toBe("ROOKIE_DEBUT");
      expect(event.category).toBe("career");
      expect(event.scope).toBe("rikishi");
      expect(event.rikishiId).toBe("rikishi-1");
      expect(event.heyaId).toBe("heya-1");
      expect(event.importance).toBe("notable");
      expect(event.title).toBe("Jiro debuts");
      expect(event.summary).toBe("A new rikishi joins the ranks.");
      expect(event.tags).toContain("lifecycle");
      expect(event.tags).toContain("debut");
    });

    it("should log a scouting investment changed event", () => {
      const event = EventBus.scoutingInvestmentChanged(world, "rikishi-1", "high");
      expect(event.type).toBe("SCOUTING_INVESTMENT_CHANGED");
      expect(event.category).toBe("scouting");
      expect(event.scope).toBe("rikishi");
      expect(event.rikishiId).toBe("rikishi-1");
      expect(event.importance).toBe("minor");
      expect(event.title).toBe("Scouting investment updated");
      expect(event.summary).toBe("Investment level set to high.");
      expect(event.data?.level).toBe("high");
      expect(event.tags).toContain("scouting");
    });

    it("should log a basho started event", () => {
      const event = EventBus.bashoStarted(world, "hatsu");
      expect(event.type).toBe("BASHO_STARTED");
      expect(event.category).toBe("basho");
      expect(event.phase).toBe("basho_day");
      expect(event.scope).toBe("world");
      expect(event.importance).toBe("headline");
      expect(event.title).toBe("Hatsu Basho begins");
      expect(event.summary).toBe("The hatsu tournament has officially started.");
      expect(event.data?.bashoName).toBe("hatsu");
      expect(event.tags).toContain("basho");
    });

    it("should log a basho ended event", () => {
      const event = EventBus.bashoEnded(world, "hatsu", "rikishi-1", "Taro");
      expect(event.type).toBe("BASHO_ENDED");
      expect(event.category).toBe("basho");
      expect(event.phase).toBe("basho_wrap");
      expect(event.scope).toBe("world");
      expect(event.importance).toBe("headline");
      expect(event.title).toBe("Hatsu Basho concludes");
      expect(event.summary).toBe("Taro wins the Emperor's Cup.");
      expect(event.data?.bashoName).toBe("hatsu");
      expect(event.data?.yushoId).toBe("rikishi-1");
      expect(event.data?.yushoName).toBe("Taro");
      expect(event.tags).toContain("basho");
      expect(event.tags).toContain("yusho");
    });

    it("should log a basho day event", () => {
      const event = EventBus.bashoDay(world, 1);
      expect(event.type).toBe("BASHO_DAY_ADVANCED");
      expect(event.category).toBe("basho");
      expect(event.phase).toBe("basho_day");
      expect(event.scope).toBe("world");
      expect(event.importance).toBe("notable"); // day 1
      expect(event.title).toBe("Day 1");
      expect(event.summary).toBe("Tournament day 1 begins.");
      expect(event.data?.day).toBe(1);
      expect(event.tags).toContain("basho");
    });

    it("should log a major basho day event for day 15", () => {
      const event = EventBus.bashoDay(world, 15);
      expect(event.importance).toBe("major");
    });

    it("should log a minor basho day event for middle days", () => {
      const event = EventBus.bashoDay(world, 5);
      expect(event.importance).toBe("minor");
    });

    it("should log a welfare alert event", () => {
      const event = EventBus.welfareAlert(world, "heya-1", "Issue", "Problem found.");
      expect(event.type).toBe("WELFARE_ALERT");
      expect(event.category).toBe("welfare");
      expect(event.scope).toBe("heya");
      expect(event.heyaId).toBe("heya-1");
      expect(event.importance).toBe("major");
      expect(event.title).toBe("Issue");
      expect(event.summary).toBe("Problem found.");
      expect(event.tags).toContain("welfare");
    });

    it("should log a sanctioned welfare alert event", () => {
      const event = EventBus.welfareAlert(world, "heya-1", "Sanction", "You are punished.", { complianceState: "sanctioned" });
      expect(event.importance).toBe("headline");
    });

    it("should log a bout result event", () => {
      const event = EventBus.boutResult(world, "rikishi-1", "rikishi-2", "Yorikiri", 5);
      expect(event.type).toBe("BOUT_RESULT");
      expect(event.category).toBe("basho");
      expect(event.phase).toBe("basho_day");
      expect(event.scope).toBe("world");
      expect(event.importance).toBe("minor");
      expect(event.title).toBe("Bout concluded");
      expect(event.summary).toBe("Winner decided by Yorikiri.");
      expect(event.data?.winnerId).toBe("rikishi-1");
      expect(event.data?.loserId).toBe("rikishi-2");
      expect(event.data?.kimarite).toBe("Yorikiri");
      expect(event.data?.day).toBe(5);
      expect(event.tags).toContain("basho");
      expect(event.tags).toContain("bout");
    });
  });


  describe("tickWeek", () => {
    it("should return 0 as it is a placeholder", () => {
      const world = createMockWorld();
      expect(tickWeek(world)).toBe(0);
    });
  });
