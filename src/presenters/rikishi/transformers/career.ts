/**
 * Career Transformer
 * ==================
 * Transforms career statistics, streaks, and records.
 */

import type { Rikishi } from "../../../engine/types/rikishi";
import type { RikishiCareerDTO } from "../types";
import { RANK_HIERARCHY } from "@/engine/types/banzuke";

interface HistoryEntry {
  win?: boolean;
  rank?: string;
  rankNumber?: number;
  side?: string;
}

/**
 * Calculate streak from history.
 */
export function calculateStreak(history: HistoryEntry[]): { streak: number; label: string } {
  if (history.length === 0) return { streak: 0, label: "-" };
  const last = history[history.length - 1].win;
  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].win === last) streak++;
    else break;
  }
  return {
    streak: last ? streak : -streak,
    label: `${last ? "W" : "L"}${streak}`,
  };
}

/**
 * Calculate average rank from career history.
 */
export function calculateAvgRank(history: HistoryEntry[]): string {
  if (history.length === 0) return "-";
  let sum = 0;
  for (const h of history) {
    sum += rankScore(h.rank ?? "M", h.rankNumber, h.side);
  }
  const avg = sum / history.length;

  // Convert avg score back to a readable rank (Maegashira level is common)
  const tier = Math.floor(avg / 1000);
  const num = Math.floor((avg % 1000) / 2);
  const RANK_MAP: Record<number, string> = {
    1: "Y",
    2: "O",
    3: "S",
    4: "K",
    5: "M",
    6: "J",
    7: "Ms",
    8: "Sd",
    9: "Jd",
    10: "Jk",
  };
  const prefix = RANK_MAP[tier] || "?";
  return num > 0 ? `${prefix}${num}` : prefix;
}

/**
 * Convert rank to numeric score for averaging.
 */
export function rankScore(rank: string, rankNumber?: number, side?: string): number {
  const tier = RANK_HIERARCHY[rank as keyof typeof RANK_HIERARCHY]?.tier ?? 99;
  const num = rankNumber ?? 0;
  const sideVal = side === "east" ? 0 : 0.5;
  return tier * 1000 + num * 2 + sideVal;
}

/**
 * Transform career-related fields.
 */
export function toCareerDTO(r: Rikishi): RikishiCareerDTO {
  const history = r.history ?? [];
  const streakInfo = calculateStreak(history);
  const careerHistory = r.careerHistory ?? [];

  return {
    currentBashoWins: r.currentBashoWins ?? 0,
    currentBashoLosses: r.currentBashoLosses ?? 0,
    currentBashoRecord: `${r.currentBashoWins ?? 0}-${r.currentBashoLosses ?? 0}`,
    careerWins: r.careerWins,
    careerLosses: r.careerLosses,
    careerRecord: `${r.careerWins}-${r.careerLosses}`,
    careerYusho: r.careerRecord?.yusho ?? 0,
    streak: streakInfo.streak,
    streakLabel: streakInfo.label,
    winPercentage: r.careerWins / Math.max(1, r.careerWins + r.careerLosses),
    avgRankLabel: calculateAvgRank(careerHistory),
  };
}
