/**
 * Kore-yori-sanyaku (これより三役) — "From here, the three ranks"
 *
 * Traditional announcement made before the final three bouts of a basho day
 * (the sanyaku bouts). This is a ceremonial call that signals the highest-
 * ranked bouts are about to begin.
 */

/** The announcement text displayed before the final three bouts */
export const KORE_YORI_SANYAKU_ANNOUNCEMENT =
  "これより三役 — From here, the three ranks. The highest-ranked bouts of the day begin.";

/** Short form for UI display */
export const KORE_YORI_SANYAKU_SHORT = "Kore-yori-sanyaku";

/** Number of final bouts that constitute the sanyaku bouts */
export const SANYAKU_BOUT_COUNT = 3;

/**
 * Check if a bout is one of the final sanyaku bouts.
 * @param boutIndex - 0-based index of the bout in the day's schedule
 * @param totalBouts - total number of bouts in the day
 */
export function isSanyakuBout(boutIndex: number, totalBouts: number): boolean {
  return boutIndex >= totalBouts - SANYAKU_BOUT_COUNT;
}

/**
 * Get the announcement text for the kore-yori-sanyaku call.
 */
export function getKoreYoriSanyakuText(): string {
  return KORE_YORI_SANYAKU_ANNOUNCEMENT;
}
