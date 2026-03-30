import { TickResolutionEvent } from "../types/combat";

export const VOCABULARY = {
  adverbs_heavy: [
    'brutally', 'massively', 'relentlessly', 'with crushing force', 'explosively', 'with daunting power',
    'overwhelmingly', 'with sheer brute strength', 'ferociously', 'like a freight train', 'with devastating impact'
  ],
  adverbs_fast: [
    'like lightning', 'swiftly', 'in a blur', 'with sharp precision', 'with cat-like speed', 'instantaneously',
    'with blinding speed', 'rapidly', 'in a flash', 'with striking quickness', 'suddenly'
  ],
  adverbs_technical: [
    'methodically', 'with calculated precision', 'expertly', 'with master-class timing',
    'tactically', 'with textbook form', 'flawlessly', 'with incredible savvy', 'astutely', 'with surgical precision', 'cleverly'
  ],
  verbs_push: [
    'shoves', 'drives into', 'blasts', 'rams', 'pummels', 'shunts',
    'bulldozes', 'batters', 'thrusts into', 'steamrolls', 'smashes into'
  ],
  verbs_trick: [
    'sidesteps', 'redirects', 'pulls down on', 'feints against', 'parries', 'outmaneuvers',
    'slips past', 'evades and redirects', 'deflects', 'baits', 'bamboozles'
  ],
  verbs_belt: [
    'locks onto', 'seizes', 'wrenches', 'hauls', 'grips', 'cinches',
    'clutches', 'latches onto', 'snatches', 'hooks into', 'grapples'
  ],
  verbs_speed: [
    'flanks', 'dashes past', 'circles', 'flickers around', 'evades', 'darts inside',
    'slips inside', 'dances around', 'weaves past', 'maneuvers around', 'shoots past'
  ],
  

  // New injury vocabulary
  injury_severe: ['devastating', 'career-threatening', 'gruesome', 'heartbreaking', 'critical', 'severe', 'major', 'horrifying'],
  injury_moderate: ['painful', 'concerning', 'troubling', 'significant', 'nasty', 'unfortunate', 'worrying'],
  injury_minor: ['nagging', 'frustrating', 'minor', 'irritating', 'slight', 'pesky', 'bothersome'],
  injury_body_part: ['knee', 'ankle', 'shoulder', 'elbow', 'neck', 'lower back', 'hamstring', 'calf'],

  // State-driven decorators
  decorator_exhausted: [
    'gasping for air', 'running on fumes', 'heaving', 'clearly spent',
    'exhausted beyond measure', 'visibly drained', 'running on empty', 'completely out of breath', 'struggling for oxygen'
  ],
  decorator_gasping: [
    'breathing heavily', 'showing signs of fatigue', 'laboring for breath', 'starting to tire', 'panting slightly'
  ],
  decorator_wobbling: [
    'teetering on the edge', 'scrambling for footing', 'visibly off-balance', 'struggling to stay upright',
    'swaying unsteadily', 'losing their center', 'stumbling backward', 'trying to regain balance', 'on shaky legs'
  ],
  decorator_critical: [
    'on the verge of collapse', 'dead to rights', 'completely unmoored', 'with no balance left', 'in a desperate spot'
  ],
  decorator_reversal: [
    'What a turnaround!', 'The tables have turned!', 'A sudden shift in momentum!', 'Incredible reversal!', 'A shocking counterattack!'
  ],
  decorator_edge: [
    'right at the bales', 'dancing on the straw', 'perilously close to the edge', 'at the very brink of the ring', 'with heels on the tawara'
  ],
  decorator_rivalry: [
    'in a bitter clash', 'with bad blood boiling', 'fueled by their intense rivalry', 'in a grudge match', 'with pride on the line'
  ],
  decorator_championship: [
    'with the Emperor\'s Cup looming', 'in a bout with massive title implications', 'under the blinding lights of championship stakes', 'with the yusho at stake', 'in a title-defining moment'
  ],

  ZABUTON_RAIN: "A historic kinboshi! The arena erupts into chaos as a rain of purple zabuton floods the dohyo!",
  GINBOSHI_REACTION: "An upset for the ages! The Maegashira has taken a silver star from the Ozeki, and the first zabuton are already flying!",
};

