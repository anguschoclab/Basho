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
import type { Rikishi } from "../../types/rikishi";
import type { Heya } from "../../types/heya";
import { DEFAULT_START_YEAR } from "../../../constants/engine/calendar";
import { createImpactBuilder, type ImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { mergeImpacts, resolveImpacts, sequenceImpacts } from "../../core/ImpactResolver";
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
import type { Sponsor } from "../../types/sponsors";
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
    processHeyaMonth(world, heya, id, builder);
  }

  // 2. Process Rikishi (Archetype Drift)
  if (isBashoMonth(world.calendar?.month ?? 1)) {
    for (const id of world.activeRikishiIds) {
      const r = getRikishi(world, id);
      if (!r) continue;
      const nextR = { ...r };
      if (processArchetypeDrift(world, nextR, id, builder)) {
        // Write only the fields drift touches — a whole-entity write carries a
        // stale `economics` snapshot that reverts the salary credit above.
        builder.updateRikishi(id, {
          combatProfile: nextR.combatProfile,
          archetypeEvidence: nextR.archetypeEvidence,
        });
      }
    }
  }

  builder.logEvent("BASHO_STATUS", "narrative", {
    status: "meta_shift",
    incident: "monthly_boundary",
    day: world.calendar?.month ?? 1,
    score: world.year ?? DEFAULT_START_YEAR,
  });

  // Exhibition basho (jungyo) — participant roster is input-derived (roster
  // membership does not change mid-phase); the simulation itself runs on the
  // progressively-resolved world below so stipend writes compose.
  const currentMonth = world.calendar?.month ?? 1;
  const { jungyoEvent, jungyoParticipants } = collectJungyoParticipants(
    builder,
    world,
    currentMonth
  );

  surfaceKachiNokori(builder, world);

  const renewals = collectSponsorRenewals(world);

  const baseImpact = builder.build();

  // Snapshot-writing services must be computed against a progressively
  // resolved world — each writes complete objects (economics/funds/
  // myosekiMarket/sponsorPool) derived from its input. A flat merge would
  // let the last writer's stale snapshot discard earlier deltas (this is how
  // the monthly JSA salary credit and the heya monthly burn were silently
  // dropped). Sequencing composes them correctly.
  const producers: Array<(w: WorldState) => StateImpact | null | undefined> = [
    (w) => tickMonthlyNPC(w),
    (w) => payTravelAllowance(w),
    (w) => deductTsukebitoCosts(w),
    (w) => distributeKoenkaiToSekitori(w),
  ];
  if (jungyoParticipants && jungyoEvent) {
    const participants = jungyoParticipants;
    producers.push((w) => simulateExhibitionBasho(w, jungyoEvent.name, participants));
  }
  producers.push((w) => payMochikyukinBonuses(w, currentMonth));
  for (const rn of renewals) {
    producers.push((w) =>
      renewSponsorContract(w, rn.relId, rn.sponsorId, {
        sponsor: rn.sponsor,
        relIndex: rn.relIndex,
      })
    );
  }

  const sequenced = sequenceImpacts(resolveImpacts(world, [baseImpact]), producers);
  return mergeImpacts([baseImpact, ...sequenced.impacts]);
}

/**
 * One heya's monthly cycle: JSA salaries + overhead, loan repayments, facility
 * decay, NPC auto-investment, then the runway-band sync and debt-floor clamp.
 */
function processHeyaMonth(world: WorldState, heya: Heya, id: string, builder: ImpactBuilder): void {
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

/** Collects the jungyo participant roster and logs the tour event. */
function collectJungyoParticipants(
  builder: ImpactBuilder,
  world: WorldState,
  currentMonth: number
): {
  jungyoEvent: ReturnType<typeof getExhibitionBashoSchedule>[number] | undefined;
  jungyoParticipants: Rikishi[] | null;
} {
  const exhibitionSchedule = getExhibitionBashoSchedule(world.year ?? DEFAULT_START_YEAR);
  const jungyoEvent = exhibitionSchedule.find((e) => e.month === currentMonth);
  let jungyoParticipants: Rikishi[] | null = null;
  if (jungyoEvent && !isBashoMonth(currentMonth)) {
    const participants: Rikishi[] = [];
    for (const id of world.activeRikishiIds ?? []) {
      const r = getRikishi(world, id);
      if (!r) continue;
      if (!isSekitoriDivision(r.division) || r.isRetired) continue;
      const heya = world.heyas.get(r.heyaId);
      if (heya?.jungyoOptOut) continue;
      participants.push(r);
    }
    if (participants.length > 0) {
      jungyoParticipants = participants;
      // Log the exhibition tour event
      builder.logEvent("BASHO_STATUS", "basho", {
        status: "exhibition_tour",
        description: `The ${jungyoEvent.displayName} begins — ${participants.length} sekitori participate in the regional tour.`,
        bashoName: jungyoEvent.name,
        month: currentMonth,
        location: jungyoEvent.location,
        participantCount: participants.length,
      });
    }
  }
  return { jungyoEvent, jungyoParticipants };
}

/** Surfaces kachi-nokori (surplus wins) for sekitori after mochikyukin payout. */
function surfaceKachiNokori(builder: ImpactBuilder, world: WorldState): void {
  if (!isBashoMonth(world.calendar?.month ?? 1)) return;
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

/**
 * Collects sponsor renewals due within the renewal window. Params are
 * input-derived; each renewal is sequenced in the producer chain so
 * sponsorPool snapshot writes compose.
 */
function collectSponsorRenewals(world: WorldState): Array<{
  relId: string;
  sponsorId: string;
  sponsor: Sponsor;
  relIndex: number;
}> {
  const renewals: Array<{
    relId: string;
    sponsorId: string;
    sponsor: Sponsor;
    relIndex: number;
  }> = [];
  if (!world.sponsorPool) return renewals;
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
        renewals.push({ relId: rel.relId, sponsorId: sponsor.sponsorId, sponsor, relIndex: i });
      }
    }
  }
  return renewals;
}
