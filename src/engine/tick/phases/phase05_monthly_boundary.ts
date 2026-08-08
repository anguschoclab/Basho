/**
 * phase05_monthly_boundary.ts
 * ===========================
 * Pipeline Phase: Monthly Institutional Updates.
 *
 * Responsibilities:
 * 1. Pay sekitori salaries and kinboshi stipends.
 * 2. Deduct heya maintenance, rent, and staff costs.
 * 3. Process loan repayments.
 * 4. Apply facility decay or maintenance.
 * 5. NPC auto-investment in facilities.
 * 6. NPC monthly decision loops (retirements, recruitment vacancies).
 * 7. Archetype drift evaluation post-basho.
 */

import type { WorldState } from "../../types/world";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { mergeImpacts } from "../../core/ImpactResolver";
import { isBashoMonth } from "../../calendar";
import {
  payTravelAllowance,
  deductTsukebitoCosts,
  distributeKoenkaiToSekitori,
} from "../../systems/economy/TravelAllowanceService";
import { tickMonthlyNPC } from "../../npcAI";
import { payMochikyukinBonuses } from "../../systems/economy/MochikyukinService";
import { renewSponsorContract } from "../../systems/economy/SponsorContractService";
import { processHeyaEconomics, processLoanRepayments } from "./monthly/economics";
import { processFacilitiesMaintenance, processNpcAutoInvestment } from "./monthly/facilities";
import { processArchetypeDrift } from "./monthly/training";
import type { HeyaUpdates } from "./monthly/types";
import { RUNWAY_THRESHOLDS, RUNWAY_BANDS } from "../../../constants/engine/economy";
import {
  SPONSOR_RENEWAL_WINDOW_WEEKS,
  SPONSOR_MIN_LOYALTY_FOR_RENEWAL,
} from "../../../constants/engine/time";
import { clampFundsToDebtLimit } from "../../../constants/engine/economic";
import { getRikishi } from "../../queries";

export function phase05_monthly_boundary(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase05_monthly_boundary");
  const boundaries = world.transientContext?.boundaries;
  if (!boundaries?.monthBoundary) return builder.build();

  // 1. Process Heyas (Economics, Loans, Facilities, NPC AI)
  for (const [id, heya] of world.heyas) {
    const heyaUpdates: HeyaUpdates = {};

    // -- Economics: Salaries & Upkeep --
    const breakdown = { jsaSalaries: 0, heyaOverhead: 0 };
    processHeyaEconomics(world, heya, world.rikishi, heyaUpdates, builder, breakdown);

    // -- Loan Repayments --
    processLoanRepayments(world, heya, heyaUpdates, builder);

    // -- Facilities Decay & Maintenance --
    const maintenance = processFacilitiesMaintenance(world, heya, heyaUpdates, builder);

    // -- NPC Auto-Investment (uses overhead-only burn, not JSA salaries) --
    processNpcAutoInvestment(world, heya, breakdown.heyaOverhead, maintenance, heyaUpdates, builder);

    // Runway Band Sync (overhead-only burn — JSA salaries don't leave heya.funds)
    const burn = Math.max(1, breakdown.heyaOverhead + maintenance);
    const runway = (heyaUpdates.funds ?? heya.funds ?? 0) / burn;
    heyaUpdates.runwayBand =
      runway >= RUNWAY_THRESHOLDS.SECURE
        ? RUNWAY_BANDS.SECURE
        : runway >= RUNWAY_THRESHOLDS.COMFORTABLE
          ? RUNWAY_BANDS.COMFORTABLE
          : runway >= RUNWAY_THRESHOLDS.TIGHT
            ? RUNWAY_BANDS.TIGHT
            : runway >= RUNWAY_THRESHOLDS.CRITICAL
              ? RUNWAY_BANDS.CRITICAL
              : RUNWAY_BANDS.DESPERATE;

    // Clamp funds to debt floor after overhead (mirrors weekly FinanceCalculator clamp)
    if (heyaUpdates.funds !== undefined) {
      heyaUpdates.funds = clampFundsToDebtLimit(heyaUpdates.funds);
    }

    builder.updateHeya(id, heyaUpdates);
  }

  // 2. Process Rikishi (Archetype Drift)
  if (isBashoMonth(world.calendar?.month ?? 1)) {
    for (const id of world.activeRikishiIds) {
      const r = getRikishi(world, id);
      if (!r) continue;
      const nextR = { ...r };
      if (processArchetypeDrift(world, nextR, id, builder)) {
        builder.updateRikishi(id, nextR);
      }
    }
  }

  builder.logEvent("BASHO_STATUS", "narrative", {
    status: "meta_shift",
    incident: "monthly_boundary",
    day: world.calendar?.month ?? 1,
    score: world.calendar?.year ?? 2026,
  });

  // NPC Monthly Strategy: finance decisions, sponsor recruitment, governance,
  // retirement evaluation, vacancy assessment.
  const npcMonthlyImpact = tickMonthlyNPC(world);

  // Pay travel/jungyo allowance to sekitori
  const travelImpact = payTravelAllowance(world);

  // Deduct tsukebito costs from sekitori
  const tsukebitoImpact = deductTsukebitoCosts(world);

  // Distribute kōenkai income portion to sekitori
  const koenkaiDistributionImpact = distributeKoenkaiToSekitori(world);

  // Pay mochikyukin bonuses to sekitori (every 2 months)
  const mochikyukinPayoutImpact = payMochikyukinBonuses(world, world.calendar?.month ?? 1);

  // Auto-renew sponsor contracts expiring within window for high-loyalty sponsors
  const sponsorRenewalImpacts: StateImpact[] = [];
  if (world.sponsorPool) {
    const currentWeek = world.week ?? 0;
    for (const sponsor of world.sponsorPool.sponsors.values()) {
      if (!sponsor.active || sponsor.loyalty < SPONSOR_MIN_LOYALTY_FOR_RENEWAL) continue;
      for (const rel of sponsor.relationships) {
        if (
          rel.endsAtTick !== undefined &&
          rel.endsAtTick - currentWeek <= SPONSOR_RENEWAL_WINDOW_WEEKS &&
          rel.endsAtTick > currentWeek
        ) {
          sponsorRenewalImpacts.push(renewSponsorContract(world, rel.relId, sponsor.sponsorId));
        }
      }
    }
  }

  return mergeImpacts([
    builder.build(),
    npcMonthlyImpact,
    travelImpact,
    tsukebitoImpact,
    koenkaiDistributionImpact,
    mochikyukinPayoutImpact,
    ...sponsorRenewalImpacts,
  ]);
}
