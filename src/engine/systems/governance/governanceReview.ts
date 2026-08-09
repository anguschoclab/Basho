/**
 * src/engine/governance/governanceReview.ts
 *
 * Handles post-basho institutional reviews, financial insolvency,
 * merger/closure pressure, succession planning, and AI meta drift.
 * Also processes rikishi retirements and Oyakata candidate conversion.
 */

import { stableSort } from "../../utils/sort";
import type { WorldState } from "../../types/world";
import type { Heya } from "../../types/heya";
import * as governance from "./ScandalService";
import { generateGovernanceHeadline } from "../media/MediaService";
import { issueBailoutLoanIfNeeded } from "../../loans";
import { getHeyaRoster, getActiveRikishi, getRikishi } from "../../queries";
import { PRESTIGE_ORDER, bandIndex } from "../../prestige/prestigeSystem";
import { findMergerTarget, executeMerger } from "../../mergers";
import { checkRetirement } from "../../lifecycle";
import { generateRetirementNarrative } from "../../lifecycle/retirementNarrative";
import { onRikishiRetired } from "../../records";
import { LegacyService } from "../legacy/LegacyService";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import {
  LOAN_ISSUANCE_THRESHOLD,
  MERGER_THRESHOLD,
  FACTION_BAILOUT_AMOUNT,
  FACTION_BENEFACTOR_THRESHOLD,
  HEYA_FLOOR,
  CHRONIC_UNDERPERFORMANCE_BASHO,
  PRESTIGE_COLLAPSE_BAND,
  NON_FINANCIAL_MERGER_MAX_ROSTER,
} from "../../../constants/engine/economic";
import { processRetireeOyakataConversion } from "../../lifecycle/retireeOyakataConversion";

/**
 * Post-basho governance: institutional sanctions, council reactions,
 * loans/benefactors escalation, succession checks, merger/closure pressure.
 * Returns StateImpact describing governance changes instead of mutating state.
 */
