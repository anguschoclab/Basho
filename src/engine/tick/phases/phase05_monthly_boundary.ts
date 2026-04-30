// @ts-nocheck
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
import { mergeImpacts } from "../../core/ImpactResolver";
import type { StateImpact } from "../../core/StateImpact";
import { isBashoMonth } from "../../calendar";
import {
  payTravelAllowance,
  deductTsukebitoCosts,
  distributeKoenkaiToSekitori,
} from "../../systems/economics/TravelAllowanceService";
import { tickMonthlyNPC } from "../../npcAI";
import { payMochikyukinBonuses } from "../../systems/economics/MochikyukinService";
import { renewSponsorContract } from "../../systems/economy/SponsorContractService";
import { processHeyaEconomics, processLoanRepayments } from "./monthly/economics";
import { processFacilitiesMaintenance, processNpcAutoInvestment } from "./monthly/facilities";
import { processArchetypeDrift } from "./monthly/training";
import type { HeyaUpdates } from "./monthly/types";

export function phase05_monthly_boundary(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase05_monthly_boundary");
  const boundaries = world.transientContext?.boundaries;
  if (!boundaries?.monthBoundary) return builder.build();

  // 1. Process Heyas (Economics, Loans, Facilities, NPC AI)
  for (const [id, heya] of world.heyas) {
    const heyaUpdates: HeyaUpdates = {};

    // -- Economics: Salaries & Upkeep --
    const totalExpenses = processHeyaEconomics(world, heya, world.rikishi, heyaUpdates, builder);

    // -- Loan Repayments --
    processLoanRepayments(world, heya, heyaUpdates, builder);

    // -- Facilities Decay & Maintenance --
    const maintenance = processFacilitiesMaintenance(world, heya, heyaUpdates, builder);

    // -- NPC Auto-Investment --
    processNpcAutoInvestment(world, heya, totalExpenses, maintenance, heyaUpdates, builder);

    // Runway Band Sync
    const burn = Math.max(1, totalExpenses + maintenance);
    const runway = (heyaUpdates.funds ?? heya.funds ?? 0) / burn;
    heyaUpdates.runwayBand =
      runway >= 12
        ? "secure"
        : runway >= 6
          ? "comfortable"
          : runway >= 3
            ? "tight"
            : runway >= 1
              ? "critical"
              : "desperate";

    builder.updateHeya(id, heyaUpdates);
  }

  // 2. Process Rikishi (Archetype Drift)
  if (isBashoMonth(world.calendar.month)) {
    for (const [id, r] of world.rikishi) {
      if (r.isRetired) continue;
      const nextR = { ...r };
      if (processArchetypeDrift(world, nextR, id, builder)) {
        builder.updateRikishi(id, nextR);
      }
    }
  }

  builder.logEvent("BASHO_STATUS", "narrative", {
    status: "meta_shift",
    incident: "monthly_boundary",
    day: world.calendar.month,
    score: world.calendar.year,
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
  const mochikyukinPayoutImpact = payMochikyukinBonuses(world, world.calendar.month);

  // Auto-renew sponsor contracts expiring within 8 weeks for high-loyalty sponsors
  const sponsorRenewalImpacts: StateImpact[] = [];
  if (world.sponsorPool) {
    const currentWeek = world.week ?? 0;
    for (const sponsor of world.sponsorPool.sponsors.values()) {
      if (!sponsor.active || sponsor.loyalty < 60) continue;
      for (const rel of sponsor.relationships) {
        if (
          rel.endsAtTick !== undefined &&
          rel.endsAtTick - currentWeek <= 8 &&
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
