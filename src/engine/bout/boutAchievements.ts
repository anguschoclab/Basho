/**
 * src/engine/bout/boutAchievements.ts
 * ===================================
 * Kinboshi/ginboshi award detection.
 * Extracted from boutResolver.ts for SRP separation.
 *
 * Pure detection only — this module never mutates rikishi or world state.
 * It returns BoutAward facts describing *what happened*; the bout result
 * applier owns every state side-effect (achievements, kinboshiThisBasho,
 * awardLog) so each counter is written exactly once.
 */

import type { Rikishi } from "../types/rikishi";
import type { BoutAward, BoutResult } from "../types/basho";

interface DetectKinboshiOptions {
  /**
   * True for playoff (kettei-sen) bouts. Per JSA rules a kinboshi is only
   * earned in honbasho torikumi — playoff wins never award a gold star.
   */
  isPlayoff?: boolean;
}

export function detectKinboshi(
  result: BoutResult,
  winner: Rikishi,
  loser: Rikishi,
  opts?: DetectKinboshiOptions
): {
  kinboshiDelta: boolean;
  awards: BoutAward[];
} {
  const awards: BoutAward[] = [];
  let kinboshiDelta = false;

  // Honbasho torikumi only — playoffs are exhibition-deciding and never award stars.
  if (!opts?.isPlayoff) {
    const awardBase = {
      winnerId: winner.id,
      loserId: loser.id,
      day: result.day ?? 0,
      boutId: result.boutId,
    };

    // Kinboshi: maegashira over yokozuna. Fusensho (default win) excluded;
    // hansoku (disqualification) DOES count per JSA practice.
    if (
      winner.rank === "maegashira" &&
      loser.rank === "yokozuna" &&
      result.kimarite !== "fusensho"
    ) {
      kinboshiDelta = true;
      awards.push({ type: "kinboshi", ...awardBase });
      result.awardFact = "kinboshi";
    } else if (
      winner.rank === "maegashira" &&
      loser.rank === "ozeki" &&
      result.kimarite !== "fusensho"
    ) {
      // Ginboshi: informal "silver star" — recorded on the result but carries
      // no official ledger entry or mochikyukin value.
      awards.push({ type: "ginboshi", ...awardBase });
      result.awardFact = "ginboshi";
    }
  }

  return { kinboshiDelta, awards };
}
