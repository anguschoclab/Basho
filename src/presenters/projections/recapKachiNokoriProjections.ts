/**
 * recapKachiNokoriProjections.ts — projects kachi-nokori (win margin) data for RecapPage.
 *
 * Uses KachiNokoriService.buildPostBashoPayload to compute win margins
 * for sekitori post-basho.
 */
import type { WorldState } from "../../engine/types/world";
import { getAllRikishi } from "../worldAccess";
import { buildPostBashoPayload } from "../../engine/systems/economy/KachiNokoriService";

export interface KachiNokoriDTO {
  rikishiId: string;
  shikona: string;
  heyaName: string;
  wins: number;
  kachiNokori: number;
}

export function selectKachiNokoriLeaders(
  world: WorldState,
  limit = 10
): KachiNokoriDTO[] {
  const allRikishi = getAllRikishi(world);
  const heyaMap = world.heyas;
  const results: KachiNokoriDTO[] = [];

  for (const r of allRikishi) {
    if (r.isRetired) continue;
    // Engine writes `currentBashoRecord` (rikishi.ts:262, boutResultApplier.ts:150,157),
    // not `bashoRecord`. Reading the wrong field silently returned an empty list.
    const bashoRecord = r.currentBashoRecord;
    if (!bashoRecord || bashoRecord.wins === undefined) continue;

    const payload = buildPostBashoPayload(r, bashoRecord.wins, bashoRecord.losses ?? 0);
    if (!payload) continue;

    results.push({
      rikishiId: r.id,
      shikona: r.shikona,
      heyaName: heyaMap.get(r.heyaId)?.name ?? "—",
      wins: bashoRecord.wins,
      kachiNokori: payload.kachiNokori,
    });
  }

  return results
    .sort((a, b) => b.kachiNokori - a.kachiNokori)
    .slice(0, limit);
}