export const SENTENCE_TEMPLATES: Record<string, string[]> = {
  // Tokens are enclosed in brackets

  injury_sprain: [
    "A [injury_moderate] sprain slows [Defender] down.",
    "Medical staff diagnoses a [injury_moderate] sprain to the [injury_body_part].",
    "[Defender] suffers a [injury_severe] sprained joint.",
    "A twisted [injury_body_part] results in a [injury_severe] sprain.",
    "A sharp movement causes a sudden, [injury_moderate] sprain for [Defender]."
  ],
  injury_strain: [
    "An overextension leads to a [injury_moderate] [injury_body_part] strain.",
    "The heavy lifting takes its toll with a deep strain.",
    "A sudden burst of power results in a [injury_severe] strain.",
    "[Defender] grabs their [injury_body_part], clearly suffering a [injury_moderate] strain.",
    "The [injury_moderate] strain will definitely affect their next bout."
  ],
  injury_contusion: [
    "A brutal clash results in a [injury_moderate] contusion.",
    "A heavy blow leaves a visible, [injury_moderate] contusion on the [injury_body_part].",
    "[Defender] absorbs a [injury_severe] impact, causing a deep contusion.",
    "The collision creates a [injury_moderate] contusion.",
    "A [injury_minor] contusion, but it looks [injury_moderate]."
  ],
  injury_inflammation: [
    "Chronic [injury_moderate] inflammation flares up in the [injury_body_part].",
    "The joint swells with [injury_minor] inflammation.",
    "Persistent, [injury_minor] inflammation hampers [Defender]'s movement.",
    "Medical staff apply ice to combat the [injury_moderate] inflammation.",
    "The [injury_body_part] is inflamed and clearly [injury_moderate]."
  ],
  injury_tear: [
    "A [injury_severe] tear requires immediate attention.",
    "The [injury_body_part] gives way, indicating a [injury_severe] muscle tear.",
    "A horrific pop signals a [injury_severe] ligament tear.",
    "Medical staff confirms a [injury_severe] tear to the [injury_body_part].",
    "The [injury_severe] tear will sideline [Defender] for weeks."
  ],
  injury_fracture: [
    "A devastating impact leads to a [injury_severe] bone fracture.",
    "A nasty fall results in a [injury_severe] fracture.",
    "The [injury_severe] fracture leaves the arena in stunned silence.",
    "A clean, [injury_severe] fracture to the [injury_body_part].",
    "The [injury_severe] fracture is a massive blow to their career."
  ],
  injury_nerve: [
    "A pinched nerve causes [injury_severe] radiating pain.",
    "Nerve damage leaves the [injury_body_part] numb and weak.",
    "A [injury_moderate] nerve issue complicates the bout.",
    "The [injury_severe] nerve impingement severely restricts mobility.",
    "A jarring hit causes [injury_severe] nerve irritation."
  ],
  injury_unknown: [
    "[Defender] goes down with an unspecified, [injury_moderate] injury.",
    "Medical staff is unsure of the exact nature of the [injury_moderate] injury.",
    "A mysterious, [injury_moderate] ailment sidelines [Defender].",
    "The [injury_moderate] injury details remain unclear at this time.",
    "An undisclosed, [injury_moderate] injury forces a withdrawal."
  ],

  push_success: [
    "[decorator_reversal?] [decorator_championship?] [decorator_rivalry?] [Attacker], [decorator_exhausted?] [decorator_gasping?], [adverbs_heavy] [verbs_push] [Defender] [decorator_edge?]!",
    "[Attacker] [verbs_push] forward, leaving [Defender] [decorator_wobbling?] [decorator_critical?]!",
    "A massive [verbs_push] from [Attacker] sends [Defender] reeling!",
    "[decorator_reversal?] [Attacker] [adverbs_heavy] [verbs_push] right through [Defender]'s defense!",
    "Using every ounce of power, [Attacker] [verbs_push] [Defender] backward [decorator_edge?]!",
    "[Attacker] unleashes a flurry of thrusts and [verbs_push] [Defender] [decorator_critical?]!",
    "[decorator_championship?] [Attacker] [verbs_push] [Defender] with unyielding force!",
    "[decorator_rivalry?] [Attacker] [adverbs_heavy] [verbs_push] the staggering [Defender]!"
  ],
  trick_success: [
    "[decorator_reversal?] [Attacker] [adverbs_fast] [verbs_trick] [Defender]'s charge!",
    "A brilliant technical read [decorator_edge?]! [Attacker] [verbs_trick] the heavier [Defender] [decorator_critical?].",
    "[Attacker] uses [Defender]'s weight against them, [adverbs_technical] [verbs_trick] the attack!",
    "[decorator_championship?] [Attacker] calmly [verbs_trick] [Defender], showing incredible ring sense!",
    "With a sudden burst of ingenuity, [Attacker] [verbs_trick] [Defender] [decorator_wobbling?]!",
    "[decorator_rivalry?] [Attacker] [verbs_trick] the onrushing [Defender] with a deft maneuver!",
    "[decorator_reversal?] [Attacker] [adverbs_technical] [verbs_trick] [Defender], leaving them grasping at air!",
    "[Attacker], [decorator_gasping?], manages to [verbs_trick] [Defender] just in time!"
  ],
  belt_success: [
    "[decorator_reversal?] [Attacker] [adverbs_heavy] [verbs_belt] the mawashi of [Defender] [decorator_edge?]!",
    "[Attacker] [verbs_belt] a deep grip and begins to [adverbs_technical] drive [Defender] back [decorator_critical?]!",
    "Powerful yotsu-zumo! [Attacker] [verbs_belt] [Defender] and won't let go!",
    "[decorator_championship?] [Attacker] [verbs_belt] [Defender] and establishes absolute control!",
    "[decorator_rivalry?] [Attacker] [adverbs_heavy] [verbs_belt] [Defender] in a crushing embrace!",
    "Fighting through the fatigue, [Attacker], [decorator_exhausted?], [verbs_belt] [Defender]!",
    "[decorator_reversal?] [Attacker] secures an inside position and [verbs_belt] [Defender]!",
    "[Attacker] [adverbs_technical] [verbs_belt] [Defender], forcing them into a defensive posture [decorator_wobbling?]!"
  ],
  speed_success: [
    "[decorator_reversal?] [Attacker] [adverbs_fast] [verbs_speed] the lunging [Defender] [decorator_edge?]!",
    "[Attacker] [verbs_speed] inside the reach of [Defender], [adverbs_fast] attacking from the side [decorator_critical?]!",
    "Too fast! [Attacker] [adverbs_fast] [verbs_speed] and leaves [Defender] grabbing at air!",
    "[decorator_championship?] [Attacker] [verbs_speed] [Defender] with magnificent agility!",
    "[decorator_rivalry?] [Attacker] [verbs_speed] [Defender], creating a massive opening!",
    "[decorator_reversal?] [Attacker] [adverbs_fast] [verbs_speed] [Defender], flipping the script completely!",
    "Despite being [decorator_exhausted?], [Attacker] [verbs_speed] [Defender] in a flash!",
    "[Attacker] deftly [verbs_speed] [Defender], exploiting their lack of balance [decorator_wobbling?]!"
  ],
  repeated_action: [
    "[Attacker] relentlessly goes back to the well! Another [action_name]!",
    "[decorator_reversal?] [Attacker] insists on the [action_name]!",
    "[decorator_championship?] [Attacker] attempts the [action_name] once again!",
    "[decorator_rivalry?] [Attacker] stubbornly repeats the [action_name]!",
    "[Attacker] spams the [action_name], looking for a crack in [Defender]'s defense!",
    "Again with the [action_name]! [Attacker] will not be deterred!",
    "[decorator_exhausted?] [Attacker] relies on the familiar [action_name]!",
    "A predictable but powerful [action_name] from [Attacker]!"
  ]
};

