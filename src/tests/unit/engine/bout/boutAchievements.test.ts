import { describe, it, expect } from "vitest";
import { detectKinboshi } from "@/engine/bout/boutAchievements";
import type { Rikishi, RikishiAchievements } from "@/engine/types/rikishi";
import type { BoutResult } from "@/engine/types/basho";

function makeAchievements(): RikishiAchievements {
  return {
    kinboshiEarned: 0,
    ginboshiEarned: 0,
    kinboshiConceded: 0,
    ginboshiConceded: 0,
    specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
    mochikyukinPoints: 0,
  };
}

function makeRikishi(id: string, rank: string, achievements?: RikishiAchievements): Rikishi {
  return {
    id,
    rank,
    stats: {
      aggression: 50,
      mental: 50,
      power: 50,
      speed: 50,
      technique: 50,
      balance: 50,
      stamina: 50,
      achievements: achievements ?? makeAchievements(),
    },
  } as unknown as Rikishi;
}

function makeResult(kimarite: string = "yorikiri"): BoutResult {
  return {
    boutId: "test-bout",
    winner: "east",
    winnerRikishiId: "east",
    loserRikishiId: "west",
    kimarite,
    kimariteName: kimarite,
    stance: "migi",
    tachiaiWinner: "east",
    duration: 5,
    excitementScore: 50,
    upset: false,
    isKinboshi: false,
    log: [],
    kenshoEnvelopes: 0,
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
  } as unknown as BoutResult;
}

