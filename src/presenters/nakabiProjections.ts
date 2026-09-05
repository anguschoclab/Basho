/**
 * nakabiProjections.ts — projects nakabi (day-8 checkpoint) summary for UI.
 *
 * Reads the nakabi_checkpoint event from the event log, which is emitted
 * by NakabiService.logNakabiCheckpoint on day 8 of each honbasho.
 */
import type { WorldState } from "../engine/types/world";
import type { NakabiSummary } from "../engine/systems/basho/NakabiService";

export interface NakabiProjection {
  summary: NakabiSummary | null;
  isNakabiDay: boolean;
}

export function projectNakabi(world: WorldState): NakabiProjection {
  const currentDay = world.currentBasho?.day ?? 0;
  const isNakabiDay = currentDay === 8;

  // Find the most recent nakabi_checkpoint event in the log
  const log = world.events?.log ?? [];
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i];
    if (e.type === "BASHO_STATUS" && e.data?.status === "nakabi_checkpoint") {
      const d = e.data;
      return {
        summary: {
          bashoName: String(d.bashoName ?? ""),
          year: Number(d.year ?? world.year ?? 0),
          day: 8,
          leaderId: String(d.leaderId ?? ""),
          leaderWins: Number(d.leaderWins ?? 0),
          leaderLosses: Number(d.leaderLosses ?? 0),
          undefeatedCount: Number(d.undefeatedCount ?? 0),
          notablePerformers: Array.isArray(d.notablePerformers)
            ? d.notablePerformers.map((p: Record<string, unknown>) => ({
                rikishiId: String(p.rikishiId ?? ""),
                shikona: String(p.shikona ?? ""),
                wins: Number(p.wins ?? 0),
                losses: Number(p.losses ?? 0),
                note: String(p.note ?? ""),
              }))
            : [],
        },
        isNakabiDay,
      };
    }
  }

  return { summary: null, isNakabiDay };
}
