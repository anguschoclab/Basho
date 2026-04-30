/**
 * MediaAgent.ts
 * =============
 * Worker agent for handling media event responses.
 * Decides how NPC oyakata respond to media events based on personality traits.
 */

import type { WorldState } from "../types/world";
import type { Id } from "../types/common";
import type { Oyakata } from "../types/oyakata";

export interface MediaAgentContext {
  eventId: string;
  eventType: string;
  severity: "minor" | "moderate" | "major";
  oyakata: Oyakata;
  heyaId: Id;
  world: WorldState;
}

export interface MediaAgentResult {
  response: "apologize" | "deny" | "ignore" | "deflect";
  reasoning: string[];
  confidence: number;
}

/**
 * Media Worker: Handles media event response decisions
 * Evaluates personality traits, mood, and event severity to determine response strategy
 */
export function spawnMediaAgent(ctx: MediaAgentContext): MediaAgentResult {
  const reasoning: string[] = [];
  const { oyakata, severity, eventType } = ctx;

  const isPublicityHawk = oyakata.managerFlags?.publicityHawk;
  const isTraditionalist = oyakata.traits.tradition > 70;
  const isCompassionate = oyakata.traits.compassion > 70;
  const isRiskTaker = oyakata.traits.risk > 60;
  const isDisciplined = oyakata.managerFlags?.disciplineHawk;
  const isAmbitious = oyakata.traits.ambition > 70;

  let response: "apologize" | "deny" | "ignore" | "deflect" = "ignore";
  let confidence = 0.7;

  // Base response determination by personality
  if (isPublicityHawk) {
    response = isRiskTaker ? "deny" : "ignore";
    reasoning.push("[Media Agent] Publicity hawk prioritizes image maintenance");
    confidence = 0.8;
  } else if (isTraditionalist) {
    response = "apologize";
    reasoning.push("[Media Agent] Traditionalist chooses honor over defense");
    confidence = 0.85;
  } else if (isDisciplined) {
    response = "apologize";
    reasoning.push("[Media Agent] Discipline hawk sets example through accountability");
    confidence = 0.75;
  } else if (isCompassionate) {
    response = "apologize";
    reasoning.push("[Media Agent] Compassionate oyakata shows empathy");
    confidence = 0.8;
  } else if (isRiskTaker) {
    response = "deny";
    reasoning.push("[Media Agent] Risk-taker challenges allegations");
    confidence = 0.65;
  } else if (isAmbitious) {
    response = "deflect";
    reasoning.push("[Media Agent] Ambitious oyakata shifts narrative");
    confidence = 0.6;
  }

  // Mood overrides
  if (oyakata.mood === "anxious") {
    if (response === "deny" || response === "ignore") {
      response = "apologize";
      reasoning.push("[Media Agent] Anxiety overrides: choosing de-escalation");
    }
    confidence -= 0.1;
  } else if (oyakata.mood === "furious" || oyakata.mood === "obsessed") {
    if (response === "apologize") {
      response = "deny";
      reasoning.push("[Media Agent] Emotional state overrides: refusing to concede");
    }
    confidence -= 0.15;
  } else if (oyakata.mood === "content") {
    confidence += 0.1;
  }

  // Severity adjustments
  if (severity === "major") {
    if (response === "ignore") {
      response = isTraditionalist ? "apologize" : "deflect";
      reasoning.push("[Media Agent] Major severity prevents passive response");
    }
    confidence -= 0.1;
  } else if (severity === "minor") {
    if (response === "apologize" && !isTraditionalist) {
      response = "ignore";
      reasoning.push("[Media Agent] Minor severity allows passive approach");
    }
    confidence += 0.1;
  }

  // Event type specific logic
  if (eventType === "scandal" || eventType === "crisis") {
    if (isDisciplined || isTraditionalist) {
      response = "apologize";
      reasoning.push("[Media Agent] Scandal/crisis demands accountability");
    }
  } else if (eventType === "praise" || eventType === "achievement") {
    response = "deflect";
    reasoning.push("[Media Agent] Positive events handled with modesty");
    confidence = 0.9;
  }

  // Clamp confidence
  confidence = Math.max(0.3, Math.min(0.95, confidence));

  reasoning.push(
    `[Media Agent] Final response: ${response} (confidence: ${(confidence * 100).toFixed(0)}%)`
  );

  return {
    response,
    reasoning,
    confidence,
  };
}
