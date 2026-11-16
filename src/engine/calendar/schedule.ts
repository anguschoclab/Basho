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

import type { BashoState, MatchSchedule } from "@/engine/types/basho";
import type { Division } from "@/engine/types/banzuke";
import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";
import {
  buildSwissTorikumi,
  buildLowerDivisionSwiss,
  type MatchPairing,
} from "@/engine/matchmaking/index";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { StateImpact } from "@/engine/core/StateImpact";
import {
  getDivisionExpectedSize,
  activeDivisionRoster,
  needsScheduleForDay,
} from "@/engine/calendar/scheduleHelpers";
import type { DramaContext, DramaLabel } from "@/engine/matchmaking/DramaMatchmaker";
import { toKeyedMap } from "@/engine/utils/index";

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
  const scoreMap: Partial<Record<DramaLabel, number>> = {
    make_or_break: 100,
    yusho_decider: 85,
    kadoban_survival: 90,
    kinboshi_hunt: 50,
    senshuraku_finale: 70,
  };

  return {
    label,
    score: scoreMap[label] ?? 50,
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
  /** Rikishi to withhold from this division's pool (e.g. a juryo callup). */
  excludeIds?: ReadonlySet<string>;
  /** Pre-built bouts appended after pairing (e.g. the cross-division bout). */
  extraBouts?: MatchSchedule[];
}): { scheduled: MatchSchedule[]; impact: StateImpact } {
  const { world, basho, division, day, config } = args;

  const builder = createImpactBuilder("scheduleDivisionDay");
  const roster = activeDivisionRoster(world, division).filter(
    (r) => !args.excludeIds?.has(r.id)
  );
  const maxActiveRikishi = config?.maxActiveRikishi;
  if (!needsScheduleForDay(division, day)) return { scheduled: [], impact: builder.build() };

  const pool =
    typeof maxActiveRikishi === "number" ? roster.slice(0, Math.max(0, maxActiveRikishi)) : roster;

  if (pool.length < 2 && !args.extraBouts?.length)
    return { scheduled: [], impact: builder.build() };

  let finalPairings: MatchPairing[] = [];

  if (division === "makuuchi") {
    // ── JSA Swiss path (TDD §2.2–2.4) ─────────────────────────────────────
    if (pool.length >= 2) {
      finalPairings = buildSwissTorikumi(basho, pool, {
        seed: `${args.seed}-swiss-makuuchi-day${day}`,
        division: "makuuchi",
        rivalriesState: world.rivalriesState,
      });
    }
  } else if (["makushita", "sandanme", "jonidan", "jonokuchi"].includes(division)) {
    // ── NEW: 7-bout Division Swiss path ─────────────────────────────────
    if (pool.length >= 2) {
      finalPairings = buildLowerDivisionSwiss(basho, pool, {
        seed: `${args.seed}-lower-swiss-${division}-day${day}`,
        division,
      });
    }
  } else if (division === "juryo") {
    // ── Juryo with crossover from Makushita ─────────────────────────
    const { scheduled, impact: crossoverImpact } = scheduleJuryoWithCrossover(world, basho, {
      seed: args.seed,
      day,
      excludeIds: args.excludeIds,
    });

    builder.merge(crossoverImpact);
    return { scheduled, impact: builder.build() };
  } else {
    // Unsupported division fallback
    return { scheduled: [], impact: builder.build() };
  }

  // ── Political favor: matchmaking_avoid (day 1, one-shot) ──────────────
  // The requester's rikishi must not face their hottest rival heya today.
  const override = world.matchmakingOverride;
  if (day === 1 && override?.type === "avoid_rival") {
    const { pairings, consumed } = applyMatchmakingAvoid(
      finalPairings,
      pool,
      override.requesterId,
      world
    );
    finalPairings = pairings;
    if (consumed) builder.updateWorldField("matchmakingOverride", undefined);
  }

  const scheduled: MatchSchedule[] = finalPairings.map((p) => ({
    boutId: `b-${world.year}-${basho.bashoName}-d${day}-${p.eastId}-${p.westId}`,
    day,
    eastRikishiId: p.eastId,
    westRikishiId: p.westId,
    dramaticContext: extractDramaContext(p),
  }));

  // Cross-division bouts sit first on the card — the JSA opens the makuuchi
  // session with the juryo call-up.
  const ordered = [...(args.extraBouts ?? []), ...scheduled];

  // Append to basho state using ImpactBuilder
  builder.appendToWorldArray("basho.matches", ordered);

  return { scheduled: ordered, impact: builder.build() };
}

/**
 * Plan the juryo → makuuchi crossover for a day.
 *
 * When the makuuchi card is odd, the JSA calls up the top-ranked juryo
 * rikishi to face the lowest-ranked makuuchi man. The callup is planned
 * BEFORE the division loop so juryo scheduling can exclude him — his
 * vacated juryo slot then back-fills through the makushita crossover,
 * mirroring the real torikumi cascade.
 *
 * Returns null when makuuchi is even, no healthy juryo candidate exists,
 * or either division isn't scheduled today.
 */