export const MEDIA_TEMPLATES: Record<string, string[]> = {

  LATE_NIGHT_BRAWL: [
    "[Rikishi] involved in Roppongi altercations!",
    "[Rikishi] seen in midnight scuffle after heavy drinking.",
    "EXCLUSIVE: [Rikishi] Spotted in Roppongi at 3 AM Following Brutal Loss!",
    "FLASH: Midnight brawl at the bar! Was [Rikishi] involved?",
    "TABLOID: [Rikishi] seen throwing punches outside an Osaka club."
  ],
  SECRET_INJURY_LEAK: [
    "Is [Rikishi] hiding a knee injury? Insiders speak.",
    "Rumors of [Rikishi]'s training absence confirmed?",
    "Rumbling in the Heya: Is [Rikishi] Hiding a Devastating Knee Injury?",
    "Whispers in the Kokugikan: Has [Rikishi] lost the fighting spirit?",
    "Medical Leak: The truth about [Rikishi]'s physical condition."
  ],
  ILLEGAL_GAMBLING: [
    "SHOCKING: [Rikishi] linked to illegal betting ring!",
    "[Rikishi] faces investigation over 'dark' associations.",
    "EXPOSED: The secret gambling debts of [Rikishi] threatening their career!",
    "TABLOID: [Rikishi] seen with questionable associates in Osaka.",
    "JSA calls emergency meeting over [Rikishi]'s financial irregularities."
  ],
  TRAINING_ABUSE_ALLEGATION: [
    "Crisis at the heya: [Rikishi] accused of harsh behavior.",
    "Stablemate speaks out against [Rikishi]'s training methods.",
    "SCANDAL: [Rikishi] allegedly goes too far during morning keiko!",
    "Questions Surround [Rikishi]'s aggressive approach to junior wrestlers.",
    "JSA Insiders report growing concerns regarding [Rikishi]'s brutal training sessions."
  ],
  COACH_DISPUTE: [
    "[Rikishi] and Coach at odds! Tensions boiling over.",
    "Public fallout: [Rikishi] seen arguing with Oyakata.",
    "Sports Daily: [Rikishi] missed morning keiko; rumors of internal rift.",
    "Veteran Oyakata publicly reprimands [Rikishi] for a lack of professionalism.",
    "Editorial: The decline of discipline? [Rikishi] clashes with stablemaster."
  ],

  TABLOID_SCANDAL: [
    "EXCLUSIVE: [Rikishi] Spotted in Roppongi at 3 AM Following Brutal Loss!",
    "Rumbling in the Heya: Is [Rikishi] Hiding a Devastating Knee Injury?",
    "TABLOID: [Rikishi] seen with questionable associates in Osaka.",
    "FLASH: Midnight brawl at the bar! Was [Rikishi] involved?",
    "SCANDAL: [Rikishi] allegedly skips keiko to meet a mysterious companion!",
    "Busted! [Rikishi] caught indulging in late-night fast food before weigh-ins.",
    "Whispers in the Kokugikan: Has [Rikishi] lost the fighting spirit?",
    "EXPOSED: The secret gambling debts of [Rikishi] threatening their career!"
  ],
  SPORTS_DAILY_SCANDAL: [
    "Questions Surround [Rikishi]'s Focus Ahead of the Upcoming Basho.",
    "[Rikishi] Draws Criticism from Deliberation Council Over Recent Conduct.",
    "Editorial: The decline of discipline? [Rikishi] in the spotlight for the wrong reasons.",
    "Sports Daily: [Rikishi] missed morning keiko; rumors of internal rift.",
    "JSA Insiders report growing concerns regarding [Rikishi]'s commitment.",
    "An analysis of [Rikishi]'s poor performance: Is off-dohyo drama to blame?",
    "Veteran Oyakata publicly reprimands [Rikishi] for a lack of professionalism.",
    "[Rikishi]'s sponsors express dismay as rumors of misbehavior circulate."
  ],
  JSA_OFFICIAL_RESPONSE: [
    "JSA Issues Formal Warning to [Rikishi] Regarding Code of Conduct.",
    "Official Notice: [Rikishi] Suspended for 3 Days Pending Investigation.",
    "JSA Statement: Compliance review initiated for [Rikishi]'s stable.",
    "Disciplinary Action: [Rikishi] fined for violation of JSA regulations.",
    "JSA Press Release: [Rikishi] mandated to undergo ethics retraining.",
    "The Japan Sumo Association formally reprimands [Rikishi] for conduct detrimental to the sport.",
    "Notice of Hearing: [Rikishi] summoned before the Compliance Committee.",
    "JSA announces strict probationary measures for [Rikishi] following recent events."
  ]
};

