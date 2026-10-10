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

interface CrisisAgentResult {
  selectedChoiceId: string;
  reasoning: string[];
  expectedImpact: {
    reputationChange?: number;
    politicalCapitalChange?: number;
    welfareRiskChange?: number;
  };
}

interface CrisisDecision {
  choice: string;
  reason: string;
  rep?: number;
  pc?: number;
  wr?: number;
}

/** Archetype → crisisId → decision table. First matching archetype wins. */
const ARCHETYPE_DECISIONS: Record<string, Record<string, CrisisDecision>> = {
  disciplined: {
    governance_audit: {
      choice: "cooperate",
      reason: "[Crisis Agent] Discipline hawk chooses cooperation with audit",
      pc: 5,
      wr: -5,
    },
    scandal_nightlife: {
      choice: "suspend",
      reason: "[Crisis Agent] Discipline hawk enforces rules with suspension",
      rep: -5,
      wr: -10,
    },
    stomach_flu: {
      choice: "quarantine",
      reason: "[Crisis Agent] Discipline hawk prioritizes health with quarantine",
      wr: -15,
    },
  },
  compassionate: {
    stomach_flu: {
      choice: "quarantine",
      reason: "[Crisis Agent] Compassionate oyakata chooses rest for sick rikishi",
      wr: -15,
      rep: 5,
    },
    injury_training: {
      choice: "halt_training",
      reason: "[Crisis Agent] Compassionate oyakata halts training after injury",
      wr: -10,
    },
    scandal_nightlife: {
      choice: "defend",
      reason: "[Crisis Agent] Compassionate oyakata defends their rikishi",
      rep: -3,
    },
  },
  riskTaker: {
    dojo_duel: {
      choice: "accept",
      reason: "[Crisis Agent] Risk-taker accepts the challenge",
      rep: 5,
    },
    sponsorship_friction: {
      choice: "call_bluff",
      reason: "[Crisis Agent] Risk-taker calls sponsor's bluff",
      pc: -10,
      rep: 5,
    },
    media_firestorm: {
      choice: "no_comment",
      reason: "[Crisis Agent] Risk-taker refuses to engage with media",
      rep: -5,
    },
  },
  ambitious: {
    media_firestorm: {
      choice: "exclusive",
      reason: "[Crisis Agent] Ambitious oyakata controls narrative with exclusive",
      rep: 5,
    },
    sponsorship_friction: {
      choice: "renegotiate",
      reason: "[Crisis Agent] Ambitious oyakata negotiates to preserve relationship",
      pc: 5,
    },
    governance_audit: {
      choice: "cooperate",
      reason: "[Crisis Agent] Ambitious oyakata cooperates to maintain standing",
      pc: 5,
    },
  },
  publicityHawk: {
    dojo_duel: {
      choice: "accept",
      reason: "[Crisis Agent] Publicity hawk accepts for media attention",
      rep: 5,
    },
    media_firestorm: {
      choice: "exclusive",
      reason: "[Crisis Agent] Publicity hawk uses exclusive for spotlight",
      rep: 8,
    },
  },
  traditionalist: {
    governance_audit: {
      choice: "cooperate",
      reason: "[Crisis Agent] Traditionalist respects JSA authority",
      pc: 5,
    },
    scandal_nightlife: {
      choice: "suspend",
      reason: "[Crisis Agent] Traditionalist enforces discipline",
      rep: -3,
      wr: -5,
    },
  },
};

/** Mood overrides: crisisId → {from → to + delta + reason}. */
const MOOD_OVERRIDES: Record<
  string,
  Record<string, Record<string, { to: string; reason: string; rep?: number }>>
> = {
  anxious: {
    dojo_duel: {
      accept: {
        to: "decline",
        reason: "[Crisis Agent] Anxiety override: declining challenge",
        rep: -3,
      },
    },
    sponsorship_friction: {
      call_bluff: {
        to: "renegotiate",
        reason: "[Crisis Agent] Anxiety override: choosing safer negotiation",
      },
    },
  },
  furious: {
    scandal_nightlife: {
      suspend: {
        to: "defend",
        reason: "[Crisis Agent] Emotional override: defending rikishi aggressively",
        rep: -8,
      },
    },
    media_firestorm: {
      exclusive: {
        to: "no_comment",
        reason: "[Crisis Agent] Emotional override: defiant stance",
        rep: -10,
      },
    },
  },
  obsessed: {
    scandal_nightlife: {
      suspend: {
        to: "defend",
        reason: "[Crisis Agent] Emotional override: defending rikishi aggressively",
        rep: -8,
      },
    },
    media_firestorm: {
      exclusive: {
        to: "no_comment",
        reason: "[Crisis Agent] Emotional override: defiant stance",
        rep: -10,
      },
    },
  },
};

/**
 * Crisis Worker: Handles crisis response decisions
 * Evaluates personality traits, mood, and crisis severity to determine response strategy
 */
export function spawnCrisisAgent(ctx: CrisisAgentContext): CrisisAgentResult {
  const reasoning: string[] = [];
  const { crisis, oyakata, currentMood } = ctx;

  const isRiskTaker = oyakata.traits.risk > 60;

  let selectedChoiceId = crisis.options[0]?.id || "";
  let reputationChange = 0;
  let politicalCapitalChange = 0;
  let welfareRiskChange = 0;

  // Analyze crisis type and personality match. Generated crises carry RNG
  // ids, so match on the semantic type first and fall back to the id.
  const crisisId = crisis.type ?? crisis.id;

  reasoning.push(`[Crisis Agent] Evaluating ${crisis.title}`);

  // Base decision on personality — insolvency overrides archetype priority.
  if (isRiskTaker && crisisId === "financial_insolvency") {
    selectedChoiceId = "emergency_loan";
    reasoning.push("[Crisis Agent] Risk-taker takes the predatory loan to survive");
    reputationChange = -5;
    politicalCapitalChange = -5;
  } else if (crisisId === "financial_insolvency") {
    selectedChoiceId = "seek_pardon";
    reasoning.push("[Crisis Agent] Pleading with the JSA for a grace period");
    reputationChange = -15;
    politicalCapitalChange = -10;
  } else {
    const archetypes: [string, boolean | undefined][] = [
      ["disciplined", oyakata.managerFlags?.disciplineHawk],
      ["compassionate", oyakata.traits.compassion > 70],
      ["riskTaker", isRiskTaker],
      ["ambitious", oyakata.traits.ambition > 70],
      ["publicityHawk", oyakata.managerFlags?.publicityHawk],
      ["traditionalist", oyakata.traits.tradition > 70],
    ];
    for (const [name, active] of archetypes) {
      if (!active) continue;
      const decision = ARCHETYPE_DECISIONS[name]?.[crisisId];
      if (decision) {
        selectedChoiceId = decision.choice;
        reasoning.push(decision.reason);
        reputationChange = decision.rep ?? 0;
        politicalCapitalChange = decision.pc ?? 0;
        welfareRiskChange = decision.wr ?? 0;
      }
      break; // First matching archetype wins — inner misses fall through
    }
  }

  // Mood overrides
  const moodTable = currentMood ? MOOD_OVERRIDES[currentMood] : undefined;
  const override = moodTable?.[crisisId]?.[selectedChoiceId];
  if (override) {
    selectedChoiceId = override.to;
    reasoning.push(override.reason);
    if (override.rep !== undefined) reputationChange = override.rep;
  }

  // Guard: the selected option must actually exist on the crisis.
  if (!crisis.options.some((o) => o.id === selectedChoiceId)) {
    selectedChoiceId = crisis.options[0]?.id || "";
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
