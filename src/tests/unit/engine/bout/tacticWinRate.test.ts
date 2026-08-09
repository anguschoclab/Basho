import { describe, it, expect } from "vitest";
import { resolveBout } from "@/engine/bout/boutResolver";
import { mockRikishi, makeMockBasho } from "../utils";
import type { BoutContext } from "@/engine/bout/boutUtils";
import type { BoutTactic } from "@/engine/types/combat";

// IMPORTANT: tactic must be passed as the 5th positional arg; resolveBout
// overwrites bout.playerTactic from this parameter (boutResolver.ts:372).
function eastWinRate(tactic: BoutTactic, n = 300): number {
  let wins = 0;
  for (let day = 1; day <= n; day++) {
    const east = mockRikishi("r-east", {
      power: 60,
      speed: 60,
      balance: 60,
      technique: 60,
      momentum: 50,
      fatigue: 0,
    });
    const west = mockRikishi("r-west", {
      power: 60,
      speed: 60,
      balance: 60,
      technique: 60,
      momentum: 50,
      fatigue: 0,
    });
    const basho = makeMockBasho();
    const ctx: BoutContext = {
      id: `b-${day}`,
      day,
      rikishiEastId: east.id,
      rikishiWestId: west.id,
      playerSide: "east",
    };
    const { result } = resolveBout(ctx, east, west, basho, tactic);
    if (result.winner === "east") wins++;
  }
  return wins / n;
}

describe("tactic win-rate (end-to-end)", () => {
  it("moves ALL_OUT > STANDARD > DEFENSIVE_PULL", () => {
    const allOut = eastWinRate("ALL_OUT");
    const standard = eastWinRate("STANDARD");
    const defensive = eastWinRate("DEFENSIVE_PULL");
    expect(allOut).toBeGreaterThan(standard);
    expect(standard).toBeGreaterThan(defensive);
  });

  it("is deterministic: identical winner for the same tactic+seed", () => {
    const mk = () => {
      const east = mockRikishi("r-east", { power: 60, speed: 60, balance: 60 });
      const west = mockRikishi("r-west", { power: 60, speed: 60, balance: 60 });
      const basho = makeMockBasho();
      const ctx: BoutContext = {
        id: "b-1",
        day: 7,
        rikishiEastId: east.id,
        rikishiWestId: west.id,
        playerSide: "east",
      };
      return resolveBout(ctx, east, west, basho, "ALL_OUT").result.winner;
    };
    expect(mk()).toBe(mk());
  });

  it("keeps the swing bounded (no auto-win / auto-loss) for evenly matched wrestlers", () => {
    const allOut = eastWinRate("ALL_OUT");
    const defensive = eastWinRate("DEFENSIVE_PULL");
    // A tactic should tilt, not decide. Tune with product; bounds are generous.
    expect(allOut).toBeLessThan(0.85);
    expect(defensive).toBeGreaterThan(0.1);
  });
});
