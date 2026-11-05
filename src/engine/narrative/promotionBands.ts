/**
 * promotionBands.ts
 *
 * Promotion narrative-state classification (Ozeki run, Yokozuna run, Kadoban
 * drama, council support). Single home for the "which story state is this"
 * decision — presenters consume these via NarrativeService delegators and
 * must not re-derive band keys inline.
 *
 * No hysteresis on promotion bands — the inputs (cumulative recentWins,
 * yusho counts, kadoban counters) are monotonic or discrete state, not
 * values that oscillate around a threshold.
 */

import {
  OZEKI_RUN_BANDS,
  YOKOZUNA_SUPPORT_BANDS,
} from "@/engine/narrative/NarrativeBands";
import type {
  OzekiRunBand,
  YokozunaRunBand,
  YokozunaSupportBand,
  KadobanBand,
} from "@/engine/narrative/NarrativeBands";
import { kachiKoshiThreshold } from "@/engine/banzuke/banzukeHelpers";
import type { SeededRNG } from "@/engine/core/rng";
import {
  getOzekiRunProse,
  getYokozunaRunProse,
  getKadobanProse,
} from "@/engine/narrative/NarrativeProse";

/** Kadoban campaign state — structurally compatible with OzekiKadobanState. */
export interface KadobanStatus {
  isKadoban: boolean;
  consecutiveMakeKoshi: number;
}

/**
 * Get the Ozeki-run narrative band for a candidate's recent win total.
 * "imminent" shares its bound with the real 33-win promotion rule.
 */
export function resolveOzekiRunBand(recentWins: number): OzekiRunBand {
  const entry =
    OZEKI_RUN_BANDS.find((b) => recentWins >= b.min && recentWins < b.max) ??
    OZEKI_RUN_BANDS[OZEKI_RUN_BANDS.length - 1];
  return entry.band;
}

/**
 * Get the council-support band for a Yokozuna candidate's media heat.
 */
export function resolveYokozunaSupportBand(mediaHeat: number): YokozunaSupportBand {
  const entry =
    YOKOZUNA_SUPPORT_BANDS.find((b) => mediaHeat >= b.min && mediaHeat < b.max) ??
    YOKOZUNA_SUPPORT_BANDS[YOKOZUNA_SUPPORT_BANDS.length - 1];
  return entry.band;
}

/**
 * Get the Yokozuna-run narrative band from recent yusho/jun-yusho counts
 * and council support (mediaHeat).
 */
export function resolveYokozunaRunBand(
  yushos: number,
  junYushos: number,
  mediaHeat: number
): YokozunaRunBand {
  if (yushos >= 2) {
    return resolveYokozunaSupportBand(mediaHeat) === "strong" ? "unanimous" : "borderline";
  }
  if (yushos === 1 && junYushos === 1) return "partial";
  if (yushos === 1) return "testing";
  return "standard";
}

/**
 * Get the Kadoban narrative band for an Ozeki's make-koshi campaign.
 * Precedence: demoted > cleared > danger > fighting — a rikishi at both
 * the win and loss threshold is already demoted.
 */
export function resolveKadobanDramaBand(
  status: KadobanStatus,
  wins: number,
  losses: number
): KadobanBand {
  const threshold = kachiKoshiThreshold("ozeki");
  if (status.isKadoban && losses >= threshold) return "demoted";
  if (status.isKadoban && wins >= threshold) return "cleared";
  if (status.consecutiveMakeKoshi === 1) return "danger";
  return "fighting";
}

/**
 * Public promotion-narrative surface. Kept separate from NarrativeService
 * (which is near its const-object size budget) — band resolution delegates
 * to the pure functions above; narrative wrappers combine band + prose.
 */
export const PromotionNarrative = {
  getOzekiRunBand(recentWins: number): OzekiRunBand {
    return resolveOzekiRunBand(recentWins);
  },

  getYokozunaSupportBand(mediaHeat: number): YokozunaSupportBand {
    return resolveYokozunaSupportBand(mediaHeat);
  },

  getYokozunaRunBand(
    yushos: number,
    junYushos: number,
    mediaHeat: number
  ): YokozunaRunBand {
    return resolveYokozunaRunBand(yushos, junYushos, mediaHeat);
  },

  getKadobanDramaBand(status: KadobanStatus, wins: number, losses: number): KadobanBand {
    return resolveKadobanDramaBand(status, wins, losses);
  },

  getOzekiRunNarrative(rng: SeededRNG, recentWins: number): string {
    return getOzekiRunProse(rng, this.getOzekiRunBand(recentWins));
  },

  getYokozunaRunNarrative(
    rng: SeededRNG,
    yushos: number,
    junYushos: number,
    mediaHeat: number
  ): string {
    return getYokozunaRunProse(rng, this.getYokozunaRunBand(yushos, junYushos, mediaHeat));
  },

  getKadobanNarrative(
    rng: SeededRNG,
    status: KadobanStatus,
    wins: number,
    losses: number
  ): string {
    return getKadobanProse(rng, this.getKadobanDramaBand(status, wins, losses));
  },
};
