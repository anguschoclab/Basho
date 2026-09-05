/**
 * recapKihakuProjections.ts — projects top-5 kihaku performers for RecapPage.
 *
 * Reads rikishi.kihakuIsenScore (written by BanzukePublisher post-basho)
 * and returns the top 5 performers for display.
 */
import type { WorldState } from "../../engine/types/world";
import { getAllRikishi } from "../worldAccess";

export interface KihakuPerformerDTO {
  rikishiId: string;
  shikona: string;
  heyaId: string;
  heyaName: string;
  kihakuIsenScore: number;
  label: string;
}

function kihakuLabel(score: number): string {
  if (score >= 80) return "Blazing Spirit";
  if (score >= 65) return "Fierce Determination";
  if (score >= 50) return "Steady Resolve";
  if (score >= 35) return "Faltering Will";
  return "Broken Spirit";
}

export function selectTopKihakuPerformers(
  world: WorldState,
  limit = 5
): KihakuPerformerDTO[] {
  const allRikishi = getAllRikishi(world);
  const heyaMap = world.heyas;

  return allRikishi
    .filter((r): r is typeof r & { kihakuIsenScore: number } =>
      !r.isRetired && r.kihakuIsenScore !== undefined
    )
    .map((r) => ({
      rikishiId: r.id,
      shikona: r.shikona,
      heyaId: r.heyaId,
      heyaName: heyaMap.get(r.heyaId)?.name ?? "—",
      kihakuIsenScore: r.kihakuIsenScore,
      label: kihakuLabel(r.kihakuIsenScore),
    }))
    .sort((a, b) => b.kihakuIsenScore - a.kihakuIsenScore)
    .slice(0, limit);
}
