import type { BashoState, MatchSchedule } from "./types/basho";
import type { Division } from "./types/banzuke";
import type { WorldState } from "./types/world";
import {
  buildSwissTorikumi,
  buildLowerDivisionSwiss,
  type MatchPairing,
} from "./matchmaking/index";
import { createImpactBuilder } from "./core/ImpactBuilder";
import type { StateImpact } from "./core/StateImpact";
import {
  getDivisionExpectedSize,
  activeDivisionRoster,
  needsScheduleForDay,
} from "./scheduleHelpers";

// === CORE SCHEDULING ===

/**
 * Schedule bouts for a single division on a single day.
 * Appends matches to basho.matches and returns the new matches.
 */
export function scheduleDivisionDay(args: {
  world: WorldState;
  basho: BashoState;
  division: Division;
  day: number;
  seed: string;
  config?: { maxActiveRikishi?: number };
}): { scheduled: MatchSchedule[]; impact: StateImpact } {
  const { world, basho, division, day, config } = args;

  const builder = createImpactBuilder("scheduleDivisionDay");
  const roster = activeDivisionRoster(world, division);
  const maxActiveRikishi = config?.maxActiveRikishi;
  if (!needsScheduleForDay(division, day)) return { scheduled: [], impact: builder.build() };

  const pool =
    typeof maxActiveRikishi === "number" ? roster.slice(0, Math.max(0, maxActiveRikishi)) : roster;

  if (pool.length < 2) return { scheduled: [], impact: builder.build() };

  let finalPairings: MatchPairing[];

  if (division === "makuuchi") {
    // ── JSA Swiss path (TDD §2.2–2.4) ─────────────────────────────────────
    finalPairings = buildSwissTorikumi(basho, pool, {
      seed: `${args.seed}-swiss-makuuchi-day${day}`,
      division: "makuuchi",
      rivalriesState: world.rivalriesState,
    });
  } else if (["makushita", "sandanme", "jonidan", "jonokuchi"].includes(division)) {
    // ── NEW: 7-bout Division Swiss path ─────────────────────────────────
    finalPairings = buildLowerDivisionSwiss(basho, pool, {
      seed: `${args.seed}-lower-swiss-${division}-day${day}`,
      division,
    });
  } else if (division === "juryo") {
    // ── Juryo with crossover from Makushita ─────────────────────────
    const { scheduled, impact: crossoverImpact } = scheduleJuryoWithCrossover(world, basho, {
      seed: args.seed,
    });

    builder.merge(crossoverImpact);
    return { scheduled, impact: builder.build() };
  } else {
    // Unsupported division fallback
    return { scheduled: [], impact: builder.build() };
  }

  const scheduled: MatchSchedule[] = finalPairings.map((p) => ({
    boutId: `b-${world.year}-${basho.bashoName}-d${day}-${p.eastId}-${p.westId}`,
    day,
    eastRikishiId: p.eastId,
    westRikishiId: p.westId,
  }));

  // Append to basho state using ImpactBuilder
  builder.appendToWorldArray("basho.matches", scheduled);

  return { scheduled, impact: builder.build() };
}

/**
 * Schedule all divisions for a single day.
 * Returns StateImpact describing scheduled matches instead of mutating directly.
 */
export function scheduleAllDivisionsDay(args: {
  world: WorldState;
  basho: BashoState;
  day: number;
  seed: string;
  divisions?: Division[];
}): { scheduled: MatchSchedule[]; impact: StateImpact } {
  const divisions: Division[] =
    args.divisions ??
    (["jonokuchi", "jonidan", "sandanme", "makushita", "juryo", "makuuchi"] as Division[]);

  const builder = createImpactBuilder("scheduleAllDivisionsDay");
  const out: MatchSchedule[] = [];
  for (const div of divisions) {
    const { scheduled, impact } = scheduleDivisionDay({
      world: args.world,
      basho: args.basho,
      division: div,
      day: args.day,
      seed: args.seed,
    });
    out.push(...scheduled);
    builder.merge(impact);
  }
  return { scheduled: out, impact: builder.build() };
}

