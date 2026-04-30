/**
 * CrisisAgent.ts
 * ==============
 * Worker agent for handling NPC responses to narrative crises.
 * Decides how NPC oyakata respond to crisis events based on personality traits.
 */

import type { WorldState } from "../types/world";
import type { Id } from "../types/common";
import type { Oyakata } from "../types/oyakata";
import type { ActiveCrisis } from "../types/crises";

export interface CrisisAgentContext {
  crisis: ActiveCrisis;
  oyakata: Oyakata;
  heyaId: Id;
  world: WorldState;
  currentMood?: string;
}

export interface CrisisAgentResult {
  selectedChoiceId: string;
  reasoning: string[];
  expectedImpact: {
    reputationChange?: number;
    politicalCapitalChange?: number;
    welfareRiskChange?: number;
  };
}

/**
 * Crisis Worker: Handles crisis response decisions
 * Evaluates personality traits, mood, and crisis severity to determine response strategy
 */
export function spawnCrisisAgent(ctx: CrisisAgentContext): CrisisAgentResult {
  const reasoning: string[] = [];
  const { crisis, oyakata, currentMood } = ctx;

  const isTraditionalist = oyakata.traits.tradition > 70;
  const isCompassionate = oyakata.traits.compassion > 70;
  const isRiskTaker = oyakata.traits.risk > 60;
  const isDisciplined = oyakata.managerFlags?.disciplineHawk;
  const isAmbitious = oyakata.traits.ambition > 70;
  const isPublicityHawk = oyakata.managerFlags?.publicityHawk;

  let selectedChoiceId = crisis.options[0]?.id || "";
  let reputationChange = 0;
  let politicalCapitalChange = 0;
  let welfareRiskChange = 0;

  // Analyze crisis type and personality match
  const crisisId = crisis.id;

  reasoning.push(`[Crisis Agent] Evaluating ${crisis.title}`);

  // Base decision on personality
  if (isDisciplined) {
    // Discipline hawk prefers structured, rule-based responses
    if (crisisId === "governance_audit") {
      selectedChoiceId = "cooperate";
      reasoning.push("[Crisis Agent] Discipline hawk chooses cooperation with audit");
      politicalCapitalChange = 5;
      welfareRiskChange = -5;
    } else if (crisisId === "scandal_nightlife") {
      selectedChoiceId = "suspend";
      reasoning.push("[Crisis Agent] Discipline hawk enforces rules with suspension");
      reputationChange = -5;
      welfareRiskChange = -10;
    } else if (crisisId === "stomach_flu") {
      selectedChoiceId = "quarantine";
      reasoning.push("[Crisis Agent] Discipline hawk prioritizes health with quarantine");
      welfareRiskChange = -15;
    }
  } else if (isCompassionate) {
    // Compassionate oyakata protect their rikishi
    if (crisisId === "stomach_flu") {
      selectedChoiceId = "quarantine";
      reasoning.push("[Crisis Agent] Compassionate oyakata chooses rest for sick rikishi");
      welfareRiskChange = -15;
      reputationChange = 5;
    } else if (crisisId === "injury_training") {
      selectedChoiceId = "halt_training";
      reasoning.push("[Crisis Agent] Compassionate oyakata halts training after injury");
      welfareRiskChange = -10;
    } else if (crisisId === "scandal_nightlife") {
      selectedChoiceId = "defend";
      reasoning.push("[Crisis Agent] Compassionate oyakata defends their rikishi");
      reputationChange = -3;
    }
  } else if (isRiskTaker) {
    // Risk-taker chooses bold options
    if (crisisId === "dojo_duel") {
      selectedChoiceId = "accept";
      reasoning.push("[Crisis Agent] Risk-taker accepts the challenge");
      reputationChange = 5;
    } else if (crisisId === "sponsorship_friction") {
      selectedChoiceId = "call_bluff";
      reasoning.push("[Crisis Agent] Risk-taker calls sponsor's bluff");
      politicalCapitalChange = -10;
      reputationChange = 5;
    } else if (crisisId === "media_firestorm") {
      selectedChoiceId = "no_comment";
      reasoning.push("[Crisis Agent] Risk-taker refuses to engage with media");
      reputationChange = -5;
    }
  } else if (isAmbitious) {
    // Ambitious oyakata protect reputation
    if (crisisId === "media_firestorm") {
      selectedChoiceId = "exclusive";
      reasoning.push("[Crisis Agent] Ambitious oyakata controls narrative with exclusive");
      reputationChange = 5;
    } else if (crisisId === "sponsorship_friction") {
      selectedChoiceId = "renegotiate";
      reasoning.push("[Crisis Agent] Ambitious oyakata negotiates to preserve relationship");
      politicalCapitalChange = 5;
    } else if (crisisId === "governance_audit") {
      selectedChoiceId = "cooperate";
      reasoning.push("[Crisis Agent] Ambitious oyakata cooperates to maintain standing");
      politicalCapitalChange = 5;
    }
  } else if (isPublicityHawk) {
    // Publicity hawk chooses options that generate attention
    if (crisisId === "dojo_duel") {
      selectedChoiceId = "accept";
      reasoning.push("[Crisis Agent] Publicity hawk accepts for media attention");
      reputationChange = 5;
    } else if (crisisId === "media_firestorm") {
      selectedChoiceId = "exclusive";
      reasoning.push("[Crisis Agent] Publicity hawk uses exclusive for spotlight");
      reputationChange = 8;
    }
  } else if (isTraditionalist) {
    // Traditionalist follows sumo traditions
    if (crisisId === "governance_audit") {
      selectedChoiceId = "cooperate";
      reasoning.push("[Crisis Agent] Traditionalist respects JSA authority");
      politicalCapitalChange = 5;
    } else if (crisisId === "scandal_nightlife") {
      selectedChoiceId = "suspend";
      reasoning.push("[Crisis Agent] Traditionalist enforces discipline");
      reputationChange = -3;
      welfareRiskChange = -5;
    }
  }

  // Mood overrides
  if (currentMood === "anxious") {
    // Anxious oyakata play it safe
    if (crisisId === "dojo_duel" && selectedChoiceId === "accept") {
      selectedChoiceId = "decline";
      reasoning.push("[Crisis Agent] Anxiety override: declining challenge");
      reputationChange = -3;
    }
    if (crisisId === "sponsorship_friction" && selectedChoiceId === "call_bluff") {
      selectedChoiceId = "renegotiate";
      reasoning.push("[Crisis Agent] Anxiety override: choosing safer negotiation");
    }
  } else if (currentMood === "furious" || currentMood === "obsessed") {
    // Emotional oyakata take aggressive stances
    if (crisisId === "scandal_nightlife" && selectedChoiceId === "suspend") {
      selectedChoiceId = "defend";
      reasoning.push("[Crisis Agent] Emotional override: defending rikishi aggressively");
      reputationChange = -8;
    }
    if (crisisId === "media_firestorm" && selectedChoiceId === "exclusive") {
      selectedChoiceId = "no_comment";
      reasoning.push("[Crisis Agent] Emotional override: defiant stance");
      reputationChange = -10;
    }
  }

  reasoning.push(`[Crisis Agent] Final choice: ${selectedChoiceId}`);
  reasoning.push(
    `[Crisis Agent] Expected impact: reputation ${reputationChange}, political capital ${politicalCapitalChange}, welfare risk ${welfareRiskChange}`
  );

  return {
    selectedChoiceId,
    reasoning,
    expectedImpact: {
      reputationChange,
      politicalCapitalChange,
      welfareRiskChange,
    },
  };
}
