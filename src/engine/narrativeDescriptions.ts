// src/engine/narrativeDescriptions.ts
// Narrative Descriptions — static bands + verbose prose helpers
//
// Used by:
// - src/engine/scouting.ts (short labels)
// - src/pages/RikishiPage.tsx (verbose prose)
//
// Constraints:
// - Pure functions only (no RNG)
// - Defensive against NaN/undefined

export type AttributeKey = "power" | "speed" | "balance" | "technique";
export type FacilityType = "training" | "recovery" | "nutrition";
export type CareerPhase = "youth" | "rising" | "prime" | "declining" | "twilight";
export type StyleKey = "oshi" | "yotsu" | "hybrid";
export type ArchetypeKey =
  | "oshi_specialist"
  | "yotsu_specialist"
  | "speedster"
  | "trickster"
  | "all_rounder"
  | "hybrid_oshi_yotsu"
  | "counter_specialist";

export type OyakataArchetypeKey =
  | "traditionalist"
  | "scientist"
  | "gambler"
  | "nurturer"
  | "tyrant"
  | "strategist";

// ---- small helpers ----
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const safe = (x: any, fallback: number) => (Number.isFinite(Number(x)) ? Number(x) : fallback);

// =======================
// Core stat bands (0–100)
// =======================

/** Attribute band label (0–100). */
export function describeAttribute(value: number): string {
  const v = clamp(safe(value, 0), 0, 100);
  if (v >= 90) return "Exceptional";
  if (v >= 75) return "Outstanding";
  if (v >= 60) return "Strong";
  if (v >= 45) return "Capable";
  if (v >= 30) return "Developing";
  if (v >= 15) return "Limited";
  return "Struggling";
}

/** Verbose attribute prose (0–100) keyed by attribute name. */
export function describeAttributeVerbose(attribute: AttributeKey | string, value: number): string {
  const level = describeAttribute(value);

  const descriptors: Record<AttributeKey, Record<string, string>> = {
    power: {
      Exceptional: "His raw strength is fearsome—opponents buckle on contact.",
      Outstanding: "A powerful frame that most cannot withstand.",
      Strong: "Solid strength, enough to move most men.",
      Capable: "Adequate power for his level.",
      Developing: "Still building the muscle needed at this rank.",
      Limited: "Lacks the power expected of a rikishi.",
      Struggling: "Physically overmatched in most contests."
    },
    speed: {
      Exceptional: "Lightning quick—his reactions are almost preternatural.",
      Outstanding: "Fast enough to catch opponents off-guard routinely.",
      Strong: "Quick on his feet, able to exploit openings.",
      Capable: "Moves well enough for his style.",
      Developing: "Could be quicker; timing still maturing.",
      Limited: "Sluggish compared to peers.",
      Struggling: "Slow to react, often caught out."
    },
    balance: {
      Exceptional: "His root is legendary—impossible to shift.",
      Outstanding: "Exceptionally stable; rarely loses footing.",
      Strong: "Well-grounded, recovers well from pressure.",
      Capable: "Adequate balance for competitive sumo.",
      Developing: "Sometimes caught leaning; balance needs work.",
      Limited: "Unsteady; vulnerable to throws.",
      Struggling: "Falls too easily—fundamentals lacking."
    },
    technique: {
      Exceptional: "A master technician—every move is precise.",
      Outstanding: "Highly skilled; knows exactly what to do.",
      Strong: "Good technical foundation.",
      Capable: "Sound basics, can execute his preferred moves.",
      Developing: "Technique improving but inconsistent.",
      Limited: "Relies on physicality over skill.",
      Struggling: "Lacks the craft to compete effectively."
    }
  };

  const key = attribute as AttributeKey;
  return descriptors[key]?.[level] ?? `${level} ${String(attribute)}`;
}

// =======================
// Aggression (0–100)
// =======================

export function describeAggression(value: number): string {
  const v = clamp(safe(value, 0), 0, 100);
  if (v >= 85) return "Relentless";
  if (v >= 70) return "Aggressive";
  if (v >= 55) return "Forward-moving";
  if (v >= 40) return "Patient";
  if (v >= 25) return "Defensive";
  return "Passive";
}