export function runGovernanceReview(world: WorldState): StateImpact {
  const builder = createImpactBuilder("governanceReview");

  // Pre-calculate potential benefactors by ichimon for efficient lookup in loop
  const benefactorsByIchimon = new Map<string, Heya[]>();
  for (const h of world.heyas.values()) {
    if (h.ichimon && h.funds > FACTION_BENEFACTOR_THRESHOLD) {
      if (!benefactorsByIchimon.has(h.ichimon)) {
        benefactorsByIchimon.set(h.ichimon, []);
      }
      const list = benefactorsByIchimon.get(h.ichimon);
      if (list) list.push(h);
    }
  }

  for (const heya of stableSort(world.heyas.values(), (x) => x.id)) {
    const welfareState = heya.welfareState;
    const scandalScore = heya.scandalScore ?? 0;

    // === Financial insolvency check ===
    if (heya.funds < 0 && heya.runwayBand === "desperate") {
      // Queue heya update for riskIndicators
      builder.updateHeya(heya.id, { riskIndicators: { ...heya.riskIndicators, financial: true } });

      const scandalImpact = governance.reportScandal(
        world,
        heya.id,
        "minor",
        "Financial insolvency at basho end"
      );
      builder.merge(scandalImpact);

      // Queue event instead of calling EventBus directly
      builder.logEvent(
        "GOVERNANCE_RULING",
        "narrative",
        {
          incident: "financial_insolvency",
          reason: "Stable funds below zero at basho end.",
          money: heya.funds,
          status: heya.runwayBand,
        },
        { heyaId: heya.id, importance: "headline" }
      );

      // === Loans/benefactors escalation (Constitution §4.4) ===
      if (heya.funds < LOAN_ISSUANCE_THRESHOLD) {
        builder.merge(issueBailoutLoanIfNeeded(world, heya.id));
      }

      // v1.7 Faction Solidarity (Traditional Bailouts)
      if (heya.ichimon && heya.id !== world.playerHeyaId) {
        // Find a wealthy faction-mate to provide a gift
        const potentialBenefactors = benefactorsByIchimon.get(heya.ichimon) || [];
        const benefactor = potentialBenefactors.find((h) => h.id !== heya.id);

        if (benefactor) {
          const giftAmount = FACTION_BAILOUT_AMOUNT;
          // Queue heya updates for funds transfer
          builder.updateHeya(benefactor.id, { funds: benefactor.funds - giftAmount });
          builder.updateHeya(heya.id, { funds: heya.funds + giftAmount });

          builder.logEvent(
            "GOVERNANCE_RULING",
            "narrative",
            {
              incident: "ichimon_bailout",
              heyaname: heya.name,
              heya: heya.name,
              rival: benefactor.name,
              money: giftAmount,
              heyaId: benefactor.id,
            },
            { heyaId: heya.id, importance: "major" }
          );
        }
      }
      // === Insolvency-triggered merger for NPC stables with no rescue available ===
      // Blocked when at or below HEYA_FLOOR to prevent runaway collapse.
      if (
        heya.funds < MERGER_THRESHOLD &&
        heya.id !== world.playerHeyaId &&
        world.heyas.size > HEYA_FLOOR
      ) {
        const targetId = findMergerTarget(world, heya.id);
        if (targetId) {
          builder.logEvent(
            "GOVERNANCE_RULING",
            "narrative",
            {
              incident: "insolvency_merger",
              reason: "extreme_debt",
              money: heya.funds,
            },
            { heyaId: heya.id, importance: "headline" }
          );
          // Queue merger impact
          builder.merge(executeMerger(world, heya.id, targetId, "financial_insolvency"));
        }
      }
    } else if (heya.funds > 0 && heya.runwayBand !== "desperate") {
      // Queue heya update to clear financial risk indicator
      builder.updateHeya(heya.id, { riskIndicators: { ...heya.riskIndicators, financial: false } });
    }

    // === Non-financial merger: chronic underperformance + prestige collapse ===
    // Small stables with prolonged underperformance and collapsed prestige
    // are forced to merge even if financially solvent.
    // Blocked when at or below HEYA_FLOOR to prevent runaway collapse.
    if (
      heya.id !== world.playerHeyaId &&
      world.heyas.size > HEYA_FLOOR &&
      (heya.consecutiveUnderperformanceBasho ?? 0) >= CHRONIC_UNDERPERFORMANCE_BASHO &&
      heya.prestigeBand === PRESTIGE_COLLAPSE_BAND &&
      getHeyaRoster(world, heya.id).length <= NON_FINANCIAL_MERGER_MAX_ROSTER &&
      heya.funds >= MERGER_THRESHOLD
    ) {
      const targetId = findMergerTarget(world, heya.id);
      if (targetId) {
        builder.logEvent(
          "GOVERNANCE_RULING",
          "narrative",
          {
            incident: "non_financial_merger",
            reason: "chronic_underperformance",
            prestigeBand: heya.prestigeBand,
          },
          { heyaId: heya.id, importance: "headline" }
        );
        builder.merge(executeMerger(world, heya.id, targetId, "chronic_underperformance"));
      }
    }

    // === Welfare review escalation ===
    if (welfareState && welfareState.complianceState === "sanctioned") {
      builder.logEvent(
        "WELFARE_COMPLIANCE",
        "welfare",
        {
          status: "post_basho_sanction_review",
          heyaname: heya.name,
          risk: welfareState.welfareRisk,
        },
        { heyaId: heya.id }
      );

      // Sanctioned stables face additional prestige erosion
      const currentIdx = bandIndex(heya.prestigeBand);
      if (currentIdx > 0) {
        const newBand = PRESTIGE_ORDER[currentIdx - 1];
        // Queue heya update for prestigeBand
        builder.updateHeya(heya.id, { prestigeBand: newBand });

        builder.logEvent(
          "GOVERNANCE_RULING",
          "narrative",
          {
            incident: "prestige_erosion",
            status: newBand,
            reason: "sanctions_active",
          },
          { heyaId: heya.id, importance: "notable" }
        );
      }
    }

    // === Council scandal reaction ===
    if (scandalScore >= 40) {
      builder.logEvent(
        "GOVERNANCE_RULING",
        "narrative",
        {
          incident: "council_scandal_review",
          score: Math.floor(scandalScore),
        },
        { heyaId: heya.id, importance: scandalScore >= 60 ? "major" : "notable" }
      );
    }

    // === Merger/closure pressure for extremely small stables ===
    const rosterSize = getHeyaRoster(world, heya.id).length;
    if (rosterSize < 3) {
      if (heya.id !== world.playerHeyaId) {
        builder.logEvent(
          "GOVERNANCE_RULING",
          "narrative",
          {
            incident: "low_roster_warning",
            reason: "roster_critically_low",
            score: rosterSize,
          },
          { heyaId: heya.id, importance: "major" }
        );

        // NEW: Generate Media Headline (Phase 3.4 SSOT)
        builder.merge(
          generateGovernanceHeadline({
            world,
            heyaId: heya.id,
            templatePath: "institutional.governance.low_roster_headline",
            severity: "national",
          })
        );

        // If roster is 0 or 1, mark for eventual closure (NPC only)
        // Blocked when at or below HEYA_FLOOR to prevent runaway collapse.
        if (rosterSize <= 1 && world.heyas.size > HEYA_FLOOR) {
          builder.logEvent(
            "GOVERNANCE_RULING",
            "narrative",
            {
              incident: "merger_imminent",
              reason: "recruitment_crisis",
              score: rosterSize,
            },
            { heyaId: heya.id, importance: "headline" }
          );

          // Execute actual merger
          const targetId = findMergerTarget(world, heya.id);
          if (targetId) {
            builder.merge(executeMerger(world, heya.id, targetId, "critically_low_roster"));
          }
        }
      } else {
        // Player stable — warn but don't force closure
        builder.logEvent(
          "GOVERNANCE_RULING",
          "narrative",
          {
            incident: "player_roster_warning",
            reason: "player_low_roster",
            score: rosterSize,
          },
          { heyaId: heya.id, importance: "major" }
        );
      }
    }

    // === Succession check — aging oyakata ===
    const oyakata = world.oyakata.get(heya.oyakataId);
    if (oyakata && oyakata.age >= 63) {
      builder.logEvent(
        "GOVERNANCE_RULING",
        "narrative",
        {
          shikona: oyakata.name,
          threshold: oyakata.age,
          incident: "oyakata_retirement_warning",
          reason: oyakata.age >= 65 ? "mandatory_retirement" : "approaching_retirement",
        },
        { heyaId: heya.id, importance: oyakata.age >= 65 ? "major" : "notable" }
      );
    }

    // === Post-basho scandal score decay reward for clean basho ===
    if (scandalScore > 0 && heya.governanceStatus === "good_standing") {
      // Queue heya update for scandalScore
      builder.updateHeya(heya.id, { scandalScore: Math.max(0, scandalScore - 2) });
    }
  }

  return builder.build();
}

