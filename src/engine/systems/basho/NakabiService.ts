/**
 * Nakabi (Mid-Basho Checkpoint) — Day 8 Event
 *
 * At the halfway point of a 15-day basho, a nakabi checkpoint event
 * is generated. This logs a summary of the current standings,
 * highlights leaders, and notes any notable performances.
 */

import type { WorldState } from "../../types/world";
import type { Rikishi } from "../../types/rikishi";
import type { StateImpact } from "../../core/StateImpact";
import { createImpactBuilder } from "../../core/ImpactBuilder";

/** The basho day on which nakabi occurs (day 8 of 15) */
export const NAKABI_DAY = 8;

/** Nakabi checkpoint summary data */
export interface NakabiSummary {
  bashoName: string;
  year: number;
  day: number;
  leaderId: string | null;
  leaderWins: number;
  leaderLosses: number;
  undefeatedCount: number;
  notablePerformers: Array<{
    rikishiId: string;
    shikona: string;
    wins: number;
    losses: number;
    note: string;
  }>;
}

/**
 * Generate a nakabi checkpoint summary from the current basho state.
 */
export function generateNakabiSummary(
  world: WorldState,
  bashoName: string,
  rikishiList: Rikishi[]
): NakabiSummary {
  // Get current basho records (single-pass filter+map)
  const records: { rikishiId: string; shikona: string; wins: number; losses: number; rankNumber: number }[] = [];
  for (const r of rikishiList) {
    if (r.isRetired) continue;
    records.push({
      rikishiId: r.id,
      shikona: r.shikona ?? r.name ?? r.id,
      wins: r.currentBashoWins ?? 0,
      losses: r.currentBashoLosses ?? 0,
      rankNumber: r.rankNumber ?? 99,
    });
  }

  // Find the leader (most wins, tiebreak by rank)
  const sorted = [...records].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.rankNumber - b.rankNumber;
  });

  const leader = sorted[0] ?? null;

  let undefeatedCount = 0;
  for (const r of records) {
    if (r.losses === 0 && r.wins > 0) {
      undefeatedCount++;
    }
  }

  // Notable performers: undefeated, or rank-and-file performing above expectation
  const notablePerformers: NakabiSummary["notablePerformers"] = [];
  for (const r of records) {
    if (r.wins === NAKABI_DAY && r.losses === 0) {
      notablePerformers.push({
        rikishiId: r.rikishiId,
        shikona: r.shikona,
        wins: r.wins,
        losses: r.losses,
        note: "Undefeated at nakabi",
      });
    } else if (r.rankNumber > 10 && r.wins >= 6 && r.losses <= 2) {
      notablePerformers.push({
        rikishiId: r.rikishiId,
        shikona: r.shikona,
        wins: r.wins,
        losses: r.losses,
        note: "Maegashira surprise contender",
      });
    }
  }

  return {
    bashoName,
    year: world.year,
    day: NAKABI_DAY,
    leaderId: leader?.rikishiId ?? null,
    leaderWins: leader?.wins ?? 0,
    leaderLosses: leader?.losses ?? 0,
    undefeatedCount,
    notablePerformers: notablePerformers.slice(0, 5),
  };
}

/**
 * Log the nakabi checkpoint event to the world event log.
 */
export function logNakabiCheckpoint(
  _world: WorldState,
  summary: NakabiSummary
): StateImpact {
  const builder = createImpactBuilder("logNakabiCheckpoint");

  const leaderName = summary.notablePerformers.find(
    (p) => p.rikishiId === summary.leaderId
  )?.shikona ?? "Unknown";

  builder.logEvent(
    "BASHO_STATUS",
    "basho",
    {
      status: "nakabi_checkpoint",
      description: `Nakabi (Day ${summary.day}) checkpoint: ${leaderName} leads at ${summary.leaderWins}-${summary.leaderLosses}. ${summary.undefeatedCount} undefeated.`,
      bashoName: summary.bashoName,
      year: summary.year,
      day: summary.day,
      leaderId: summary.leaderId,
      leaderWins: summary.leaderWins,
      leaderLosses: summary.leaderLosses,
      undefeatedCount: summary.undefeatedCount,
      notablePerformers: summary.notablePerformers,
    },
    { importance: "notable" }
  );

  return builder.build();
}

/**
 * Check if the current basho day is the nakabi checkpoint.
 */
export function isNakabiDay(currentDay: number): boolean {
  return currentDay === NAKABI_DAY;
}
