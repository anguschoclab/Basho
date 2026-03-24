import { TickResolutionEvent } from "../types/combat";

export const VOCABULARY = {
  adverbs_heavy: ['brutally', 'massively', 'relentlessly', 'with crushing force'],
  adverbs_fast: ['like lightning', 'swiftly', 'in a blur', 'with sharp precision'],
  verbs_push: ['shoves', 'drives into', 'blasts', 'rams'],
  verbs_trick: ['sidesteps', 'redirects', 'pulls down on', 'feints against'],
  
  // State-driven decorators
  decorator_exhausted: ['gasping for air', 'running on fumes', 'heaving'],
  decorator_wobbling: ['teetering on the edge', 'scrambling for footing', 'visibly off-balance'],
};

export const SENTENCE_TEMPLATES: Record<string, string[]> = {
  // Tokens are enclosed in brackets
  push_success: [
    "[Attacker], [decorator_exhausted?], [adverbs_heavy] [verbs_push] [Defender]!",
    "[Attacker] [verbs_push] forward, leaving [Defender] [decorator_wobbling]!"
  ],
  trick_success: [
    "[Attacker] [adverbs_fast] [verbs_trick] [Defender]'s charge!",
    "A brilliant technical read! [Attacker] [verbs_trick] the heavier [Defender]."
  ],
  // Fallback for other families if needed
  belt_success: [
    "[Attacker] grapples with [Defender], showing superior strength!",
    "[Attacker] locks onto [Defender]'s belt, [adverbs_heavy] controlling the pace."
  ],
  speed_success: [
    "[Attacker] [adverbs_fast] maneuvers around [Defender]!",
    "A flash of movement! [Attacker] [adverbs_fast] attacks [Defender]."
  ],
  repeated_action: [
    "[Attacker] relentlessly goes back to the well! Another [action_name]!"
  ]
};
