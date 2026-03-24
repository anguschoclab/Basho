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
  ZABUTON_RAIN: "A historic kinboshi! The arena erupts into chaos as a rain of purple zabuton floods the dohyo!",
  GINBOSHI_REACTION: "An upset for the ages! The Maegashira has taken a silver star from the Ozeki, and the first zabuton are already flying!",
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

export const MEDIA_TEMPLATES = {
  TABLOID_SCANDAL: [
    "EXCLUSIVE: [Rikishi] Spotted in Roppongi at 3 AM Following Brutal Loss!",
    "Rumbling in the Heya: Is [Rikishi] Hiding a Devastating Knee Injury?",
    "TABLOID: [Rikishi] seen with questionable associates in Osaka.",
    "FLASH: Midnight brawl at the bar! Was [Rikishi] involved?"
  ],
  SPORTS_DAILY_SCANDAL: [
    "Questions Surround [Rikishi]'s Focus Ahead of the Upcoming Basho.",
    "[Rikishi] Draws Criticism from Deliberation Council Over Recent Conduct.",
    "Editorial: The decline of discipline? [Rikishi] in the spotlight for the wrong reasons.",
    "Sports Daily: [Rikishi] missed morning keiko; rumors of internal rift."
  ],
  JSA_OFFICIAL_RESPONSE: [
    "JSA Issues Formal Warning to [Rikishi] Regarding Code of Conduct.",
    "Official Notice: [Rikishi] Suspended for 3 Days Pending Investigation.",
    "JSA Statement: Compliance review initiated for [Rikishi]'s stable.",
    "Disciplinary Action: [Rikishi] fined for violation of JSA regulations."
  ]
};

export const GRIP_TEMPLATES = {
  moro_zashi: [
    "Brilliant maneuver! [Attacker] slips both arms in for a deep moro-zashi grip!",
    "[Attacker] secures the double-inside grip! [Defender] is in serious trouble."
  ],
  kenka_yotsu_stalemate: [
    "A classic kenka-yotsu battle. Neither man can secure their preferred grip.",
    "They are deadlocked fighting for the inside left hand."
  ],
  maemitsu_secured: [
    "[Attacker] drops their hips and grabs a tight maemitsu grip on the front of the belt!",
    "Using their lower center of gravity, [Attacker] secures the front belt."
  ],
  grip_secured: [
    "[Attacker] gets their favored [grip_preference] grip and locks it in.",
    "A fierce grip fight, but [Attacker] wins the inside position!"
  ]
};
