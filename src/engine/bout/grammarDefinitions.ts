import { TickResolutionEvent } from "../types/combat";

export const VOCABULARY = {
  adverbs_heavy: [
    'brutally', 'massively', 'relentlessly', 'with crushing force', 'explosively', 'with daunting power',
    'overwhelmingly', 'with sheer brute strength', 'ferociously', 'like a freight train', 'with devastating impact',
    'with bone-rattling force', 'savagely', 'with undeniable momentum', 'like an avalanche', 'with titanic pressure',
    'unforgivingly'
  ],
  adverbs_fast: [
    'like lightning', 'swiftly', 'in a blur', 'with sharp precision', 'with cat-like speed', 'instantaneously',
    'with blinding speed', 'rapidly', 'in a flash', 'with striking quickness', 'suddenly',
    'with supernatural agility', 'at breakneck speed', 'in the blink of an eye', 'with startling acceleration', 'like a phantom'
  ],
  adverbs_technical: [
    'methodically', 'with calculated precision', 'expertly', 'with master-class timing',
    'tactically', 'with textbook form', 'flawlessly', 'with incredible savvy', 'astutely', 'with surgical precision', 'cleverly',
    'with veteran guile', 'showing immense ring IQ', 'with geometric perfection', 'like a seasoned tactician', 'with profound situational awareness'
  ],
  verbs_push: [
    'shoves', 'drives into', 'blasts', 'rams', 'pummels', 'shunts',
    'bulldozes', 'batters', 'thrusts into', 'steamrolls', 'smashes into',
    'plows through', 'launches a barrage against', 'overpowers', 'forces back', 'hammers at'
  ],
  verbs_trick: [
    'sidesteps', 'redirects', 'pulls down on', 'feints against', 'parries', 'outmaneuvers',
    'slips past', 'evades and redirects', 'deflects', 'baits', 'bamboozles',
    'slips the charge of', 'uses the momentum of', 'expertly dodges', 'sends flying', 'creates a massive opening against'
  ],
  verbs_belt: [
    'locks onto', 'seizes', 'wrenches', 'hauls', 'grips', 'cinches',
    'clutches', 'latches onto', 'snatches', 'hooks into', 'grapples',
    'digs deep into the mawashi of', 'establishes iron control over', 'binds up', 'wraps up', 'anchors onto'
  ],
  verbs_speed: [
    'flanks', 'dashes past', 'circles', 'flickers around', 'evades', 'darts inside',
    'slips inside', 'dances around', 'weaves past', 'maneuvers around', 'shoots past',
    'bypasses the defense of', 'twirls around', 'finds the angle on', 'cuts the corner against', 'outpaces'
  ],
  

  // New injury vocabulary
  injury_severe: ['devastating', 'career-threatening', 'gruesome', 'heartbreaking', 'critical', 'severe', 'major', 'horrifying'],
  injury_moderate: ['painful', 'concerning', 'troubling', 'significant', 'nasty', 'unfortunate', 'worrying'],
  injury_minor: ['nagging', 'frustrating', 'minor', 'irritating', 'slight', 'pesky', 'bothersome'],
  injury_body_part: ['knee', 'ankle', 'shoulder', 'elbow', 'neck', 'lower back', 'hamstring', 'calf'],

  // State-driven decorators
  decorator_exhausted: [
    'gasping for air', 'running on fumes', 'heaving', 'clearly spent',
    'exhausted beyond measure', 'visibly drained', 'running on empty', 'completely out of breath', 'struggling for oxygen',
    'legs looking like jelly', 'chest heaving violently', 'barely able to stand', 'fighting through pure exhaustion', 'looking completely winded'
  ],
  decorator_gasping: [
    'breathing heavily', 'showing signs of fatigue', 'laboring for breath', 'starting to tire', 'panting slightly',
    'drawing deep breaths', 'mouth wide open', 'shoulders slumping', 'looking a bit flushed', 'sweating profusely'
  ],
  decorator_wobbling: [
    'teetering on the edge', 'scrambling for footing', 'visibly off-balance', 'struggling to stay upright',
    'swaying unsteadily', 'losing their center', 'stumbling backward', 'trying to regain balance', 'on shaky legs',
    'with compromised posture', 'awkwardly backpedaling', 'flailing for stability', 'with their center of gravity completely ruined', 'staggering'
  ],
  decorator_critical: [
    'on the verge of collapse', 'dead to rights', 'completely unmoored', 'with no balance left', 'in a desperate spot',
    'with nowhere left to go', 'absolutely helpless', 'at the mercy of the attacker', 'in a disastrous position', 'with their defense completely shattered'
  ],
  decorator_reversal: [
    'What a turnaround!', 'The tables have turned!', 'A sudden shift in momentum!', 'Incredible reversal!', 'A shocking counterattack!',
    'Out of nowhere!', 'Just when it seemed over!', 'A dramatic shift in the tide!', 'Unbelievable defensive transition!', 'A spectacular counter!'
  ],
  decorator_edge: [
    'right at the bales', 'dancing on the straw', 'perilously close to the edge', 'at the very brink of the ring', 'with heels on the tawara',
    'with no real estate left', 'staring down the drop-off', 'balancing on the absolute boundary', 'with toes brushing the bales', 'cornered at the edge'
  ],
  decorator_rivalry: [
    'in a bitter clash', 'with bad blood boiling', 'fueled by their intense rivalry', 'in a grudge match', 'with pride on the line',
    'fighting like they genuinely hate each other', 'with a history of fierce battles', 'in a deeply personal matchup', 'trading blows fueled by animosity', 'in the latest chapter of this epic rivalry'
  ],
  decorator_championship: [
    'with the Emperor\'s Cup looming', 'in a bout with massive title implications', 'under the blinding lights of championship stakes', 'with the yusho at stake', 'in a title-defining moment',
    'feeling the crushing pressure of the race', 'with the entire nation watching', 'in a crucial turning point for the tournament', 'chasing sumo immortality', 'with destiny calling'
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
    "[decorator_rivalry?] [Attacker] [adverbs_heavy] [verbs_push] the staggering [Defender]!",
    "[decorator_reversal?] What raw power! [Attacker] [adverbs_heavy] [verbs_push] [Defender]!",
    "No subtlety here, [Attacker] [adverbs_heavy] [verbs_push] directly into the chest of [Defender] [decorator_edge?]!",
    "[decorator_championship?] A thunderous clash! [Attacker] [verbs_push] [Defender] [decorator_wobbling?]!",
    "Relentless tsuppari! [Attacker] [verbs_push] the beleaguered [Defender] [decorator_critical?]!",
    "[Attacker], [decorator_exhausted?], summons one last surge and [verbs_push] [Defender]!"
  ],
  trick_success: [
    "[decorator_reversal?] [Attacker] [adverbs_fast] [verbs_trick] [Defender]'s charge!",
    "A brilliant technical read [decorator_edge?]! [Attacker] [verbs_trick] the heavier [Defender] [decorator_critical?].",
    "[Attacker] uses [Defender]'s weight against them, [adverbs_technical] [verbs_trick] the attack!",
    "[decorator_championship?] [Attacker] calmly [verbs_trick] [Defender], showing incredible ring sense!",
    "With a sudden burst of ingenuity, [Attacker] [verbs_trick] [Defender] [decorator_wobbling?]!",
    "[decorator_rivalry?] [Attacker] [verbs_trick] the onrushing [Defender] with a deft maneuver!",
    "[decorator_reversal?] [Attacker] [adverbs_technical] [verbs_trick] [Defender], leaving them grasping at air!",
    "[Attacker], [decorator_gasping?], manages to [verbs_trick] [Defender] just in time!",
    "Like a matador! [Attacker] [adverbs_technical] [verbs_trick] the charging [Defender] [decorator_critical?]!",
    "[decorator_reversal?] An astonishing sleight of hand! [Attacker] [verbs_trick] [Defender] [decorator_edge?]!",
    "[Attacker] feints perfectly, and [verbs_trick] the overcommitted [Defender]!",
    "A textbook pull-down attempt! [Attacker] [adverbs_fast] [verbs_trick] [Defender]!",
    "[decorator_championship?] The wily [Attacker] [verbs_trick] [Defender] with a masterful display of judo!"
  ],
  belt_success: [
    "[decorator_reversal?] [Attacker] [adverbs_heavy] [verbs_belt] the mawashi of [Defender] [decorator_edge?]!",
    "[Attacker] [verbs_belt] a deep grip and begins to [adverbs_technical] drive [Defender] back [decorator_critical?]!",
    "Powerful yotsu-zumo! [Attacker] [verbs_belt] [Defender] and won't let go!",
    "[decorator_championship?] [Attacker] [verbs_belt] [Defender] and establishes absolute control!",
    "[decorator_rivalry?] [Attacker] [adverbs_heavy] [verbs_belt] [Defender] in a crushing embrace!",
    "Fighting through the fatigue, [Attacker], [decorator_exhausted?], [verbs_belt] [Defender]!",
    "[decorator_reversal?] [Attacker] secures an inside position and [verbs_belt] [Defender]!",
    "[Attacker] [adverbs_technical] [verbs_belt] [Defender], forcing them into a defensive posture [decorator_wobbling?]!",
    "A battle for the inside! [Attacker] [verbs_belt] the belt and anchors [Defender] [decorator_edge?]!",
    "[decorator_championship?] [Attacker] [adverbs_heavy] [verbs_belt] the front mawashi of [Defender]!",
    "[decorator_reversal?] A sudden shift in the grapple! [Attacker] [verbs_belt] [Defender] [decorator_critical?]!",
    "With vice-like grip strength, [Attacker] [verbs_belt] [Defender] and halts their momentum completely!",
    "The crowd hums as [Attacker] finally [verbs_belt] [Defender] into a stalemate!"
  ],
  speed_success: [
    "[decorator_reversal?] [Attacker] [adverbs_fast] [verbs_speed] the lunging [Defender] [decorator_edge?]!",
    "[Attacker] [verbs_speed] inside the reach of [Defender], [adverbs_fast] attacking from the side [decorator_critical?]!",
    "Too fast! [Attacker] [adverbs_fast] [verbs_speed] and leaves [Defender] grabbing at air!",
    "[decorator_championship?] [Attacker] [verbs_speed] [Defender] with magnificent agility!",
    "[decorator_rivalry?] [Attacker] [verbs_speed] [Defender], creating a massive opening!",
    "[decorator_reversal?] [Attacker] [adverbs_fast] [verbs_speed] [Defender], flipping the script completely!",
    "Despite being [decorator_exhausted?], [Attacker] [verbs_speed] [Defender] in a flash!",
    "[Attacker] deftly [verbs_speed] [Defender], exploiting their lack of balance [decorator_wobbling?]!",
    "A masterclass in footwork! [Attacker] [adverbs_fast] [verbs_speed] the much slower [Defender]!",
    "[decorator_championship?] Lightning strikes! [Attacker] [verbs_speed] [Defender] before they can even set up!",
    "[decorator_reversal?] Blistering pace! [Attacker] [verbs_speed] [Defender] [decorator_edge?]!",
    "With a rapid shuffle, [Attacker] [verbs_speed] the incoming barrage from [Defender]!",
    "[Attacker] uses the lateral movement perfectly and [verbs_speed] [Defender] [decorator_critical?]!"
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
    "TABLOID: [Rikishi] seen throwing punches outside an Osaka club.",
    "Police Called to Late-Night Dispute: Is [Rikishi] to Blame?",
    "SCANDAL: Bloodied [Rikishi] spotted fleeing a Ginza nightclub!",
    "The Dark Side of Sumo: [Rikishi] embroiled in violent street clash.",
    "Eyewitness Report: [Rikishi] 'out of control' during drunken tirade.",
    "Disgraceful! [Rikishi] caught on camera in alleyway brawl.",
    "LATE NIGHT DRAMA: [Rikishi] questioned by authorities after club incident.",
    "Punches Thrown! [Rikishi] in hot water over late-night scrap.",
    "Another scandal! [Rikishi] reportedly injured in street fight.",
    "Witnesses claim [Rikishi] instigated a brawl near the stables.",
    "Trouble outside the ring: [Rikishi] linked to violent late-night clash."
  ],
  SECRET_INJURY_LEAK: [
    "Is [Rikishi] hiding a knee injury? Insiders speak.",
    "Rumors of [Rikishi]'s training absence confirmed?",
    "Rumbling in the Heya: Is [Rikishi] Hiding a Devastating Knee Injury?",
    "Whispers in the Kokugikan: Has [Rikishi] lost the fighting spirit?",
    "Medical Leak: The truth about [Rikishi]'s physical condition.",
    "Sources: [Rikishi] relying on heavy painkillers to survive the basho.",
    "EXCLUSIVE X-RAYS LEAKED: Is [Rikishi]'s career effectively over?",
    "The Silent Agony: [Rikishi] reportedly struggling to even walk after bouts.",
    "Cover-up at the stable? Oyakata denies rumors of [Rikishi]'s severe tear.",
    "Doctors Warn [Rikishi] That Further Bouts Risk Permanent Paralysis.",
    "CONFIRMED: [Rikishi] dealing with undisclosed damage, insiders claim.",
    "Medical Staff 'deeply concerned' about [Rikishi]'s hidden injury.",
    "Is a secret fracture holding [Rikishi] back this tournament?",
    "The truth leaks out! [Rikishi] reportedly wrestling through agonizing pain.",
    "Stable tries to hide the truth about [Rikishi]'s deteriorating condition!"
  ],
  ILLEGAL_GAMBLING: [
    "SHOCKING: [Rikishi] linked to illegal betting ring!",
    "[Rikishi] faces investigation over 'dark' associations.",
    "EXPOSED: The secret gambling debts of [Rikishi] threatening their career!",
    "TABLOID: [Rikishi] seen with questionable associates in Osaka.",
    "JSA calls emergency meeting over [Rikishi]'s financial irregularities.",
    "Yakuza Ties Alleged! [Rikishi] suspected of massive underground gambling debt.",
    "Police Raid Uncovers Ledger Naming [Rikishi] in Illegal Baseball Betting.",
    "Sponsors Flee as [Rikishi] Faces Blackmail Over Gambling Debts.",
    "High-Stakes Poker Ring Busted: [Rikishi] named as frequent participant.",
    "The Fall of a Hero: How gambling addiction might end [Rikishi]'s run.",
    "Underground Casino Bust: Was [Rikishi] among the patrons?",
    "Debts pile up! [Rikishi] investigated for illegal gambling ties.",
    "A risky wager! [Rikishi] caught in illicit betting scandal.",
    "JSA furious as [Rikishi]'s illegal gambling habits are laid bare.",
    "Shadowy figures seen demanding payment from [Rikishi] at the stables."
  ],
  TRAINING_ABUSE_ALLEGATION: [
    "Crisis at the heya: [Rikishi] accused of harsh behavior.",
    "Stablemate speaks out against [Rikishi]'s training methods.",
    "SCANDAL: [Rikishi] allegedly goes too far during morning keiko!",
    "Questions Surround [Rikishi]'s aggressive approach to junior wrestlers.",
    "JSA Insiders report growing concerns regarding [Rikishi]'s brutal training sessions.",
    "Tears in the Dojo: Young recruit hospitalized after beating by [Rikishi].",
    "Whistleblower Exposes 'Torture' Keiko Sessions Led by [Rikishi].",
    "Is it Tradition or Abuse? The shocking allegations against [Rikishi].",
    "Oyakata Looks the Other Way as [Rikishi] terrorizes stablemates.",
    "Anonymous Complaint Filed Against [Rikishi] For Hazing Violations."
  ],
  COACH_DISPUTE: [
    "[Rikishi] and Coach at odds! Tensions boiling over.",
    "Public fallout: [Rikishi] seen arguing with Oyakata.",
    "Sports Daily: [Rikishi] missed morning keiko; rumors of internal rift.",
    "Veteran Oyakata publicly reprimands [Rikishi] for a lack of professionalism.",
    "Editorial: The decline of discipline? [Rikishi] clashes with stablemaster.",
    "Mutiny in the Stable: [Rikishi] demands transfer after explosive argument.",
    "Oyakata Threatens to Retire [Rikishi] Following Disrespectful Outburst.",
    "The Silent Treatment: [Rikishi] and Stablemaster Haven't Spoken in Weeks.",
    "Generational Divide: [Rikishi] openly defies Oyakata's traditional training orders.",
    "Locker Room Divided as [Rikishi] Challenges Stablemaster's Authority."
  ],

  TABLOID_SCANDAL: [
    "EXCLUSIVE: [Rikishi] Spotted in Roppongi at 3 AM Following Brutal Loss!",
    "Rumbling in the Heya: Is [Rikishi] Hiding a Devastating Knee Injury?",
    "TABLOID: [Rikishi] seen with questionable associates in Osaka.",
    "FLASH: Midnight brawl at the bar! Was [Rikishi] involved?",
    "SCANDAL: [Rikishi] allegedly skips keiko to meet a mysterious companion!",
    "Busted! [Rikishi] caught indulging in late-night fast food before weigh-ins.",
    "Whispers in the Kokugikan: Has [Rikishi] lost the fighting spirit?",
    "EXPOSED: The secret gambling debts of [Rikishi] threatening their career!",
    "SHOCK PHOTOS: [Rikishi] breaking curfew with an unknown celebrity!",
    "The Secret Double Life of [Rikishi] Finally Revealed!",
    "Is [Rikishi] faking their recent poor form to cover up a wild lifestyle?",
    "You Won't Believe What [Rikishi] Was Caught Doing Backstage!",
    "Rumors swirling that [Rikishi] is planning to quit sumo for pro wrestling."
  ],
  SPORTS_DAILY_SCANDAL: [
    "Questions Surround [Rikishi]'s Focus Ahead of the Upcoming Basho.",
    "[Rikishi] Draws Criticism from Deliberation Council Over Recent Conduct.",
    "Editorial: The decline of discipline? [Rikishi] in the spotlight for the wrong reasons.",
    "Sports Daily: [Rikishi] missed morning keiko; rumors of internal rift.",
    "JSA Insiders report growing concerns regarding [Rikishi]'s commitment.",
    "An analysis of [Rikishi]'s poor performance: Is off-dohyo drama to blame?",
    "Veteran Oyakata publicly reprimands [Rikishi] for a lack of professionalism.",
    "[Rikishi]'s sponsors express dismay as rumors of misbehavior circulate.",
    "Column: [Rikishi] Must Address Off-Ring Issues Before They Derail Their Career.",
    "Statistical Drop: Has the recent controversy permanently rattled [Rikishi]?",
    "Stablemaster Promises Thorough Internal Investigation into [Rikishi]'s Actions.",
    "Public Perception Plummets for [Rikishi] Following Weeks of Negative Headlines.",
    "Is the Pressure Too Much? [Rikishi] Shows Visible Strain in Interviews."
  ],
  JSA_OFFICIAL_RESPONSE: [
    "JSA Issues Formal Warning to [Rikishi] Regarding Code of Conduct.",
    "Official Notice: [Rikishi] Suspended for 3 Days Pending Investigation.",
    "JSA Statement: Compliance review initiated for [Rikishi]'s stable.",
    "Disciplinary Action: [Rikishi] fined for violation of JSA regulations.",
    "JSA Press Release: [Rikishi] mandated to undergo ethics retraining.",
    "The Japan Sumo Association formally reprimands [Rikishi] for conduct detrimental to the sport.",
    "Notice of Hearing: [Rikishi] summoned before the Compliance Committee.",
    "JSA announces strict probationary measures for [Rikishi] following recent events.",
    "Official Ruling: [Rikishi] faces potential demotion if behavior does not improve.",
    "JSA Chairman Expresses 'Deep Disappointment' over [Rikishi]'s Actions.",
    "The Association Confirms Ongoing Surveillance of [Rikishi]'s Off-Ring Activities.",
    "Strict Gag Order Imposed on [Rikishi]'s Stable Pending Board Review.",
    "JSA Demands Public Apology from [Rikishi] Following Disgraceful Incident."
  ]
};

