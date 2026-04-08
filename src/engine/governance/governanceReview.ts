/**
 * src/engine/governance/governanceReview.ts
 * 
 * Handles post-basho institutional reviews, financial insolvency, 
 * merger/closure pressure, succession planning, and AI meta drift.
 * Also processes rikishi retirements and Oyakata candidate conversion.
 */

import { stableSort } from "../utils/sort";
import type { WorldState } from "../types/world";
import { logEngineEvent } from "../events";
import { EventBus } from "../events";
import * as governance from "./GovernanceService";
import { generateGovernanceHeadline } from "../systems/media/MediaService";
import { issueBailoutLoanIfNeeded } from "../loans";
import { getStableRikishi, getActiveRikishi } from "../queries";
import { PRESTIGE_ORDER, bandIndex } from "../prestige/prestigeSystem";
import { findMergerTarget, executeMerger } from "../mergers";
import { checkRetirement } from "../lifecycle";
import { generateOyakata } from "../oyakataPersonalities";
import { onRikishiRetired } from "../records";
import { recordOyakataHandover } from "../lineage";
import { rngForWorld } from "../rng";

/**
 * Post-basho governance: institutional sanctions, council reactions,
 * loans/benefactors escalation, succession checks, merger/closure pressure.
 */
export function runGovernanceReview(world: WorldState): void {
  for (const heya of stableSort(world.heyas.values(), x => x.id)) {
    const welfareState = heya.welfareState;
    const scandalScore = heya.scandalScore ?? 0;

    // === Financial insolvency check ===
    if (heya.funds < 0 && heya.runwayBand === "desperate") {
      heya.riskIndicators.financial = true;
      governance.reportScandal(world, heya.id, "minor", "Financial insolvency at basho end");

      EventBus.governance(world, heya.id, { 
        reason: "Financial insolvency", 
        funds: heya.funds, 
        runway: heya.runwayBand 
      }, "headline");

      // === Loans/benefactors escalation (Constitution §4.4) ===
      if (heya.funds < -5_000_000) {
        issueBailoutLoanIfNeeded(world, heya.id);
      }

      // v1.7 Faction Solidarity (Traditional Bailouts)
      if (heya.ichimon && heya.id !== world.playerHeyaId) {
         // Find a wealthy faction-mate to provide a gift
         const allies = Array.from(world.heyas.values()).filter(h => h.ichimon === heya.ichimon && h.id !== heya.id);
         const benefactor = allies.find(h => h.funds > 60_000_000);
         
         if (benefactor) {
            const giftAmount = 10_000_000;
            benefactor.funds -= giftAmount;
            heya.funds += giftAmount;

            logEngineEvent(world, {
               type: "GOVERNANCE_FACTION_BAILOUT",
               category: "economy",
               importance: "major",
               scope: "world",
               heyaId: heya.id,
               title: `Faction solidarity at ${heya.name}`,
               summary: `The ${heya.ichimon} Ichimon has provided a ¥${giftAmount.toLocaleString()} Traditional Gift to ${heya.name} to stabilize their accounts.`,
               data: { benefactorId: benefactor.id, ichimon: heya.ichimon, amount: giftAmount }
            });
         }
      }
    } else if (heya.funds > 0 && heya.runwayBand !== "desperate") {
      // Clear financial risk indicator when no longer desperate
      heya.riskIndicators.financial = false;
    }

    // === Welfare review escalation ===
    if (welfareState && welfareState.complianceState === "sanctioned") {
      logEngineEvent(world, {
        type: "POST_BASHO_WELFARE_REVIEW",
        category: "welfare",
        importance: "major",
        scope: "heya",
        heyaId: heya.id,
        title: `${heya.name} welfare review`,
        summary: `Post-basho institutional review: ${heya.name} remains under sanctions for welfare violations.`,
        data: { complianceState: welfareState.complianceState, welfareRisk: welfareState.welfareRisk }
      });

      generateGovernanceHeadline(
        world,
        heya.id,
        "major",
        `${heya.name} remains under sanctions for ongoing welfare violations following post-basho review.`
      );


      // Sanctioned stables face additional prestige erosion
      const currentIdx = bandIndex(heya.prestigeBand);
      if (currentIdx > 0) {
        const newBand = PRESTIGE_ORDER[currentIdx - 1];
        heya.prestigeBand = newBand;
        logEngineEvent(world, {
          type: "PRESTIGE_SHIFT",
          category: "discipline",
          importance: "notable",
          scope: "heya",
          heyaId: heya.id,
          title: `${heya.name} prestige damaged by sanctions`,
          summary: `Ongoing sanctions erode ${heya.name}'s standing in the sumo world.`,
          data: { from: PRESTIGE_ORDER[currentIdx], to: newBand, reason: "sanctions" }
        });
      }
    }

    // === Council scandal reaction ===
    if (scandalScore >= 40) {
      const severityLabel = scandalScore >= 80 ? "severe" : scandalScore >= 60 ? "significant" : "concerning";
      logEngineEvent(world, {
        type: "COUNCIL_SCANDAL_REVIEW",
        category: "discipline",
        importance: scandalScore >= 60 ? "major" : "notable",
        scope: "heya",
        heyaId: heya.id,
        title: `Council reviews ${heya.name}`,
        summary: `The Sumo Association council notes ${severityLabel} conduct issues at ${heya.name}. Score: ${Math.floor(scandalScore)}.`,
        data: { scandalScore: Math.floor(scandalScore), governanceStatus: heya.governanceStatus }
      });

      generateGovernanceHeadline(
        world,
        heya.id,
        scandalScore >= 60 ? "major" : "minor",
        `The Sumo Association council formally noted concerns regarding conduct at ${heya.name}.`
      );

    }

    // === Merger/closure pressure for extremely small stables ===
    const rosterSize = getStableRikishi(world, heya.id).length;
    if (rosterSize < 3) {
      if (heya.id !== world.playerHeyaId) {
        EventBus.governance(world, heya.id, { 
          reason: "Roster size critically low", 
          rosterSize 
        }, "major");


        // If roster is 0 or 1, mark for eventual closure (NPC only)
        if (rosterSize <= 1) {
          EventBus.governance(world, heya.id, { 
            reason: "Critically low recruitment", 
            rosterSize 
          }, "headline");


          // Execute actual merger
          const targetId = findMergerTarget(world, heya.id);
          if (targetId) {
             executeMerger(world, heya.id, targetId, "Critically low recruitment / Roster size");
          }
        }
      } else {
        // Player stable — warn but don't force closure
        logEngineEvent(world, {
          type: "ROSTER_WARNING",
          category: "career",
          importance: "major",
          scope: "heya",
          heyaId: heya.id,
          title: "Roster critically low",
          summary: `Your stable has fewer than 3 wrestlers. Recruit urgently or face Association review.`,
          data: { rosterSize }
        });
      }
    }

    // === Succession check — aging oyakata ===
    const oyakata = world.oyakata.get(heya.oyakataId);
    if (oyakata && oyakata.age >= 63) {
      EventBus.governance(world, heya.id, { 
        name: oyakata.name, 
        age: oyakata.age,
        reason: oyakata.age >= 65 ? "Mandatory retirement imminent" : "Approaching retirement age"
      }, oyakata.age >= 65 ? "major" : "notable");
    }

    // === Post-basho scandal score decay reward for clean basho ===
    if (scandalScore > 0 && heya.governanceStatus === "good_standing") {
      heya.scandalScore = Math.max(0, scandalScore - 2);
    }
  }
}

