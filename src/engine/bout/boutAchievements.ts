/**
 * src/engine/bout/boutAchievements.ts
 * ===================================
 * Kinboshi/ginboshi achievement detection.
 * Extracted from boutResolver.ts for SRP separation.
 */

import type { Rikishi, RikishiAchievements } from "../types/rikishi";
import type { BoutResult } from "../types/basho";

function defaultAchievements(): RikishiAchievements {
  return {
    kinboshiEarned: 0,
    ginboshiEarned: 0,
    kinboshiConceded: 0,
    ginboshiConceded: 0,
    specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
    mochikyukinPoints: 0,
  };
}

export function detectKinboshi(
  result: BoutResult,
  winner: Rikishi,
  loser: Rikishi
): {
  winnerAchievements: RikishiAchievements;
  loserAchievements: RikishiAchievements;
  kinboshiDelta: boolean;
} {
  const winnerAchievements = winner.stats.achievements || defaultAchievements();
  const loserAchievements = loser.stats.achievements || defaultAchievements();
  let kinboshiDelta = false;

  if (winner.rank === "maegashira" && loser.rank === "yokozuna" && result.kimarite !== "fusensho") {
    winnerAchievements.kinboshiEarned++;
    loserAchievements.kinboshiConceded++;
    kinboshiDelta = true;
  } else if (
    winner.rank === "maegashira" &&
    loser.rank === "ozeki" &&
    result.kimarite !== "fusensho"
  ) {
    winnerAchievements.ginboshiEarned++;
    loserAchievements.ginboshiConceded++;
    result.awardFact = "ginboshi";
  }

  return { winnerAchievements, loserAchievements, kinboshiDelta };
}
