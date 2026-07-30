/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { mockRikishi } from "../utils";
import type { BoutResult, BashoName } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";

function makeBoutResult(winner: "east" | "west"): BoutResult {
  return {
    boutId: "test-bout-vet",
    day: 10,
    eastRikishiId: "east-1",
    westRikishiId: "west-1",
    winner,
    kimarite: "yori-kiri",
    kimariteName: "yori-kiri",
    upset: false,
    isKinboshi: false,
    isYushoRace: false,
    log: [],
  } as any;
}

function makeWorld(): WorldState {
  return {
    seed: "test-vet-decline",
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
      day: 10,
      matches: [],
      standings: new Map(),
      isActive: true,
    } as any,
  } as any;
}

function runNarrative(winnerDecline: string | undefined, loserDecline: string | undefined, winner: "east" | "west") {
  const east = mockRikishi("east-1", {
    shikona: "EastMan",
    currentBashoWins: 5,
    currentBashoLosses: 5,
    declinePhase: winner === "east" ? winnerDecline : loserDecline,
  } as any);
  const west = mockRikishi("west-1", {
    shikona: "WestMan",
    currentBashoWins: 5,
    currentBashoLosses: 5,
    declinePhase: winner === "west" ? winnerDecline : loserDecline,
  } as any);

  const result = makeBoutResult(winner);
  const world = makeWorld();

  generateBoutNarrative(
    result,
    east,
    west,
    "hatsu" as BashoName,
    10,
    "test-vet-decline",
    world
  );

  return result.pbpLines ?? [];
}

describe("Veteran Decline Narrative (B9)", () => {
  it("post-bout: adds father_time narrative when loser is in early-decline", () => {
    const lines = runNarrative(undefined, "early-decline", "east");
    const postBoutLines = lines.filter((e: any) => e.phase === "post_bout");
    const hasDeclineLine = postBoutLines.some((e: any) =>
      e.tags?.includes("veteran") || e.text.includes("Father time") || e.text.includes("clock") || e.text.includes("years")
    );
    expect(hasDeclineLine).toBe(true);
  });

  it("post-bout: adds father_time narrative when loser is in late-decline", () => {
    const lines = runNarrative(undefined, "late-decline", "east");
    const postBoutLines = lines.filter((e: any) => e.phase === "post_bout");
    const hasDeclineLine = postBoutLines.some((e: any) =>
      e.tags?.includes("veteran") || e.text.includes("Father time") || e.text.includes("clock") || e.text.includes("years")
    );
    expect(hasDeclineLine).toBe(true);
  });

  it("post-bout: adds father_time narrative when loser is in twilight", () => {
    const lines = runNarrative(undefined, "twilight", "east");
    const postBoutLines = lines.filter((e: any) => e.phase === "post_bout");
    const hasDeclineLine = postBoutLines.some((e: any) =>
      e.tags?.includes("veteran") || e.text.includes("Father time") || e.text.includes("clock") || e.text.includes("years")
    );
    expect(hasDeclineLine).toBe(true);
  });

  it("post-bout: adds defying_age narrative when winner is in late-decline", () => {
    const lines = runNarrative("late-decline", undefined, "east");
    const postBoutLines = lines.filter((e: any) => e.phase === "post_bout");
    const hasDefyingAge = postBoutLines.some((e: any) =>
      e.tags?.includes("veteran") || e.text.includes("Defying") || e.text.includes("turns back") || e.text.includes("silences")
    );
    expect(hasDefyingAge).toBe(true);
  });

  it("post-bout: adds defying_age narrative when winner is in twilight", () => {
    const lines = runNarrative("twilight", undefined, "east");
    const postBoutLines = lines.filter((e: any) => e.phase === "post_bout");
    const hasDefyingAge = postBoutLines.some((e: any) =>
      e.tags?.includes("veteran") || e.text.includes("Defying") || e.text.includes("turns back") || e.text.includes("silences")
    );
    expect(hasDefyingAge).toBe(true);
  });

  it("post-bout: does not add decline narrative when neither rikishi is in decline", () => {
    const lines = runNarrative("peak", "peak", "east");
    const postBoutLines = lines.filter((e: any) => e.phase === "post_bout");
    const hasDeclineLine = postBoutLines.some((e: any) =>
      e.text.includes("Father time") || e.text.includes("Defying age")
    );
    expect(hasDeclineLine).toBe(false);
  });

  it("post-bout: adds early_decline specific narrative when loser is in early-decline", () => {
    const lines = runNarrative(undefined, "early-decline", "east");
    const postBoutLines = lines.filter((e: any) => e.phase === "post_bout");
    // Should have some veteran-tagged line
    const hasVeteranTag = postBoutLines.some((e: any) => e.tags?.includes("veteran"));
    expect(hasVeteranTag).toBe(true);
  });
});