export function planJuryoCallupForMakuuchi(
  world: WorldState,
  basho: BashoState,
  day: number
): { juryoId: string; makuuchiId: string } | null {
  if (!needsScheduleForDay("makuuchi", day) || !needsScheduleForDay("juryo", day)) return null;

  const makuuchiPool = activeDivisionRoster(world, "makuuchi");
  if (makuuchiPool.length < 3 || makuuchiPool.length % 2 === 0) return null;

  // Skip anyone already booked today (defensive — callers schedule divisions
  // in one pass, but standalone invocations may follow a partial card).
  const busyToday = new Set(
    basho.matches.filter((m) => m.day === day).flatMap((m) => [m.eastRikishiId, m.westRikishiId])
  );

  // The JSA calls up the top juryo man — a hurt rikishi isn't promoted into
  // a harder bout, so the pick skips `injured` (he still fights his juryo
  // bout via the normal card, which the competing-injury rules cover).
  const callup = activeDivisionRoster(world, "juryo")
    .filter((r) => !r.injured && !busyToday.has(r.id))
    .sort((a, b) => {
      const byRank = (a.rankNumber ?? 99) - (b.rankNumber ?? 99);
      if (byRank !== 0) return byRank;
      if (a.side !== b.side) return a.side === "east" ? -1 : 1;
      return a.id < b.id ? -1 : 1;
    })[0];
  if (!callup) return null;

  // The odd man out is the lowest-ranked makuuchi rikishi — matching real
  // torikumi where the callup opens the session against the bottom of the card.
  const oddMan = [...makuuchiPool].sort((a, b) => {
    const byRank = (b.rankNumber ?? 0) - (a.rankNumber ?? 0);
    if (byRank !== 0) return byRank;
    if (a.side !== b.side) return a.side === "west" ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  })[0];

  return { juryoId: callup.id, makuuchiId: oddMan.id };
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

  // W-B: plan the juryo → makuuchi crossover up front so the juryo loop can
  // exclude the callup (and back-fill his slot via makushita) and makuuchi
  // can append the cross-division bout.
  const crossover = planJuryoCallupForMakuuchi(args.world, args.basho, args.day);
  const crossBout: MatchSchedule | undefined = crossover
    ? {
        boutId: `b-${args.world.year}-${args.basho.bashoName}-d${args.day}-${crossover.makuuchiId}-${crossover.juryoId}`,
        day: args.day,
        eastRikishiId: crossover.makuuchiId,
        westRikishiId: crossover.juryoId,
        crossDivisionCallupId: crossover.juryoId,
      }
    : undefined;

  const builder = createImpactBuilder("scheduleAllDivisionsDay");
  const out: MatchSchedule[] = [];
  for (const div of divisions) {
    const { scheduled, impact } = scheduleDivisionDay({
      world: args.world,
      basho: args.basho,
      division: div,
      day: args.day,
      seed: args.seed,
      excludeIds:
        crossover && div === "juryo"
          ? new Set([crossover.juryoId])
          : crossover && div === "makuuchi"
            ? new Set([crossover.makuuchiId])
            : undefined,
      extraBouts: crossBout && div === "makuuchi" ? [crossBout] : undefined,
    });
    out.push(...scheduled);
    builder.merge(impact);
  }
  return { scheduled: out, impact: builder.build() };
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
  options: { seed: string; day?: number; excludeIds?: ReadonlySet<string> }
): { scheduled: MatchSchedule[]; impact: StateImpact } {
  const builder = createImpactBuilder("scheduleJuryoWithCrossover");
  const division = "juryo";
  // The caller's requested day wins — basho.day is only the fallback (S7-23).
  const day = options.day ?? basho.day ?? 1;

  if (!needsScheduleForDay(division, day)) {
    return { scheduled: [], impact: builder.build() };
  }

  // excludeIds: the makuuchi-callup rikishi is withheld here — his vacated
  // slot then counts toward oddSlots and back-fills via makushita (W-B).
  let pool = activeDivisionRoster(world, division).filter(
    (r) => !options.excludeIds?.has(r.id)
  );
  const expectedSize = getDivisionExpectedSize(division);
  const actualSize = pool.length;

  // Check for odd slots (injured or kyujo)
  const oddSlots = expectedSize - actualSize;

  if (oddSlots > 0) {
    // Call up top Makushita (Ms1-Ms5)
    // Exclude rikishi already scheduled for this day — makushita is
    // scheduled before juryo, so without this a call-up gets two bouts.
    const busyToday = new Set(
      basho.matches.filter((m) => m.day === day).flatMap((m) => [m.eastRikishiId, m.westRikishiId])
    );
    const makushitaPool = activeDivisionRoster(world, "makushita")
      .filter((r) => !r.injured && !r.isKyujo && !busyToday.has(r.id))
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

  // For lower divisions and Juryo, we still use the lower division swiss logic or similar.
  // NOTE: no `division` filter — the pool intentionally mixes juryo with
  // makushita callups; passing division: "juryo" silently dropped every
  // callup, leaving a healthy juryo rikishi unpaired (phantom absence at
  // performance publication).
  let finalPairings = buildLowerDivisionSwiss(basho, pool, {
    seed: `${options.seed}-juryo-crossover-day${day}`,
  });

  // ── Political favor: matchmaking_avoid (day 1, one-shot) ──────────────
  // Same rule as the makuuchi/lower-division path — without it a
  // juryo-only requester's favor survives the whole day-1 pipeline
  // because this function returns before the shared override block.
  const override = world.matchmakingOverride;
  if (day === 1 && override?.type === "avoid_rival") {
    const { pairings, consumed } = applyMatchmakingAvoid(
      finalPairings,
      pool,
      override.requesterId,
      world
    );
    finalPairings = pairings;
    if (consumed) builder.updateWorldField("matchmakingOverride", undefined);
  }

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

// ── Matchmaking override consumer (political favor) ─────────────────────────

/**
 * Repair pass for the `matchmaking_avoid` political favor: on day 1, no
 * rikishi from the requesting heya may be paired against a rikishi from their
 * hottest rival heya (per `rivalriesState.heyaRivalryPairs` heat).
 *
 * Deterministic swap repair: for each forbidden pairing, swap the rival-heya
 * rikishi with the same-side rikishi of the next pairing where the swap keeps
 * same-heya avoidance intact on both pairings.
 */
function applyMatchmakingAvoid(
  pairings: MatchPairing[],
  pool: Rikishi[],
  requesterHeyaId: string,
  world: WorldState
): { pairings: MatchPairing[]; consumed: boolean } {
  const heyaOf = toKeyedMap(
    pool,
    (r) => r.id,
    (r) => r.heyaId
  );
  const requesterInPool = pool.some((r) => r.heyaId === requesterHeyaId);
  if (!requesterInPool) return { pairings, consumed: false };

  // Requester's hottest rival heya.
  const rivalPairs = world.rivalriesState?.heyaRivalryPairs;
  // ⚡ Bolt: Replaced chained array methods (.filter().sort().map()[0]) with a single-pass loop
  // to reduce memory allocations (GC pressure) and algorithmic complexity (O(N log N) -> O(N)).
  let rivalHeyaId: string | undefined;
  if (rivalPairs) {
    let maxHeat = -Infinity;
    for (const p of Object.values(rivalPairs)) {
      if (p.heyaAId === requesterHeyaId || p.heyaBId === requesterHeyaId) {
        if (p.heat > maxHeat) {
          maxHeat = p.heat;
          rivalHeyaId = p.heyaAId === requesterHeyaId ? p.heyaBId : p.heyaAId;
        }
      }
    }
  }
  // Favor is consumed once the requester's division is scheduled on day 1,
  // even if no rival pairing needed repair.
  if (!rivalHeyaId) return { pairings, consumed: true };

  const out = pairings.map((p) => ({ ...p }));
  const isForbidden = (p: MatchPairing): boolean => {
    const a = heyaOf.get(p.eastId);
    const b = heyaOf.get(p.westId);
    return (
      (a === requesterHeyaId && b === rivalHeyaId) || (a === rivalHeyaId && b === requesterHeyaId)
    );
  };
  const sameHeya = (x: string | undefined, y: string | undefined) => x !== undefined && x === y;

  for (let i = 0; i < out.length; i++) {
    if (!isForbidden(out[i])) continue;
    // Which side holds the rival rikishi?
    const rivalSide: "eastId" | "westId" =
      heyaOf.get(out[i].eastId) === rivalHeyaId ? "eastId" : "westId";
    // Find a swap partner on the same side in a later pairing.
    for (let j = i + 1; j < out.length; j++) {
      const cand = out[j][rivalSide];
      const candHeya = heyaOf.get(cand);
      if (candHeya === rivalHeyaId || candHeya === requesterHeyaId) continue;
      // Check both pairings stay same-heya-safe after the swap.
      const iOther = out[i][rivalSide === "eastId" ? "westId" : "eastId"];
      const jOther = out[j][rivalSide === "eastId" ? "westId" : "eastId"];
      if (sameHeya(heyaOf.get(cand), heyaOf.get(iOther))) continue;
      if (sameHeya(heyaOf.get(out[i][rivalSide]), heyaOf.get(jOther))) continue;
      const tmp = out[i][rivalSide];
      out[i] = { ...out[i], [rivalSide]: cand, reasons: [...out[i].reasons, "favor_avoid_rival"] };
      out[j] = { ...out[j], [rivalSide]: tmp };
      break;
    }
  }
  return { pairings: out, consumed: true };
}
