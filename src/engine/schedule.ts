import { stableSort } from "./utils";
// schedule.ts
// =======================================================
// Schedule Builder v1.1 — Deterministic torikumi pairing for ALL divisions
// Uses matchmaking.ts for candidate generation and scoring.
// =======================================================
import { rngFromSeed, rngForWorld, SeededRNG } from "./rng";
import type { BashoState, MatchSchedule } from "./types/basho";
import type { Division } from "./types/banzuke";
import type { Rikishi } from "./types/rikishi";
import type { WorldState } from "./types/world";
import { getActiveRikishi } from "./selectors";

import {
  buildCandidatePairs,
  buildSwissTorikumi,
  type MatchPairing,
  type MatchmakingRules,
} from "./matchmaking";

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

/** Default bout days per division (sekitori = 15, lower = 7) */
export const DEFAULT_DIVISION_DAYS: Record<Division, number> = {
  makuuchi: 15,
  juryo: 15,
  makushita: 7,
  sandanme: 7,
  jonidan: 7,
  jonokuchi: 7,
};

// === HELPERS ===

/**
 * Active division roster.
 *  * @param world - The World.
 *  * @param division - The Division.
 *  * @returns The result.
 */
function activeDivisionRoster(
  world: WorldState,
  division: Division,
): Rikishi[] {
  const pool: Rikishi[] = [];
  for (const r of getActiveRikishi(world)) {
    if (r.division === division && !r.injured) {
      pool.push(r);
    }
  }
  return stableSort(pool, (r) => r.id);
}

/**
 * Previous opponents set.
 *  * @param basho - The Basho.
 *  * @returns The result.
 */
function previousOpponentsSet(basho: BashoState): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const m of basho.matches) {
    const e = m.eastRikishiId;
    const w = m.westRikishiId;

    if (!map.has(e)) map.set(e, new Set());
    if (!map.has(w)) map.set(w, new Set());

    map.get(e)!.add(w);
    map.get(w)!.add(e);
  }
  return map;
}

/**
 * Greedy selection of non-overlapping pairs.
 * Candidates should be pre-sorted by score (descending).
 */
