/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { mockRikishi } from "../utils";
import type { BoutResult, BashoName } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";

function makeBoutResult(winner: "east" | "west", kimarite = "yori-kiri"): BoutResult {
  return {
    boutId: "test-bout-1",
    day: 14,
    eastRikishiId: "east-1",
    westRikishiId: "west-1",
    winner,
    kimarite,
    kimariteName: kimarite,
    upset: false,
    isKinboshi: false,
    isYushoRace: false,
    log: [],
  } as any;
}

function makeWorld(): WorldState {
  return {
    seed: "test-77-pressure",
    year: 2025,
    week: 1,
    dayIndexGlobal: 1,
    cyclePhase: "active_basho",
    heyas: new Map(),
    rikishi: new Map(),
    oyakata: new Map(),
    activeRikishiIds: new Set(),
    currentBasho: {
      year: 2025,
      bashoNumber: 1,
      bashoName: "hatsu" as BashoName,
      day: 14,
      matches: [],
      standings: new Map(),
      isActive: true,
    } as any,
  } as any;
}

function runNarrative(eastWins: number, eastLosses: number, westWins: number, westLosses: number, winner: "east" | "west") {
  const east = mockRikishi("east-1", {
    shikona: "EastMan",
    currentBashoWins: eastWins,
    currentBashoLosses: eastLosses,
  } as any);
  const west = mockRikishi("west-1", {
    shikona: "WestMan",
    currentBashoWins: westWins,
    currentBashoLosses: westLosses,
  } as any);

  const result = makeBoutResult(winner);
  const world = makeWorld();

  generateBoutNarrative(
    result,
    east,
    west,
    "hatsu" as BashoName,
    14,
    "test-77-pressure",
    world
  );

  return result.pbpLines ?? [];
}

describe("7-7 Pressure Narrative (B12)", () => {
  it("pre-bout: adds seven_seven storyline when both rikishi are 7-7", () => {
    const lines = runNarrative(7, 7, 7, 7, "east");
    const preBoutLines = lines.filter((e: any) => e.phase === "pre_bout");
    const has77Line = preBoutLines.some((e: any) =>
      e.text.includes("7-7") || e.text.includes("Seven wins, seven losses") || e.text.includes("Everything is on the line")
    );
    expect(has77Line).toBe(true);
  });

  it("pre-bout: does not add seven_seven storyline when records are not 7-7", () => {
    const lines = runNarrative(8, 6, 6, 8, "east");
    const preBoutLines = lines.filter((e: any) => e.phase === "pre_bout");
    const has77Line = preBoutLines.some((e: any) =>
      e.text.includes("7-7") || e.text.includes("Seven wins, seven losses")
    );
    expect(has77Line).toBe(false);
  });

  it("post-bout: adds seven_seven_win storyline when winner was at 7-7 and wins", () => {
    const lines = runNarrative(7, 7, 7, 7, "east");
    const postBoutLines = lines.filter((e: any) => e.phase === "post_bout");
    const has77WinLine = postBoutLines.some((e: any) =>
      e.text.includes("7-7") || e.text.includes("pressure") || e.text.includes("winning record") || e.text.includes("rose to the occasion")
    );
    expect(has77WinLine).toBe(true);
  });

  it("post-bout: adds seven_seven_loss storyline when loser was at 7-7 and loses", () => {
    const lines = runNarrative(7, 7, 7, 7, "east");
    const postBoutLines = lines.filter((e: any) => e.phase === "post_bout");
    const has77LossLine = postBoutLines.some((e: any) =>
      e.text.includes("7-7") || e.text.includes("Devastation") || e.text.includes("make-koshi") || e.text.includes("crushing")
    );
    expect(has77LossLine).toBe(true);
  });

  it("post-bout: does not add seven_seven lines when records are not 7-7", () => {
    const lines = runNarrative(9, 5, 5, 9, "east");
    const postBoutLines = lines.filter((e: any) => e.phase === "post_bout");
    const has77Line = postBoutLines.some((e: any) =>
      e.text.includes("7-7") || e.text.includes("rose to the occasion") || e.text.includes("Devastation for")
    );
    expect(has77Line).toBe(false);
  });
});