/**
 * AI Meta Drift recognition delays per A6.1:
 * NPC managers observe public outcomes and can adjust strategy,
 * but only after a recognition delay based on manager profile.
 * Returns StateImpact with world field update instead of mutating state.
 */
export function runAIMetaDrift(world: WorldState): StateImpact {
  const lastBasho = world.history[world.history.length - 1];
  if (!lastBasho) {
    return createImpactBuilder("aiMetaDrift").build();
  }

  // Compute basho meta: dominant style this basho
  let oshiWins = 0,
    yotsuWins = 0;
  for (const r of getActiveRikishi(world)) {
    if ((r.currentBashoWins ?? 0) > (r.currentBashoLosses ?? 0)) {
      if (r.style === "oshi") oshiWins++;
      else if (r.style === "yotsu") yotsuWins++;
    }
  }
  const metaBias: "oshi" | "yotsu" | "neutral" =
    oshiWins > yotsuWins * 1.3 ? "oshi" : yotsuWins > oshiWins * 1.3 ? "yotsu" : "neutral";

  const builder = createImpactBuilder("aiMetaDrift");

  // Queue world field update for _postBashoMeta
  builder.updateWorldField("_postBashoMeta", {
    bashoNumber: lastBasho.bashoNumber,
    metaBias,
    yushoStyle: getRikishi(world, lastBasho.yusho)?.style ?? "hybrid",
    recognitionEligibleWeek: world.week + 2, // 2-week recognition delay baseline
  });

  if (metaBias !== "neutral") {
    builder.logEvent("BASHO_STATUS", "basho", {
      status: "meta_shift",
      incident: metaBias,
      score: oshiWins,
      delta: yotsuWins,
    });
  }

  return builder.build();
}

