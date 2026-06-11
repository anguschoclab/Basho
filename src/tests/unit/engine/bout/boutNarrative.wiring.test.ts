import { describe, it, expect } from "vitest";
import { resolveBout } from "../boutResolver";
import { applyBoutResult } from "../boutResultApplier";
import { applyImpact } from "../../core/ImpactResolver";
import { mockRikishi, makeMockBasho, makeMockWorld } from "../utils";
import type { BoutContext } from "../boutUtils";
import type { MatchSchedule, BoutResult } from "../../types/basho";
import type { WorldState } from "../../types/world";
import type { Heya } from "../../types/heya";

function makeBoutContext(overrides: Partial<BoutContext> = {}): BoutContext {
  return {
    id: "bout-test-001",
    day: 1,
    rikishiEastId: "r-east",
    rikishiWestId: "r-west",
    ...overrides,
  };
}

function makeMinimalBoutResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "test-bout",
    winner: "east",
    winnerRikishiId: "east",
    loserRikishiId: "west",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    stance: "migi-yotsu",
    tachiaiWinner: "east",
    duration: 8.5,
    upset: false,
    isKinboshi: false,
    log: [
      { phase: "tachiai", data: { tick: 0 } },
      { phase: "finish", data: {} },
    ],
    kenshoEnvelopes: 0,
    ...overrides,
  };
}

function makeTestWorld(
  east: ReturnType<typeof mockRikishi>,
  west: ReturnType<typeof mockRikishi>
): WorldState {
  const basho = makeMockBasho({
    matches: [],
    standings: new Map([
      [east.id, { wins: 0, losses: 0 }],
      [west.id, { wins: 0, losses: 0 }],
    ]),
  });

  return makeMockWorld({
    rikishi: new Map([
      [east.id, east],
      [west.id, west],
    ]),
    currentBasho: basho,
    currentBashoName: "hatsu",
    heyas: new Map([
      [
        east.heyaId,
        {
          id: east.heyaId,
          name: "East Heya",
          rikishiIds: [east.id],
        } as unknown as Heya,
      ],
      [
        west.heyaId,
        {
          id: west.heyaId,
          name: "West Heya",
          rikishiIds: [west.id],
        } as unknown as Heya,
      ],
    ]),
  }) as WorldState;
}

describe("boutNarrative.wiring — narrative system is wired to the bout engine", () => {
  // -------------------------------------------------------------------------
  // Path 1: PBP generation via resolveBout
  // -------------------------------------------------------------------------

  describe("resolveBout generates narrative for healthy bouts", () => {
    it("populates pbpLines, pbp, and narrative", () => {
      const east = mockRikishi("r-east", { injured: false });
      const west = mockRikishi("r-west", { injured: false });
      const basho = makeMockBasho();
      const ctx = makeBoutContext();

      const { result } = resolveBout(ctx, east, west, basho);

      expect(result.pbpLines).toBeDefined();
      expect(result.pbpLines!.length).toBeGreaterThan(0);
      for (const line of result.pbpLines!) {
        expect(typeof line.text).toBe("string");
        expect(line.text.length).toBeGreaterThan(0);
        expect(typeof line.id).toBe("string");
        expect(line.id.length).toBeGreaterThan(0);
      }

      expect(result.pbp).toBeDefined();
      expect(result.pbp!.length).toBe(result.pbpLines!.length);
      expect(result.pbp).toEqual(result.pbpLines!.map((l) => l.text));

      expect(result.narrative).toBeDefined();
      expect(result.narrative!.length).toBeGreaterThan(0);
      for (const line of result.narrative!) {
        expect(typeof line).toBe("string");
        expect(line.length).toBeGreaterThan(0);
      }
    });
  });

  describe("resolveBout skips narrative for fusensho bouts", () => {
    it("returns fusensho and leaves pbpLines / narrative undefined", () => {
      const east = mockRikishi("r-east", { injured: false });
      const west = mockRikishi("r-west", { injured: true });
      const basho = makeMockBasho();
      const ctx = makeBoutContext();

      const { result } = resolveBout(ctx, east, west, basho);

      expect(result.kimarite).toBe("fusensho");
      expect(result.duration).toBe(0);
      expect(result.pbpLines).toBeUndefined();
      expect(result.pbp).toBeUndefined();
      expect(result.narrative).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Path 2: Event-bus emission via applyBoutResult
  // -------------------------------------------------------------------------

  describe("applyBoutResult emits BOUT_RESOLVED events", () => {
    it("queues a BOUT_RESOLVED event in the returned StateImpact", () => {
      const east = mockRikishi("east", { injured: false, rank: "maegashira" });
      const west = mockRikishi("west", { injured: false, rank: "maegashira" });
      const world = makeTestWorld(east, west);
      const match: MatchSchedule = {
        boutId: "test-bout",
        day: 1,
        eastRikishiId: "east",
        westRikishiId: "west",
      };
      const result = makeMinimalBoutResult();

      const impact = applyBoutResult(world, match, result);

      expect(impact.events).toBeDefined();
      const boutEvents = impact.events!.filter((e) => e.type === "BOUT_RESOLVED");
      expect(boutEvents.length).toBe(1);
      expect(boutEvents[0].category).toBe("narrative");
      expect(boutEvents[0].rikishiId).toBe("east");
    });

    it("events queued by applyBoutResult reach world.events.log after applyImpact", () => {
      const east = mockRikishi("east", { injured: false, rank: "maegashira" });
      const west = mockRikishi("west", { injured: false, rank: "maegashira" });
      const world = makeTestWorld(east, west);
      const match: MatchSchedule = {
        boutId: "test-bout",
        day: 1,
        eastRikishiId: "east",
        westRikishiId: "west",
      };
      const result = makeMinimalBoutResult();

      const impact = applyBoutResult(world, match, result);
      const updatedWorld = applyImpact(world, impact);

      const log = updatedWorld.events.log;
      const boutEvents = log.filter((e) => e.type === "BOUT_RESOLVED");
      expect(boutEvents.length).toBe(1);
      expect(boutEvents[0].category).toBe("narrative"); // category set by applyBoutResult builder.logEvent
    });
  });

  describe("applyBoutResult emits MENTOR_MENTEE_BOUT when applicable", () => {
    it("queues a MENTOR_MENTEE_BOUT event when mentor faces apprentice", () => {
      const mentor = mockRikishi("mentor", {
        injured: false,
        rank: "maegashira",
        menteeIds: ["apprentice"],
      });
      const apprentice = mockRikishi("apprentice", {
        injured: false,
        rank: "maegashira",
        mentorId: "mentor",
      });
      const world = makeTestWorld(mentor, apprentice);
      const match: MatchSchedule = {
        boutId: "test-bout-mentor",
        day: 1,
        eastRikishiId: "mentor",
        westRikishiId: "apprentice",
      };
      const result = makeMinimalBoutResult({
        boutId: "test-bout-mentor",
        winnerRikishiId: "mentor",
        loserRikishiId: "apprentice",
      });

      const impact = applyBoutResult(world, match, result);

      expect(impact.events).toBeDefined();
      const mentorEvents = impact.events!.filter(
        (e) => e.type === "MENTOR_MENTEE_BOUT"
      );
      expect(mentorEvents.length).toBe(1);
      expect(mentorEvents[0].category).toBe("training");
      expect(mentorEvents[0].rikishiId).toBe("apprentice");
    });
  });
});
