/**
 * cornerAdviceProjection.ts
 * =========================
 * Builds player-facing corner advice for the active basho in a UI-ready shape.
 * Lives in the presenter layer so UI components do not touch raw engine state.
 */

import { getRikishi } from "../../engine/queries";
import { getAdvice } from "../../engine/bout/CornerAdvice";
import type { WorldState } from "../../engine/types/world";
import type { Rikishi } from "../../engine/types/rikishi";

export interface CornerAdviceItem {
  id: string;
  title: string;
  detail: string;
  priority: "critical" | "high" | "medium" | "low";
  relatedEntityId?: string;
  suggestedAction?: string;
}

export interface CornerAdviceProjection {
  playerRikishi: Pick<Rikishi, "id" | "shikona" | "name">;
  opponent: Pick<Rikishi, "id" | "shikona" | "name">;
  advice: CornerAdviceItem[];
}

export function projectCornerAdvice(
  world: WorldState,
  playerRikishiIds: string[]
): CornerAdviceProjection | null {
  const basho = world.currentBasho;
  if (!basho || !basho.matches || world.cyclePhase !== "active_basho") return null;
  const day = basho.day ?? 1;

  const todayMatch = basho.matches.find((m) => {
    if ((m.day ?? 1) !== day || m.result) return false;
    const eastId = m.eastRikishiId;
    const westId = m.westRikishiId;
    return (
      (eastId && playerRikishiIds.includes(eastId)) || (westId && playerRikishiIds.includes(westId))
    );
  });
  if (!todayMatch) return null;

  const playerId =
    (todayMatch.eastRikishiId && playerRikishiIds.includes(todayMatch.eastRikishiId)
      ? todayMatch.eastRikishiId
      : todayMatch.westRikishiId) || undefined;
  if (!playerId) return null;

  const playerRikishi = getRikishi(world, playerId);
  const opponentId =
    playerId === todayMatch.eastRikishiId ? todayMatch.westRikishiId : todayMatch.eastRikishiId;
  if (!playerRikishi || !opponentId) return null;
  const opponent = getRikishi(world, opponentId);
  if (!opponent) return null;

  const stats = world.currentBasho?.standings?.get?.(playerId);
  const recs = getAdvice({
    playerRikishi,
    opponent,
    bashoDay: day,
    playerRecord: stats ? { wins: stats.wins ?? 0, losses: stats.losses ?? 0 } : undefined,
  });

  return {
    playerRikishi: {
      id: playerRikishi.id,
      shikona: playerRikishi.shikona,
      name: playerRikishi.name,
    },
    opponent: { id: opponent.id, shikona: opponent.shikona, name: opponent.name },
    advice: recs.map((r) => ({
      id: r.id,
      title: r.title,
      detail: r.detail,
      priority: r.priority,
      relatedEntityId: r.relatedEntityId,
      suggestedAction: r.suggestedAction,
    })),
  };
}
