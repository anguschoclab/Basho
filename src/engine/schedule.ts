// schedule.ts
// =======================================================
// Schedule Builder v1.1 — Deterministic torikumi pairing for ALL divisions
// Uses matchmaking.ts for candidate generation and scoring.
// =======================================================
/* eslint-disable @typescript-eslint/no-explicit-any */
import { rngFromSeed } from "./rng";
import type { BashoState, MatchSchedule } from "./types/basho";
import type { Division } from "./types/banzuke";
import type { Rikishi } from "./types/rikishi";
import type { WorldState } from "./types/world";
import {
  buildCandidatePairs,
  buildSwissTorikumi,
  buildLowerDivisionSwiss,
  type MatchPairing,
  type MatchmakingRules,
} from "./matchmaking/index";
import { createImpactBuilder } from "./core/ImpactBuilder";
import type { StateImpact } from "./core/StateImpact";
import {
  getDivisionExpectedSize,
  activeDivisionRoster,
  greedySelectPairs,
  needsScheduleForDay,
} from "./scheduleHelpers";

/** Defines the structure for division schedule config. */
export interface DivisionScheduleConfig {
  division: Division;
  /** number of bouts on a given day (usually roster/2) */
  boutsPerDay?: number;
  /** max active rikishi to consider (for huge lower divisions) */
  maxActiveRikishi?: number;
}

/** Defines the structure for schedule rules. */
export interface ScheduleRules {
  matchmaking?: Partial<MatchmakingRules>;
  allowForcedRepeats?: boolean;
}

// === CORE SCHEDULING ===

/**
 * Schedule bouts for a single division on a single day.
 * Appends matches to basho.matches and returns the new matches.
 */
/**
 * Schedule bouts for a single division on a single day.
 *
 * For **makuuchi** the JSA Swiss Shimpan algorithm (buildSwissTorikumi) is
 * used directly.  It returns a fully-ordered, chronologically-sorted array
 * (lowest rank first, elite last) — no secondary shuffle is applied so the
 * broadcast order is preserved in basho.matches.
 *
 * For all other divisions the legacy candidate-pair / greedy-select path
 * is retained (lower divisions use 7-day schedules, not the Swiss system).
 *
 * Returns StateImpact describing scheduled matches instead of mutating basho.matches directly.
 */
export function scheduleDivisionDay(args: {
  world: WorldState;
  basho: BashoState;
  division: Division;
  day: number;
  seed: string;
  rules?: ScheduleRules;
  config?: DivisionScheduleConfig;
}): { scheduled: MatchSchedule[]; impact: StateImpact } {
  const { world, basho, division, day, rules, config } = args;

  const builder = createImpactBuilder("scheduleDivisionDay");
  const roster = activeDivisionRoster(world, division);
  const maxActiveRikishi = config?.maxActiveRikishi;
  if (!needsScheduleForDay(division, day)) return { scheduled: [], impact: builder.build() };

  const pool =
    typeof maxActiveRikishi === "number" ? roster.slice(0, Math.max(0, maxActiveRikishi)) : roster;

  if (pool.length < 2) return { scheduled: [], impact: builder.build() };

  let finalPairings: MatchPairing[];

  const rng = rngFromSeed(args.seed, "schedule", `${division}::day${day}`);
  const scheduleRules = rules ?? {};
  if (division === "makuuchi") {
    // ── JSA Swiss path (TDD §2.2–2.4) ─────────────────────────────────────
    // buildSwissTorikumi already applies the three-phase constraint solver
    // and returns results sorted chronologically (lowest rank → elite last).
    finalPairings = buildSwissTorikumi(basho, pool, {
      seed: `${args.seed}-swiss-makuuchi-day${day}`,
      division: "makuuchi",
      rivalriesState: (world as any).rivalriesState,
    });
  } else if (["makushita", "sandanme", "jonidan", "jonokuchi"].includes(division)) {
    // ── NEW: 7-bout Division Swiss path ─────────────────────────────────
    finalPairings = buildLowerDivisionSwiss(basho, pool, {
      seed: `${args.seed}-lower-swiss-${division}-day${day}`,
      division,
    });
  } else if (division === "juryo") {
    // ── NEW: Juryo with crossover from Makushita ─────────────────────────
    const { scheduled, impact: crossoverImpact } = scheduleJuryoWithCrossover(world, basho, {
      seed: args.seed,
    });

    // Merge the crossover impact
    if (crossoverImpact.arrayAppends) {
      for (const append of crossoverImpact.arrayAppends) {
        builder.appendToWorldArray(append.field, append.items);
      }
    }
    if (crossoverImpact.worldFields) {
      for (const [field, value] of Object.entries(crossoverImpact.worldFields)) {
        (builder as any).updateWorldField(field, value);
      }
    }

    return { scheduled, impact: builder.build() };
  } else {
    // ── Legacy candidate-pair path (should not be reached) ───────────────
    const boutsPerDay = args.config?.boutsPerDay ?? Math.floor(pool.length / 2);
    if (boutsPerDay <= 0) return { scheduled: [], impact: builder.build() };

    const candidates = buildCandidatePairs(basho, pool, {
      seed: `${args.seed}-cand-${division}-day${day}`,
      division,
    });

    const used = new Set<string>();
    const selected = greedySelectPairs(candidates, boutsPerDay, used);

    if (selected.length < boutsPerDay && (scheduleRules.allowForcedRepeats ?? true)) {
      const relaxedCandidates = buildCandidatePairs(basho, pool, {
        seed: `${args.seed}-relaxed-${division}-day${day}`,
        division,
        rules: { avoidRepeatOpponents: false },
      });
      const additional = greedySelectPairs(relaxedCandidates, boutsPerDay - selected.length, used);
      selected.push(...additional);
    }

    // Deterministic shuffle for lower divisions (broadcast order not mandated)
    const shuffled = [...selected];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    finalPairings = shuffled;
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
function scheduleAllDivisionsDay(args: {
  world: WorldState;
  basho: BashoState;
  day: number;
  seed: string;
  rules?: ScheduleRules;
  /** Override divisions list, otherwise uses all divisions present in types */
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
      rules: args.rules,
    });
    out.push(...scheduled);

    // Merge the impact
    if (impact.arrayAppends) {
      for (const append of impact.arrayAppends) {
        builder.appendToWorldArray(append.field, append.items);
      }
    }
    if (impact.worldFields) {
      for (const [field, value] of Object.entries(impact.worldFields)) {
        (builder as any).updateWorldField(field, value);
      }
    }
  }
  return { scheduled: out, impact: builder.build() };
}

