/**
 * RivalryAgent.ts
 * ===============
 * Worker agent for handling rivalry management and response.
 * Decides on rivalry escalation, de-escalation, and strategic targeting.
 */

import type { Oyakata } from "../types/oyakata";
import type { RivalryPairState } from "../systems/narrative/RivalryConstants";

export interface RivalryAgentContext {
  oyakata: Oyakata;
  activeRivalries: Record<string, RivalryPairState>;
  currentMood?: string;
}

export interface RivalryAgentResult {
  escalateRivalry: boolean;
  rivalryId?: string;
  escalateStrategy: "aggressive" | "calculated" | "defensive";
  deescalateRivalry: boolean;
  deescalateRivalryId?: string;
  targetRivalForMatchmaking: string[];
  reasoning: string[];
}

/**
 * Rivalry Worker: Handles rivalry management and strategic targeting
 * Evaluates active rivalries, oyakata personality, and strategic value to determine rivalry approach
 */
export function spawnRivalryAgent(ctx: RivalryAgentContext): RivalryAgentResult {
  const reasoning: string[] = [];
  const { oyakata, activeRivalries, currentMood } = ctx;

  const isAmbitious = oyakata.traits.ambition > 60;
  const isRiskTaker = oyakata.traits.risk > 60;
  const isTraditionalist = oyakata.traits.tradition > 70;
  const isCompassionate = oyakata.traits.compassion > 60;

  let escalateRivalry = false;
  let rivalryId: string | undefined;
  let escalateStrategy: "aggressive" | "calculated" | "defensive" = "calculated";
  let deescalateRivalry = false;
  let deescalateRivalryId: string | undefined;
  const targetRivalForMatchmaking: string[] = [];

  reasoning.push("[Rivalry Agent] Evaluating rivalry portfolio");
  reasoning.push(`[Rivalry Agent] Active rivalries: ${Object.keys(activeRivalries).length}`);

  // Analyze active rivalries
  const highHeatRivalries: string[] = [];
  const mediumHeatRivalries: string[] = [];
  const lowHeatRivalries: string[] = [];

  for (const [key, pair] of Object.entries(activeRivalries)) {
    if (pair.heat >= 70) {
      highHeatRivalries.push(key);
    } else if (pair.heat >= 40) {
      mediumHeatRivalries.push(key);
    } else {
      lowHeatRivalries.push(key);
    }
  }

  reasoning.push(
    `[Rivalry Agent] High heat: ${highHeatRivalries.length}, Medium heat: ${mediumHeatRivalries.length}, Low heat: ${lowHeatRivalries.length}`
  );

  // Escalation decision
  if (isAmbitious && mediumHeatRivalries.length > 0) {
    escalateRivalry = true;
    rivalryId = mediumHeatRivalries[0];

    if (isRiskTaker) {
      escalateStrategy = "aggressive";
      reasoning.push("[Rivalry Agent] Risk-taker chooses aggressive escalation");
    } else if (isTraditionalist) {
      escalateStrategy = "defensive";
      reasoning.push("[Rivalry Agent] Traditionalist chooses defensive escalation");
    } else {
      escalateStrategy = "calculated";
      reasoning.push("[Rivalry Agent] Calculated escalation approach");
    }
  }

  // De-escalation decision
  if (highHeatRivalries.length > 3 && isCompassionate) {
    deescalateRivalry = true;
    deescalateRivalryId = highHeatRivalries[0];
    reasoning.push("[Rivalry Agent] Compassionate oyakata de-escalates overheated rivalry");
  }

  // Mood override
  if (currentMood === "anxious") {
    if (escalateRivalry) {
      escalateRivalry = false;
      reasoning.push("[Rivalry Agent] Anxiety override: cancelling escalation");
    }
    if (!deescalateRivalry && highHeatRivalries.length > 0) {
      deescalateRivalry = true;
      deescalateRivalryId = highHeatRivalries[0];
      reasoning.push("[Rivalry Agent] Anxiety override: initiating de-escalation");
    }
  } else if (currentMood === "furious" || currentMood === "obsessed") {
    if (!escalateRivalry && mediumHeatRivalries.length > 0) {
      escalateRivalry = true;
      rivalryId = mediumHeatRivalries[0];
      escalateStrategy = "aggressive";
      reasoning.push("[Rivalry Agent] Emotional override: aggressive escalation");
    }
  }

  // Strategic targeting for matchmaking
  // Target rivalries with high heat but not too high (40-70 range) for continued engagement
  const targetRange = mediumHeatRivalries;
  if (targetRange.length > 0) {
    targetRivalForMatchmaking.push(...targetRange.slice(0, 2));
    reasoning.push(`[Rivalry Agent] Targeting ${targetRange.length} rivalries for matchmaking`);
  }

  // Also target promising low-heat rivalries if ambitious
  if (isAmbitious && lowHeatRivalries.length > 0) {
    targetRivalForMatchmaking.push(...lowHeatRivalries.slice(0, 2));
    reasoning.push("[Rivalry Agent] Targeting low-heat rivalries for development");
  }

  reasoning.push("[Rivalry Agent] Final rivalry strategy determined");

  return {
    escalateRivalry,
    rivalryId,
    escalateStrategy,
    deescalateRivalry,
    deescalateRivalryId,
    targetRivalForMatchmaking,
    reasoning,
  };
}
