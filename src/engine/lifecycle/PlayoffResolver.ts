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
        result.pbpLines = [
          ...playoffLines.slice(0, 1),
          ...result.pbpLines,
          ...playoffLines.slice(1),
        ];
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

/**
 * Calculate standings filtered by division.
 * Returns top candidates for a specific division (e.g., juryo, makushita).
 */
export function calculateDivisionStandings(
  basho: BashoState,
  world: WorldState,
  division: string
): {
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
    const rikishi = getRikishi(world, id);
    if (!rikishi || rikishi.division !== division) continue;
    table.push({ id, wins: s.wins, losses: s.losses });
  }

  const sortedTable = sortStandings(table, (a, b) => stableTieBreak(a.id, b.id));

  if (sortedTable.length === 0) return { topCandidates: [], bestWins: 0, table: sortedTable };

  const bestWins = sortedTable[0].wins;
  const topCandidates: Id[] = [];
  for (const t of sortedTable) {
    if (t.wins === bestWins) topCandidates.push(t.id);
  }

  return { topCandidates, bestWins, table: sortedTable };
}

/**
 * Resolve playoffs for a specific division.
 * Generates division-specific narrative lines (intro, multi_man, victory).
 */
export function resolveDivisionPlayoffs(
  world: WorldState,
  basho: BashoState,
  candidates: Id[],
  division: string
): { winner: Id; matches: MatchSchedule[]; narrativeLines: PbpLine[] } {
  const narrativeLines: PbpLine[] = [];
  const divRng = rngFromSeed(
    `div-playoff-${division}-${basho.bashoName}-${world.year}`,
    "narrative",
    "playoff"
  );

  // Intro line
  const introLine = BardEngine.resolve(divRng, "playoff.lower_division.intro", {
    DIVISION: division,
  });
  if (introLine.text) {
    narrativeLines.push({
      text: introLine.text,
      id: `div-playoff-intro-${division}-${basho.bashoName}-${world.year}`,
      phase: "pre_bout",
      tags: ["playoff", "lower_division"],
    });
  }

  // Multi-man line if 3+ candidates
  if (candidates.length >= 3) {
    const multiLine = BardEngine.resolve(divRng, "playoff.lower_division.multi_man", {
      DIVISION: division,
      COUNT: String(candidates.length),
    });
    if (multiLine.text) {
      narrativeLines.push({
        text: multiLine.text,
        id: `div-playoff-multi-${division}-${basho.bashoName}-${world.year}`,
        phase: "pre_bout",
        tags: ["playoff", "lower_division"],
      });
    }
  }

  // Resolve the actual playoff bouts
  const { winner, matches } = resolvePlayoffs(world, basho, candidates);

  // Victory line
  const winnerRikishi = getRikishi(world, winner);
  const victoryLine = BardEngine.resolve(divRng, "playoff.lower_division.victory", {
    WINNER: winnerRikishi?.shikona ?? winner,
    DIVISION: division,
    rikishiId: winner,
  });
  if (victoryLine.text) {
    narrativeLines.push({
      text: victoryLine.text,
      id: `div-playoff-victory-${division}-${basho.bashoName}-${world.year}`,
      phase: "post_bout",
      tags: ["playoff", "lower_division"],
    });
  }

  return { winner, matches, narrativeLines };
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
  const topCandidates: Id[] = [];
  for (const t of sortedTable) {
    if (t.wins === bestWins) topCandidates.push(t.id);
  }

  return { topCandidates, bestWins, table: sortedTable };
}