/**
 * AI Meta Drift recognition delays per A6.1:
 * NPC managers observe public outcomes and can adjust strategy,
 * but only after a recognition delay based on manager profile.
 */
export function runAIMetaDrift(world: WorldState): void {
  const lastBasho = world.history[world.history.length - 1];
  if (!lastBasho) return;

  // Compute basho meta: dominant style this basho
  let oshiWins = 0, yotsuWins = 0;
  for (const r of getActiveRikishi(world)) {
    if ((r.currentBashoWins ?? 0) > (r.currentBashoLosses ?? 0)) {
      if (r.style === "oshi") oshiWins++;
      else if (r.style === "yotsu") yotsuWins++;
    }
  }
  const metaBias: "oshi" | "yotsu" | "neutral" = 
    oshiWins > yotsuWins * 1.3 ? "oshi" : 
    yotsuWins > oshiWins * 1.3 ? "yotsu" : "neutral";

  // Write meta state for NPC AI to consume in future weeks
  world._postBashoMeta = {
    bashoNumber: lastBasho.bashoNumber,
    metaBias,
    yushoStyle: world.rikishi.get(lastBasho.yusho)?.style ?? "hybrid",
    recognitionEligibleWeek: world.week + 2 // 2-week recognition delay baseline
  };

  if (metaBias !== "neutral") {
    logEngineEvent(world, {
      type: "META_SHIFT_OBSERVED",
      category: "basho",
      importance: "minor",
      scope: "world",
      title: `Meta trend: ${metaBias} style dominance`,
      summary: `${metaBias === "oshi" ? "Pushing" : "Belt"} specialists dominated this basho. NPC managers may adjust.`,
      data: { metaBias, oshiWins, yotsuWins }
    });
  }
}

