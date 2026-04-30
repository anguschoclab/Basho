/**
 * Injury Transformer
 * ==================
 * Transforms injury data and generates injury summary text.
 */

import type { Rikishi } from "../../../engine/types/rikishi";
import { SeededRNG } from "../../../engine/rng";
import { BardEngine } from "../../../engine/narrative/BardEngine";

/**
 * Calculate injury summary text for UI display.
 */
export function calculateInjurySummary(rng: SeededRNG, r: Rikishi): string {
  if (!r.injured || !r.injuryStatus) {
    return BardEngine.resolve(rng, "ui.digest.status.healthy").text;
  }

  const loc = r.injuryStatus.location ? ` ${r.injuryStatus.location}` : "";
  const severityValue = typeof r.injuryStatus.severity === "number" ? r.injuryStatus.severity : 50;

  let sevKey = "moderate";
  if (severityValue < 30) sevKey = "minor";
  if (severityValue >= 70) sevKey = "severe";

  const sevLabel = BardEngine.resolve(rng, `ui.labels.injury.severity.${sevKey}`).text;
  const weeks = r.injuryWeeksRemaining?.toString() ?? "?";

  return BardEngine.resolve(rng, "ui.labels.injury.summary_format", {
    SEV: sevLabel,
    LOC: loc,
    WEEKS: weeks,
  }).text;
}
