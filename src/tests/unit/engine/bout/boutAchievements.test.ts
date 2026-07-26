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
  } as unknown as BoutResult;
}

describe("boutAchievements", () => {
  describe("detectKinboshi", () => {
    it("awards kinboshi when maegashira beats yokozuna", () => {
      const winner = makeRikishi("m1", "maegashira");
      const loser = makeRikishi("y1", "yokozuna");
      const result = makeResult();
      const { winnerAchievements, loserAchievements, kinboshiDelta } = detectKinboshi(result, winner, loser);
      expect(kinboshiDelta).toBe(true);
      expect(winnerAchievements.kinboshiEarned).toBe(1);
      expect(loserAchievements.kinboshiConceded).toBe(1);
    });

    it("awards ginboshi when maegashara beats ozeki", () => {
      const winner = makeRikishi("m1", "maegashira");
      const loser = makeRikishi("o1", "ozeki");
      const result = makeResult();
      const { winnerAchievements, loserAchievements, kinboshiDelta } = detectKinboshi(result, winner, loser);
      expect(kinboshiDelta).toBe(false);
      expect(winnerAchievements.ginboshiEarned).toBe(1);
      expect(loserAchievements.ginboshiConceded).toBe(1);
      expect(result.awardFact).toBe("ginboshi");
    });

    it("does not award kinboshi on fusensho", () => {
      const winner = makeRikishi("m1", "maegashira");
      const loser = makeRikishi("y1", "yokozuna");
      const result = makeResult("fusensho");
      const { kinboshiDelta } = detectKinboshi(result, winner, loser);
      expect(kinboshiDelta).toBe(false);
    });

    it("does not award ginboshi on fusensho", () => {
      const winner = makeRikishi("m1", "maegashira");
      const loser = makeRikishi("o1", "ozeki");
      const result = makeResult("fusensho");
      const { kinboshiDelta } = detectKinboshi(result, winner, loser);
      expect(kinboshiDelta).toBe(false);
      expect(result.awardFact).toBeUndefined();
    });

    it("does not award for non-maegashira winner vs yokozuna", () => {
      const winner = makeRikishi("s1", "sekiwake");
      const loser = makeRikishi("y1", "yokozuna");
      const result = makeResult();
      const { kinboshiDelta } = detectKinboshi(result, winner, loser);
      expect(kinboshiDelta).toBe(false);
    });

    it("does not award for maegashira vs sekiwake", () => {
      const winner = makeRikishi("m1", "maegashira");
      const loser = makeRikishi("s1", "sekiwake");
      const result = makeResult();
      const { kinboshiDelta } = detectKinboshi(result, winner, loser);
      expect(kinboshiDelta).toBe(false);
    });

    it("creates default achievements when missing", () => {
      const winner = makeRikishi("m1", "maegashira");
      const loser = makeRikishi("y1", "yokozuna");
      (winner.stats as { achievements?: RikishiAchievements }).achievements = undefined;
      (loser.stats as { achievements?: RikishiAchievements }).achievements = undefined;
      const result = makeResult();
      const { winnerAchievements, loserAchievements } = detectKinboshi(result, winner, loser);
      expect(winnerAchievements.kinboshiEarned).toBe(1);
      expect(loserAchievements.kinboshiConceded).toBe(1);
    });

    it("increments existing achievements", () => {
      const existing = makeAchievements();
      existing.kinboshiEarned = 3;
      existing.kinboshiConceded = 2;
      const winner = makeRikishi("m1", "maegashira", existing);
      const loser = makeRikishi("y1", "yokozuna", existing);
      const result = makeResult();
      const { winnerAchievements, loserAchievements } = detectKinboshi(result, winner, loser);
      expect(winnerAchievements.kinboshiEarned).toBe(4);
      expect(loserAchievements.kinboshiConceded).toBe(3);
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

    it("Test 4.2: detectKinboshi works when achievements are undefined (after fix, should not be needed)", () => {
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

    it("Test 4.4: detectKinboshi increments existing kinboshiEarned count", () => {
      const existing = makeAchievements();
      existing.kinboshiEarned = 2;
      const winner = makeRikishi("m1", "maegashira", existing);
      const loser = makeRikishi("y1", "yokozuna");
      const result = makeResult();
      const { kinboshiDelta, winnerAchievements } = detectKinboshi(result, winner, loser);
      expect(kinboshiDelta).toBe(true);
      expect(winnerAchievements.kinboshiEarned).toBe(3);
    });

    it("Test 4.5: detectKinboshi increments kinboshiConceded on loser", () => {
      const winner = makeRikishi("m1", "maegashira");
      const loser = makeRikishi("y1", "yokozuna");
      const result = makeResult();
      const { loserAchievements } = detectKinboshi(result, winner, loser);
      expect(loserAchievements.kinboshiConceded).toBe(1);
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
