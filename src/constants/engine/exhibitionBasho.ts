/**
 * Exhibition Basho (Jungyo) Constants
 * ====================================
 * Constants governing exhibition basho events.
 */

/** Injury risk multiplier for exhibition basho (reduced from 1.0) */
export const EXHIBITION_INJURY_RISK_MULTIPLIER = 0.5;

/** Stipend multiplier for exhibition basho (partial, vs full honbasho stipend) */
export const EXHIBITION_STIPEND_MULTIPLIER = 0.3;

/** Rivalry seed chance during exhibition basho */
export const EXHIBITION_RIVALRY_SEED_CHANCE = 0.15;

/** Base stipend amount before multiplier */
export const EXHIBITION_BASE_STIPEND = 50000;

/** Base injury chance before multiplier */
export const EXHIBITION_INJURY_BASE_CHANCE = 0.02;

/** Fatigue penalty added on minor injury */
export const EXHIBITION_INJURY_FATIGUE_PENALTY = 2;

/**
 * WS-14 — jungyo travel-load coupling. Every tour participant accrues
 * fatigue proportional to real tour length; the August summer gauntlet
 * carries the heaviest load (~21 for a 28-day tour), a 4-day winter hop
 * ~3. Feeds the existing fatigue → weekly-injury-chance coupling in
 * InjuryService — the heat, travel, and back-to-back appearances are
 * what make summer jungyo dangerous.
 */
export const JUNGYO_FATIGUE_PER_TOUR_DAY = 0.5;
export const JUNGYO_SEASON_FATIGUE_MULT: Record<
  "winter" | "spring" | "summer" | "autumn",
  number
> = {
  winter: 0.75,
  spring: 1.0,
  summer: 1.5,
  autumn: 1.0,
};

/**
 * WS-14 — consecutive jungyō tours an eligible yokozuna may skip before the
 * Yokozuna Deliberation Council issues a formal warning (the real YDC
 * duty-attendance channel: a yokozuna is expected to appear on tour unless
 * genuinely hurt — repeated skips while kyūjō draw kankoku-level pressure).
 * At the threshold the rikishi gains a `councilWarnings` increment.
 */
export const JUNGYO_YDC_ABSENCE_THRESHOLD = 2;
