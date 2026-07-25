import { describe, it, expect } from "vitest";
import { computeTacticAftermath } from "@/engine/bout/boutTacticAftermath";
import type { Rikishi } from "@/engine/types/rikishi";
import type { BoutResult } from "@/engine/types/basho";
import type { BoutContext } from "@/engine/bout/boutPhysics";
import type { BoutTactic } from "@/engine/types/combat";

function makeRikishi(id: string, fatigue = 0, momentum = 50): Rikishi {
  return {
    id,
    fatigue,
    momentum,
    stats: { aggression: 50, mental: 50, power: 50, speed: 50, technique: 50, balance: 50, stamina: 50 },
  } as unknown as Rikishi;
}

function makeResult(winner: "east" | "west" = "east", kimarite = "yorikiri"): BoutResult {
  return {
    boutId: "test",
    winner,
    winnerRikishiId: winner === "east" ? "east" : "west",
    loserRikishiId: winner === "east" ? "west" : "east",
    kimarite,
    kimariteName: kimarite,
    stance: "migi",
    tachiaiWinner: winner,
    duration: 5,
    excitementScore: 50,
    upset: false,
    isKinboshi: false,
    log: [],
    kenshoEnvelopes: 0,
  } as unknown as BoutResult;
}

function makeBout(playerSide: "east" | "west" | undefined = "east", playerTactic?: string): BoutContext {
  return {
    id: "test-bout",
    day: 5,
    rikishiEastId: "east",
    rikishiWestId: "west",
    playerSide,
    playerTactic: playerTactic as BoutContext["playerTactic"],
  } as unknown as BoutContext;
}

describe("boutTacticAftermath", () => {
  it("returns empty updates when no tactics and no fusensho", () => {
    const east = makeRikishi("east");
    const west = makeRikishi("west");
    const bout = makeBout("east");
    const result = makeResult("east");
    const { playerUpdate, cpuUpdate, injuryMultiplier } = computeTacticAftermath(bout, result, east, west, undefined);
    expect(playerUpdate).toEqual({});
    expect(cpuUpdate).toEqual({});
    expect(injuryMultiplier).toBe(1.0);
  });

  it("applies fatigue cost for player tactic", () => {
    const east = makeRikishi("east", 10, 50);
    const west = makeRikishi("west");
    const bout = makeBout("east", "ALL_OUT");
    const result = makeResult("east");
    const { playerUpdate } = computeTacticAftermath(bout, result, east, west, undefined);
    expect(playerUpdate.fatigue).toBeDefined();
    expect(playerUpdate.fatigue).toBeGreaterThan(10);
  });

  it("applies momentum delta on win", () => {
    const east = makeRikishi("east", 0, 50);
    const west = makeRikishi("west");
    const bout = makeBout("east", "ALL_OUT");
    const result = makeResult("east");
    const { playerUpdate } = computeTacticAftermath(bout, result, east, west, undefined);
    expect(playerUpdate.momentum).toBeDefined();
    expect(playerUpdate.momentum).not.toBe(50);
  });

  it("applies momentum delta on loss", () => {
    const east = makeRikishi("east", 0, 50);
    const west = makeRikishi("west");
    const bout = makeBout("east", "ALL_OUT");
    const result = makeResult("west");
    const { playerUpdate } = computeTacticAftermath(bout, result, east, west, undefined);
    expect(playerUpdate.momentum).toBeDefined();
  });

  it("sets injury multiplier when player loses with tactic", () => {
    const east = makeRikishi("east", 0, 50);
    const west = makeRikishi("west");
    const bout = makeBout("east", "ALL_OUT");
    const result = makeResult("west");
    const { injuryMultiplier } = computeTacticAftermath(bout, result, east, west, undefined);
    expect(injuryMultiplier).toBeGreaterThanOrEqual(1.0);
  });

  it("skips tactic effects on fusensho", () => {
    const east = makeRikishi("east", 10, 50);
    const west = makeRikishi("west");
    const bout = makeBout("east", "ALL_OUT");
    const result = makeResult("east", "fusensho");
    const { playerUpdate, injuryMultiplier } = computeTacticAftermath(bout, result, east, west, undefined);
    expect(playerUpdate).toEqual({});
    expect(injuryMultiplier).toBe(1.0);
  });

  it("applies CPU tactic effects", () => {
    const east = makeRikishi("east", 0, 50);
    const west = makeRikishi("west", 0, 50);
    const bout = makeBout("east");
    const result = makeResult("east");
    const { cpuUpdate } = computeTacticAftermath(bout, result, east, west, "ALL_OUT" as BoutTactic);
    expect(cpuUpdate.fatigue).toBeDefined();
  });

  it("applies henka momentum penalty on win", () => {
    const east = makeRikishi("east", 0, 50);
    const west = makeRikishi("west");
    const bout = makeBout("east", "HENKA");
    const result = makeResult("east");
    const { playerUpdate } = computeTacticAftermath(bout, result, east, west, undefined);
    expect(playerUpdate.momentum).toBeDefined();
    expect(playerUpdate.momentum).toBeLessThan(50);
  });

  it("clamps fatigue to max", () => {
    const east = makeRikishi("east", 95, 50);
    const west = makeRikishi("west");
    const bout = makeBout("east", "ALL_OUT");
    const result = makeResult("east");
    const { playerUpdate } = computeTacticAftermath(bout, result, east, west, undefined);
    expect(playerUpdate.fatigue).toBeLessThanOrEqual(100);
  });
});
