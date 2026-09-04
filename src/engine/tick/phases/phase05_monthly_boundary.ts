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
import { DEFAULT_START_YEAR } from "../../../constants/engine/calendar";
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
import { getKachiNokoriForRikishi } from "../../systems/economy/KachiNokoriService";
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
import { isSekitoriDivision } from "../../../constants/engine/rankDisplay";
import { getRikishi } from "../../queries";
import {
  getExhibitionBashoSchedule,
  simulateExhibitionBasho,
} from "../../systems/basho/ExhibitionBashoService";

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
    processNpcAutoInvestment(
      world,
      heya,
      breakdown.heyaOverhead,
      maintenance,
      heyaUpdates,
      builder
    );

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
    score: world.year ?? DEFAULT_START_YEAR,
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

  // Exhibition basho (jungyo) — simulate on non-honbasho months
  const currentMonth = world.calendar?.month ?? 1;
  const exhibitionSchedule = getExhibitionBashoSchedule(world.year ?? DEFAULT_START_YEAR);
  const jungyoEvent = exhibitionSchedule.find((e) => e.month === currentMonth);
  const exhibitionImpacts: StateImpact[] = [];
  if (jungyoEvent && !isBashoMonth(currentMonth)) {
    const sekitoriParticipants = Array.from(world.activeRikishiIds ?? [])
      .map((id) => getRikishi(world, id))
      .filter((r): r is NonNullable<typeof r> => r !== undefined)
      .filter((r) => isSekitoriDivision(r.division) && !r.isRetired);
    if (sekitoriParticipants.length > 0) {
      const exhibitionImpact = simulateExhibitionBasho(
        world,
        jungyoEvent.name,
        sekitoriParticipants
      );
      exhibitionImpacts.push(exhibitionImpact);
      // Log the exhibition tour event
      builder.logEvent("BASHO_STATUS", "basho", {
        status: "exhibition_tour",
        description: `The ${jungyoEvent.displayName} begins — ${sekitoriParticipants.length} sekitori participate in the regional tour.`,
        bashoName: jungyoEvent.name,
        month: currentMonth,
        location: jungyoEvent.location,
        participantCount: sekitoriParticipants.length,
      });
    }
  }

  // Pay mochikyukin bonuses to sekitori (every 2 months)
  const mochikyukinPayoutImpact = payMochikyukinBonuses(world, world.calendar?.month ?? 1);

  // Surface kachi-nokori (surplus wins) for sekitori after mochikyukin payout
  if (isBashoMonth(world.calendar?.month ?? 1)) {
    for (const id of world.activeRikishiIds) {
      const r = getRikishi(world, id);
      if (!r) continue;
      if (r.division !== "makuuchi" && r.division !== "juryo") continue;
      const kachiNokori = getKachiNokoriForRikishi(r);
      if (kachiNokori > 0) {
        builder.logEvent("BASHO_STATUS", "narrative", {
          status: "kachi_nokori",
          rikishiId: r.id,
          shikona: r.shikona || r.name,
          heyaId: r.heyaId,
          kachiNokori,
          wins: r.currentBashoWins ?? 0,
          losses: r.currentBashoLosses ?? 0,
        });
      }
    }
  }

  // Auto-renew sponsor contracts expiring within window for high-loyalty sponsors
  const sponsorRenewalImpacts: StateImpact[] = [];
  if (world.sponsorPool) {
    const currentWeek = world.week ?? 0;
    for (const sponsor of world.sponsorPool.sponsors.values()) {
      if (!sponsor.active || sponsor.loyalty < SPONSOR_MIN_LOYALTY_FOR_RENEWAL) continue;
      for (let i = 0; i < sponsor.relationships.length; i++) {
        const rel = sponsor.relationships[i];
        if (
          rel.endsAtTick !== undefined &&
          rel.endsAtTick - currentWeek <= SPONSOR_RENEWAL_WINDOW_WEEKS &&
          rel.endsAtTick > currentWeek
        ) {
          sponsorRenewalImpacts.push(
            renewSponsorContract(world, rel.relId, sponsor.sponsorId, {
              sponsor,
              relIndex: i,
            })
          );
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
    ...exhibitionImpacts,
    ...sponsorRenewalImpacts,
  ]);
}
