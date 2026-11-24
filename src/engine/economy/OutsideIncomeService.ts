/**
 * OutsideIncomeService.ts
 * =======================
 * Sekitori outside income — the non-JSA streams that make top-tier
 * careers founder-rich (real-2026 totals: Y ¥80–120M, O ¥45–75M,
 * S/K ¥30–45M, M ¥20–35M, J ¥14–20M gross annual):
 *
 * 1. Commercial endorsements (CM/print/TV) — monthly credit,
 *    concentrated at Yokozuna/Ōzeki and charismatic makuuchi
 *    (ENDORSEMENT_ANNUAL_BY_RANK). Jūryō and below earn none —
 *    their income is JSA-internal.
 *
 * 2. Personal tanimachi/kōenkai gifts (goshūgi) — per-basho cash
 *    envelopes at post-tournament parties, star-scaled
 *    (PATRONAGE_BASHO_BASE_BY_RANK). Distinct from the heya-level
 *    kōenkai split — that stream is institutional and flat; this one
 *    is individual and tracks `marketability`.
 *
 * Both streams land in `cash` (personal, taxable-equivalent income) and
 * accumulate onto `careerEndorsements` / `careerPatronage` so the UI can
 * show the outside-vs-JSA split. Career liquid wealth is what NPC
 * retirees draw on to self-fund stable foundings — see
 * `evaluateFoundingEligibility`.
 */

import type { WorldState } from "@/engine/types/world";
import type { StateImpact } from "@/engine/core/StateImpact";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { getRikishi } from "@/engine/core/queries";
import { rngForWorld } from "@/engine/core/rng";
import { isSekitoriDivision } from "@/constants/engine/rankDisplay";
import {
  ENDORSEMENT_ANNUAL_BY_RANK,
  PATRONAGE_BASHO_BASE_BY_RANK,
  PATRONAGE_JITTER_MIN,
  PATRONAGE_JITTER_SPAN,
  outsideIncomeStarFactor,
  MONTHLY_DIVISOR,
} from "@/constants/engine/economyExtended";

type Economics = NonNullable<import("@/engine/types/rikishi").Rikishi["economics"]>;

const EMPTY_ECONOMICS: Omit<Economics, "mochikyukinLastPayoutMonth"> = {
  cash: 0,
  retirementFund: 0,
  careerKenshoWon: 0,
  kinboshiCount: 0,
  totalEarnings: 0,
  currentBashoEarnings: 0,
  popularity: 50,
};

/**
 * Monthly endorsement income (CM/media deals). Credit = rank base ×
 * marketability star factor, divided monthly. Seeded variance is
 * deliberately absent — deal contracts are fixed-annual.
 */
export function payMonthlyEndorsements(world: WorldState): StateImpact {
  const builder = createImpactBuilder("payMonthlyEndorsements");

  for (const rikishiId of world.activeRikishiIds) {
    const rikishi = getRikishi(world, rikishiId);
    if (!rikishi) continue;
    if (!isSekitoriDivision(rikishi.division)) continue;

    const annual =
      ENDORSEMENT_ANNUAL_BY_RANK[rikishi.rank as keyof typeof ENDORSEMENT_ANNUAL_BY_RANK] ?? 0;
    if (annual <= 0) continue;

    const monthly = (annual / MONTHLY_DIVISOR) * outsideIncomeStarFactor(rikishi.marketability ?? 50);

    const economics = rikishi.economics || { ...EMPTY_ECONOMICS };
    builder.updateRikishi(rikishiId, {
      economics: {
        ...economics,
        cash: economics.cash + monthly,
        totalEarnings: economics.totalEarnings + monthly,
        careerEndorsements: (economics.careerEndorsements ?? 0) + monthly,
      },
    });
  }

  return builder.build();
}

/**
 * Per-basho personal patronage gifts — post-tournament goshūgi from
 * tanimachi and kōenkai members. Runs at basho conclusion so the gift
 * reflects the tournament just fought (seeded per-rikishi jitter for
 * party-size variance).
 */
export function applyBashoPatronage(world: WorldState): StateImpact {
  const builder = createImpactBuilder("applyBashoPatronage");
  const bashoKey = `${world.year ?? 0}_${world.currentBashoName ?? world.week ?? 0}`;

  for (const rikishiId of world.activeRikishiIds) {
    const rikishi = getRikishi(world, rikishiId);
    if (!rikishi || rikishi.isRetired) continue;
    if (!isSekitoriDivision(rikishi.division)) continue;

    const base =
      PATRONAGE_BASHO_BASE_BY_RANK[rikishi.rank as keyof typeof PATRONAGE_BASHO_BASE_BY_RANK] ?? 0;
    if (base <= 0) continue;

    const rng = rngForWorld(world, "economy", `patronage_${rikishiId}_${bashoKey}`);
    const jitter = PATRONAGE_JITTER_MIN + rng.next() * PATRONAGE_JITTER_SPAN;
    const gift = Math.round(base * outsideIncomeStarFactor(rikishi.marketability ?? 50) * jitter);

    const economics = rikishi.economics || { ...EMPTY_ECONOMICS };
    builder.updateRikishi(rikishiId, {
      economics: {
        ...economics,
        cash: economics.cash + gift,
        totalEarnings: economics.totalEarnings + gift,
        careerPatronage: (economics.careerPatronage ?? 0) + gift,
      },
    });
  }

  return builder.build();
}
