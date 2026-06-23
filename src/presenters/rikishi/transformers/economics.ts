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
  return {
    salaryBreakdown: getSalaryBreakdown(
      RANK_HIERARCHY[(r.rank || "jonokuchi") as Rank]?.salary ?? 0,
      r.division || "jonokuchi",
      r.stats?.achievements?.kinboshiEarned ?? 0
    ),
  };
}
