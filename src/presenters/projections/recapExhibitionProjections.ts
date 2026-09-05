/**
 * recapExhibitionProjections.ts — projects exhibition (jungyo) results for RecapPage.
 *
 * Reads exhibition basho events from the event log to surface
 * jungyo results that the player may have participated in.
 */
import type { WorldState } from "../../engine/types/world";

export interface ExhibitionResultDTO {
  exhibitionId: string;
  name: string;
  location: string;
  stipend: number;
  playerParticipated: boolean;
  results: Array<{
    rikishiId: string;
    shikona: string;
    wins: number;
    losses: number;
  }>;
}

export function selectExhibitionResults(
  world: WorldState,
  playerHeyaId?: string
): ExhibitionResultDTO[] {
  const log = world.events?.log ?? [];
  const results: ExhibitionResultDTO[] = [];

  for (const event of log) {
    if (event.type !== "BASHO_STATUS" && event.category !== "basho") continue;
    const data = event.data as unknown as Record<string, unknown>;
    if (data?.status !== "exhibition_complete" && data?.eventId !== "exhibition_complete") continue;

    const resultsArr = (data.results as Array<Record<string, unknown>>) ?? [];
    results.push({
      exhibitionId: (data.exhibitionId as string) ?? "unknown",
      name: (data.name as string) ?? "Exhibition Basho",
      location: (data.location as string) ?? "—",
      stipend: (data.stipend as number) ?? 0,
      playerParticipated: playerHeyaId
        ? resultsArr.some((r) => r.heyaId === playerHeyaId)
        : false,
      results: resultsArr.map((r) => ({
        rikishiId: (r.rikishiId as string) ?? "",
        shikona: (r.shikona as string) ?? "—",
        wins: (r.wins as number) ?? 0,
        losses: (r.losses as number) ?? 0,
      })),
    });
  }

  return results;
}
