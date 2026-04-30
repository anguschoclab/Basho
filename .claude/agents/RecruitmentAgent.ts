/**
 * RecruitmentAgent.ts
 * ===================
 * Worker agent for handling recruitment strategy and bidding decisions.
 * Decides on max bid calculations and target candidate selection.
 */

import type { WorldState } from "../types/world";
import type { Oyakata } from "../types/oyakata";

export interface RecruitmentAgentContext {
  oyakata: Oyakata;
  world: WorldState;
  vacancyCount: number;
  runwayBand: string;
  funds: number;
  rosterSize: number;
  candidateId: string;
  rivalHeyaId?: string;
}

export interface RecruitmentAgentResult {
  maxBid: number;
  shouldBid: boolean;
  bidStrategy: "aggressive" | "moderate" | "conservative";
  reasoning: string[];
  confidence: number;
}

/**
 * Recruitment Worker: Handles recruitment strategy and bidding
 * Evaluates vacancy urgency, candidate quality, and financial situation to determine bid strategy
 */
export function spawnRecruitmentAgent(ctx: RecruitmentAgentContext): RecruitmentAgentResult {
  const reasoning: string[] = [];
  const { oyakata, world, vacancyCount, runwayBand, funds, candidateId, rivalHeyaId } = ctx;

  const isAmbitious = oyakata.traits.ambition > 60;
  const isRiskTaker = oyakata.traits.risk > 60;
  const isTraditionalist = oyakata.traits.tradition > 70;

  const candidate = world.talentPool?.candidates[candidateId];
  if (!candidate) {
    return {
      maxBid: 0,
      shouldBid: false,
      bidStrategy: "conservative",
      reasoning: ["[Recruitment Agent] Candidate not found in talent pool"],
      confidence: 0,
    };
  }

  const talent = candidate.talentSeed || 50;
  const isElite = talent >= 85;
  const isHigh = talent >= 70;

  let maxBid = 0;
  let shouldBid = false;
  let bidStrategy: "aggressive" | "moderate" | "conservative" = "moderate";
  let confidence = 50;

  reasoning.push(`[Recruitment Agent] Evaluating candidate with talent ${talent}`);
  reasoning.push(`[Recruitment Agent] Vacancies: ${vacancyCount}, Funds: ¥${funds.toLocaleString()}, Runway: ${runwayBand}`);

  // Base bid calculation based on talent
  const baseBid = isElite ? 5000000 : isHigh ? 3000000 : 1500000;

  // Adjust for financial situation
  if (runwayBand === "desperate" || runwayBand === "critical") {
    bidStrategy = "conservative";
    maxBid = baseBid * 0.5;
    reasoning.push("[Recruitment Agent] Financial distress reduces bid capacity");
    confidence = 30;
  } else if (runwayBand === "cautious") {
    bidStrategy = "moderate";
    maxBid = baseBid * 0.75;
    reasoning.push("[Recruitment Agent] Cautious financial stance");
    confidence = 50;
  } else {
    // Comfortable runway
    if (isAmbitious && isElite) {
      bidStrategy = "aggressive";
      maxBid = baseBid * 1.5;
      reasoning.push("[Recruitment Agent] Ambitious oyakata aggressively pursues elite talent");
      confidence = 80;
    } else if (isRiskTaker && isHigh) {
      bidStrategy = "aggressive";
      maxBid = baseBid * 1.3;
      reasoning.push("[Recruitment Agent] Risk-taker aggressively pursues high talent");
      confidence = 70;
    } else if (isTraditionalist) {
      bidStrategy = "moderate";
      maxBid = baseBid * 0.9;
      reasoning.push("[Recruitment Agent] Traditionalist takes measured approach");
      confidence = 60;
    } else {
      bidStrategy = "moderate";
      maxBid = baseBid;
      reasoning.push("[Recruitment Agent] Standard bid approach");
      confidence = 55;
    }
  }

  // Cap bid based on funds
  const maxAffordable = funds * 0.3; // Max 30% of funds for recruitment
  maxBid = Math.min(maxBid, maxAffordable);

  // Rival competition adjustment
  if (rivalHeyaId) {
    const rivalHeya = world.heyas.get(rivalHeyaId);
    const rivalReputation = rivalHeya?.reputation || 50;
    const playerHeya = world.heyas.get(oyakata.heyaId);
    const playerReputation = playerHeya?.reputation || 50;

    if (rivalReputation > playerReputation) {
      maxBid *= 1.2; // Bid higher to outcompete
      reasoning.push("[Recruitment Agent] Increasing bid to compete with higher-reputation rival");
      confidence -= 10;
    }
  }

  // Urgency adjustment
  if (vacancyCount >= 3) {
    maxBid *= 1.15;
    reasoning.push("[Recruitment Agent] High vacancy count increases urgency");
    confidence += 10;
  }

  // Final decision
  shouldBid = maxBid > 500000 && funds > maxBid * 2;

  if (!shouldBid) {
    reasoning.push("[Recruitment Agent] Insufficient funds or bid too low - not bidding");
  } else {
    reasoning.push(`[Recruitment Agent] Final bid: ¥${maxBid.toLocaleString()}`);
  }

  return {
    maxBid,
    shouldBid,
    bidStrategy,
    reasoning,
    confidence,
  };
}
