/**
 * succession.ts — WS5 institutional constants (canon §16).
 */

/** Non-age NPC succession triggers. */
export const SUCCESSION_INSOLVENCY_EVENTS = 3;
export const SUCCESSION_MAJOR_SCANDALS = 2;
/** ~4 years of zero sekitori-kk before the board removes the master for
 *  results alone — real JSA tolerance for weak stables is measured in years,
 *  and a shorter leash chained trustee-churn: the heya-level streak counter
 *  persisted across masters, so every yearly check forced another succession
 *  until the stable slid to "struggling" and folded. */
export const SUCCESSION_UNDERPERFORMANCE_BASHO = 24;
/** A prestige-collapsed stable only counts as "dying" when its roster is also
 *  too thin to sustain keiko — a functioning roster always attracts a caretaker
 *  elder in real JSA practice (folds happen at ~8–15 rikishi, not 25). */
export const SUCCESSION_COLLAPSE_MAX_ROSTER = 15;

/** A heya underperforms a basho when no sekitori entrant reaches kachi-koshi. */
export const SEKITORI_KACHI_KOSHI_WINS = 8;
/** Minimum bout volume before a bad record counts (tiny samples are noise). */
export const UNDERPERFORMANCE_MIN_BOUTS = 5;

/** Closure-on-failed-succession gates — the JSA lets an already-dying stable
 *  fold when the master departs with no heir (Miyagino precedent: scandal,
 *  prestige collapse, or a roster too thin to sustain keiko), rather than
 *  keeping it alive under an appointed trustee. */
export const SUCCESSION_CLOSURE_MAX_ROSTER = 8;
/** Sanction must persist this many weeks to count as terminal — a transient
 *  sanction week at the master's 65th birthday does not close a stable. */
export const SUCCESSION_CLOSURE_SANCTION_WEEKS = 26;

/** The predecessor's plan-family bias persists this many basho. */
export const LEGACY_MODIFIER_DURATION_BASHO = 3;
/** Bounded plan-score bonuses — tilt borderline choices, never rescue a 0. */
export const LEGACY_PLAN_BONUS = 6;
export const FACTION_PLAN_ALIGNMENT_BONUS = 6;
export const GRUDGE_PLAN_BONUS = 4;

/** Political-capital bump for elected JSA board members (was hardcoded +20 — reduced to blunt the self-reinforcing incumbency lock). */
export const ELECTION_INCUMBENCY_BONUS = 8;
// Board seat count lives in constants/engine/committee.ts (BOARD_COMMITTEE.size).
