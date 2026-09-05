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

  // Seniors: rankNumber <= 3
  const seniors = heyaRikishi.filter((r) => (r.rankNumber ?? 99) <= 3);
  // Juniors: rankNumber > 10
  const juniors = heyaRikishi.filter((r) => (r.rankNumber ?? 99) > 10);

  // Build a map of junior -> assigned senior
  const juniorAssignments: Record<string, string> = {};
  for (const s of seniors) {
    for (const jId of s.tsukebitoIds ?? []) {
      juniorAssignments[jId] = s.id;
    }
  }

  const assignments: TsukebitoAssignmentDTO[] = seniors
    .filter((s) => (s.tsukebitoIds ?? []).length > 0)
    .map((s) => ({
      seniorId: s.id,
      seniorShikona: s.shikona,
      seniorRankLabel: rankLabel(s),
      tsukebitoIds: s.tsukebitoIds ?? [],
      tsukebito: (s.tsukebitoIds ?? [])
        .map((jId) => world.rikishi.get(jId))
        .filter((r): r is Rikishi => !!r)
        .map((r) => ({
          id: r.id,
          shikona: r.shikona,
          rankLabel: rankLabel(r),
        })),
    }));

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