/**
 * Process retirements and return vacancy counts per heya.
 */
export function runRetirements(world: WorldState): Record<string, number> {
  const vacanciesByHeyaId: Record<string, number> = {};

  for (const r of stableSort(world.rikishi.values(), x => x.id)) {
    const id = r.id;
    const reason = checkRetirement(r, world.year, world.seed);
    if (reason) {
      EventBus.retirement(world, id, r.heyaId, r.shikona ?? r.name ?? id, reason);
      vacanciesByHeyaId[r.heyaId] = (vacanciesByHeyaId[r.heyaId] || 0) + 1;

      // Constitution 2.3 & 61: Oyakata candidate eligibility
      const age = world.year - r.birthYear;
      const isAccomplished = r.rank === "yokozuna" || r.rank === "ozeki" || r.rank === "sekiwake" || (r.careerWins >= 200);

      if (age >= 28 && isAccomplished) {
        if (world.myosekiMarket) {
          const availableStock = Object.values(world.myosekiMarket.stocks).find(s => s.status === "available");
          if (availableStock) {
            // Become an Oyakata
            const rng = rngForWorld(world, "governance", `retirement_${id}`);
            const newOyakataId = rng.uuid('OY');
            const newOyakata = generateOyakata(newOyakataId, r.heyaId, r.shikona ?? r.name ?? id, age);

            availableStock.ownerId = newOyakataId;
            availableStock.holderId = newOyakataId;
            availableStock.status = "held";
            delete availableStock.askingPrice;

            const tx = {
              id: rng.uuid('MT'),
              date: `${world.year}-W${world.week || 1}`,
              myosekiId: availableStock.id,
              type: "sale" as const,
              fromId: "JSA",
              toId: newOyakataId,
              amount: r.economics?.retirementFund || 150000000
            };
            world.myosekiMarket.history.unshift(tx);

            world.oyakata.set(newOyakataId, newOyakata);

            logEngineEvent(world, {
              type: "NEW_OYAKATA",
              category: "career",
              importance: "major",
              scope: "heya",
              heyaId: r.heyaId,
              title: `${r.shikona ?? r.name} acquires Elder Stock`,
              summary: `Retired accomplished rikishi ${r.shikona ?? r.name} has acquired the ${availableStock.name} elder stock and become an Oyakata.`,
              data: { rikishiId: id, oyakataId: newOyakataId, myosekiName: availableStock.name }
            });

            recordOyakataHandover(world, r.heyaId, newOyakataId, availableStock.name);
          }
        }
      }

      onRikishiRetired(world, id);
      world.historicalRikishi.set(id, r);
    }
  }

  return vacanciesByHeyaId;
}
