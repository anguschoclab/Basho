/**
 * Economics Transformer
 * =====================
 * Transforms salary and economic data.
 */

import type { Rikishi } from "../../../engine/types/rikishi";
import type { Rank } from "../../../engine/types/banzuke";
import { RANK_HIERARCHY } from "../../../engine/types/banzuke";
import { getSalaryBreakdown } from "../../../engine/economics_awards";
import type { RikishiEconomicsDTO } from "../types";

/**
 * Transform economics fields.
 */
export function toEconomicsDTO(r: Rikishi): RikishiEconomicsDTO {
  const e = r.economics;
  return {
    salaryBreakdown: getSalaryBreakdown(
      RANK_HIERARCHY[(r.rank || "jonokuchi") as Rank]?.salary ?? 0,
      r.division || "jonokuchi",
      r.stats?.achievements?.kinboshiEarned ?? 0
    ),
    totalEarnings: e?.totalEarnings ?? 0,
    cash: e?.cash ?? 0,
    retirementFund: e?.retirementFund ?? 0,
    careerKenshoWon: e?.careerKenshoWon ?? 0,
    kinboshiCount: e?.kinboshiCount ?? 0,
    popularity: e?.popularity ?? 50,
    currentBashoEarnings: e?.currentBashoEarnings ?? 0,
  };
}
