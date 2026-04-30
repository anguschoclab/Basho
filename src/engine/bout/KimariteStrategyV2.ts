/**
 * src/engine/bout/KimariteStrategyV2.ts
 * =======================================
 * V2 weight overrides — recalibrated against real professional sumo kimarite
 * distribution data. Weights reflect relative selection priority within each
 * phase bucket (push_battle, belt_battle, edge_crisis), NOT overall frequency.
 *
 * Real-world targets (10,000-bout simulation):
 *   Yorikiri   ~32.4%  →  27–38%   (keep 90 — dominant belt walk-out finish)
 *   Oshidashi  ~20.9%  →  17–28%   (keep 85 — dominant push-out finish)
 *   Hatakikomi  ~8.1%  →   5–12%   (raise 80→88 — slap-down is very high within its condition)
 *   Tsukidashi  ~5.7%  →   3–9%    (raise 60→72 — closer to oshidashi within thrust sub-family)
 *   Yoritaoshi  ~4.7%  →   2–8%    (raise 72→75 — belt throw-down, slightly above throws)
 *   Uwatenage   ~3.0%  →   1–6%    (lower 85→60 — was over-weighted vs real frequency)
 *   Shitatenage ~2.0%  →   1–5%    (lower 70→50 — less common than uwatenage)
 *
 * Note: KIMARITE_STRATEGIES (V1) is left unchanged to preserve the legacy
 * evaluator (deleted in Phase 8). V1 is kept for reference only.
 */

import type { KimariteStrategy } from "../types/kimariteStrategy";
import { KIMARITE_STRATEGIES } from "./KimariteStrategyData";

const V2_WEIGHT_OVERRIDES: Partial<Record<string, number>> = {
  hatakikomi: 88,
  tsukidashi: 72,
  yoritaoshi: 75,
  uwatenage: 60,
  shitatenage: 50,
};

export const KIMARITE_STRATEGIES_V2: KimariteStrategy[] = KIMARITE_STRATEGIES.map((s) => {
  const overrideWeight = V2_WEIGHT_OVERRIDES[s.id];
  return overrideWeight !== undefined ? { ...s, weight: overrideWeight } : s;
});
