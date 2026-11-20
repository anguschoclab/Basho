/**
 * Bout physics and combat constants.
 */

/** Maximum heat value for rivalries */
export const MAX_RIVALRY_HEAT = 100;

/** Maximum closeness value for rivalries */
export const MAX_RIVALRY_CLOSENESS = 100;

/** Maximum spite value for rivalries */
export const MAX_RIVALRY_SPITE = 100;

// ── Tactic profile constants ──────────────────────────────────────────────────

// Kimarite weight biases
export const KIMARITE_BIAS_BELT_YOTSU = 1.3;
export const KIMARITE_BIAS_PUSH_YOTSU = 0.8;
export const KIMARITE_BIAS_PUSH_OSHI = 1.3;
export const KIMARITE_BIAS_BELT_OSHI = 0.8;
export const KIMARITE_BIAS_TRICK_HENKA = 1.5;
export const KIMARITE_BIAS_TRICK_DEFENSIVE = 1.2;
export const KIMARITE_BIAS_SPEED_DEFENSIVE = 1.1;
export const KIMARITE_BIAS_PUSH_ALL_OUT = 1.4;
export const KIMARITE_BIAS_TRICK_NEKODAMASHI = 1.6;
export const KIMARITE_BIAS_SPEED_NEKODAMASHI = 1.2;

// Injury risk multipliers
export const INJURY_RISK_MULT_NORMAL = 1.0;
export const INJURY_RISK_MULT_OSHI_THRUST = 1.1;
export const INJURY_RISK_MULT_HENKA = 0.8;
export const INJURY_RISK_MULT_DEFENSIVE = 0.7;
export const INJURY_RISK_MULT_ALL_OUT = 1.5;

// Tachiai power modifiers
export const TACHIAI_POWER_MOD_YOTSU = 1;
export const TACHIAI_POWER_MOD_OSHI = 2;
export const TACHIAI_POWER_MOD_HENKA = -10;
export const TACHIAI_POWER_MOD_DEFENSIVE = -3;
export const TACHIAI_POWER_MOD_ALL_OUT = 3;

// Fatigue costs
export const FATIGUE_COST_YOTSU = 2;
export const FATIGUE_COST_OSHI = 3;
export const FATIGUE_COST_LIGHT = 1;
export const FATIGUE_COST_ALL_OUT = 8;

// Momentum penalties/rewards
export const MOMENTUM_WIN_YOTSU = 1;
export const MOMENTUM_LOSS_YOTSU = -1;
export const MOMENTUM_WIN_OSHI = 2;
export const MOMENTUM_LOSS_OSHI = -2;
export const MOMENTUM_WIN_HENKA = -3;
export const MOMENTUM_LOSS_HENKA = -2;
export const MOMENTUM_WIN_ALL_OUT = 4;
export const MOMENTUM_LOSS_ALL_OUT = -4;

// ── Kinjite (forbidden technique DQ) constants ────────────────────────────────

/** Minimum aggression/technique ratio for the brawler foul-risk bonus. */
export const KINJITE_MIN_RATIO_FOR_FOUL_RISK = 1.4;

/**
 * Baseline foul-suspicion probability for ANY bout — real kinjite are
 * mostly heat-of-the-moment acts (the topknot grab happens in a scramble),
 * not exclusively desperation fouls, so every rikishi carries a small risk.
 * Tuned near real-world rarity (~1 confirmed hansoku per 1–3 basho).
 */
export const KINJITE_SUSPICION_BASE = 0.002;

/** Extra suspicion per point of (aggression/technique − 1.0) once a brawler. */
export const KINJITE_RATIO_SCALE = 0.008;

/** Additional suspicion probability on senshuraku weekend (days 14-15). */
export const KINJITE_SENSHURAKU_BONUS = 0.002;

/** Additional suspicion probability when winner is 7-7 (must-win pressure). */
export const KINJITE_SEVEN_SEVEN_BONUS = 0.003;

/** Additional suspicion probability when winner is kadoban ozeki. */
export const KINJITE_KADOBAN_BONUS = 0.003;

/** Maximum suspicion probability cap. */
export const KINJITE_MAX_SUSPICION = 0.05;

/** Senshuraku weekend start day. */
export const KINJITE_SENSHURAKU_START_DAY = 14;

