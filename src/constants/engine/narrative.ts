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

/** Chance to narrate rare technique call-outs (nodowa, hazuoshi, zotsu, kachiage, kaina hineri, crab walk) */
export const NARRATIVE_TECHNIQUE_CHANCE = 0.15;

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

/** W N — absorbed attack entries that qualify a pull win as "the Nth time's a charm". */
export const PULL_CHARM_MIN_ABSORB = 2;

/** W N — tachiai-won-but-lost count that makes "phase two" a reputation. */
export const PHASE_TWO_MIN = 3;

/** W N — tachiai-loss ratio at which an opponent reads as fragile late in bouts. */
export const PHASE_TWO_FRAGILITY_RATIO = 0.5;

/** W N — latest day on which a first-basho kachi-koshi counts as a fast debut clinch. */
export const DEBUT_KACHI_MAX_DAY = 10;

/** W O — prior winless H2H losses required before a first win is a "monkey off his back" breakthrough. */
export const H2H_HOODOO_MIN_LOSSES = 3;

/** W O — minimum career meetings before a recent-form H2H surge beat fires. */
export const H2H_RECENT_SURGE_MIN_TOTAL = 6;

/** W O — window of recent mutual bouts inspected for a recent H2H surge. */
export const H2H_RECENT_WINDOW = 6;

/** W O — minimum mutual history entries needed to evaluate a recent H2H surge. */
export const H2H_RECENT_MIN_SAMPLE = 5;

/** W O — minimum age for the historic oldest-makuuchi-kachi-koshi record beat & interview. */
export const OLDEST_KACHI_KOSHI_MIN_AGE = 38;

/** W O — earliest kachi-koshi day windows (fixing dead day<=7 check for 8-win sekitori). */
export const EARLIEST_KACHI_SEKITORI_MAX_DAY = 11;
export const EARLIEST_KACHI_LOWER_MAX_DAY = 5;

/** W O — trailing non-KK basho in careerHistory before kachi-koshi drought commentary fires (2 => first in 3+). */
export const KACHI_DROUGHT_MIN_BASHO = 2;

/** W O — consecutive losses (with >=1 basho win) for losing-skid / skid-snapped commentary. */
export const LOSING_SKID_MIN = 4;

/** W O — height (cm) for both combatants to qualify as a "Battle of the Giants". */
export const GIANT_HEIGHT_THRESHOLD = 190;

/** W O — maximum age for the "proven giant-killer with untapped potential" beat. */
export const PROVEN_GIANT_KILLER_MAX_AGE = 25;

// ─── W P — Day-12 Kyushu transcript beats ───────────────────────────────────

/** W P — push-family log exchanges per side that make a bout a "slapathon". */
export const SLAPATHON_MIN_EXCHANGES = 3;

/** W P — loser-side edge escapes (or yokozuna-grind duration) for a valiant-loser beat. */
export const VALIANT_MIN_ESCAPES = 2;
export const VALIANT_LONG_BOUT_SECONDS = 35;

/** W P — prior tachiai-won-but-lost count for the "followup delivered" beat. */
export const FOLLOWUP_MIN_LETDOWNS = 2;

/** W P — trailing strictly-alternating KK/MK bashos for the alternating-records beat. */
export const ALTERNATING_RECORDS_MIN = 3;

/** W P — bottom-of-division slots (from the floor rankNumber) on demotion watch. */
export const DEMOTION_WATCH_BOTTOM_SLOTS = 2;

/** W P — consecutive wins since a mid-basho re-entry that earn the streak variant. */
export const RETURN_STREAK_MIN = 3;

/** W P — week-2 turnaround: early losses through day 7, then wins after it. */
export const WEEK_ONE_END_DAY = 7;
export const WEEK_TWO_EARLY_LOSSES_MIN = 3;
export const WEEK_TWO_WINS_MIN = 4;

/** W P — cumulative failed edge conversions for the edge-letdown beat. */
export const EDGE_LETDOWN_MIN_FAILED = 3;

/** W P — post-bout win streak (including this win) for the win_streak interview. */
export const WIN_STREAK_INTERVIEW_MIN = 6;

/** W P — earliest day for the closing-days interview question. */
export const CLOSING_DAYS_MIN = 12;

// ─── W Q — Kyushu Japan-Times article beats ─────────────────────────────────

/** W Q — "best start in years": earliest day, lookback depth, min history. */
export const BEST_START_MIN_DAY = 9;
export const BEST_START_LOOKBACK_BASHO = 6;
export const BEST_START_MIN_HISTORY = 3;

/** W Q — "collapsed down the home stretch": trailing losses closing last basho. */
export const COLLAPSE_MIN_TRAILING_LOSSES = 4;
export const COLLAPSE_REBOUND_MIN_WINS = 5;

/** W Q — earliest day two unbeatens get the dream-showdown framing. */
export const DREAM_SHOWDOWN_MIN_DAY = 12;
