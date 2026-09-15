/**
 * tsukebitoProjections.ts — projects tsukebito assignments for UI.
 */
import type { WorldState } from "../engine/types/world";
import type { Rikishi } from "../engine/types/rikishi";

export interface TsukebitoAssignmentDTO {
  seniorId: string;
  seniorShikona: string;
  seniorRankLabel: string;
  tsukebitoIds: string[];
  tsukebito: Array<{
    id: string;
    shikona: string;
    rankLabel: string;
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
  }>;
  eligibleJuniors: Array<{
    id: string;
    shikona: string;
    rankLabel: string;
    assignedTo: string | null;
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

export function projectTsukebito(
  world: WorldState,
  heyaId: string
): TsukebitoProjection {
  const heyaRikishi = Array.from(world.rikishi.values()).filter(
    (r) => r.heyaId === heyaId && !r.isRetired
  );

  const seniors: Rikishi[] = [];
  const juniors: Rikishi[] = [];
  const juniorAssignments: Record<string, string> = {};
  const assignments: TsukebitoAssignmentDTO[] = [];

  // Single pass loop to eliminate intermediate O(N) allocations
  // replacing multiple .filter() and .map() chains
  for (let i = 0; i < heyaRikishi.length; i++) {
    const r = heyaRikishi[i];
    const rankNumber = r.rankNumber ?? 99;

    // Seniors: rankNumber <= 3
    if (rankNumber <= 3) {
      seniors.push(r);
      const tsukebitoIds = r.tsukebitoIds;
      if (tsukebitoIds !== undefined && tsukebitoIds.length > 0) {
        const tsukebito: Array<{id: string; shikona: string; rankLabel: string}> = [];
        for (let j = 0; j < tsukebitoIds.length; j++) {
          const tId = tsukebitoIds[j];
          juniorAssignments[tId] = r.id;
          const t = world.rikishi.get(tId);
          if (t) {
            tsukebito.push({
              id: t.id,
              shikona: t.shikona,
              rankLabel: rankLabel(t),
            });
          }
        }

        assignments.push({
          seniorId: r.id,
          seniorShikona: r.shikona,
          seniorRankLabel: rankLabel(r),
          tsukebitoIds,
          tsukebito,
        });
      }
    }
    // Juniors: rankNumber > 10
    else if (rankNumber > 10) {
      juniors.push(r);
    }
  }

  const eligibleSeniors = seniors.map((s) => ({
    id: s.id,
    shikona: s.shikona,
    rankLabel: rankLabel(s),
    currentCount: (s.tsukebitoIds ?? []).length,
    maxCount: 2,
  }));

  const eligibleJuniors = juniors.map((j) => ({
    id: j.id,
    shikona: j.shikona,
    rankLabel: rankLabel(j),
    assignedTo: juniorAssignments[j.id] ?? null,
  }));

  return { assignments, eligibleSeniors, eligibleJuniors };
}
