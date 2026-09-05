/**
 * Kihaku Transformer
 * ==================
 * Surfaces the kihaku isen (fighting spirit) score for UI display.
 * The score is computed by KihakuService from bout metrics and written
 * to rikishi.kihakuIsenScore by BanzukePublisher at banzuke time.
 *
 * The bout-metric breakdown (comebackWins, edgeCrisisSurvived, etc.) lives
 * on BashoState.boutMetrics[rikishiId], not on the rikishi, so it is not
 * exposed here. Use KihakuService.extractFromBasho for full breakdown.
 */
import type { Rikishi } from "../../../engine/types/rikishi";

export interface RikishiKihakuDTO {
  /** 0-100 fighting spirit score (50 = neutral default) */
  kihakuIsenScore: number;
  /** Human-readable tier label */
  label: string;
}

function kihakuLabel(score: number): string {
  if (score >= 80) return "Blazing Spirit";
  if (score >= 65) return "Fierce Determination";
  if (score >= 50) return "Steady Resolve";
  if (score >= 35) return "Faltering Will";
  return "Broken Spirit";
}

export function toKihakuDTO(r: Rikishi): RikishiKihakuDTO {
  const score = r.kihakuIsenScore ?? 50;
  return {
    kihakuIsenScore: score,
    label: kihakuLabel(score),
  };
}