/** Kadoban ozeki day threshold. */
export const KINJITE_KADOBAN_DAY_THRESHOLD = 10;

/** Kadoban ozeki win threshold. */
export const KINJITE_KADOBAN_WIN_THRESHOLD = 8;

/** Ratio subtraction for aggression scaling. */
export const KINJITE_RATIO_SUBTRACTION = 1.0;

// ── Foul review (shimpan-panel kinjite adjudication) constants ────────────────

/** Minimum shimpan pool size required to convene a foul review panel. */
export const FOUL_REVIEW_MIN_SHIMPAN = 5;

/** Excitement bonus applied to confirmed-foul bouts (clamped to 100 overall). */
export const KINJITE_FOUL_EXCITEMENT_BONUS = 25;

/** Weighted foul-type distribution — topknot grabs dominate real kinjite. */
export const KINJITE_FOUL_WEIGHTS: ReadonlyArray<readonly [string, number]> = [
  ["topknot_grab", 0.5],
  ["closed_fist", 0.12],
  ["eye_poke", 0.08],
  ["throat_grab", 0.08],
  ["ear_strike", 0.06],
  ["low_blow", 0.06],
  ["finger_bend", 0.05],
  ["kick", 0.05],
];

/** Base probability a suspected foul is confirmed by the panel. */
export const FOUL_REVIEW_BASE_CONFIRM = 0.75;

// ── Hair-down incident (magé comes undone) constants ─────────────────────────

/**
 * Per-contested-bout chance that a rikishi's topknot comes undone mid-fight.
 * Only materializes when the afflicted rikishi is the loser AND finishes
 * downed — hair touching the clay counts as a body part down (the
 * "hair-down automatic loss" rule). Real incidence is ~1 per 2-3 basho.
 */
export const HAIR_DOWN_LOSS_CHANCE = 0.004;

/**
 * Kimarite where the loser exits upright/stepped-out — hair never reaches
 * the clay, so a loose topknot is a non-event (hair tied back up between bouts).
 */
export const HAIR_DOWN_UPRIGHT_KIMARITE = new Set([
  "fusensho",
  "hansoku",
  "yorikiri",
  "oshidashi",
  "okuridashi",
  "tsukidashi",
  "tsuridashi",
  "waridashi",
]);

// ── Missed-call review (proactive shimpan catches) constants ────────────────

/** Chance the panel reviews a hiwaza finish (hand/knee-down call). */
export const MISSED_CALL_HIWAZA_REVIEW_CHANCE = 0.04;

/** Chance the panel reviews a clean-but-close edge finish. */
export const MISSED_CALL_EDGE_REVIEW_CHANCE = 0.02;

/**
 * Reversal bias for missed-call verdicts — the panel convened because the
 * call looked wrong, so the reversal band widens beyond accuracy baselines.
 */
export const MISSED_CALL_REVERSAL_BONUS = 0.15;

/** Panel average accuracy at which the base confirm chance applies. */
export const FOUL_REVIEW_ACCURACY_CENTER = 60;

/** Confirm-chance adjustment per point of panel average accuracy. */
export const FOUL_REVIEW_ACCURACY_SCALE = 0.005;

/** Minimum possible confirm chance (very poor panel). */
export const FOUL_REVIEW_MIN_CONFIRM = 0.55;

/** Maximum possible confirm chance (elite panel). */
export const FOUL_REVIEW_MAX_CONFIRM = 0.95;

// ── Yaocho (match-fixing) constants ───────────────────────────────────────────

/** Base probability of yaocho detection per suspicious bout. */
export const YAOCHO_BASE_DETECTION_CHANCE = 0.01;

/** Additional chance per suspicious indicator. */
export const YAOCHO_PER_INDICATOR_CHANCE = 0.02;

/** Maximum detection chance cap. */
export const YAOCHO_MAX_CHANCE = 0.15;

/** Minimum repeated identical kimarite to flag as suspicious. */
export const YAOCHO_REPEAT_KIMARITE_THRESHOLD = 3;

/** Minimum h2h meetings to flag dominance pattern as suspicious. */
export const YAOCHO_H2H_DOMINANCE_MIN_MEETINGS = 4;

