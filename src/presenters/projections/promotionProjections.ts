/**
 * promotionProjections.ts
 *
 * Projections for ozeki and yokozuna promotion candidates.
 * Extracted from uiDigest.ts to eliminate monolithic structure.
 */

import type { WorldState } from "@/engine/types/world";
import type { OzekiKadobanState } from "@/engine/banzuke/ozekiLogic";
import { PromotionNarrative } from "@/engine/narrative/promotionBands";
import { getYokozunaRunProse, getKadobanProse } from "@/engine/narrative/NarrativeProse";
import type { YokozunaSupportBand } from "@/engine/narrative/NarrativeBands";
import { SeededRNG } from "@/engine/core/rng";
import { SEKIWAKE_33_WIN_THRESHOLD } from "@/constants/engine/banzuke";
import { OZEKI_RUN_MIN_WINS } from "@/constants/engine/generation";
import { isYokozunaStrongCase } from "@/engine/banzuke/promotionLogic";
import { getRikishiHistory } from "@/engine/history/historyIndex";
import {
  selectPromotionCandidates,
  selectYokozunaCandidates,
  selectKadobanRikishi,
} from "@/presenters/selectors";
import { projectRikishi } from "@/presenters/rikishi/index";
import type { UIRikishi } from "@/presenters/rikishi/index";

/** Defines the structure for ozeki run candidate. */
export interface OzekiRunCandidate {
  rikishi: UIRikishi;
  recentWins: number;
  threshold: number;
  progress: number;
  narrative: string;
}

/** Defines the structure for yokozuna candidate. */
export interface YokozunaCandidate {
  rikishi: UIRikishi;
  recentYushos: number;
  recentJunYushos: number;
  consecutiveYushos: number;
  isStrong: boolean;
  politicalPressure: number; // 1-100 from mediaHeat
  supportLevel: YokozunaSupportBand;
  narrative: string;
}

/**
 * Get ozeki run candidates.
 */
export function getOzekiRunCandidates(world: WorldState): OzekiRunCandidate[] {
  const candidates: OzekiRunCandidate[] = [];
  if (!world.historyIndex) return candidates;
  const playerHeyaId = world.playerHeyaId;

  const historyIndex = world.historyIndex;

  for (const r of selectPromotionCandidates(world)) {
    const history = getRikishiHistory(historyIndex, r.id);
    const len = history.length;

    let recentWins = 0;
    let recentCount = 0;
    for (let i = Math.max(0, len - 3); i < len; i++) {
      recentWins += history[i].wins ?? 0;
      recentCount++;
    }

    if (recentCount < 1) continue;

    if (world.currentBasho?.standings) {
      const stats = world.currentBasho.standings.get(r.id);
      if (stats) {
        recentWins += stats.wins;
      }
    }

    const rng = world.rng || new SeededRNG(world.seed || "ozeki_run");
    const threshold = SEKIWAKE_33_WIN_THRESHOLD;
    // Visibility filter (which candidates to list) — narrative state lives in
    // PromotionNarrative.getOzekiRunBand.
    if (recentWins >= OZEKI_RUN_MIN_WINS || r.heyaId === playerHeyaId) {
      candidates.push({
        rikishi: projectRikishi(r, world),
        recentWins,
        threshold,
        progress: Math.min(100, (recentWins / threshold) * 100),
        narrative: PromotionNarrative.getOzekiRunNarrative(rng, recentWins),
      });
    }
  }
  return candidates.sort((a, b) => b.recentWins - a.recentWins);
}

/**
 * Get yokozuna candidates.
 */
export function getYokozunaCandidates(world: WorldState): YokozunaCandidate[] {
  const candidates: YokozunaCandidate[] = [];
  if (!world.historyIndex) return candidates;

  const historyIndex = world.historyIndex;

  for (const r of selectYokozunaCandidates(world)) {
    const history = getRikishiHistory(historyIndex, r.id);
    let yushos = 0;
    let junYushos = 0;
    const len = history.length;
    for (let i = Math.max(0, len - 2); i < len; i++) {
      const h = history[i];
      if (h.yusho) yushos++;
      if (h.junYusho) junYushos++;
    }

    // Real consecutive yusho streak — walk history backwards from the latest
    // basho until a non-yusho result. (Previously this was the 2-basho count,
    // which overstated the streak on the 6-tournament trajectory track.)
    let consecutiveYushos = 0;
    for (let i = len - 1; i >= 0 && history[i].yusho; i--) consecutiveYushos++;

    const heat = world.mediaState?.mediaHeat?.[r.id] ?? 0;
    const runBand = PromotionNarrative.getYokozunaRunBand(yushos, junYushos, heat);
    const supportLevel = PromotionNarrative.getYokozunaSupportBand(heat);
    const isStrong = isYokozunaStrongCase(yushos, junYushos);

    if (yushos >= 1 || junYushos >= 1 || r.heyaId === world.playerHeyaId) {
      const rng = world.rng || new SeededRNG(world.seed || r.id);
      const narrative = getYokozunaRunProse(rng, runBand);

      candidates.push({
        rikishi: projectRikishi(r, world),
        recentYushos: yushos,
        recentJunYushos: junYushos,
        consecutiveYushos,
        isStrong,
        politicalPressure: heat,
        supportLevel,
        narrative,
      });
    }
  }
  return candidates;
}

/**
 * Get kadoban drama.
 */
export function getKadobanDrama(
  world: WorldState
): Array<{ rikishi: UIRikishi; narrative: string; isDemoted: boolean }> {
  const kadobanMap = world.ozekiKadoban ?? {};
  const entries: Array<{
    rikishi: UIRikishi;
    narrative: string;
    isDemoted: boolean;
  }> = [];

  for (const r of selectKadobanRikishi(world)) {
    const rid = r.id;
    const status = kadobanMap[rid] as OzekiKadobanState | undefined;
    if (!status) continue;
    if (!status.isKadoban && status.consecutiveMakeKoshi < 2) continue;

    let wins = 0;
    let losses = 0;
    if (world.currentBasho?.standings) {
      const stats = world.currentBasho.standings.get(rid);
      if (stats) {
        wins = stats.wins;
        losses = stats.losses;
      }
    }
    const runBand = PromotionNarrative.getKadobanDramaBand(status, wins, losses);
    const isDemoted = runBand === "demoted";

    const rng = world.rng || new SeededRNG(world.seed || rid);
    const narrative = getKadobanProse(rng, runBand);

    entries.push({ rikishi: projectRikishi(r, world), narrative, isDemoted });
  }
  return entries;
}