export function describeAggressionVerbose(value: number): string {
  const v = clamp(safe(value, 0), 0, 100);
  if (v >= 85) return "Fights with overwhelming forward pressure—never retreats.";
  if (v >= 70) return "Prefers to attack, constantly pushing the action.";
  if (v >= 55) return "A forward-moving style that seeks to control the pace.";
  if (v >= 40) return "Picks his moments carefully, waiting for openings.";
  if (v >= 25) return "Tends to absorb pressure before countering.";
  return "Overly cautious; rarely initiates.";
}

// =======================
// Experience (0–100)
// =======================

export function describeExperience(value: number): string {
  const v = Math.max(0, Math.floor(safe(value, 0)));
  if (v >= 80) return "Veteran";
  if (v >= 60) return "Experienced";
  if (v >= 40) return "Established";
  if (v >= 20) return "Developing";
  if (v >= 10) return "Green";
  return "Novice";
}

export function describeExperienceVerbose(value: number): string {
  const v = Math.max(0, Math.floor(safe(value, 0)));
  if (v >= 80) return "A seasoned veteran who has seen everything the dohyo offers.";
  if (v >= 60) return "Years of experience inform his every move.";
  if (v >= 40) return "Established at this level, comfortable in his routines.";
  if (v >= 20) return "Still learning, but no longer a newcomer.";
  if (v >= 10) return "Young and eager, with much still to learn.";
  return "A fresh face, everything still ahead.";
}

// =======================
// Stamina (0–100)
// =======================

export function describeStamina(value: number): string {
  const v = clamp(safe(value, 0), 0, 100);
  if (v >= 85) return "Tireless";
  if (v >= 70) return "Enduring";
  if (v >= 55) return "Resilient";
  if (v >= 40) return "Average";
  if (v >= 25) return "Flagging";
  return "Brittle";
}

export function describeStaminaVerbose(value: number): string {
  const v = clamp(safe(value, 0), 0, 100);
  if (v >= 85) return "Can go the distance no matter how long the bout.";
  if (v >= 70) return "Rarely tires; maintains intensity throughout.";
  if (v >= 55) return "Good conditioning; handles long bouts well.";
  if (v >= 40) return "Standard stamina for the rank.";
  if (v >= 25) return "Tends to fade in extended contests.";
  return "Runs out of gas quickly; prefers short bouts.";
}

// =======================
// Momentum
// =======================

/**
 * Momentum is used inconsistently across builds.
 * - If your engine stores 0–100, we map it to a rough -5..+5 scale.
 * - If it already stores -5..+5-ish, we use it directly.
 */
export function describeMomentum(value: number): string {
  const vRaw = safe(value, 0);
  const v = Math.abs(vRaw) > 10 ? (clamp(vRaw, 0, 100) - 50) / 10 : clamp(vRaw, -5, 5);

  if (v >= 3) return "On fire";
  if (v >= 1) return "Rising";
  if (v === 0) return "Steady";
  if (v >= -2) return "Struggling";
  return "In crisis";
}

export function describeMomentumVerbose(value: number): string {
  const vRaw = safe(value, 0);
  const v = Math.abs(vRaw) > 10 ? (clamp(vRaw, 0, 100) - 50) / 10 : clamp(vRaw, -5, 5);

  if (v >= 3) return "Riding a wave of confidence—everything is clicking.";
  if (v >= 1) return "Form is improving; belief is building.";
  if (v === 0) return "Neither hot nor cold; performing as expected.";
  if (v >= -2) return "Confidence wavers; searching for answers.";
  return "Deep in a slump; the pressure is visible.";
}

// =======================
// Career Phase
// =======================

export function describeCareerPhaseVerbose(phase: CareerPhase | string): string {
  const descriptions: Record<CareerPhase, string> = {
    youth: "Young and raw, with enormous potential still untapped.",
    rising: "Growing rapidly, improving with each tournament.",
    prime: "At the peak of his powers—this is his time.",
    declining: "Experience compensates for fading physicality.",
    twilight: "The end approaches, but pride drives him forward."
  };
  return descriptions[phase as CareerPhase] ?? "Career status uncertain.";
}