export const INSTITUTIONAL_TEMPLATES: Record<string, string[]> = {
  event_scout_strict: [
    "Oyakata demands the recruit demonstrate absolute obedience and discipline from day one.",
    "The stablemaster observes in stoic silence, looking for strict adherence to basic forms.",
    "A rigorous test of physical endurance reveals the recruit's unyielding resolve.",
    "Oyakata emphasizes that only endless repetition and strict adherence will lead to greatness.",
    "The recruit is sternly reminded of the harsh realities and iron rules of disciplined stable life.",
    "With a cold stare, Oyakata outlines the exact expectations required to survive the grueling keiko.",
    "The evaluation is devoid of praise; Oyakata only points out flaws to test the recruit's humility.",
    "A terse, uncompromising interview leaves the prospect fully aware of the strict hierarchy ahead.",
    "Oyakata makes it clear that frivolity will not be tolerated under his roof.",
    "The contract is offered with a grim warning: fail to follow instructions, and you will be expelled."
  ],
  event_scout_indulgent: [
    "Oyakata warmly welcomes the recruit, promising a lenient environment to find their feet.",
    "The stablemaster focuses on the recruit's character, humor, and relaxed well-being.",
    "Oyakata patiently explains the path to a long, easy career in the sport, emphasizing rest.",
    "Seeing potential for steady growth, the stablemaster offers the recruit a comfortable haven to develop.",
    "The recruit is reassured by Oyakata's indulgent approach, promising frequent breaks and good food.",
    "With a jovial laugh, Oyakata dismisses minor technical flaws, praising the prospect's natural spirit.",
    "The stablemaster assures the recruit that the heya is like a family, and mistakes are easily forgiven.",
    "An unusually relaxed scouting session ends with Oyakata taking the prospect out for a lavish chanko dinner.",
    "Oyakata emphasizes that a happy rikishi is a strong rikishi, much to the prospect's relief.",
    "The recruit signs eagerly, drawn to the stablemaster's famously easygoing and permissive reputation."
  ],
  event_scout_traditionalist: [
    "Oyakata demands the recruit demonstrate pure fighting spirit.",
    "The stablemaster observes in stoic silence, looking for grit and traditional sumo fundamentals.",
    "A rigorous test of physical endurance reveals the recruit's unyielding resolve.",
    "Oyakata emphasizes that only endless repetition and yotsu-sumo will lead to greatness.",
    "The recruit is sternly reminded of the harsh realities of traditional stable life.",
    "The scouting session focuses entirely on the ancient customs and respect for the dohyo.",
    "Oyakata dismisses modern athletic metrics, insisting that true strength comes from the heart.",
    "The prospect is evaluated purely on their willingness to perform shiko until collapse.",
    "A lecture on the history of the sport dominates the interview, testing the recruit's reverence.",
    "Oyakata looks for a rikishi who embodies the stoic, uncomplaining samurai spirit of old."
  ],
  event_scout_scientist: [
    "Oyakata reviews the recruit's biometric data and physical testing metrics.",
    "A thorough analysis of the recruit's fast-twitch muscle fibers impresses the stablemaster.",
    "Oyakata discusses a structured nutritional and sport science regimen with the prospect.",
    "The scout values the recruit's anatomical leverage over their raw weight.",
    "Data-driven projections suggest this recruit has a high ceiling if proper technique is applied.",
    "The interview revolves around VO2 max, recovery rates, and optimal calorie intake.",
    "Oyakata uses slow-motion video analysis to critique the prospect's tachiai mechanics.",
    "A modern, clinical approach defines the scouting trip, leaving nothing to chance or 'gut feeling'.",
    "The stablemaster believes this recruit's unique biomechanics can be optimized for peak performance.",
    "Oyakata presents a spreadsheet outlining a three-year, data-backed development plan."
  ],
  event_scout_gambler: [
    "Oyakata makes a bold wager, taking a chance on the highly volatile prospect.",
    "Seeing a high-risk, high-reward potential, the stablemaster aggressively pursues the recruit.",
    "Oyakata trusts their gut feeling over conventional scouting reports, dreaming of glory.",
    "A massive gamble! Oyakata pushes all in to recruit this raw, unpolished talent.",
    "The stablemaster envisions a quick, explosive rise to the top, ignoring obvious red flags.",
    "Dismissing the injury history, Oyakata bets everything on the prospect's undeniable raw power.",
    "Oyakata loves the thrill of an unknown quantity, signing the unproven amateur on a whim.",
    "It's a boom-or-bust acquisition, but the stablemaster is addicted to the high-stakes potential.",
    "Against the advice of the elders, Oyakata rolls the dice on the controversial recruit.",
    "The stablemaster believes they've found a hidden gem that will shock the entire sumo world."
  ],
  event_scout_nurturer: [
    "Oyakata warmly welcomes the recruit, promising a supportive and family-like environment.",
    "The stablemaster focuses on the recruit's character and long-term well-being.",
    "Oyakata patiently explains the path to a long, healthy career in the grueling sport.",
    "Seeing potential for steady growth, the stablemaster offers the recruit a safe haven to develop.",
    "The recruit is reassured by Oyakata's compassionate approach and promises of mentorship.",
    "The scouting trip feels more like an adoption, with Oyakata focusing on the prospect's emotional needs.",
    "Oyakata promises the parents that their child will be cared for physically, mentally, and spiritually.",
    "The stablemaster emphasizes injury prevention and holistic development over immediate results.",
    "A gentle, encouraging evaluation leaves the prospect feeling valued and deeply understood.",
    "Oyakata pledges to guide the young rikishi through both the triumphs and inevitable heartbreaks."
  ],
  event_scout_tyrant: [
    "Oyakata ruthlessly berates the recruit during tryouts, testing their psychological breaking point.",
    "The stablemaster demands absolute obedience and immediate results, striking fear into the prospect.",
    "A brutal, uncompromising evaluation leaves the recruit exhausted but contracted.",
    "Oyakata makes it clear: failure to perform will not be tolerated in this stable.",
    "The recruit signs under immense pressure, terrified of the tyrant's notorious wrath.",
    "The interview is an interrogation, with Oyakata seeking to crush any signs of weakness or ego.",
    "Oyakata promises nothing but pain, suffering, and relentless demands.",
    "The prospect is verbally battered until they submit completely to the stablemaster's absolute authority.",
    "A terrifying aura surrounds Oyakata, who accepts the recruit only as a new tool to be broken and remade.",
    "The scouting session is a display of pure dominance; the recruit is merely the latest subject."
  ],
  event_scout_strategist: [
    "Oyakata cunningly evaluates how the recruit fits into the current sumo meta.",
    "A calculated assessment of the recruit's tactical adaptability impresses the stablemaster.",
    "Oyakata plans a highly specialized development track for the unique prospect.",
    "The stablemaster analyzes the recruit's potential to exploit weaknesses in modern opponents.",
    "A strategic acquisition! Oyakata believes this recruit is the missing piece for the stable.",
    "Oyakata sees the prospect not just as a wrestler, but as a specific counter-measure to a rival stable.",
    "The interview focuses heavily on fight IQ, situational awareness, and adaptability.",
    "A masterplan is already forming in Oyakata's mind; this recruit is the perfect chess piece.",
    "The stablemaster outlines a clever, unorthodox path to the top divisions for the new signing.",
    "Every strength and weakness is cataloged to maximize the prospect's tactical advantage."
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
