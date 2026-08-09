 
import { describe, it, expect } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import type { PbpLine } from "@/engine/bout/boutNarrative";
import { mockRikishi } from "../utils";
import type { BoutResult, BoutLogEntry } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";

function makeBoutResult(log: BoutLogEntry[], overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "test-bout-1",
    day: 7,
    eastId: "r1",
    westId: "r2",
    winner: "east",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    duration: 8,
    log,
    upset: false,
    kenshoEnvelopes: 0,
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
    ...overrides,
  } as BoutResult;
}

function getLines(result: BoutResult): PbpLine[] {
  return result.pbpLines ?? [];
}

describe("bout timeout narrative (8.5)", () => {
  it("bout_timeout log entry generates timeout narrative", () => {
    const east = mockRikishi("r1", { rank: "ozeki", division: "makuuchi" });
    const west = mockRikishi("r2", { rank: "ozeki", division: "makuuchi" });
    const world = { rikishi: new Map([["r1", east], ["r2", west]]) } as unknown as WorldState;
    const log: BoutLogEntry[] = [
      { phase: "bout_timeout", clock: 480, data: {
        eastForce: 30, westForce: 10,
        eastMomentum: 5, westMomentum: 0,
        decisionBasis: "east_stability",
      }},
    ];
    const result = makeBoutResult(log, { isTimeout: true });

    generateBoutNarrative(result, east, west, undefined, 7, "timeout-test-seed", world);
    const lines = getLines(result);
    const timeoutLines = lines.filter((l) => l.phase === "bout_timeout");

    expect(timeoutLines.length).toBeGreaterThan(0);
  });

  it("east advantage timeout mentions east shikona", () => {
    const east = mockRikishi("r1", { rank: "ozeki", division: "makuuchi" });
    const west = mockRikishi("r2", { rank: "ozeki", division: "makuuchi" });
    const world = { rikishi: new Map([["r1", east], ["r2", west]]) } as unknown as WorldState;
    const log: BoutLogEntry[] = [
      { phase: "bout_timeout", clock: 480, data: {
        eastForce: 50, westForce: 5,
        eastMomentum: 10, westMomentum: 0,
        decisionBasis: "east_stability",
      }},
    ];
    const result = makeBoutResult(log, { isTimeout: true, winner: "east" });

    generateBoutNarrative(result, east, west, undefined, 7, "timeout-east-seed", world);
    const lines = getLines(result);
    const timeoutLines = lines.filter((l) => l.phase === "bout_timeout");

    expect(timeoutLines.length).toBeGreaterThan(0);
    expect(timeoutLines.some((l) => l.text.includes("Wrestler-r1"))).toBe(true);
  });

  it("west advantage timeout mentions west shikona", () => {
    const east = mockRikishi("r1", { rank: "ozeki", division: "makuuchi" });
    const west = mockRikishi("r2", { rank: "ozeki", division: "makuuchi" });
    const world = { rikishi: new Map([["r1", east], ["r2", west]]) } as unknown as WorldState;
    const log: BoutLogEntry[] = [
      { phase: "bout_timeout", clock: 480, data: {
        eastForce: 5, westForce: 50,
        eastMomentum: 0, westMomentum: 10,
        decisionBasis: "west_stability",
      }},
    ];
    const result = makeBoutResult(log, { isTimeout: true, winner: "west" });

    generateBoutNarrative(result, east, west, undefined, 7, "timeout-west-seed", world);
    const lines = getLines(result);
    const timeoutLines = lines.filter((l) => l.phase === "bout_timeout");

    expect(timeoutLines.length).toBeGreaterThan(0);
    expect(timeoutLines.some((l) => l.text.includes("Wrestler-r2"))).toBe(true);
  });

  it("no timeout narrative when no bout_timeout log entry", () => {
    const east = mockRikishi("r1", { rank: "ozeki", division: "makuuchi" });
    const west = mockRikishi("r2", { rank: "ozeki", division: "makuuchi" });
    const world = { rikishi: new Map([["r1", east], ["r2", west]]) } as unknown as WorldState;
    const result = makeBoutResult([]);

    generateBoutNarrative(result, east, west, undefined, 7, "no-timeout-seed", world);
    const lines = getLines(result);
    const timeoutLines = lines.filter((l) => l.phase === "bout_timeout");

    expect(timeoutLines.length).toBe(0);
  });
});