// =======================
// Record (wins/losses/absences)
// =======================

export function describeRecord(wins: number, losses: number): { record: string; assessment: string };
export function describeRecord(
  wins: number,
  losses: number,
  absences: number
): { record: string; assessment: string };
export function describeRecord(wins: number, losses: number, absences = 0): { record: string; assessment: string } {
  const w = Math.max(0, Math.floor(safe(wins, 0)));
  const l = Math.max(0, Math.floor(safe(losses, 0)));
  const a = Math.max(0, Math.floor(safe(absences, 0)));

  const record = a > 0 ? `${w}-${l}-${a}` : `${w}-${l}`;
  const total = w + l;
  if (total === 0) return { record, assessment: "No bouts yet" };

  const winRate = w / total;
  let assessment: string;

  if (winRate >= 0.8) assessment = "Dominant";
  else if (winRate >= 0.6) assessment = "Strong";
  else if (winRate >= 0.5) assessment = "Competitive";
  else if (winRate >= 0.4) assessment = "Struggling";
  else assessment = "In trouble";

  if (a > 0 && assessment !== "Dominant") assessment = `${assessment} (hampered by absence)`;

  return { record, assessment };
}

// =======================
// Injury
// =======================

export function describeInjuryVerbose(weeksRemaining: number): string {
  const w = Math.max(0, Math.floor(safe(weeksRemaining, 0)));
  if (w >= 8) return "Facing a long road to recovery.";
  if (w >= 4) return "Healing, but still weeks away.";
  if (w >= 2) return "Progressing well; return in sight.";
  return "Nearly recovered; could return soon.";
}

// =======================
// Fatigue (0–100)
// =======================

export function describeFatigue(value: number): string {
  const v = clamp(safe(value, 0), 0, 100);
  if (v <= 10) return "Fresh";
  if (v <= 30) return "Lightly worn";
  if (v <= 50) return "Tired";
  if (v <= 70) return "Exhausted";
  return "Spent";
}

export function describeFatigueVerbose(value: number): string {
  const v = clamp(safe(value, 0), 0, 100);
  if (v <= 10) return "Looks fresh, moving freely without reservation.";
  if (v <= 30) return "Minor signs of wear, but nothing concerning.";
  if (v <= 50) return "The tournament grind is showing; movements less crisp.";
  if (v <= 70) return "Visibly fatigued; conserving energy where possible.";
  return "Running on empty; every bout a struggle.";
}

// =======================
// Training effect (multiplier)
// =======================

export function describeTrainingEffect(multiplier: number): string {
  const m = clamp(safe(multiplier, 1), 0, 10);
  if (m >= 1.5) return "Dramatically increases";
  if (m >= 1.2) return "Significantly improves";
  if (m >= 1.05) return "Slightly enhances";
  if (m >= 0.95) return "Maintains";
  if (m >= 0.8) return "Slightly reduces";
  if (m >= 0.5) return "Significantly reduces";
  return "Dramatically reduces";
}

// =======================
// Reputation / Prestige (0–100)
// =======================

export function describeReputation(value: number): string {
  const v = clamp(safe(value, 0), 0, 100);
  if (v >= 90) return "Legendary";
  if (v >= 75) return "Prestigious";
  if (v >= 60) return "Respected";
  if (v >= 45) return "Established";
  if (v >= 30) return "Developing";
  if (v >= 15) return "Modest";
  return "Unknown";
}

export function describeReputationVerbose(value: number): string {
  const v = clamp(safe(value, 0), 0, 100);
  if (v >= 90) return "One of the great institutions of sumo.";
  if (v >= 75) return "A stable of considerable prestige and history.";
  if (v >= 60) return "Well-respected in sumo circles.";
  if (v >= 45) return "An established presence in the sumo world.";
  if (v >= 30) return "Building a name; the foundation is there.";
  if (v >= 15) return "A small stable, still seeking recognition.";
  return "Little known outside dedicated followers.";
}

// =======================
// Facility quality (0–100)
// =======================

