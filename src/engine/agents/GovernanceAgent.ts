/**
 * GovernanceAgent.ts
 * ================
 * Worker agent for handling governance and political decisions.
 * Decides on scandal management, political favor usage, and political maneuvering.
 */

import type { WorldState } from "../types/world";
import type { Oyakata } from "../types/oyakata";
import type { Heya } from "../types/heya";

export interface GovernanceAgentContext {
  heya: Heya;
  oyakata: Oyakata;
  world: WorldState;
  scandalScore: number;
  politicalCapital: number;
  governanceStatus: string;
}

export interface GovernanceAgentResult {
  shouldReduceScandal: boolean;
  scandalReductionMethod?: "cooperate" | "deny" | "ignore";
  shouldUsePoliticalFavor: boolean;
  favorType?: "matchmaking" | "payout_advance" | "governance_pardon";
  favorTarget?: string;
  shouldSabotageRival: boolean;
  rivalTarget?: string;
  reasoning: string[];
}

/**
 * Governance Worker: Handles political maneuvering and scandal management
 * Evaluates political capital, scandal score, and personality to determine strategy
 */
export function spawnGovernanceAgent(ctx: GovernanceAgentContext): GovernanceAgentResult {
  const reasoning: string[] = [];
  const { heya, oyakata, world, scandalScore, politicalCapital, governanceStatus } = ctx;

  const isAmbitious = oyakata.traits.ambition > 60;
  const isRiskTaker = oyakata.traits.risk > 60;
  const isTraditionalist = oyakata.traits.tradition > 70;
  const isDiplomat = oyakata.archetype === "strategist";
  const isMachiavellian = oyakata.archetype === "tyrant";

  let shouldReduceScandal = false;
  let scandalReductionMethod: "cooperate" | "deny" | "ignore" | undefined;
  let shouldUsePoliticalFavor = false;
  let favorType: "matchmaking" | "payout_advance" | "governance_pardon" | undefined;
  let favorTarget: string | undefined;
  let shouldSabotageRival = false;
  let rivalTarget: string | undefined;

  reasoning.push("[Governance Agent] Evaluating political situation");
  reasoning.push(
    `[Governance Agent] Scandal score: ${scandalScore}, Political capital: ${politicalCapital}, Status: ${governanceStatus}`
  );

  // Scandal reduction decision
  if (scandalScore >= 30) {
    shouldReduceScandal = true;

    if (governanceStatus === "sanctioned" || governanceStatus === "probation") {
      if (isTraditionalist || isDiplomat) {
        scandalReductionMethod = "cooperate";
        reasoning.push(
          "[Governance Agent] Traditionalist/diplomat chooses cooperation to reduce scandal"
        );
      } else if (isMachiavellian) {
        scandalReductionMethod = "deny";
        reasoning.push("[Governance Agent] Machiavellian chooses denial despite sanctions");
      } else {
        scandalReductionMethod = "cooperate";
        reasoning.push("[Governance Agent] Defaulting to cooperation under sanctions");
      }
    } else if (scandalScore >= 50) {
      if (isMachiavellian || isRiskTaker) {
        scandalReductionMethod = "deny";
        reasoning.push("[Governance Agent] Risk-taker chooses denial for high scandal");
      } else {
        scandalReductionMethod = "cooperate";
        reasoning.push("[Governance Agent] Prudent choice: cooperate to reduce scandal");
      }
    } else {
      if (isAmbitious && politicalCapital > 50) {
        scandalReductionMethod = "deny";
        reasoning.push("[Governance Agent] Ambitious with capital chooses denial");
      } else {
        scandalReductionMethod = "ignore";
        reasoning.push(
          "[Governance Agent] Moderate scandal: ignore and let natural decay handle it"
        );
      }
    }
  }

  // Political favor usage
  if (politicalCapital > 40 && isAmbitious) {
    shouldUsePoliticalFavor = true;

    if (governanceStatus === "probation" || governanceStatus === "sanctioned") {
      favorType = "governance_pardon";
      reasoning.push("[Governance Agent] Using governance pardon to address sanctions");
    } else if (heya.funds && heya.funds < 5000000) {
      favorType = "payout_advance";
      reasoning.push("[Governance Agent] Using payout advance for financial relief");
    } else {
      favorType = "matchmaking";
      reasoning.push("[Governance Agent] Using matchmaking favor for competitive advantage");
    }
  }

  // Rival sabotage
  if (isMachiavellian && politicalCapital > 60 && scandalScore < 20) {
    shouldSabotageRival = true;

    // Find a rival heya with high reputation
    const rivalHeyas = Array.from(world.heyas.values())
      .filter((h) => h.id !== heya.id && (h.reputation || 0) > (heya.reputation || 0))
      .sort((a, b) => (b.reputation || 0) - (a.reputation || 0));

    if (rivalHeyas.length > 0) {
      rivalTarget = rivalHeyas[0].id;
      reasoning.push(`[Governance Agent] Targeting rival ${rivalHeyas[0].name} for sabotage`);
    } else {
      shouldSabotageRival = false;
      reasoning.push("[Governance Agent] No suitable rival target found");
    }
  }

  reasoning.push("[Governance Agent] Final strategy determined");

  return {
    shouldReduceScandal,
    scandalReductionMethod,
    shouldUsePoliticalFavor,
    favorType,
    favorTarget,
    shouldSabotageRival,
    rivalTarget,
    reasoning,
  };
}
