/**
 * Narrative system constants.
 */

/** Stat change threshold for training milestone */
export const STAT_CHANGE_MILESTONE_THRESHOLD = 1.0;

/** Momentum shifts threshold for narrative bonus */
export const MOMENTUM_SHIFTS_NARRATIVE_THRESHOLD = 3;

/** Bout duration divisor for closeness calculation */
export const BOUT_DURATION_CLOSENESS_DIVISOR = 12;

/** Bout duration divisor for domination calculation */
export const BOUT_DURATION_DOMINATION_DIVISOR = 10;

/** Heat spike thresholds */
export const HEAT_SPIKE_THRESHOLDS = [25, 50, 75];

/** Closeness decay per week */
export const CLOSENESS_DECAY_RATE = 0.25;

/** Spite decay per week */
export const SPITE_DECAY_RATE = 0.35;

/** Top rivalry pairs to seed */
export const TOP_RIVALRY_PAIRS_TO_SEED = 12;

/** Nationality rivalry bonus */
export const NATIONALITY_RIVALRY_BONUS = 5;

/** Rivalry state divisor */
export const RIVALRY_STATE_DIVISOR = 100;

/** Same heya heat threshold for respect */
export const SAME_HEYA_RESPECT_HEAT_THRESHOLD = 50;

/** Same heya spite threshold for respect */
export const SAME_HEYA_RESPECT_SPITE_THRESHOLD = 40;

/** Bad blood spite threshold */
export const BAD_BLOOD_SPITE_THRESHOLD = 0.7;

/** Bad blood heat threshold */
export const BAD_BLOOD_HEAT_THRESHOLD = 0.65;

/** Grudge spite threshold */
export const GRUDGE_SPITE_THRESHOLD = 0.45;

/** Grudge heat threshold */
export const GRUDGE_HEAT_THRESHOLD = 0.4;

/** Respect closeness threshold */
export const RESPECT_CLOSENESS_THRESHOLD = 0.65;

/** Respect heat threshold */
export const RESPECT_HEAT_THRESHOLD = 0.5;

/** Unstable closeness threshold */
export const UNSTABLE_CLOSENESS_THRESHOLD = 0.45;

/** Unstable spite threshold */
export const UNSTABLE_SPITE_THRESHOLD = 0.35;

/** Unstable heat threshold */
export const UNSTABLE_HEAT_THRESHOLD = 0.55;

/** Public hype meetings threshold */
export const PUBLIC_HYPE_MEETINGS_THRESHOLD = 4;

/** Public hype heat threshold */
export const PUBLIC_HYPE_HEAT_THRESHOLD = 35;

/** Public hype spite threshold */
export const PUBLIC_HYPE_SPITE_THRESHOLD = 35;

/** Heat base growth */
export const HEAT_BASE_GROWTH = 6;

/** Heat repeat bonus max */
export const HEAT_REPEAT_BONUS_MAX = 10;

/** Heat repeat multiplier */
export const HEAT_REPEAT_MULTIPLIER = 0.8;

/** Heat close bonus multiplier */
export const HEAT_CLOSE_BONUS_MULTIPLIER = 10;

/** Heat upset bonus */
export const HEAT_UPSET_BONUS = 12;

/** Heat title bonus */
export const HEAT_TITLE_BONUS = 6;

/** Heat kinboshi bonus */
export const HEAT_KINBOSHI_BONUS = 10;

/** Heat final day bonus */
export const HEAT_FINAL_DAY_BONUS = 8;

/** Heat yusho race bonus */
export const HEAT_YUSHO_RACE_BONUS = 12;

/** Closeness gain multiplier */
export const CLOSENESS_GAIN_MULTIPLIER = 8;

/** Spite gain multiplier */
export const SPITE_GAIN_MULTIPLIER = 6;

/** Spite upset bonus */
export const SPITE_UPSET_BONUS = 4;

/** Trigger repeat base */
export const TRIGGER_REPEAT_BASE = 2;

/** Trigger repeat divisor */
export const TRIGGER_REPEAT_DIVISOR = 4;

/** Close finish threshold */
export const CLOSE_FINISH_THRESHOLD = 0.55;

/** Close finish trigger bonus */
export const CLOSE_FINISH_TRIGGER_BONUS = 4;

/** Upset trigger bonus */
export const UPSET_TRIGGER_BONUS = 6;

/** Kinboshi trigger bonus */
export const KINBOSHI_TRIGGER_BONUS = 8;

/** Title stakes trigger bonus */
export const TITLE_STAKES_TRIGGER_BONUS = 4;

/** Rank difference threshold for rivalry bonus */
export const RANK_DIFF_THRESHOLD = 4;

/** Rank difference score base */
export const RANK_DIFF_SCORE_BASE = 15;

/** Rank diff score multiplier */
export const RANK_DIFF_SCORE_MULTIPLIER = 2;

// ─────────────────────────────────────────
// Bout narrative probabilities
// ─────────────────────────────────────────

/** Chance to narrate stamina engagement in long bouts */
export const NARRATIVE_STAMINA_CHANCE = 0.4;

/** Chance to narrate grip depth changes */
export const NARRATIVE_DEPTH_CHANGE_CHANCE = 0.3;

/** Recovery probability threshold for low-recovery edge crisis narration */
export const NARRATIVE_LOW_RECOVERY_THRESHOLD = 0.2;

/** Toe position threshold for tawara drama narration */
export const NARRATIVE_TAWARA_TOE_THRESHOLD = 0.6;

/** Chance for gyoji confusion flavor in mono-ii */
export const NARRATIVE_GYOJI_CONFUSED_CHANCE = 0.4;

/** Chance for mono-ii call to be reversed */
export const NARRATIVE_CALL_REVERSED_CHANCE = 0.25;

/** Cumulative threshold for mono-ii rematch ordered */
export const NARRATIVE_REMATCH_CHANCE = 0.35;

/** Chance for stress-terse interview modifier */
export const NARRATIVE_STRESS_TERSE_CHANCE = 0.5;

/** Chance for media-savvy polished interview modifier */
export const NARRATIVE_MEDIA_SAVVY_CHANCE = 0.4;
