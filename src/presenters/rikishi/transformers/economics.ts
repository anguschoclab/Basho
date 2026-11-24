/**
 * Economics Transformer
 * =====================
 * Transforms salary and economic data.
 */

import type { Rikishi } from "@/engine/types/rikishi";
import type { Rank } from "@/engine/types/banzuke";
import { jsaSekitoriSalary } from "@/constants/engine/jsaEra";
import { DEFAULT_START_YEAR } from "@/constants/engine/calendar";
import { getSalaryBreakdown } from "@/engine/economy/awards";
import type { RikishiEconomicsDTO } from "@/presenters/rikishi/types";

/**
 * Transform economics fields. `year` is the world's calendar year — JSA
 * compensation is era-keyed (the July-2026 revision applies from 2027).
 */
export function toEconomicsDTO(r: Rikishi, year?: number): RikishiEconomicsDTO {
  const e = r.economics;
  return {
    salaryBreakdown: getSalaryBreakdown(
      jsaSekitoriSalary((r.rank || "jonokuchi") as Rank, year ?? DEFAULT_START_YEAR),
      r.division || "jonokuchi",
      r.stats?.achievements?.mochikyukinPoints ?? 0,
      r.rank
    ),
    totalEarnings: e?.totalEarnings ?? 0,
    cash: e?.cash ?? 0,
    retirementFund: e?.retirementFund ?? 0,
    careerKenshoWon: e?.careerKenshoWon ?? 0,
    kinboshiCount: e?.kinboshiCount ?? 0,
    popularity: e?.popularity ?? 50,
    currentBashoEarnings: e?.currentBashoEarnings ?? 0,
    careerEndorsements: e?.careerEndorsements ?? 0,
    careerPatronage: e?.careerPatronage ?? 0,
  };
}