function greedySelectPairs(
  candidates: MatchPairing[],
  maxPairs: number,
  used = new Set<string>(),
): MatchPairing[] {
  const selected: MatchPairing[] = [];

  for (const c of candidates) {
    if (selected.length >= maxPairs) break;
    if (used.has(c.eastId) || used.has(c.westId)) continue;

    selected.push(c);
    used.add(c.eastId);
    used.add(c.westId);
  }

  return selected;
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
 * Appends matches to basho.matches and returns the new entries.
 */
export function scheduleDivisionDay(args: {
  world: WorldState;
  basho: BashoState;
  division: Division;
  day: number;
  seed: string;
  rules?: ScheduleRules;
  config?: DivisionScheduleConfig;
}): MatchSchedule[] {
  const { world, basho, division, day } = args;
  const rules = args.rules ?? {};

  const roster = activeDivisionRoster(world, division);
  const maxActive = args.config?.maxActiveRikishi;
  if (!needsScheduleForDay(division, day)) return [];

  const pool =
    typeof maxActive === "number"
      ? roster.slice(0, Math.max(0, maxActive))
      : roster;

  if (pool.length < 2) return [];

  let finalPairings: MatchPairing[];

  if (division === "makuuchi") {
    // ── JSA Swiss path (TDD §2.2–2.4) ─────────────────────────────────────
    // buildSwissTorikumi already applies the three-phase constraint solver
    // and returns results sorted chronologically (lowest rank → elite last).
    finalPairings = buildSwissTorikumi(basho, pool, {
      seed: `${args.seed}-swiss-makuuchi-day${day}`,
      division: "makuuchi",
      rivalriesState: (world as any).rivalriesState,
    });
  } else {
    // ── Legacy candidate-pair path (all lower divisions) ───────────────────
    const rng = rngFromSeed(args.seed, "schedule", `${division}::day${day}`);
    const boutsPerDay = args.config?.boutsPerDay ?? Math.floor(pool.length / 2);
    if (boutsPerDay <= 0) return [];

    const candidates = buildCandidatePairs(basho, pool, {
      seed: `${args.seed}-cand-${division}-day${day}`,
      division,
    });

    const used = new Set<string>();
    const selected = greedySelectPairs(candidates, boutsPerDay, used);

    if (selected.length < boutsPerDay && (rules.allowForcedRepeats ?? true)) {
      const relaxedCandidates = buildCandidatePairs(basho, pool, {
        seed: `${args.seed}-relaxed-${division}-day${day}`,
        division,
        rules: { avoidRepeatOpponents: false },
      });
      const additional = greedySelectPairs(
        relaxedCandidates,
        boutsPerDay - selected.length,
        used,
      );
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

  // Append to basho state (engine truth source)
  basho.matches.push(...scheduled);

  return scheduled;
}

/**
 * Schedule all divisions for a single day.
 */
function scheduleAllDivisionsDay(args: {
  world: WorldState;
  basho: BashoState;
  day: number;
  seed: string;
  rules?: ScheduleRules;
  /** Override divisions list, otherwise uses all divisions present in types */
  divisions?: Division[];
}): MatchSchedule[] {
  const divisions: Division[] =
    args.divisions ??
    ([
      "jonokuchi",
      "jonidan",
      "sandanme",
      "makushita",
      "juryo",
      "makuuchi",
    ] as Division[]);

  const out: MatchSchedule[] = [];
  for (const div of divisions) {
    out.push(
      ...scheduleDivisionDay({
        world: args.world,
        basho: args.basho,
        division: div,
        day: args.day,
        seed: args.seed,
        rules: args.rules,
      }),
    );
  }
  return out;
}

/**
 * Back-compat helper used by `src/engine/world.ts` and `GameContext`.
 *
 * Generates ONE day of schedules for all divisions (respecting odd-day-only
 * lower divisions) and appends the resulting `MatchSchedule` entries to
 * `basho.schedule` and `basho.matches`.
 */
export function generateDaySchedule(
  world: WorldState,
  basho: BashoState,
  day: number,
  seed: string,
  rules?: ScheduleRules,
): MatchSchedule[] {
  return scheduleAllDivisionsDay({ world, basho, day, seed, rules });
}

/**
 * Generate the complete schedule for a basho (all days, all divisions).
 * For lower divisions that only fight 7 days, this only schedules on odd days.
 */
export function generateFullBashoSchedule(args: {
  world: WorldState;
  basho: BashoState;
  seed: string;
  rules?: ScheduleRules;
  divisions?: Division[];
}): void {
  const divisions: Division[] =
    args.divisions ??
    ([
      "makuuchi",
      "juryo",
      "makushita",
      "sandanme",
      "jonidan",
      "jonokuchi",
    ] as Division[]);

  const maxDays = 15;

  for (let day = 1; day <= maxDays; day++) {
    for (const div of divisions) {
      if (!needsScheduleForDay(div, day)) continue;

      scheduleDivisionDay({
        world: args.world,
        basho: args.basho,
        division: div,
        day,
        seed: args.seed,
        rules: args.rules,
      });
    }
  }
}

/**
 * Check if a specific day needs scheduling for a division.
 */
export function needsScheduleForDay(division: Division, day: number): boolean {
  if (day > 15) return false;

  const divDays = DEFAULT_DIVISION_DAYS[division];
  // Lower divisions fight on odd days only, up to day 13 (7 bouts: 1, 3, 5, 7, 9, 11, 13)
  if (divDays === 7) {
    if (day % 2 === 0) return false;
    if (day > 13) return false;
  }

  return true;
}

/**
 * Get total expected bouts for a division in a basho.
 */
export function getTotalBashodays(division: Division): number {
  return DEFAULT_DIVISION_DAYS[division];
}

/**
 * Ensure day schedule — checks if a schedule already exists for the day,
 * and generates it if missing.
 *
 * @param world WorldState
 * @param day Day number
 */
export function ensureDaySchedule(world: WorldState, day: number): void {
  const basho = world.currentBasho;
  if (!basho) return;

  const needsMakuuchi = needsScheduleForDay("makuuchi", day);
  const alreadyScheduled = basho.matches.some((m) => m.day === day);

  if (needsMakuuchi && !alreadyScheduled) {
    generateDaySchedule(world, basho, day, world.seed);
  }
}