/**
 * Process retirements and return StateImpact with metadata.
 * Returns impact containing rikishiToHistorical operations and vacancy count in metadata.
 */
export function runRetirements(world: WorldState): StateImpact {
  const builder = createImpactBuilder("retirements");
  const vacanciesByHeyaId: Record<string, number> = {};
  const rikishiToRetire: string[] = [];

  for (const rikishiId of world.activeRikishiIds) {
    const r = getRikishi(world, rikishiId);
    if (!r) continue;
    const id = r.id;
    const reason = checkRetirement(r, world.year, world.seed);
    if (reason) {
      const careerWins = r.careerWins ?? 0;
      const careerLosses = r.careerLosses ?? 0;
      const yearsActive = world.year - r.birthYear - 15;
      const highestRank = r.rank;
      const yushoCount = (r.careerHistory ?? []).filter((h) => h.isYusho).length;
      const kinboshiCount = r.economics?.kinboshiCount ?? 0;
      const retirementNarrative = generateRetirementNarrative(
        r,
        world,
        `retirement-${id}-${world.year}`
      );
      builder.logEvent(
        "LIFECYCLE_EVENT",
        "career",
        {
          rikishiId: id,
          heyaId: r.heyaId,
          shikona: r.shikona ?? r.name ?? id,
          status: "retirement",
          reason,
          careerWins,
          careerLosses,
          highestRank,
          yushoCount,
          kinboshiCount,
          yearsActive,
          careerPhase: r.declinePhase ?? "twilight",
          origin: r.origin ?? "Japan",
          retirementNarrative,
        },
        { heyaId: r.heyaId, rikishiId: id, importance: "headline" }
      );
      vacanciesByHeyaId[r.heyaId] = (vacanciesByHeyaId[r.heyaId] || 0) + 1;
      rikishiToRetire.push(id);

      // Constitution 2.3 & 61: Oyakata candidate eligibility + (RNG-gated) stable founding.
      // Shared helper — also called from CareerService.processRetirements (AutoSim path).
      processRetireeOyakataConversion(world, r, builder);

      // Register bloodline trait if the retiree was accomplished (yokozuna/ozeki/sekiwake)
      builder.merge(LegacyService.registerLegacyTrait(world, r));

      // Merge retirement impact (records, etc.)
      builder.merge(onRikishiRetired(world, id));
    }
  }

  // Queue collection operation to move rikishi to historical
  for (const id of rikishiToRetire) {
    const r = getRikishi(world, id);
    const reason = r ? checkRetirement(r, world.year, world.seed) : "Retirement";
    builder.retireRikishi(id, world.year, reason ?? "Retirement");
  }

  // Add vacancy count to metadata
  builder.addMetadata("vacanciesByHeyaId", vacanciesByHeyaId);

  return builder.build();
}
