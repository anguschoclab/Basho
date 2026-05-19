/**
 * src/engine/schedule.ts
 * =====================
 * Basho Match Scheduling System
 *
 * Handles match scheduling for all divisions across basho days.
 * Uses Swiss algorithm for makuuchi and lower divisions.
 *
 * @see SwissAlgorithm for Swiss pairing logic
 * @see scheduleHelpers for scheduling utilities
 */

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
import type { DramaContext, DramaLabel } from "./matchmaking/DramaMatchmaker";

// === DRAMA CONTEXT EXTRACTION ===

/**
 * Extracts drama context from MatchPairing reasons array.
 * Looks for drama_* prefixes and converts to DramaContext.
 *
 * @param {MatchPairing} pairing - The MatchPairing to extract drama context from
 * @returns {DramaContext | undefined} DramaContext if a drama reason is found, otherwise undefined
 */
function extractDramaContext(pairing: MatchPairing): DramaContext | undefined {
  const dramaReason = pairing.reasons.find((r) => r.startsWith("drama_"));
  if (!dramaReason) return undefined;

  const label = dramaReason.replace("drama_", "") as DramaLabel;

  // Map drama labels to scores
  const scoreMap: Record<DramaLabel, number> = {
    make_or_break: 100,
    yusho_decider: 85,
    kadoban_survival: 90,
    kinboshi_hunt: 50,
    senshuraku_finale: 70,
  };

  return {
    label,
    score: scoreMap[label] || 50,
    reason: dramaReason,
  };
}

// === CORE SCHEDULING ===

/**
 * Schedule bouts for a single division on a single day.
 * Appends matches to basho.matches and returns the new matches.
 *
 * Algorithm:
 * 1. Check if division needs scheduling for this day
 * 2. Get active roster for the division
 * 3. Apply maxActiveRikishi limit if configured
 * 4. Use Swiss algorithm for makuuchi division
 * 5. Use lower division Swiss for makushita, sandanme, jonidan, jonokuchi
 * 6. Handle juryo with crossover from makushita
 * 7. Extract drama context from pairings
 * 8. Build impact with scheduled matches
 *
 * @param {Object} args - Scheduling arguments
 * @param {WorldState} args.world - Current world state
 * @param {BashoState} args.basho - Current basho state
 * @param {Division} args.division - Division to schedule
 * @param {number} args.day - Day number (1-15)
 * @param {string} args.seed - Seed for deterministic pairing
 * @param {Object} [args.config] - Optional configuration
 * @param {number} [args.config.maxActiveRikishi] - Limit on active rikishi to schedule
 * @returns {{scheduled: MatchSchedule[], impact: StateImpact}} Scheduled matches and state impact
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
    dramaticContext: extractDramaContext(p),
  }));

  // Append to basho state using ImpactBuilder
  builder.appendToWorldArray("basho.matches", scheduled);

  return { scheduled, impact: builder.build() };
}

/**
 * Schedule all divisions for a single day.
 * Returns StateImpact describing scheduled matches instead of mutating directly.
 *
 * @param {Object} args - Scheduling arguments
 * @param {WorldState} args.world - Current world state
 * @param {BashoState} args.basho - Current basho state
 * @param {number} args.day - Day number (1-15)
 * @param {string} args.seed - Seed for deterministic pairing
 * @param {Division[]} [args.divisions] - Optional list of divisions to schedule
 * @returns {{scheduled: MatchSchedule[], impact: StateImpact}} Scheduled matches and state impact
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
 *
 * @param {Object} args - Scheduling arguments
 * @param {WorldState} args.world - Current world state
 * @param {BashoState} args.basho - Current basho state
 * @param {string} args.seed - Seed for deterministic pairing
 * @param {Division[]} [args.divisions] - Optional list of divisions to schedule
 * @returns {StateImpact} State impact describing all scheduled matches
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
 *
 * Algorithm:
 * 1. Check if Juryo needs scheduling for this day
 * 2. Get active Juryo roster
 * 3. Calculate expected size vs actual size to find odd slots
 * 4. If odd slots exist, call up top 5 healthy Makushita rikishi
 * 5. Temporarily add callups to the pool for scheduling
 * 6. Use lower division Swiss algorithm for pairing
 * 7. Extract drama context and build impact
 *
 * @param {WorldState} world - Current world state
 * @param {BashoState} basho - Current basho state
 * @param {Object} options - Scheduling options
 * @param {string} options.seed - Seed for deterministic pairing
 * @returns {{scheduled: MatchSchedule[], impact: StateImpact}} Scheduled matches and state impact
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
    dramaticContext: extractDramaContext(p),
  }));

  builder.appendToWorldArray("basho.matches", scheduled);

  return { scheduled, impact: builder.build() };
}

/**
 * Ensure day schedule — checks if a schedule already exists for the day.
 * If makuuchi needs scheduling and no schedule exists, generates one.
 *
 * @param {WorldState} world - Current world state
 * @param {number} day - Day number (1-15)
 * @returns {StateImpact} State impact if scheduling was needed, empty impact otherwise
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