/**
 * Back-compat helper used by `src/engine/world.ts` and `GameContext`.
 *
 * Generates ONE day of schedules for all divisions (respecting odd-day-only
 * lower divisions) and appends the resulting `MatchSchedule` entries to
 * `basho.schedule` and `basho.matches`.
 * Returns StateImpact describing scheduled matches instead of mutating directly.
 */
export function generateDaySchedule(
  world: WorldState,
  basho: BashoState,
  day: number,
  seed: string,
  rules?: ScheduleRules
): { scheduled: MatchSchedule[]; impact: StateImpact } {
  return scheduleAllDivisionsDay({ world, basho, day, seed, rules });
}

/**
 * Generate the complete schedule for a basho (all days, all divisions).
 * For lower divisions that only fight 7 days, this only schedules on odd days.
 * Returns StateImpact describing scheduled matches instead of mutating directly.
 */
export function generateFullBashoSchedule(args: {
  world: WorldState;
  basho: BashoState;
  seed: string;
  rules?: ScheduleRules;
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
        rules: args.rules,
      });

      // Merge the impact
      if (impact.arrayAppends) {
        for (const append of impact.arrayAppends) {
          builder.appendToWorldArray(append.field, append.items);
        }
      }
      if (impact.worldFields) {
        for (const [field, value] of Object.entries(impact.worldFields)) {
          (builder as any).updateWorldField(field, value);
        }
      }
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
  let callups: Rikishi[] = [];

  if (oddSlots > 0) {
    // Call up top Makushita (Ms1-Ms5)
    const makushitaPool = activeDivisionRoster(world, "makushita")
      .filter((r) => !r.injured && !(r as any).isKyujo)
      .sort((a, b) => {
        const aNum = a.rankNumber ?? 99;
        const bNum = b.rankNumber ?? 99;
        if (aNum !== bNum) return aNum - bNum;
        return a.side === "east" ? -1 : 1;
      });

    // Take top 5 or as many as needed
    const callupCount = Math.min(oddSlots, 5, makushitaPool.length);
    callups = makushitaPool.slice(0, callupCount);

    // Temporarily move callups to Juryo for scheduling
    pool = [...pool, ...callups];
  }

  // Schedule using legacy candidate-pair system for now
  // (Could be upgraded to Swiss in future)
  const boutsPerDay = Math.floor(pool.length / 2);
  if (boutsPerDay <= 0) return { scheduled: [], impact: builder.build() };

  const candidates = buildCandidatePairs(basho, pool, {
    seed: `${options.seed}-juryo-crossover-day${day}`,
    division,
  });

  const used = new Set<string>();
  const selected = greedySelectPairs(candidates, boutsPerDay, used);

  // Add forced repeats if needed
  if (selected.length < boutsPerDay) {
    const relaxedCandidates = buildCandidatePairs(basho, pool, {
      seed: `${options.seed}-relaxed-juryo-day${day}`,
      division,
      rules: { avoidRepeatOpponents: false },
    });
    const additional = greedySelectPairs(relaxedCandidates, boutsPerDay - selected.length, used);
    selected.push(...additional);
  }

  const rng = rngFromSeed(options.seed, "schedule", `juryo::day${day}`);
  const shuffled = [...selected];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const scheduled: MatchSchedule[] = shuffled.map((p) => ({
    boutId: `b-${world.year}-${basho.bashoName}-d${day}-${p.eastId}-${p.westId}`,
    day,
    eastRikishiId: p.eastId,
    westRikishiId: p.westId,
  }));

  builder.appendToWorldArray("basho.matches", scheduled);

  // Note: knock-on effects (promoting from lower divisions to fill gaps in Makushita)
  // would be implemented here in a full implementation

  return { scheduled, impact: builder.build() };
}

/**
 * Ensure day schedule — checks if a schedule already exists for the day,
 * and generates it if missing.
 * Returns StateImpact describing scheduled matches instead of mutating directly.
 *
 * @param world WorldState
 * @param day Day number
 */
export function ensureDaySchedule(world: WorldState, day: number): StateImpact {
  const builder = createImpactBuilder("ensureDaySchedule");
  const basho = world.currentBasho;
  if (!basho) return builder.build();

  const needsMakuuchi = needsScheduleForDay("makuuchi", day);
  const alreadyScheduled = basho.matches.some((m) => m.day === day);

  if (needsMakuuchi && !alreadyScheduled) {
    const { impact } = generateDaySchedule(world, basho, day, world.seed);

    // Merge the impact
    if (impact.arrayAppends) {
      for (const append of impact.arrayAppends) {
        builder.appendToWorldArray(append.field, append.items);
      }
    }
    if (impact.worldFields) {
      for (const [field, value] of Object.entries(impact.worldFields)) {
        (builder as any).updateWorldField(field, value);
      }
    }
  }

  return builder.build();
}
