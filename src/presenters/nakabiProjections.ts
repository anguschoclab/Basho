/**
 * nakabiProjections.ts — projects nakabi (day-8 checkpoint) summary for UI.
 *
 * Reads the nakabi_checkpoint event from the event log, which is emitted
 * by NakabiService.logNakabiCheckpoint on day 8 of each honbasho.
 */
import type { WorldState } from "@/engine/types/world";
import type { NakabiSummary } from "@/engine/systems/basho/NakabiService";
import type { AvatarRenderData } from "@/engine/types/avatar";
import { resolveAvatar, rikishiStageInput } from "@/engine/avatarGenerator";

export interface NakabiProjection {
  summary:
    | (NakabiSummary & { leaderShikona?: string; leaderAvatar?: AvatarRenderData })
    | null;
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
      const leader = world.rikishi.get(String(d.leaderId ?? ""));
      return {
        summary: {
          bashoName: String(d.bashoName ?? ""),
          year: Number(d.year ?? world.year ?? 0),
          day: 8,
          leaderId: String(d.leaderId ?? ""),
          leaderShikona: leader?.shikona ?? String(d.leaderShikona ?? ""),
          leaderAvatar: leader
            ? resolveAvatar({
                id: leader.id,
                stored: leader.avatarConfig,
                nationality: leader.nationality,
                ...rikishiStageInput(leader, world.year),
              })
            : undefined,
          leaderWins: Number(d.leaderWins ?? 0),
          leaderLosses: Number(d.leaderLosses ?? 0),
          undefeatedCount: Number(d.undefeatedCount ?? 0),
          notablePerformers: Array.isArray(d.notablePerformers)
            ? d.notablePerformers.map((p: Record<string, unknown>) => {
                const rikishiId = String(p.rikishiId ?? "");
                const r = world.rikishi.get(rikishiId);
                return {
                  rikishiId,
                  shikona: String(p.shikona ?? ""),
                  wins: Number(p.wins ?? 0),
                  losses: Number(p.losses ?? 0),
                  note: String(p.note ?? ""),
                  avatar: r
                    ? resolveAvatar({
                        id: r.id,
                        stored: r.avatarConfig,
                        nationality: r.nationality,
                        ...rikishiStageInput(r, world.year),
                      })
                    : undefined,
                };
              })
            : [],
        },
        isNakabiDay,
      };
    }
  }

  return { summary: null, isNakabiDay };
}