export const INSTITUTIONAL_TEMPLATES: Record<string, string[]> = {
  event_scout_traditionalist: [
    "Oyakata demands the recruit demonstrate pure fighting spirit.",
    "The stablemaster observes in stoic silence, looking for grit and traditional sumo fundamentals.",
    "A rigorous test of physical endurance reveals the recruit's unyielding resolve.",
    "Oyakata emphasizes that only endless repetition and yotsu-sumo will lead to greatness.",
    "The recruit is sternly reminded of the harsh realities of traditional stable life."
  ],
  event_scout_scientist: [
    "Oyakata reviews the recruit's biometric data and physical testing metrics.",
    "A thorough analysis of the recruit's fast-twitch muscle fibers impresses the stablemaster.",
    "Oyakata discusses a structured nutritional and sport science regimen with the prospect.",
    "The scout values the recruit's anatomical leverage over their raw weight.",
    "Data-driven projections suggest this recruit has a high ceiling if proper technique is applied."
  ],
  event_scout_gambler: [
    "Oyakata makes a bold wager, taking a chance on the highly volatile prospect.",
    "Seeing a high-risk, high-reward potential, the stablemaster aggressively pursues the recruit.",
    "Oyakata trusts their gut feeling over conventional scouting reports, dreaming of glory.",
    "A massive gamble! Oyakata pushes all in to recruit this raw, unpolished talent.",
    "The stablemaster envisions a quick, explosive rise to the top, ignoring obvious red flags."
  ],
  event_scout_nurturer: [
    "Oyakata warmly welcomes the recruit, promising a supportive and family-like environment.",
    "The stablemaster focuses on the recruit's character and long-term well-being.",
    "Oyakata patiently explains the path to a long, healthy career in the grueling sport.",
    "Seeing potential for steady growth, the stablemaster offers the recruit a safe haven to develop.",
    "The recruit is reassured by Oyakata's compassionate approach and promises of mentorship."
  ],
  event_scout_tyrant: [
    "Oyakata ruthlessly berates the recruit during tryouts, testing their psychological breaking point.",
    "The stablemaster demands absolute obedience and immediate results, striking fear into the prospect.",
    "A brutal, uncompromising evaluation leaves the recruit exhausted but contracted.",
    "Oyakata makes it clear: failure to perform will not be tolerated in this stable.",
    "The recruit signs under immense pressure, terrified of the tyrant's notorious wrath."
  ],
  event_scout_strategist: [
    "Oyakata cunningly evaluates how the recruit fits into the current sumo meta.",
    "A calculated assessment of the recruit's tactical adaptability impresses the stablemaster.",
    "Oyakata plans a highly specialized development track for the unique prospect.",
    "The stablemaster analyzes the recruit's potential to exploit weaknesses in modern opponents.",
    "A strategic acquisition! Oyakata believes this recruit is the missing piece for the stable."
  ],

  event_governance_strict: [
    "The JSA issues a formal decree: the stable's governance status has been officially revised.",
    "An urgent dispatch from the council confirms a strict alteration in governance status.",
    "In a stern uncompromising mandate, the compliance committee mandates a new governance status.",
    "The Oyakata accepts the board's decision to modify their institutional standing.",
    "Following an internal review, the stable's governance status is publicly updated."
  ],
  event_governance_indulgent: [
    "The JSA issues a formal notice: the heya's governance status has been officially revised.",
    "An urgent dispatch from the council confirms a lenient alteration in governance status.",
    "In a gentle ruling, the compliance committee mandates a new governance status.",
    "The stablemaster accepts the board's decision to modify their institutional standing.",
    "Following an internal review, the heya's governance status is publicly updated."
  ],
  event_governance_traditionalist: [
    "The elders hand down a severe governance ruling, demanding immediate compliance to traditional ways.",
    "A firm governance ruling is issued by the committee to guide the heya back to its roots.",
    "The board's governance ruling sends a clear message about historical institutional integrity.",
    "An unprecedented traditionalist governance ruling alters the future trajectory of the stable.",
    "The disciplinary panel announces a final, binding governance ruling based on ancient precedent."
  ],
  event_governance_scientist: [
    "A data-driven governance ruling is issued by the committee to modernise the heya.",
    "The board's governance ruling sends a clear message about scientific institutional integrity.",
    "An unprecedented analytical governance ruling alters the future trajectory of the stable.",
    "The disciplinary panel announces a final, binding governance ruling based on new metrics.",
    "The JSA issues a formal notice: the heya's governance status has been officially revised based on recent data."
  ],
  event_governance_gambler: [
    "A high-stakes governance ruling is issued by the committee to shake up the heya.",
    "The board's governance ruling sends a risky message about institutional integrity.",
    "An unprecedented gamble of a governance ruling alters the future trajectory of the stable.",
    "The disciplinary panel announces a final, binding governance ruling that feels like a roll of the dice.",
    "The JSA issues a formal notice: the heya's governance status has been officially revised in a surprising move."
  ],
  event_governance_nurturer: [
    "A compassionate governance ruling is issued by the committee to guide the heya.",
    "The board's governance ruling sends a warm message about institutional integrity.",
    "An unprecedented supportive governance ruling alters the future trajectory of the stable.",
    "The disciplinary panel announces a final, binding governance ruling focused on wellbeing.",
    "The JSA issues a formal notice: the heya's governance status has been officially revised with care."
  ],
  event_governance_tyrant: [
    "A brutal governance ruling is issued by the committee to force the heya into line.",
    "The board's governance ruling sends a terrifying message about institutional integrity.",
    "An unprecedented tyrannical governance ruling alters the future trajectory of the stable.",
    "The disciplinary panel announces a final, binding governance ruling demanding absolute obedience.",
    "The JSA issues a formal notice: the heya's governance status has been officially revised with an iron fist."
  ],
  event_governance_strategist: [
    "A cunning governance ruling is issued by the committee to outmaneuver the heya.",
    "The board's governance ruling sends a calculated message about institutional integrity.",
    "An unprecedented strategic governance ruling alters the future trajectory of the stable.",
    "The disciplinary panel announces a final, binding governance ruling based on long-term planning.",
    "The JSA issues a formal notice: the heya's governance status has been officially revised with a master plan."
  ],
  event_welfare_strict: [
    "A critical welfare violation notice is triggered, prompting an immediate investigation by the JSA.",
    "The welfare committee raises a red flag regarding conditions at the stable.",
    "A formal welfare violation notice underscores deep concerns for the rikishi's wellbeing.",
    "The Oyakata is summoned following a serious welfare violation notice.",
    "Welfare monitors issue a stern warning detailing unacceptable conditions."
  ],
  event_welfare_indulgent: [
    "A minor welfare alert is triggered, prompting an immediate investigation by the JSA.",
    "The welfare committee raises a red flag regarding conditions at the heya.",
    "A formal welfare alert underscores deep concerns for the rikishi's wellbeing.",
    "The stablemaster is summoned following a routine welfare alert.",
    "Welfare monitors issue a mild warning detailing unacceptable conditions."
  ],
  event_welfare_traditionalist: [
    "A critical traditional welfare alert is triggered, prompting an immediate investigation by the JSA.",
    "The welfare committee raises a red flag regarding ancient conditions at the stable.",
    "A formal welfare violation notice underscores deep concerns for the rikishi's traditional wellbeing.",
    "The Oyakata is summoned following a serious old-school welfare violation notice.",
    "Welfare monitors issue a stern warning detailing unacceptable ancient conditions."
  ],
  event_welfare_scientist: [
    "A critical scientific welfare alert is triggered, prompting an immediate data-driven investigation by the JSA.",
    "The welfare committee raises a red flag regarding modern conditions at the stable.",
    "A formal welfare violation notice underscores deep concerns for the rikishi's scientific wellbeing.",
    "The Oyakata is summoned following a serious analytical welfare violation notice.",
    "Welfare monitors issue a stern warning detailing unacceptable metric conditions."
  ],
  event_welfare_gambler: [
    "A critical risky welfare alert is triggered, prompting an immediate investigation by the JSA.",
    "The welfare committee raises a red flag regarding dangerous conditions at the stable.",
    "A formal welfare violation notice underscores deep concerns for the rikishi's high-stakes wellbeing.",
    "The Oyakata is summoned following a serious gambling welfare violation notice.",
    "Welfare monitors issue a stern warning detailing unacceptable risky conditions."
  ],
  event_welfare_nurturer: [
    "A critical compassionate welfare alert is triggered, prompting an immediate investigation by the JSA.",
    "The welfare committee raises a red flag regarding caring conditions at the stable.",
    "A formal welfare violation notice underscores deep concerns for the rikishi's nurtured wellbeing.",
    "The Oyakata is summoned following a serious supportive welfare violation notice.",
    "Welfare monitors issue a stern warning detailing unacceptable negligent conditions."
  ],
  event_welfare_tyrant: [
    "A critical brutal welfare alert is triggered, prompting an immediate investigation by the JSA.",
    "The welfare committee raises a red flag regarding terrifying conditions at the stable.",
    "A formal welfare violation notice underscores deep concerns for the rikishi's abused wellbeing.",
    "The Oyakata is summoned following a serious tyrannical welfare violation notice.",
    "Welfare monitors issue a stern warning detailing unacceptable cruel conditions."
  ],
  event_welfare_strategist: [
    "A critical strategic welfare alert is triggered, prompting an immediate investigation by the JSA.",
    "The welfare committee raises a red flag regarding calculated conditions at the stable.",
    "A formal welfare violation notice underscores deep concerns for the rikishi's planned wellbeing.",
    "The Oyakata is summoned following a serious cunning welfare violation notice.",
    "Welfare monitors issue a stern warning detailing unacceptable scheming conditions."
  ],
  event_scout_strict: [
    "Oyakata demands the recruit demonstrate absolute obedience.",
    "The stablemaster observes in stoic silence, looking for strict discipline.",
    "A rigorous test of physical endurance reveals the recruit's unyielding resolve.",
    "Oyakata emphasizes that only endless repetition and strict adherence will lead to greatness.",
    "The recruit is sternly reminded of the harsh realities of disciplined stable life."
  ],
  event_scout_indulgent: [
    "Oyakata warmly welcomes the recruit, promising a lenient environment.",
    "The stablemaster focuses on the recruit's character and relaxed well-being.",
    "Oyakata patiently explains the path to a long, easy career in the sport.",
    "Seeing potential for steady growth, the stablemaster offers the recruit a safe haven to develop.",
    "The recruit is reassured by Oyakata's indulgent approach and promises of mentorship."
  ],

};

const GRIP_TEMPLATES = {
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
