import { stableTieBreak, sortStandings } from "../utils/sort";
import { resolveBout } from "../bout/boutResolver";
import type { WorldState } from "../types/world";
import type { BashoState, MatchSchedule } from "../types/basho";
import type { Id } from "../types/common";
import { rngForWorld } from "../rng";
import { getRikishi } from "../queries";
import { BardEngine } from "../bard/BardEngine";
import { rngFromSeed } from "../rng";
import type { PbpLine } from "../bout/boutNarrative";

/**
 * Run a single-elimination playoff among tied yūshō candidates.
 * Uses resolveBout (physics + narrative + rivalry update) but skips the
 * full applyBoutResult side-effects (no standings mutation, no kenshō).
 * The bracket is deterministically shuffled via the world seed.
 */
export function resolvePlayoffs(
  world: WorldState,
  basho: BashoState,
  candidates: Id[]
): { winner: Id; matches: MatchSchedule[] } {
  const allMatches: MatchSchedule[] = [];
  const rng = rngForWorld(world, "combat", `playoff::${basho.bashoName}::${world.year}`);
  let round = rng.shuffle(candidates.slice());
  let day = 16;

  while (round.length > 1) {
    const next: Id[] = [];
    const bouts: Array<[Id, Id]> = [];

    for (let i = 0; i + 1 < round.length; i += 2) {
      bouts.push([round[i], round[i + 1]]);
    }
    const bye = round.length % 2 === 1 ? round[round.length - 1] : null;

    for (const [eastId, westId] of bouts) {
      const east = getRikishi(world, eastId);
      const west = getRikishi(world, westId);
      if (!east || !west) {
        next.push(eastId);
        continue;
      }
      const boutId = `playoff-${world.year}-${basho.bashoName}-d${day}-${eastId}-${westId}`;
      const { result } = resolveBout(
        { id: boutId, day, rikishiEastId: eastId, rikishiWestId: westId },
        east,
        west,
        basho,
        undefined,
        world
      );

      // Add playoff-specific narrative lines (Gap 3)
      const playoffRng = rngFromSeed(`playoff-${boutId}-narrative`, "pbp", "playoff");
      const playoffLines: PbpLine[] = [];
      const preLine = BardEngine.resolve(playoffRng, "pre_bout.playoff_bout", {
        EAST: east.shikona,
        WEST: west.shikona,
        eastRikishiId: east.id,
        westRikishiId: west.id,
      });
      if (preLine.text && !preLine.text.includes("[MISSING:")) {
        playoffLines.push({
          text: preLine.text,
          id: `${boutId}-playoff-pre`,
          phase: "pre_bout",
          tags: ["yusho_race"],
        });
      }
      const winnerName = result.winner === "east" ? east.shikona : west.shikona;
      const loserName = result.winner === "east" ? west.shikona : east.shikona;
      const winnerId = result.winner === "east" ? east.id : west.id;
      const loserId = result.winner === "east" ? west.id : east.id;
      const postLine = BardEngine.resolve(playoffRng, "post_bout.playoff_result", {
        WINNER: winnerName,
        LOSER: loserName,
        winnerId,
        loserId,
      });
      if (postLine.text && !postLine.text.includes("[MISSING:")) {
        playoffLines.push({
          text: postLine.text,
          id: `${boutId}-playoff-post`,
          phase: "post_bout",
          tags: ["yusho_race"],
        });
      }
      // Prepend playoff opening line and append playoff result line to existing pbpLines
      if (result.pbpLines && result.pbpLines.length > 0) {
        result.pbpLines = [...playoffLines.slice(0, 1), ...result.pbpLines, ...playoffLines.slice(1)];
      } else {
        result.pbpLines = playoffLines.length > 0 ? playoffLines : undefined;
      }

      allMatches.push({ boutId, day, eastRikishiId: eastId, westRikishiId: westId, result });
      next.push(result.winnerRikishiId);
    }

    if (bye) next.push(bye);
    round = next;
    day++;
  }

  return { winner: round[0], matches: allMatches };
}

export function calculateStandings(basho: BashoState): {
  topCandidates: Id[];
  bestWins: number;
  table: Array<{ id: Id; wins: number; losses: number }>;
} {
  const table: Array<{ id: Id; wins: number; losses: number }> = [];
  const standingsEntries =
    basho.standings instanceof Map
      ? Array.from(basho.standings.entries())
      : Object.entries(basho.standings);

  for (const [id, rec] of standingsEntries) {
    const s = rec as { wins: number; losses: number };
    table.push({ id, wins: s.wins, losses: s.losses });
  }

  const sortedTable = sortStandings(table, (a, b) => stableTieBreak(a.id, b.id));

  if (sortedTable.length === 0) return { topCandidates: [], bestWins: 0, table: sortedTable };

  const bestWins = sortedTable[0].wins;
  const topCandidates = sortedTable.reduce<Id[]>((acc, t) => {
    if (t.wins === bestWins) acc.push(t.id);
    return acc;
  }, []);

  return { topCandidates, bestWins, table: sortedTable };
}
