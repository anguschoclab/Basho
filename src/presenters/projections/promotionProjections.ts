/**
 * promotionProjections.ts
 *
 * Projections for ozeki and yokozuna promotion candidates.
 * Extracted from uiDigest.ts to eliminate monolithic structure.
 */



import type { WorldState } from "../../engine/types/world";
import { BardEngine } from "../../engine/narrative/BardEngine";
import { SeededRNG } from "../../engine/rng";
import {
  selectPromotionCandidates,
  selectYokozunaCandidates,
  selectKadobanRikishi,
} from "../selectors";
import { projectRikishi } from "../rikishiUI";
import type { UIRikishi } from "../rikishiUI";

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
  supportLevel: "strong" | "adequate" | "insufficient";
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
    const history = historyIndex.rikishi[r.id] || [];
    const len = history.length;

    let recentWins = 0;
    let recentCount = 0;
    for (let i = Math.max(0, len - 3); i < len; i++) {
      recentWins += history[i].wins || 0;
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
    const threshold = 33;
    if (recentWins >= 20 || r.heyaId === playerHeyaId) {
      let runKey = "building";
      if (recentWins >= 33) runKey = "imminent";
      else if (recentWins >= 30) runKey = "brink";

      candidates.push({
        rikishi: projectRikishi(r, world),
        recentWins,
        threshold,
        progress: Math.min(100, (recentWins / threshold) * 100),
        narrative: BardEngine.resolve(rng, `ui.digest.promotion.ozeki_run.${runKey}`).text,
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
    const history = historyIndex.rikishi[r.id] || [];
    let yushos = 0;
    let junYushos = 0;
    const len = history.length;
    for (let i = Math.max(0, len - 2); i < len; i++) {
      const h = history[i];
      if (h.yusho) yushos++;
      if (h.junYusho) junYushos++;
    }

    const isStrong = yushos >= 2 || (yushos >= 1 && junYushos >= 1);

    const heat = world.mediaState?.mediaHeat?.[r.id] || 0;
    const supportLevel = heat >= 75 ? "strong" : heat >= 50 ? "adequate" : "insufficient";

    if (yushos >= 1 || junYushos >= 1 || r.heyaId === world.playerHeyaId) {
      const rng = world.rng || new SeededRNG(world.seed || r.id);
      let runKey = "standard";
      if (yushos >= 2) runKey = heat >= 75 ? "unanimous" : "borderline";
      else if (yushos === 1 && junYushos === 1) runKey = "partial";
      else if (yushos === 1) runKey = "testing";

      const narrative = BardEngine.resolve(rng, `ui.digest.promotion.yokozuna_run.${runKey}`).text;

      candidates.push({
        rikishi: projectRikishi(r, world),
        recentYushos: yushos,
        recentJunYushos: junYushos,
        consecutiveYushos: yushos,
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
    const status = (kadobanMap as Record<string, unknown>)[rid];
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
    const isDemoted = status.isKadoban && losses >= 8;

    const rng = world.rng || new SeededRNG(world.seed || rid);
    let runKey = "fighting";
    if (isDemoted) runKey = "demoted";
    else if (status.isKadoban && wins >= 8) runKey = "cleared";
    else if (status.consecutiveMakeKoshi === 1) runKey = "danger";

    const narrative = BardEngine.resolve(rng, `ui.digest.kadoban.${runKey}`).text;

    entries.push({ rikishi: projectRikishi(r, world), narrative, isDemoted });
  }
  return entries;
}
