/**
 * CompetitionService — thin orchestrator barrel.
 *
 * Responsibilities are split across focused sub-modules:
 *   - PlayoffResolver.ts  : playoff bracket resolution + standings calculation
 *   - PrizeDistribution.ts: sansho prizes, basho teate, kinboshi stipends
 *   - BashoHistory.ts     : almanac snapshots, award log, yokozuna deliberations
 *
 * All sub-module exports are re-exported here so existing imports remain valid.
 */

import { createImpactBuilder } from "../core/ImpactBuilder";
import { mergeImpacts } from "../core/ImpactResolver";
import { accumulateMochikyukinPoints } from "../systems/economy/MochikyukinService";
import type { WorldState } from "../types/world";
import type { StateImpact } from "../core/StateImpact";
import { resolvePlayoffs, calculateStandings } from "./PlayoffResolver";
import { distributePrizes, payBashoTeate, payKinboshiStipends } from "./PrizeDistribution";
import { recordBashoHistory, checkYokozunaPromotions } from "./BashoHistory";
import { getRikishi } from "../queries";

export { resolvePlayoffs, calculateStandings };
export { distributePrizes, payBashoTeate, payKinboshiStipends };
export { recordBashoHistory, checkYokozunaPromotions };

/**
 * Conclude Tournament Competition — handles yusho, prizes, and playoffs.
 * Returns StateImpact describing competition conclusion instead of mutating directly.
 *
 * Algorithm:
 * 1. Calculate standings to determine yusho candidates
 * 2. If tie for first, resolve playoffs
 * 3. Distribute prizes (sansho, kinboshi, etc.)
 * 4. Record basho history and phase transitions
 * 5. Pay basho teate to non-sekitori rikishi
 * 6. Pay kinboshi stipends
 * 7. Accumulate mochikyukin points for sekitori
 * 8. Merge all impacts together
 *
 * @param {WorldState} world - Current world state.
 * @returns {StateImpact} Impact describing competition conclusion.
 *
 * @example
 * ```ts
 * const impact = concludeBashoCompetition(world);
 * const updatedWorld = resolveImpacts(world, [impact]);
 * ```
 */
export function concludeBashoCompetition(world: WorldState): StateImpact {
  const builder = createImpactBuilder("concludeBashoCompetition");
  const basho = world.currentBasho;
  if (!basho) return builder.build();

  const { topCandidates, bestWins } = calculateStandings(basho);

  if (topCandidates.length === 0) return builder.build();

  let yusho = topCandidates[0];
  const playoffMatches = [] as import("../types/basho").MatchSchedule[];

  if (topCandidates.length > 1) {
    const playoffResult = resolvePlayoffs(world, basho, topCandidates);
    yusho = playoffResult.winner;
    playoffMatches.push(...playoffResult.matches);

    const champ = getRikishi(world, yusho);
    builder.logEvent(
      "BOUT_RESOLVED",
      "narrative",
      {
        status: "playoff_result",
        shikona: champ?.shikona ?? yusho,
        score: topCandidates.length,
        delta: bestWins,
      },
      { rikishiId: yusho }
    );
  }

  const { prizes, impact: prizeImpact } = distributePrizes(world, basho, yusho);

  // Merge prize impact
  if (prizeImpact.entities?.rikishiUpdates) {
    for (const [id, update] of prizeImpact.entities.rikishiUpdates) {
      builder.updateRikishi(id, update);
    }
  }
  if (prizeImpact.entities?.heyaUpdates) {
    for (const [id, update] of prizeImpact.entities.heyaUpdates) {
      builder.updateHeya(id, update);
    }
  }
  if (prizeImpact.events) {
    for (const event of prizeImpact.events) {
      builder.logEvent(event.type, event.category, event.data, {
        heyaId: event.heyaId,
        rikishiId: event.rikishiId,
        importance: event.importance,
      });
    }
  }

  // Record basho history and phase transitions
  const historyImpact = recordBashoHistory(
    world,
    basho,
    yusho,
    topCandidates,
    playoffMatches,
    prizes,
    bestWins
  );

  // Pay basho teate to non-sekitori rikishi
  const teateImpact = payBashoTeate(world);

  // Pay kinboshi stipends (per-basho, not per-month)
  const kinboshiImpact = payKinboshiStipends(world);

  // Accumulate mochikyukin points for sekitori
  const mochikyukinImpact = createImpactBuilder("mochikyukinAccumulation");
  for (const id of world.activeRikishiIds) {
    const r = getRikishi(world, id);
    if (!r) continue;
    if (r.division !== "makuuchi" && r.division !== "juryo") continue;

    const bashoWins = r.currentBashoWins ?? 0;
    const bashoLosses = r.currentBashoLosses ?? 0;
    const netWins = bashoWins - bashoLosses;
    const isYusho = id === yusho;
    const isJunYusho = topCandidates.length > 1 && id === topCandidates[1];
    const kinboshiThisBasho = basho.kinboshiThisBasho?.[id] ?? 0;
    const isZenshoYusho = isYusho && bashoLosses === 0;

    const impact = accumulateMochikyukinPoints(world, id, {
      netWins,
      isYusho,
      isJunYusho,
      isZenshoYusho,
      kinboshiEarned: kinboshiThisBasho,
    });

    if (impact.entities?.rikishiUpdates) {
      for (const [rid, update] of impact.entities.rikishiUpdates) {
        mochikyukinImpact.updateRikishi(rid, update);
      }
    }
  }

  // Merge impacts together
  return mergeImpacts([
    builder.build(),
    historyImpact,
    teateImpact,
    kinboshiImpact,
    mochikyukinImpact.build(),
  ]);
}