export function describeFacilityQuality(value: number): string {
  const v = clamp(safe(value, 0), 0, 100);
  if (v >= 85) return "State-of-the-art";
  if (v >= 70) return "Excellent";
  if (v >= 55) return "Good";
  if (v >= 40) return "Adequate";
  if (v >= 25) return "Modest";
  return "Basic";
}

export function describeFacilityVerbose(type: FacilityType | string, value: number): string {
  const level = describeFacilityQuality(value);

  const descriptions: Record<FacilityType, Record<string, string>> = {
    training: {
      "State-of-the-art": "The finest training equipment and dohyo—wrestlers develop rapidly here.",
      Excellent: "Top-quality facilities that give wrestlers every advantage.",
      Good: "A solid training setup that serves the stable well.",
      Adequate: "Basic but functional equipment; it gets the job done.",
      Modest: "Simple facilities; wrestlers must work harder to improve.",
      Basic: "Minimal equipment; training effectiveness suffers."
    },
    recovery: {
      "State-of-the-art": "A medical-grade recovery center with every modern treatment.",
      Excellent: "Excellent recovery facilities that speed healing significantly.",
      Good: "Good recovery options that help wrestlers bounce back.",
      Adequate: "A standard recovery setup; nothing special.",
      Modest: "Limited recovery options; injuries linger longer.",
      Basic: "Minimal recovery support; wrestlers heal slowly."
    },
    nutrition: {
      "State-of-the-art": "An elite chanko and nutrition program; wrestlers thrive.",
      Excellent: "Excellent kitchen and nutritional support.",
      Good: "A good food program supporting wrestler health.",
      Adequate: "Standard stable cuisine; nutritionally sound.",
      Modest: "Basic fare; nutrition could be improved.",
      Basic: "Minimal kitchen facilities; nutrition is inconsistent."
    }
  };

  const key = type as FacilityType;
  return descriptions[key]?.[level] ?? `${level} ${String(type)} facilities`;
}

// =======================
// Archetype / Style prose
// =======================

export function describeArchetypeVerbose(archetype: ArchetypeKey | string): string {
  const descriptions: Record<ArchetypeKey, string> = {
    oshi_specialist: "A pure pusher-thruster who overwhelms with forward pressure.",
    yotsu_specialist: "A belt fighter who excels once grips are secured.",
    speedster: "Lightning quick, relying on timing and angles.",
    trickster: "A technician with a deep bag of tricks.",
    all_rounder: "Versatile and adaptable, comfortable in any situation.",
    hybrid_oshi_yotsu: "Comfortable both pushing and on the belt—shifts plans mid-bout.",
    counter_specialist: "Patient and reactive—turns an opponent’s attack into their undoing."
  };
  return descriptions[archetype as ArchetypeKey] ?? "A distinctive fighting style.";
}

export function describeStyleVerbose(style: StyleKey | string): string {
  const descriptions: Record<StyleKey, string> = {
    oshi: "Prefers pushing and thrusting, keeping opponents at arm’s length.",
    yotsu: "Seeks the belt, using grips to control and throw.",
    hybrid: "Comfortable both pushing and on the belt; adapts to each opponent."
  };
  return descriptions[style as StyleKey] ?? "Distinctive approach to sumo.";
}

export function describeOyakataPersonality(archetype: OyakataArchetypeKey | string): string {
  const descriptions: Record<OyakataArchetypeKey, string> = {
    traditionalist: "Values discipline and kihon above all else. Training is grueling but builds strong character.",
    scientist: "Analyses data and biomechanics to optimize performance. Open to new methods.",
    gambler: "Takes risks in training and recruitment. Seeks high-reward talent regardless of quirks.",
    nurturer: "Prioritizes wrestler health and longevity. Builds a supportive, family-like atmosphere.",
    tyrant: "Rules with an iron fist. Demands absolute obedience and effort, often at a cost.",
    strategist: "Focuses on match tactics and analyzing opponents. Masters of the mental game."
  };
  return descriptions[archetype as OyakataArchetypeKey] ?? "A leader with their own unique philosophy.";
}
