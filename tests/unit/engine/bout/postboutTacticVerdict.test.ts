import { describe, it, expect } from "vitest";
import { narratePostBout } from "@/engine/bout/narrative/postbout";
import type { PbpPipeline } from "@/engine/bout/narrative/pipeline";
import { SeededRNG } from "@/engine/core/rng";
import { mockRikishi, makeMockWorld } from "@tests/unit/engine/utils";
import type { Rikishi } from "@/engine/types/rikishi";
import type { BoutResult } from "@/engine/types/basho";
import type { BoutTactic } from "@/engine/types/combat";

/**
 * T2-G3: the post-bout tactic-verdict beat — when the player's corner called a
 * non-STANDARD tactic the narrative must say whether it paid off or backfired;
 * STANDARD tactics, absent tactic data, and non-player bouts stay silent.
 */
function pipeline(opts: {
  playerSide?: "east" | "west" | "none";
  playerTactic?: BoutTactic;
  winner: "east" | "west";
}): { p: PbpPipeline; pushed: string[] } {
  const east = mockRikishi("r-east", {
    heyaId: opts.playerSide === "east" ? "h-player" : "h-npc",
  }) as unknown as Rikishi;
  const west = mockRikishi("r-west", {
    heyaId: opts.playerSide === "west" ? "h-player" : "h-npc",
  }) as unknown as Rikishi;
  const result = {
    winner: opts.winner,
    kimarite: "yorikiri",
    kimariteName: "yorikiri",
    tactics:
      opts.playerSide && opts.playerTactic
        ? opts.playerSide === "east"
          ? { east: opts.playerTactic }
          : { west: opts.playerTactic }
        : undefined,
  } as unknown as BoutResult;

  const world = makeMockWorld({ playerHeyaId: "h-player" });
  const winnerRikishi = opts.winner === "east" ? east : west;
  const loserRikishi = opts.winner === "east" ? west : east;
  const pushed: string[] = [];

  const p = {
    result,
    east,
    west,
    world,
    push: (text: string) => pushed.push(text),
    postBoutRng: new SeededRNG("t2-verdict"),
    winnerRikishi,
    loserRikishi,
    winnerWins: 4,
    winnerLosses: 3,
    loserWins: 4,
    loserLosses: 3,
    day: 5,
    lines: [],
  } as unknown as PbpPipeline;
  return { p, pushed };
}

describe("beatPostBoutTacticVerdict", () => {
  it("player's winning non-STANDARD call → 'paid off' verdict", () => {
    const { p, pushed } = pipeline({
      playerSide: "east",
      playerTactic: "ALL_OUT",
      winner: "east",
    });
    narratePostBout(p);
    expect(pushed.some((l) => l.includes("paid off"))).toBe(true);
    expect(pushed.some((l) => l.includes("all-out assault"))).toBe(true);
  });

  it("player's losing non-STANDARD call → 'backfired' verdict", () => {
    const { p, pushed } = pipeline({
      playerSide: "west",
      playerTactic: "HENKA",
      winner: "east",
    });
    narratePostBout(p);
    expect(pushed.some((l) => l.includes("backfired"))).toBe(true);
    expect(pushed.some((l) => l.includes("sidestep gambit"))).toBe(true);
  });

  it("STANDARD tactic → no verdict line", () => {
    const { p, pushed } = pipeline({
      playerSide: "east",
      playerTactic: "STANDARD",
      winner: "east",
    });
    narratePostBout(p);
    expect(pushed.some((l) => l.includes("paid off") || l.includes("backfired"))).toBe(false);
  });

  it("non-player bout → no verdict line", () => {
    const { p, pushed } = pipeline({
      playerSide: "none",
      playerTactic: "HENKA",
      winner: "east",
    });
    narratePostBout(p);
    expect(pushed.some((l) => l.includes("paid off") || l.includes("backfired"))).toBe(false);
  });

  it("missing tactics data → no verdict line", () => {
    const { p, pushed } = pipeline({ playerSide: "east", winner: "east" });
    narratePostBout(p);
    expect(pushed.some((l) => l.includes("paid off") || l.includes("backfired"))).toBe(false);
  });
});
