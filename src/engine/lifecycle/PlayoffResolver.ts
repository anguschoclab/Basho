import { stableTieBreak, sortStandings } from "@/engine/utils/sort";
import { resolveBout } from "@/engine/bout/boutResolver";
import type { WorldState } from "@/engine/types/world";
import type { BashoState, MatchSchedule } from "@/engine/types/basho";
import type { Id } from "@/engine/types/common";
import type { Rikishi } from "@/engine/types/rikishi";
import { rngForWorld } from "@/engine/core/rng";
import { getRikishi } from "@/engine/core/queries";
import { BardEngine } from "@/engine/bard/BardEngine";
import { rngFromSeed } from "@/engine/core/rng";
import type { PbpLine } from "@/engine/bout/boutNarrative";

/**
 * Resolve playoff bouts among tied yūshō candidates.
 *
 * JSA formats:
 *  - 2 candidates: single kettei-sen bout.
 *  - 3 candidates: tomoe-sen — the winner of each bout stays on the dohyo to
 *    face the rikishi who sat out; the title goes to the first rikishi to win
 *    two consecutive bouts. A bounded kuji (lot) fallback terminates a
 *    pathological 1-1-1 cycle, mirroring the JSA provision.
 *  - 4+ candidates: single-elimination bracket.
 *
 * Uses resolveBout (physics + narrative + rivalry update) but skips the
 * full applyBoutResult side-effects (no standings mutation, no kenshō).
 * The draw is deterministically shuffled via the world seed.
 */
export function resolvePlayoffs(
  world: WorldState,
  basho: BashoState,
  candidates: Id[]
): { winner: Id; matches: MatchSchedule[] } {
  const allMatches: MatchSchedule[] = [];
  const rng = rngForWorld(world, "combat", `playoff::${basho.bashoName}::${world.year}`);
  const shuffled = rng.shuffle(candidates.slice());
  let day = 16;

  if (shuffled.length === 3) {
    return resolveTomoeSen(world, basho, shuffled, day, rng, allMatches);
  }

  let round = shuffled;

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
        { id: boutId, day, rikishiEastId: eastId, rikishiWestId: westId, isPlayoff: true },
        east,
        west,
        basho,
        undefined,
        world
      );

      decoratePlayoffNarrative(boutId, east, west, result);
      allMatches.push({ boutId, day, eastRikishiId: eastId, westRikishiId: westId, result });
      next.push(result.winnerRikishiId);
    }

    if (bye) next.push(bye);
    round = next;
    day++;
  }

  return { winner: round[0], matches: allMatches };
}

/** Bouts the JSA allows a tomoe-sen to run before falling back to kuji. */
const TOMOE_SEN_MAX_BOUTS = 12;

/**
 * Three-man tomoe-sen: the winner of each bout stays on to face the rikishi
 * who sat out the previous bout. The champion is the first to win two
 * consecutive bouts. If the 1-1-1 cycle cannot break within the bounded
 * number of bouts, the title is decided by lot (kuji) — the JSA provision
 * used in the event of an unresolvable tie.
 */
function resolveTomoeSen(
  world: WorldState,
  basho: BashoState,
  order: [Id, Id, Id] | Id[],
  startDay: number,
  rng: ReturnType<typeof rngForWorld>,
  allMatches: MatchSchedule[]
): { winner: Id; matches: MatchSchedule[] } {
  const [a, b, c] = order;
  let day = startDay;
  // rotation holds the three rikishi in fight order; the first two fight the
  // opening bout, then the winner faces the idle third rikishi each round.
  const rotation: Id[] = [a, b, c];
  let consecutiveWinner: Id | null = null;
  let consecutiveWins = 0;

  for (let bout = 0; bout < TOMOE_SEN_MAX_BOUTS; bout++) {
    const eastId = rotation[0];
    const westId = rotation[1];
    const idleId = rotation[2];
    const east = getRikishi(world, eastId);
    const west = getRikishi(world, westId);

    if (!east || !west) {
      // Missing rikishi: the present one takes the title outright.
      return { winner: east ? eastId : westId, matches: allMatches };
    }

    const boutId = `playoff-${world.year}-${basho.bashoName}-d${day}-${eastId}-${westId}`;
    const { result } = resolveBout(
      { id: boutId, day, rikishiEastId: eastId, rikishiWestId: westId, isPlayoff: true },
      east,
      west,
      basho,
      undefined,
      world
    );

    decoratePlayoffNarrative(boutId, east, west, result);
    allMatches.push({ boutId, day, eastRikishiId: eastId, westRikishiId: westId, result });

    const winnerId = result.winnerRikishiId;
    if (winnerId === consecutiveWinner) {
      consecutiveWins++;
    } else {
      consecutiveWinner = winnerId;
      consecutiveWins = 1;
    }
    if (consecutiveWins >= 2) {
      return { winner: winnerId, matches: allMatches };
    }

    // Winner stays; the idle rikishi steps in next.
    rotation[0] = winnerId;
    rotation[1] = idleId;
    rotation[2] = winnerId === eastId ? westId : eastId;
    day++;
  }

  // Kuji fallback: the JSA draws lots when a tomoe-sen cannot settle.
  return { winner: rng.pick(order), matches: allMatches };
}

/** Wraps a resolved playoff bout's pbp with tomoe/bracket framing lines. */
function decoratePlayoffNarrative(
  boutId: string,
  east: Rikishi,
  west: Rikishi,
  result: NonNullable<MatchSchedule["result"]>
): void {
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
  if (result.pbpLines && result.pbpLines.length > 0) {
    result.pbpLines = [
      ...playoffLines.slice(0, 1),
      ...result.pbpLines,
      ...playoffLines.slice(1),
    ];
  } else {
    result.pbpLines = playoffLines.length > 0 ? playoffLines : undefined;
  }
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
