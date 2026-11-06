/**
 * Injury Transformer
 * ==================
 * Transforms injury data and generates injury summary text.
 */

import type { Rikishi } from "@/engine/types/rikishi";
import { SeededRNG } from "@/engine/core/rng";
import { BardEngine } from "@/engine/bard/BardEngine";

/**
 * Calculate injury summary text for UI display.
 */
export function calculateInjurySummary(rng: SeededRNG, r: Rikishi): string {
  if (!r.injured || !r.injuryStatus) {
    return BardEngine.resolve(rng, "ui.digest.status.healthy").text;
  }

  const loc = r.injuryStatus.location ? ` ${r.injuryStatus.location}` : "";
  // severity is the string union "minor"|"moderate"|"serious"|"none" — the old
  // numeric branch was dead (typeof === "number" is never true) and rendered
  // every injury "Moderate". "serious" maps to the "severe" label.
  const severity = r.injuryStatus.severity;
  const sevKey = severity === "serious" ? "severe" : severity === "minor" ? "minor" : "moderate";

  const sevLabel = BardEngine.resolve(rng, `ui.labels.injury.severity.${sevKey}`).text;
  const weeks = r.injuryWeeksRemaining?.toString() ?? "?";

  return BardEngine.resolve(rng, "ui.labels.injury.summary_format", {
    SEV: sevLabel,
    LOC: loc,
    WEEKS: weeks,
  }).text;
}
