/**
 * CompetitionService — thin orchestrator barrel.
 *
 * Responsibilities are split across focused sub-modules:
 *   - PlayoffResolver.ts  : playoff bracket resolution + standings calculation
 *   - PrizeDistribution.ts: sansho prizes, basho teate, kinboshi stipends
 *   - BashoHistory.ts     : almanac snapshots, award log, yokozuna deliberations
 *   - concludeBasho.ts    : tournament conclusion orchestration
 *
 * All sub-module exports are re-exported here so existing imports remain valid.
 */

import {
  resolvePlayoffs,
  calculateStandings,
  calculateDivisionStandings,
  resolveDivisionPlayoffs,
} from "./PlayoffResolver";
import { distributePrizes, payBashoTeate } from "./PrizeDistribution";
import { recordBashoHistory, checkYokozunaPromotions } from "./BashoHistory";
import { concludeBashoCompetition } from "./concludeBasho";

export { resolvePlayoffs, calculateStandings, calculateDivisionStandings, resolveDivisionPlayoffs };
export { distributePrizes, payBashoTeate };
export { recordBashoHistory, checkYokozunaPromotions };
export { concludeBashoCompetition };
