import { describe, it, expect } from "vitest";
import { applyBoutResult } from "@/engine/bout/boutResultApplier";
import { mockRikishi, makeMockBasho, makeMockWorld } from "../utils";
import type { MatchSchedule, BoutResult } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";

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
    log: [],
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
        { id: east.heyaId, name: "East Heya", rikishiIds: [east.id] } as unknown as Heya,
      ],
      [
        west.heyaId,
        { id: west.heyaId, name: "West Heya", rikishiIds: [west.id] } as unknown as Heya,
      ],
    ]),
  }) as WorldState;
}

describe("applyBoutResult mentor-mentee narrative", () => {
  it("logs MENTOR_MENTEE_BOUT when mentor faces apprentice", () => {
    const mentor = mockRikishi("mentor", { injured: false, rank: "maegashira" });
    mentor.menteeIds = ["apprentice"];
    const apprentice = mockRikishi("apprentice", { injured: false, rank: "maegashira" });
    apprentice.mentorId = "mentor";
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
    const events = impact.events?.filter((e) => e.type === "MENTOR_MENTEE_BOUT");
    expect(events).toHaveLength(1);
  });

  it("sets mentor and apprentice names in the narrative context", () => {
    const mentor = mockRikishi("mentor", { injured: false, rank: "maegashira" });
    mentor.menteeIds = ["apprentice"];
    const apprentice = mockRikishi("apprentice", { injured: false, rank: "maegashira" });
    apprentice.mentorId = "mentor";
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
    const event = impact.events?.find((e) => e.type === "MENTOR_MENTEE_BOUT");
    expect(event?.data?.mentor).toBe(mentor.shikona);
    expect(event?.data?.apprentice).toBe(apprentice.shikona);
  });

  it("does not log the event for unrelated bouts", () => {
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
    const events = impact.events?.filter((e) => e.type === "MENTOR_MENTEE_BOUT");
    expect(events).toHaveLength(0);
  });
});
