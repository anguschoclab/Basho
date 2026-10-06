import { describe, it, expect } from "vitest";
import { updateH2H } from "@/engine/h2h";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { BoutResult } from "@/engine/types/basho";

describe("updateH2H", () => {
  it("creates new records and sets streak to 1 for first win", () => {
    const winner = MockFactory.createRikishi({ id: "w1", h2h: undefined });
    const loser = MockFactory.createRikishi({ id: "l1", h2h: undefined });

    const boutResult = {
      boutId: "bout-1",
      winner: "east",
      winnerRikishiId: winner.id,
      loserRikishiId: loser.id,
      kimarite: "yorikiri",
    };

    const impact = updateH2H(winner, loser, boutResult as BoutResult, "basho-1", 2025, 1);

    expect(impact.entities?.rikishiUpdates?.get(winner.id)?.h2h?.[loser.id]).toEqual({
      wins: 1,
      losses: 0,
      streak: 1,
      lastMatch: {
        winnerId: winner.id,
        kimarite: "yorikiri",
        bashoId: "basho-1",
        day: 1,
        year: 2025
      }
    });

    expect(impact.entities?.rikishiUpdates?.get(loser.id)?.h2h?.[winner.id]).toEqual({
      wins: 0,
      losses: 1,
      streak: -1,
      lastMatch: {
        winnerId: winner.id,
        kimarite: "yorikiri",
        bashoId: "basho-1",
        day: 1,
        year: 2025
      }
    });
  });

  it("increments active positive streak for winner and extends negative streak for loser", () => {
    const winner = MockFactory.createRikishi({
      id: "w1",
      h2h: {
        l1: { wins: 2, losses: 0, streak: 2, lastMatch: null as any }
      }
    });
    const loser = MockFactory.createRikishi({
      id: "l1",
      h2h: {
        w1: { wins: 0, losses: 2, streak: -2, lastMatch: null as any }
      }
    });

    const boutResult = {
      boutId: "bout-1",
      winner: "east",
      winnerRikishiId: winner.id,
      loserRikishiId: loser.id,
      kimarite: "oshidashi",
    };

    const impact = updateH2H(winner, loser, boutResult as BoutResult, "basho-1", 2025, 2);

    expect(impact.entities?.rikishiUpdates?.get(winner.id)?.h2h?.[loser.id]?.streak).toBe(3);
    expect(impact.entities?.rikishiUpdates?.get(loser.id)?.h2h?.[winner.id]?.streak).toBe(-3);
  });

  it("flips negative streak to positive 1 for winner and positive to negative 1 for loser", () => {
    const winner = MockFactory.createRikishi({
      id: "w1",
      h2h: {
        l1: { wins: 1, losses: 2, streak: -2, lastMatch: null as any }
      }
    });
    const loser = MockFactory.createRikishi({
      id: "l1",
      h2h: {
        w1: { wins: 2, losses: 1, streak: 2, lastMatch: null as any }
      }
    });

    const boutResult = {
      boutId: "bout-1",
      winner: "east",
      winnerRikishiId: winner.id,
      loserRikishiId: loser.id,
      kimarite: "tsukiotoshi",
    };

    const impact = updateH2H(winner, loser, boutResult as BoutResult, "basho-1", 2025, 3);

    expect(impact.entities?.rikishiUpdates?.get(winner.id)?.h2h?.[loser.id]?.streak).toBe(1);
    expect(impact.entities?.rikishiUpdates?.get(loser.id)?.h2h?.[winner.id]?.streak).toBe(-1);
  });
});