/** Win rate threshold for suspicious dominance. */
export const YAOCHO_H2H_DOMINANCE_WIN_RATE = 0.9;

/** Senshuraku weekend start day. */
export const YAOCHO_SENSHURAKU_START_DAY = 14;

/** Same-heya + 7-7 bonus chance. */
export const YAOCHO_SAME_HEYA_77_BONUS = 0.05;

/** Suspiciously short bout duration threshold (seconds). */
export const YAOCHO_SHORT_BOUT_THRESHOLD = 3;

/** Default bout duration if missing. */
export const YAOCHO_DEFAULT_DURATION = 10;

/** Severity indicator count thresholds. */
export const YAOCHO_SEVERITY_CRITICAL_INDICATORS = 4;
export const YAOCHO_SEVERITY_MAJOR_INDICATORS = 2;

// ── Bout phase loop constants ─────────────────────────────────────────────────

/** Momentum score accumulation factor per tick. */
export const MOMENTUM_SCORE_FACTOR = 0.01;

/** Momentum dominant threshold (absolute value to determine dominant side). */
export const MOMENTUM_DOMINANT_THRESHOLD = 0.5;

/** Tick intervals for fatigue snapshot logging. */
export const FATIGUE_LOG_TICK_1 = 10;
export const FATIGUE_LOG_TICK_2 = 20;

/** Instability floor for timeout stability comparison. */
export const INSTABILITY_FLOOR = 0.01;

/**
 * Rolling window for `Rikishi.history` (per-bout MatchResultLog entries).
 * ~500 bouts ≈ 33 basho ≈ 5.5 years — enough for streaks, recent H2H, and
 * favored-kimarite projections without unbounded save growth (the same
 * rationale as boundHistoryArrays' HISTORY_MAX_ENTRIES for world arrays).
 */
export const RIKISHI_BOUT_HISTORY_MAX = 500;

// ── Mizu-iri / Draw outcomes (azukari, itamiwake, hikiwake) ───────────────────

/** Tick at which the first mizu-iri water-break check runs during a clinch. */
export const MIZU_IRI_FIRST_TICK = 50;

/** Tick at which a second mizu-iri pause check runs if still deadlocked. */
export const MIZU_IRI_SECOND_TICK = 95;

/** Maximum mizu-iri pauses before timeout evaluates for hikiwake. */
export const MIZU_IRI_MAX_BREAKS = 2;

/** Max normalized net-torque delta for two locked rikishi to pause for mizu-iri. */
export const MIZU_IRI_TORQUE_BALANCE = 0.25;

/** Minimum ring margin (m) from tawara for a center-ring mizu-iri stalemate. */
export const MIZU_IRI_RING_MARGIN = 1.5;

/** Fatigue reduction fraction applied to both rikishi on a mizu-iri water break. */
export const MIZU_IRI_FATIGUE_RECOVERY = 0.35;

/** Maximum instability gap between wrestlers at timeout to declare hikiwake. */
export const HIKIWAKE_MAX_INSTABILITY_GAP = 0.12;

/** Probability of an itamiwake draw when an injured rikishi has a minor in-bout injury and mono-ii. */
export const ITAMIWAKE_MINOR_INJURY_CHANCE = 0.25;

/** Probability an inconclusive torinaoshi rematch with mono-ii is ruled azukari. */
export const AZUKARI_REMATCH_CHANCE = 0.18;

/** Display metadata for draw outcomes (kept outside KIMARITE_REGISTRY to preserve 82+5+2 pin). */
export const DRAW_OUTCOME_METADATA: Record<
  import("@/engine/types/combat").DrawOutcomeType,
  { name: string; nameJa: string; description: string }
> = {
  azukari: {
    name: "Azukari",
    nameJa: "預り",
    description:
      "Held in abeyance — shimpan judges rule the bout and rematch too close to award a winner.",
  },
  itamiwake: {
    name: "Itamiwake",
    nameJa: "痛み分け",
    description:
      "Pain draw — both sides unable to continue cleanly after an in-bout injury stops the bout.",
  },
  hikiwake: {
    name: "Hikiwake",
    nameJa: "引分",
    description:
      "Stalemate draw — declared when neither rikishi can force a decision even after mizu-iri breaks.",
  },
};
