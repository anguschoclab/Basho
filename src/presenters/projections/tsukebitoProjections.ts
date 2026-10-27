/**
 * tsukebitoProjections.ts — projects tsukebito assignments for UI.
 */
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { AvatarRenderData } from "@/engine/types/avatar";
import { resolveAvatar, rikishiStageInput } from "@/engine/generation/avatarGenerator";
import {
  isEligibleForTsukebito,
  isJuniorTsukebitoEligible,
  MAX_TSUKEBITO_PER_SENIOR,
} from "@/engine/training/TsukebitoService";

export interface TsukebitoAssignmentDTO {
  seniorId: string;
  seniorShikona: string;
  seniorRankLabel: string;
  seniorAvatar?: AvatarRenderData;
  tsukebitoIds: string[];
  tsukebito: Array<{
    id: string;
    shikona: string;
    rankLabel: string;
    avatar?: AvatarRenderData;
  }>;
}

export interface TsukebitoProjection {
  assignments: TsukebitoAssignmentDTO[];
  eligibleSeniors: Array<{
    id: string;
    shikona: string;
    rankLabel: string;
    currentCount: number;
    maxCount: number;
    avatar?: AvatarRenderData;
  }>;
  eligibleJuniors: Array<{
    id: string;
    shikona: string;
    rankLabel: string;
    assignedTo: string | null;
    avatar?: AvatarRenderData;
  }>;
}

function rankLabel(r: Rikishi): string {
  const rank = r.rank;
  if (!rank) return "Unranked";
  if (typeof rank === "string") return rank;
  // Rank object — use label if present, otherwise stringify
  const rankObj = rank as { label?: string };
  return rankObj.label ?? String(rank);
}

function avatarOf(r: Rikishi, year: number): AvatarRenderData {
  return resolveAvatar({
    id: r.id,
    stored: r.avatarConfig,
    nationality: r.nationality,
    ...rikishiStageInput(r, year),
  });
}

export function projectTsukebito(world: WorldState, heyaId: string): TsukebitoProjection {
  const year = world.year;

  const seniors: Rikishi[] = [];
  const juniors: Rikishi[] = [];
  const juniorAssignments: Record<string, string> = {};
  const assignments: TsukebitoAssignmentDTO[] = [];

  // Single pass over the map in insertion order — no intermediate
  // arrayification (iteration order is pinned by the v7 equivalence test).
  for (const r of world.rikishi.values()) {
    if (r.heyaId !== heyaId || r.isRetired) continue;

    // Seniors: sekitori eligible to have tsukebito
    if (isEligibleForTsukebito(r)) {
      seniors.push(r);
      const tsukebitoIds = r.tsukebitoIds;
      if (tsukebitoIds !== undefined && tsukebitoIds.length > 0) {
        const tsukebito: TsukebitoAssignmentDTO["tsukebito"] = [];
        for (let j = 0; j < tsukebitoIds.length; j++) {
          const tId = tsukebitoIds[j];
          juniorAssignments[tId] = r.id;
          const t = world.rikishi.get(tId);
          if (t) {
            tsukebito.push({
              id: t.id,
              shikona: t.shikona,
              rankLabel: rankLabel(t),
              avatar: avatarOf(t, year),
            });
          }
        }

        assignments.push({
          seniorId: r.id,
          seniorShikona: r.shikona,
          seniorRankLabel: rankLabel(r),
          seniorAvatar: avatarOf(r, year),
          tsukebitoIds,
          tsukebito,
        });
      }
    }
    // Juniors: eligible tsukebito candidates
    else if (isJuniorTsukebitoEligible(r)) {
      juniors.push(r);
    }
  }

  const eligibleSeniors = seniors.map((s) => ({
    id: s.id,
    shikona: s.shikona,
    rankLabel: rankLabel(s),
    currentCount: (s.tsukebitoIds ?? []).length,
    maxCount: MAX_TSUKEBITO_PER_SENIOR,
    avatar: avatarOf(s, year),
  }));

  const eligibleJuniors = juniors.map((j) => ({
    id: j.id,
    shikona: j.shikona,
    rankLabel: rankLabel(j),
    assignedTo: juniorAssignments[j.id] ?? null,
    avatar: avatarOf(j, year),
  }));

  return { assignments, eligibleSeniors, eligibleJuniors };
}
