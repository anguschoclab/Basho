/**
 * recapKihakuProjections.ts — projects top-5 kihaku performers for RecapPage.
 *
 * Reads rikishi.kihakuIsenScore (written by BanzukePublisher post-basho)
 * and returns the top 5 performers for display.
 */
import type { WorldState } from "@/engine/types/world";
import type { AvatarRenderData } from "@/engine/types/avatar";
import { resolveAvatar, rikishiStageInput } from "@/engine/generation/avatarGenerator";
import { getAllRikishi } from "@/presenters/worldAccess";
import { kihakuLabel } from "@/presenters/rikishi/transformers/kihaku";

export interface KihakuPerformerDTO {
  rikishiId: string;
  shikona: string;
  heyaId: string;
  heyaName: string;
  kihakuIsenScore: number;
  avatar?: AvatarRenderData;
  label: string;
}

/**
 * Selects the top kihaku performers for the basho recap.
 */
export function selectTopKihakuPerformers(world: WorldState, limit = 5): KihakuPerformerDTO[] {
  const allRikishi = getAllRikishi(world);
  const heyaMap = world.heyas;

  return allRikishi
    .filter(
      (r): r is typeof r & { kihakuIsenScore: number } =>
        !r.isRetired && r.kihakuIsenScore !== undefined
    )
    .map((r) => ({
      rikishiId: r.id,
      shikona: r.shikona,
      heyaId: r.heyaId,
      heyaName: heyaMap.get(r.heyaId)?.name ?? "—",
      kihakuIsenScore: r.kihakuIsenScore,
      avatar: resolveAvatar({
        id: r.id,
        stored: r.avatarConfig,
        nationality: r.nationality,
        ...rikishiStageInput(r, world.year),
      }),
      label: kihakuLabel(r.kihakuIsenScore),
    }))
    .sort((a, b) => b.kihakuIsenScore - a.kihakuIsenScore)
    .slice(0, limit);
}