/**
 * Generate the complete schedule for a basho (all days, all divisions).
 */
export function generateFullBashoSchedule(args: {
  world: WorldState;
  basho: BashoState;
  seed: string;
  divisions?: Division[];
}): StateImpact {
  const builder = createImpactBuilder("generateFullBashoSchedule");
  const divisions: Division[] =
    args.divisions ??
    (["makuuchi", "juryo", "makushita", "sandanme", "jonidan", "jonokuchi"] as Division[]);

  const maxDays = 15;

  for (let day = 1; day <= maxDays; day++) {
    for (const div of divisions) {
      if (!needsScheduleForDay(div, day)) continue;

      const { impact } = scheduleDivisionDay({
        world: args.world,
        basho: args.basho,
        division: div,
        day,
        seed: args.seed,
      });

      builder.merge(impact);
    }
  }

  return builder.build();
}

/**
 * Schedule Juryo with crossover from Makushita.
 * Checks both injured and isKyujo flags for odd slots, calls up top Makushita (Ms1-Ms5).
 */
export function scheduleJuryoWithCrossover(
  world: WorldState,
  basho: BashoState,
  options: { seed: string }
): { scheduled: MatchSchedule[]; impact: StateImpact } {
  const builder = createImpactBuilder("scheduleJuryoWithCrossover");
  const division = "juryo";
  const day = basho.day ?? 1;

  if (!needsScheduleForDay(division, day)) {
    return { scheduled: [], impact: builder.build() };
  }

  let pool = activeDivisionRoster(world, division);
  const expectedSize = getDivisionExpectedSize(division);
  const actualSize = pool.length;

  // Check for odd slots (injured or kyujo)
  const oddSlots = expectedSize - actualSize;

  if (oddSlots > 0) {
    // Call up top Makushita (Ms1-Ms5)
    const makushitaPool = activeDivisionRoster(world, "makushita")
      .filter((r) => !r.injured && !r.isKyujo)
      .sort((a, b) => {
        const aNum = a.rankNumber ?? 99;
        const bNum = b.rankNumber ?? 99;
        if (aNum !== bNum) return aNum - bNum;
        return a.side === "east" ? -1 : 1;
      });

    // Take top 5 or as many as needed
    const callupCount = Math.min(oddSlots, 5, makushitaPool.length);
    const callups = makushitaPool.slice(0, callupCount);

    // Temporarily move callups to Juryo for scheduling
    pool = [...pool, ...callups];
  }

  // Use a temporary basho state to avoid early pollution
  const boutsPerDay = Math.floor(pool.length / 2);
  if (boutsPerDay <= 0) return { scheduled: [], impact: builder.build() };

  // For lower divisions and Juryo, we still use the lower division swiss logic or similar
  const finalPairings = buildLowerDivisionSwiss(basho, pool, {
    seed: `${options.seed}-juryo-crossover-day${day}`,
    division,
  });

  const scheduled: MatchSchedule[] = finalPairings.map((p) => ({
    boutId: `b-${world.year}-${basho.bashoName}-d${day}-${p.eastId}-${p.westId}`,
    day,
    eastRikishiId: p.eastId,
    westRikishiId: p.westId,
  }));

  builder.appendToWorldArray("basho.matches", scheduled);

  return { scheduled, impact: builder.build() };
}

/**
 * Ensure day schedule — checks if a schedule already exists for the day.
 */
export function ensureDaySchedule(world: WorldState, day: number): StateImpact {
  const builder = createImpactBuilder("ensureDaySchedule");
  const basho = world.currentBasho;
  if (!basho) return builder.build();

  const needsMakuuchi = needsScheduleForDay("makuuchi", day);
  const alreadyScheduled = basho.matches.some((m) => m.day === day);

  if (needsMakuuchi && !alreadyScheduled) {
    const { impact } = scheduleAllDivisionsDay({
      world,
      basho,
      day,
      seed: world.seed,
    });

    builder.merge(impact);
  }

  return builder.build();
}
