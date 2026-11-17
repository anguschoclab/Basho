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

import type { Rikishi } from "@/engine/types/rikishi";
import type { BoutAward, BoutResult } from "@/engine/types/basho";

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

    // Kinboshi: maegashira over yokozuna. Fusensho (default win) and hansoku
    // (disqualification) are both excluded — the JSA awards no gold star
    // unless the yokozuna is beaten in a contested regulation bout.
    if (
      winner.rank === "maegashira" &&
      loser.rank === "yokozuna" &&
      result.kimarite !== "fusensho" &&
      result.kimarite !== "hansoku"
    ) {
      kinboshiDelta = true;
      awards.push({ type: "kinboshi", ...awardBase });
      result.awardFact = "kinboshi";
    } else if (
      result.kimarite !== "fusensho" &&
      result.kimarite !== "hansoku" &&
      ((winner.rank === "maegashira" && loser.rank === "ozeki") ||
        ((winner.rank === "sekiwake" || winner.rank === "komusubi") &&
          loser.rank === "yokozuna"))
    ) {
      // Ginboshi: informal fan/media "silver star" — not an official JSA
      // award. Real-world usage covers (a) maegashira over ozeki and
      // (b) sekiwake/komusubi over yokozuna, since sanyaku cannot earn a
      // kinboshi. Recorded on the result for flavor only; carries no
      // official ledger entry or mochikyukin value.
      awards.push({ type: "ginboshi", ...awardBase });
      result.awardFact = "ginboshi";
    }
  }

  return { kinboshiDelta, awards };
}
