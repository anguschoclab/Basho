// schedule.ts
// =======================================================
// Schedule Builder v1.1 — Deterministic torikumi pairing for ALL divisions
// Uses matchmaking.ts for candidate generation and scoring.
// =======================================================
import { rngFromSeed, rngForWorld } from "./rng";
import { SeededRNG } from "./utils/SeededRNG";
import type { BashoState, Division, MatchSchedule, Rikishi, WorldState } from "./types";
import { buildCandidatePairs, DEFAULT_MATCHMAKING_RULES, type MatchPairing, type MatchmakingRules } from "./matchmaking";

export interface DivisionScheduleConfig {
  division: Division;
  /** number of bouts on a given day (usually roster/2) */
  boutsPerDay?: number;
  /** max active rikishi to consider (for huge lower divisions) */
  maxActiveRikishi?: number;
}

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
  jonokuchi: 7
};

// === HELPERS ===

function stableSort<T>(arr: T[], keyFn: (x: T) => string): T[] {
  return [...arr].sort((a, b) => keyFn(a).localeCompare(keyFn(b)));
}

function activeDivisionRoster(world: WorldState, division: Division): Rikishi[] {
  const pool: Rikishi[] = [];
  for (const r of world.rikishi.values()) {
    if (r.division === division && !r.injured) {
      pool.push(r);
    }
  }
  return stableSort(pool, r => r.id);
}

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
function greedySelectPairs(candidates: MatchPairing[], maxPairs: number): MatchPairing[] {
  const used = new Set<string>();
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
  const rng = rngFromSeed(args.seed, "schedule", `${division}::day${day}`);

  const roster = activeDivisionRoster(world, division);
  const maxActive = args.config?.maxActiveRikishi;
  const pool = typeof maxActive === "number" ? roster.slice(0, Math.max(0, maxActive)) : roster;

  const boutsPerDay = args.config?.boutsPerDay ?? Math.floor(pool.length / 2);
  if (boutsPerDay <= 0 || pool.length < 2) return [];

  const mmRules: Partial<MatchmakingRules> = {
    ...DEFAULT_MATCHMAKING_RULES,
    ...(rules.matchmaking ?? {})
  };

  const candidates = buildCandidatePairs(basho, pool, {
    seed: `${args.seed}-cand-${division}-day${day}`,
    rules: mmRules,
    division
  });

  // First pass: strict (no repeats)
  let selected = greedySelectPairs(candidates, boutsPerDay);

  // If we couldn't fill the card, optionally allow forced repeats (same-heya still disallowed)
  if (selected.length < boutsPerDay && (rules.allowForcedRepeats ?? true)) {
    const looseRules: Partial<MatchmakingRules> = {
      ...mmRules,
      avoidRepeatOpponents: false,
      allowRepeatsWhenForced: true
    };
    const looserCandidates = buildCandidatePairs(basho, pool, {
      seed: `${args.seed}-cand2-${division}-day${day}`,
      rules: looseRules,
      division
    });

    // Add additional pairs not overlapping
    const alreadyUsed = new Set<string>();
    for (const p of selected) {
      alreadyUsed.add(p.eastId);
      alreadyUsed.add(p.westId);
    }

    const extra: MatchPairing[] = [];
    for (const c of looserCandidates) {
      if (selected.length + extra.length >= boutsPerDay) break;
      if (alreadyUsed.has(c.eastId) || alreadyUsed.has(c.westId)) continue;
      extra.push(c);
      alreadyUsed.add(c.eastId);
      alreadyUsed.add(c.westId);
    }
    selected = [...selected, ...extra];
  }

  // Deterministic shuffle of final list so it doesn't always appear sorted by score
  const shuffled = [...selected];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const scheduled: MatchSchedule[] = [];
  for (const p of shuffled) {
    scheduled.push({
      day,
      eastRikishiId: p.eastId,
      westRikishiId: p.westId
    });
  }

  // Append to basho state (mutates basho.matches as engine expects)
  basho.matches.push(...scheduled);

  // Update opponent map (not strictly needed because basho.matches holds truth)
  void previousOpponentsSet(basho);

  return scheduled;
}

/**
 * Schedule all divisions for a single day.
 */
export function scheduleAllDivisionsDay(args: {
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
    (["jonokuchi", "jonidan", "sandanme", "makushita", "juryo", "makuuchi"] as Division[]);

  const out: MatchSchedule[] = [];
  for (const div of divisions) {
    out.push(
      ...scheduleDivisionDay({
        world: args.world,
        basho: args.basho,
        division: div,
        day: args.day,
        seed: args.seed,
        rules: args.rules
      })
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
  rules?: ScheduleRules
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
    (["makuuchi", "juryo", "makushita", "sandanme", "jonidan", "jonokuchi"] as Division[]);

  const maxDays = Math.max(...divisions.map(d => DEFAULT_DIVISION_DAYS[d]));

  for (let day = 1; day <= maxDays; day++) {
    for (const div of divisions) {
      const divDays = DEFAULT_DIVISION_DAYS[div];
      
      // Lower divisions (7 days) only fight on odd days: 1, 3, 5, 7, 9, 11, 13
      if (divDays === 7 && day % 2 === 0) continue;
      if (day > divDays) continue;

      scheduleDivisionDay({
        world: args.world,
        basho: args.basho,
        division: div,
        day,
        seed: args.seed,
        rules: args.rules
      });
    }
  }
}

/**
 * Check if a specific day needs scheduling for a division.
 */
export function needsScheduleForDay(division: Division, day: number): boolean {
  const maxDays = DEFAULT_DIVISION_DAYS[division];
  if (day > maxDays) return false;
  
  // Lower divisions fight on odd days only
  if (maxDays === 7 && day % 2 === 0) return false;
  
  return true;
}

/**
 * Get total expected bouts for a division in a basho.
 */
export function getTotalBashodays(division: Division): number {
  return DEFAULT_DIVISION_DAYS[division];
}