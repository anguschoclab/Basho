/* eslint-disable @typescript-eslint/no-non-null-assertion */
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
    ...overrides,
  } as BoutResult;
}

function getLines(result: BoutResult): PbpLine[] {
  return result.pbpLines ?? [];
}

describe("narrative handlers for new log phases (1.1-1.4)", () => {
  it("fatigue log entry generates fatigue narrative", () => {
    const east = mockRikishi("r1", { rank: "ozeki", division: "makuuchi" });
    const west = mockRikishi("r2", { rank: "ozeki", division: "makuuchi" });
    const world = { rikishi: new Map([["r1", east], ["r2", west]]) } as unknown as WorldState;
    const log: BoutLogEntry[] = [
      { phase: "fatigue", clock: 100, data: { eastFatigue: 40, westFatigue: 20, fatigueDelta: 20 } },
    ];
    const result = makeBoutResult(log);

    generateBoutNarrative(result, east, west, undefined, 7, "fatigue-test-seed", world);
    const lines = getLines(result);
    const fatigueLines = lines.filter((l) => l.phase === "fatigue");

    expect(fatigueLines.length).toBeGreaterThan(0);
  });

  it("bout_injury log entry generates injury narrative", () => {
    const east = mockRikishi("r1", { rank: "ozeki", division: "makuuchi" });
    const west = mockRikishi("r2", { rank: "ozeki", division: "makuuchi" });
    const world = { rikishi: new Map([["r1", east], ["r2", west]]) } as unknown as WorldState;
    const log: BoutLogEntry[] = [
      { phase: "bout_injury", clock: 80, data: { rikishiId: "r2", area: "knee", severity: "moderate", triggerEvent: "edge_crisis_forced_out", injuryRisk: 0.6 } },
    ];
    const result = makeBoutResult(log);

    generateBoutNarrative(result, east, west, undefined, 7, "injury-test-seed", world);
    const lines = getLines(result);
    const injuryLines = lines.filter((l) => l.phase === "bout_injury");

    expect(injuryLines.length).toBeGreaterThan(0);
    expect(injuryLines.some((l) => l.text.includes("knee"))).toBe(true);
  });

  it("momentum_shift log entry generates momentum shift narrative", () => {
    const east = mockRikishi("r1", { rank: "ozeki", division: "makuuchi" });
    const west = mockRikishi("r2", { rank: "ozeki", division: "makuuchi" });
    const world = { rikishi: new Map([["r1", east], ["r2", west]]) } as unknown as WorldState;
    const log: BoutLogEntry[] = [
      { phase: "momentum_shift", clock: 60, data: { prevDominantSide: "west", newDominantSide: "east", magnitude: 3.5 } },
    ];
    const result = makeBoutResult(log);

    generateBoutNarrative(result, east, west, undefined, 7, "momentum-shift-test-seed", world);
    const lines = getLines(result);
    const shiftLines = lines.filter((l) => l.phase === "momentum_shift");

    expect(shiftLines.length).toBeGreaterThan(0);
  });

  it("grip_transition log entry with morozashi gained generates grip narrative", () => {
    const east = mockRikishi("r1", { rank: "ozeki", division: "makuuchi" });
    const west = mockRikishi("r2", { rank: "ozeki", division: "makuuchi" });
    const world = { rikishi: new Map([["r1", east], ["r2", west]]) } as unknown as WorldState;
    const log: BoutLogEntry[] = [
      { phase: "grip_transition", clock: 40, data: {
        type: "grip_class_shift",
        eastGripFrom: "uwate", eastGripTo: "morozashi",
        westGripFrom: "outside", westGripTo: "outside",
        eastRightInside: true, eastLeftInside: true,
        westRightInside: false, westLeftInside: false,
      }},
    ];
    const result = makeBoutResult(log);

    generateBoutNarrative(result, east, west, undefined, 7, "grip-moro-seed", world);
    const lines = getLines(result);
    const gripLines = lines.filter((l) => l.phase === "grip_transition");

    expect(gripLines.length).toBeGreaterThan(0);
    expect(gripLines.some((l) => l.text.includes("morozashi") || l.text.includes("inside"))).toBe(true);
  });

  it("grip_transition with morozashi lost generates loss narrative", () => {
    const east = mockRikishi("r1", { rank: "ozeki", division: "makuuchi" });
    const west = mockRikishi("r2", { rank: "ozeki", division: "makuuchi" });
    const world = { rikishi: new Map([["r1", east], ["r2", west]]) } as unknown as WorldState;
    const log: BoutLogEntry[] = [
      { phase: "grip_transition", clock: 40, data: {
        type: "grip_class_shift",
        eastGripFrom: "morozashi", eastGripTo: "uwate",
        westGripFrom: "outside", westGripTo: "outside",
        eastRightInside: false, eastLeftInside: true,
        westRightInside: false, westLeftInside: false,
      }},
    ];
    const result = makeBoutResult(log);

    generateBoutNarrative(result, east, west, undefined, 7, "grip-lost-seed", world);
    const lines = getLines(result);
    const gripLines = lines.filter((l) => l.phase === "grip_transition");

    expect(gripLines.length).toBeGreaterThan(0);
  });

  it("no fatigue narrative when no fatigue log entry present", () => {
    const east = mockRikishi("r1", { rank: "ozeki", division: "makuuchi" });
    const west = mockRikishi("r2", { rank: "ozeki", division: "makuuchi" });
    const world = { rikishi: new Map([["r1", east], ["r2", west]]) } as unknown as WorldState;
    const result = makeBoutResult([]);

    generateBoutNarrative(result, east, west, undefined, 7, "no-fatigue-seed", world);
    const lines = getLines(result);
    const fatigueLines = lines.filter((l) => l.phase === "fatigue");

    expect(fatigueLines.length).toBe(0);
  });
});