describe("boutAchievements", () => {
  describe("detectKinboshi — pure award detection", () => {
    it("awards kinboshi when maegashira beats yokozuna", () => {
      const winner = makeRikishi("m1", "maegashira");
      const loser = makeRikishi("y1", "yokozuna");
      const result = makeResult();
      const { kinboshiDelta, awards } = detectKinboshi(result, winner, loser);
      expect(kinboshiDelta).toBe(true);
      expect(awards).toEqual([
        expect.objectContaining({
          type: "kinboshi",
          winnerId: "m1",
          loserId: "y1",
          boutId: "test-bout",
        }),
      ]);
    });

    it("awards ginboshi when maegashira beats ozeki", () => {
      const winner = makeRikishi("m1", "maegashira");
      const loser = makeRikishi("o1", "ozeki");
      const result = makeResult();
      const { kinboshiDelta, awards } = detectKinboshi(result, winner, loser);
      expect(kinboshiDelta).toBe(false);
      expect(awards).toEqual([
        expect.objectContaining({ type: "ginboshi", winnerId: "m1", loserId: "o1" }),
      ]);
      expect(result.awardFact).toBe("ginboshi");
    });

    it("does not award kinboshi on fusensho", () => {
      const winner = makeRikishi("m1", "maegashira");
      const loser = makeRikishi("y1", "yokozuna");
      const result = makeResult("fusensho");
      const { kinboshiDelta, awards } = detectKinboshi(result, winner, loser);
      expect(kinboshiDelta).toBe(false);
      expect(awards).toHaveLength(0);
    });

    it("does not award ginboshi on fusensho", () => {
      const winner = makeRikishi("m1", "maegashira");
      const loser = makeRikishi("o1", "ozeki");
      const result = makeResult("fusensho");
      const { kinboshiDelta, awards } = detectKinboshi(result, winner, loser);
      expect(kinboshiDelta).toBe(false);
      expect(awards).toHaveLength(0);
      expect(result.awardFact).toBeUndefined();
    });

    it("does not award for non-maegashira winner vs yokozuna", () => {
      for (const rank of ["sekiwake", "komusubi", "ozeki"]) {
        const winner = makeRikishi("s1", rank);
        const loser = makeRikishi("y1", "yokozuna");
        const result = makeResult();
        const { kinboshiDelta, awards } = detectKinboshi(result, winner, loser);
        expect(kinboshiDelta).toBe(false);
        expect(awards.filter((a) => a.type === "kinboshi")).toHaveLength(0);
      }
    });

    it("does not award for maegashira vs sekiwake", () => {
      const winner = makeRikishi("m1", "maegashira");
      const loser = makeRikishi("s1", "sekiwake");
      const result = makeResult();
      const { kinboshiDelta, awards } = detectKinboshi(result, winner, loser);
      expect(kinboshiDelta).toBe(false);
      expect(awards).toHaveLength(0);
    });

    it("awards kinboshi on hansoku (JSA: disqualification wins count — only fusensho is excluded)", () => {
      const winner = makeRikishi("m1", "maegashira");
      const loser = makeRikishi("y1", "yokozuna");
      const result = makeResult("hansoku");
      const { kinboshiDelta, awards } = detectKinboshi(result, winner, loser);
      expect(kinboshiDelta).toBe(true);
      expect(awards[0]?.type).toBe("kinboshi");
    });

    it("suppresses kinboshi when isPlayoff is set (honbasho-only rule)", () => {
      const winner = makeRikishi("m1", "maegashira");
      const loser = makeRikishi("y1", "yokozuna");
      const result = makeResult();
      const { kinboshiDelta, awards } = detectKinboshi(result, winner, loser, {
        isPlayoff: true,
      });
      expect(kinboshiDelta).toBe(false);
      expect(awards).toHaveLength(0);
      expect(result.awardFact).toBeUndefined();
    });

    it("suppresses ginboshi when isPlayoff is set", () => {
      const winner = makeRikishi("m1", "maegashira");
      const loser = makeRikishi("o1", "ozeki");
      const result = makeResult();
      const { awards } = detectKinboshi(result, winner, loser, { isPlayoff: true });
      expect(awards).toHaveLength(0);
      expect(result.awardFact).toBeUndefined();
    });

    it("does NOT mutate the input rikishi's achievement objects (purity)", () => {
      const winnerAch = makeAchievements();
      const loserAch = makeAchievements();
      const winner = makeRikishi("m1", "maegashira", winnerAch);
      const loser = makeRikishi("y1", "yokozuna", loserAch);
      const result = makeResult();
      detectKinboshi(result, winner, loser);
      expect(winner.stats.achievements?.kinboshiEarned).toBe(0);
      expect(loser.stats.achievements?.kinboshiConceded).toBe(0);
      expect(winner.stats.achievements).toBe(winnerAch);
    });
  });

  describe("kinboshiThisBasho tracking (Bug 3)", () => {
    it("Test 4.1: detectKinboshi returns kinboshiDelta=true when maegashira beats yokozuna", () => {
      const winner = makeRikishi("m1", "maegashira");
      const loser = makeRikishi("y1", "yokozuna");
      const result = makeResult();
      const { kinboshiDelta } = detectKinboshi(result, winner, loser);
      expect(kinboshiDelta).toBe(true);
    });

    it("Test 4.2: detectKinboshi works when achievements are undefined (pure detection needs no state)", () => {
      const winner = makeRikishi("m1", "maegashira");
      const loser = makeRikishi("y1", "yokozuna");
      (winner.stats as { achievements?: RikishiAchievements }).achievements = undefined;
      (loser.stats as { achievements?: RikishiAchievements }).achievements = undefined;
      const result = makeResult();
      const { kinboshiDelta } = detectKinboshi(result, winner, loser);
      expect(kinboshiDelta).toBe(true);
    });

    it("Test 4.3: detectKinboshi does not return kinboshiDelta for non-kinboshi bouts", () => {
      const winner = makeRikishi("m1", "maegashira");
      const loser = makeRikishi("s1", "sekiwake");
      const result = makeResult();
      const { kinboshiDelta } = detectKinboshi(result, winner, loser);
      expect(kinboshiDelta).toBe(false);
    });

    it("Test 4.4: kinboshi award carries the day from the result", () => {
      const winner = makeRikishi("m1", "maegashira");
      const loser = makeRikishi("y1", "yokozuna");
      const result = { ...makeResult(), day: 9 } as BoutResult;
      const { awards } = detectKinboshi(result, winner, loser);
      expect(awards[0]?.day).toBe(9);
    });

    it("Test 4.6: detectKinboshi sets result.awardFact = ginboshi for ginboshi", () => {
      const winner = makeRikishi("m1", "maegashira");
      const loser = makeRikishi("o1", "ozeki");
      const result = makeResult();
      detectKinboshi(result, winner, loser);
      expect(result.awardFact).toBe("ginboshi");
    });
  });
});
