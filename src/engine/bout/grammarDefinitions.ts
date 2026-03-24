import { TickResolutionEvent } from "../types/combat";

export const VOCABULARY = {
  adverbs_heavy: ['brutally', 'massively', 'relentlessly', 'with crushing force', 'explosively', 'with daunting power'],
  adverbs_fast: ['like lightning', 'swiftly', 'in a blur', 'with sharp precision', 'with cat-like speed', 'instantaneously'],
  adverbs_technical: ['methodically', 'with calculated precision', 'expertly', 'with master-class timing'],
  verbs_push: ['shoves', 'drives into', 'blasts', 'rams', 'pummels', 'shunts'],
  verbs_trick: ['sidesteps', 'redirects', 'pulls down on', 'feints against', 'parries', 'outmaneuvers'],
  verbs_belt: ['locks onto', 'seizes', 'wrenches', 'hauls', 'grips', 'cinches'],
  verbs_speed: ['flanks', 'dashes past', 'circles', 'flickers around', 'evades', 'darts inside'],
  
  // State-driven decorators
  decorator_exhausted: ['gasping for air', 'running on fumes', 'heaving', 'clearly spent'],
  decorator_wobbling: ['teetering on the edge', 'scrambling for footing', 'visibly off-balance', 'struggling to stay upright'],
};

export const SENTENCE_TEMPLATES: Record<string, string[]> = {
  // Tokens are enclosed in brackets
  push_success: [
    "[Attacker], [decorator_exhausted?], [adverbs_heavy] [verbs_push] [Defender]!",
    "[Attacker] [verbs_push] forward, leaving [Defender] [decorator_wobbling]!",
    "A massive [verbs_push] from [Attacker] sends [Defender] reeling!"
  ],
  trick_success: [
    "[Attacker] [adverbs_fast] [verbs_trick] [Defender]'s charge!",
    "A brilliant technical read! [Attacker] [verbs_trick] the heavier [Defender].",
    "[Attacker] uses [Defender]'s weight against them, [adverbs_technical] [verbs_trick] the attack!"
  ],
  belt_success: [
    "[Attacker] [adverbs_heavy] [verbs_belt] the mawashi of [Defender]!",
    "[Attacker] [verbs_belt] a deep grip and begins to [adverbs_technical] drive [Defender] back!",
    "Powerful yotsu-zumo! [Attacker] [verbs_belt] [Defender] and won't let go!"
  ],
  speed_success: [
    "[Attacker] [adverbs_fast] [verbs_speed] the lunging [Defender]!",
    "[Attacker] [verbs_speed] inside the reach of [Defender], [adverbs_fast] attacking from the side!",
    "Too fast! [Attacker] [adverbs_fast] [verbs_speed] and leaves [Defender] grabbing at air!"
  ],
  repeated_action: [
    "[Attacker] relentlessly goes back to the well! Another [action_name]!"
  ]
};
