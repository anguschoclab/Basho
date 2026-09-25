/**
 * Banzuke snapshot construction.
 *
 * A BanzukeSnapshot freezes a published banzuke — which rikishi held which
 * position in each division — so history, recap, and rank-delta UI can compare
 * one basho's banzuke against another. The snapshot's `year`/`bashoNumber`
 * identify the basho the banzuke applies to (a banzuke published after hatsu
 * 2025 applies to haru 2025). Storage keys elsewhere (e.g.
 * `historyIndex.banzukeByBasho`) are keyed by the *producing* basho — the two
 * conventions are intentionally decoupled.
 */
import type {
  BanzukeAssignment,
  BanzukeEntry,
  BanzukeSnapshot,
  Division,
  DivisionBanzukeSnapshot,
  RankPosition,
} from "../types/banzuke";
import { RANK_HIERARCHY } from "../types/banzuke";

const DIVISIONS: Division[] = [
  "makuuchi",
  "juryo",
  "makushita",
  "sandanme",
  "jonidan",
  "jonokuchi",
];

/** Canonical slot ordering: rank tier asc, then rank number asc, east before west. */
function comparePositions(a: RankPosition, b: RankPosition): number {
  const ta = RANK_HIERARCHY[a.rank]?.tier ?? 99;
  const tb = RANK_HIERARCHY[b.rank]?.tier ?? 99;
  if (ta !== tb) return ta - tb;
  const na = a.rankNumber ?? 0;
  const nb = b.rankNumber ?? 0;
  if (na !== nb) return na - nb;
  if (a.side === b.side) return 0;
  return a.side === "east" ? -1 : 1;
}

/**
 * Build a BanzukeSnapshot from banzuke entries.
 *
 * @param entries - The banzuke assignments (rikishiId + position + division),
 *   e.g. the pre-update `currentBanzukeList` or `updateBanzuke`'s `newBanzuke`.
 * @param year - The year of the basho this banzuke applies to.
 * @param bashoNumber - The basho number (1-6) this banzuke applies to.
 */
export function buildBanzukeSnapshot(
  entries: BanzukeEntry[],
  year: number,
  bashoNumber: 1 | 2 | 3 | 4 | 5 | 6
): BanzukeSnapshot {
  const divisions = Object.fromEntries(
    DIVISIONS.map((division) => [
      division,
      { division, slots: [], assignments: [] } as DivisionBanzukeSnapshot,
    ])
  ) as Record<Division, DivisionBanzukeSnapshot>;

  for (const entry of entries) {
    const bucket = divisions[entry.division];
    if (!bucket) continue;
    const assignment: BanzukeAssignment = {
      rikishiId: entry.rikishiId,
      position: entry.position,
    };
    bucket.assignments.push(assignment);
    bucket.slots.push(entry.position);
  }

  for (const bucket of Object.values(divisions)) {
    bucket.assignments.sort((a, b) => comparePositions(a.position, b.position));
    bucket.slots.sort(comparePositions);
  }

  return { year, bashoNumber, divisions };
}
