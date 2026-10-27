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
} from "@/engine/lifecycle/PlayoffResolver";
import { distributePrizes, payBashoTeate } from "@/engine/lifecycle/PrizeDistribution";
import { recordBashoHistory, checkYokozunaPromotions } from "@/engine/lifecycle/BashoHistory";
import { concludeBashoCompetition } from "@/engine/lifecycle/concludeBasho";

export { resolvePlayoffs, calculateStandings, calculateDivisionStandings, resolveDivisionPlayoffs };
export { distributePrizes, payBashoTeate };
export { recordBashoHistory, checkYokozunaPromotions };
export { concludeBashoCompetition };
