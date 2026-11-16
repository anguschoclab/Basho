/**
 * W F — milestone/superlative pre-bout beats.
 *
 * - pre_bout.iron_man fires when a rikishi's consecutiveBashoFought
 *   streak is at threshold (≥25), silent below.
 * - pre_bout.oldest_division fires for veterans aged 38+.
 * - pre_bout.makuuchi_bout_milestone fires when the next bout takes the
 *   rikishi's makuuchi bout count to a round hundred.
 * - pre_bout.origin_first fires on the firstFromOriginThisBasho flag set
 *   at banzuke publish.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi } from "@tests/unit/engine/utils";
import { makeBoutResult, makeBoutWorld } from "@tests/helpers/boutTestHelpers";
import type { BashoName, BoutResult } from "@/engine/types/basho";
import type { Rikishi } from "@/engine/types/rikishi";
import type { PbpTag } from "@/engine/bout/narrative/pbpTypes";

const linesWith = (r: BoutResult, tag: PbpTag) =>
  (r.pbpLines ?? []).filter((l) => l.tags?.includes(tag));

function narrate(east: Rikishi, west: Rikishi, seed = "seed-mb"): BoutResult {
  const world = makeBoutWorld(east, west);
  const result = makeBoutResult();
  generateBoutNarrative(result, east, west, "hatsu" as BashoName, 5, seed, world);
  return result;
}

const opponent = () => mockRikishi("r-opp", { shikona: "Foe" });

beforeEach(() => BardEngine.resetCache());

describe("pre_bout.iron_man", () => {
  it("fires at streak ≥25", () => {
    const iron = mockRikishi("r-iron", { shikona: "Ironman", consecutiveBashoFought: 26 });
    const result = narrate(iron, opponent());
    expect(linesWith(result, "iron_man").length).toBeGreaterThan(0);
  });

  it("is silent below the threshold", () => {
    const short = mockRikishi("r-short", { shikona: "Streaklet", consecutiveBashoFought: 24 });
    const result = narrate(short, opponent());
    expect(linesWith(result, "iron_man")).toEqual([]);
  });
});

describe("pre_bout.oldest_division", () => {
  it("fires for a 38+ veteran", () => {
    const vet = mockRikishi("r-vet", { shikona: "Oldtimer", age: 40, birthYear: 1985 });
    const result = narrate(vet, opponent());
    expect(linesWith(result, "oldest_division").length).toBeGreaterThan(0);
  });

  it("is silent under 38", () => {
    const young = mockRikishi("r-young", { shikona: "Kid", age: 25, birthYear: 2000 });
    const result = narrate(young, opponent());
    expect(linesWith(result, "oldest_division")).toEqual([]);
  });
});

describe("pre_bout.makuuchi_bout_milestone", () => {
  const makuuchiRecord = (wins: number, losses: number) => ({
    makuuchi: { wins, losses },
    juryo: { wins: 0, losses: 0 },
    makushita: { wins: 0, losses: 0 },
    sandanme: { wins: 0, losses: 0 },
    jonidan: { wins: 0, losses: 0 },
    jonokuchi: { wins: 0, losses: 0 },
  });

  it("fires when the next bout reaches a round hundred", () => {
    const r = mockRikishi("r-cen", {
      shikona: "Centurion",
      division: "makuuchi",
      divisionRecords: makuuchiRecord(60, 39), // 99 → 100th top-division bout
    });
    const result = narrate(r, opponent());
    expect(linesWith(result, "makuuchi_milestone").length).toBeGreaterThan(0);
  });

  it("is silent off the milestone", () => {
    const r = mockRikishi("r-mid", {
      shikona: "Midway",
      division: "makuuchi",
      divisionRecords: makuuchiRecord(60, 40), // 100 → 101st, not a milestone
    });
    const result = narrate(r, opponent());
    expect(linesWith(result, "makuuchi_milestone")).toEqual([]);
  });
});

describe("pre_bout.origin_first", () => {
  it("fires when firstFromOriginThisBasho is set", () => {
    const pioneer = mockRikishi("r-pio", {
      shikona: "Pioneer",
      origin: "Tottori",
      firstFromOriginThisBasho: true,
    });
    const result = narrate(pioneer, opponent());
    expect(linesWith(result, "origin_first").length).toBeGreaterThan(0);
  });

  it("is silent without the flag", () => {
    const normal = mockRikishi("r-norm", { shikona: "Regular", origin: "Tottori" });
    const result = narrate(normal, opponent());
    expect(linesWith(result, "origin_first")).toEqual([]);
  });
});
