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
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import type { StateImpact } from "@/engine/core/StateImpact";
import {
  getDivisionExpectedSize,
  activeDivisionRoster,
  needsScheduleForDay,
} from "@/engine/calendar/scheduleHelpers";
import {
  CALLUP_CASCADE_ORDER,
  MAEZUMO_MINT_CAP,
  MAEZUMO_CALLUP_STAT,
  EIGHTH_BOUT_DAY,
  LOWER_DIVISION_BOUT_COUNT,
} from "@/constants/engine/matchmaking";
import { generateFullRikishi } from "@/engine/generation/CandidateBuilder";
import { SeededRNG } from "@/engine/core/rng";
import type { DramaContext, DramaLabel } from "@/engine/matchmaking/DramaMatchmaker";
import { toKeyedMap } from "@/engine/utils/index";
import { isEphemeralMaezumoEntrant, scheduleMaezumoDay } from "@/engine/basho/maezumoPrelims";
import { scorePairing } from "@/engine/matchmaking/MatchmakingPhases";
import { buildFacedSet, pairKey } from "@/engine/matchmaking/swissShared";

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
  /** W L — callups joining this division's Swiss pool (juryo only). */
  extraPoolIds?: readonly string[];
}): { scheduled: MatchSchedule[]; impact: StateImpact } {
  const { world, basho, division, day, config } = args;

  const builder = createImpactBuilder("scheduleDivisionDay");
  const roster = activeDivisionRoster(world, division).filter((r) => !args.excludeIds?.has(r.id));
  const maxActiveRikishi = config?.maxActiveRikishi;
  if (!needsScheduleForDay(division, day)) return { scheduled: [], impact: builder.build() };

  const pool =
    typeof maxActiveRikishi === "number" ? roster.slice(0, Math.max(0, maxActiveRikishi)) : roster;

  if (pool.length < 2 && !args.extraBouts?.length)
    return { scheduled: [], impact: builder.build() };

  let finalPairings: MatchPairing[] = [];
  const bashoForDay: BashoState = basho.day === day ? basho : { ...basho, day, currentDay: day };

  if (division === "makuuchi") {
    // ── JSA Swiss path (TDD §2.2–2.4) ─────────────────────────────────────
    if (pool.length >= 2) {
      finalPairings = buildSwissTorikumi(bashoForDay, pool, {
        seed: `${args.seed}-swiss-makuuchi-day${day}`,
        division: "makuuchi",
        day,
        rivalriesState: world.rivalriesState,
      });
    }
  } else if (["makushita", "sandanme", "jonidan", "jonokuchi"].includes(division)) {
    // ── NEW: 7-bout Division Swiss path ─────────────────────────────────
    if (pool.length >= 2) {
      finalPairings = buildLowerDivisionSwiss(bashoForDay, pool, {
        seed: `${args.seed}-lower-swiss-${division}-day${day}`,
        division,
        day,
      });
    }
  } else if (division === "juryo") {
    // ── Juryo with crossover from Makushita ─────────────────────────
    const { scheduled, impact: crossoverImpact } = scheduleJuryoWithCrossover(world, bashoForDay, {
      seed: args.seed,
      day,
      excludeIds: args.excludeIds,
      callupIds: args.extraPoolIds,
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

// ── W L: No-byes callup cascade ────────────────────────────────────────────────

/**
 * The complete callup plan for a day, computed top-down before any division
 * schedules. In honbasho nobody sits out: an odd pool absorbs the top rikishi
 * of the division below (a fixed bout against the receiving division's bottom
 * man), which can leave THAT division odd — the cascade continues down to
 * jonokuchi, where a maezumo entrant or an 8th bout (hachiban-zumo) fills.
 */
export interface DivisionCallupPlan {
  /** Per-division natives withheld from that division's Swiss pool — either
   *  called UP to the division above, or reserved for a fixed cross bout. */
  excludeIds: Map<Division, Set<string>>;
  /** Juryo: makushita callups merged into the juryo Swiss pool. */
  includePool: Map<Division, Rikishi[]>;
  /** Fixed cross-division bouts appended to each receiving division's card. */
  fixedBouts: Map<Division, MatchSchedule[]>;
  /** Ephemeral maezumo entrants to persist via the schedule impact. */
  maezumoToAdd: Rikishi[];
}

/** Banzuke-order ascending — top of a division first (east before west). */
function byTopRank(a: Rikishi, b: Rikishi): number {
  const byRank = (a.rankNumber ?? 99) - (b.rankNumber ?? 99);
  if (byRank !== 0) return byRank;
  if (a.side !== b.side) return a.side === "east" ? -1 : 1;
  return a.id < b.id ? -1 : 1;
}

/** Banzuke-order descending — bottom of a division first (west before east). */
function byBottomRank(a: Rikishi, b: Rikishi): number {
  const byRank = (b.rankNumber ?? 0) - (a.rankNumber ?? 0);
  if (byRank !== 0) return byRank;
  if (a.side !== b.side) return a.side === "west" ? -1 : 1;
  return a.id < b.id ? -1 : 1;
}

/** Mint an ephemeral maezumo entrant (unranked preliminary filler). */
function mintMaezumoEntrant(world: WorldState, basho: BashoState, index: number): Rikishi {
  const id = `maezumo-${basho.id}-${index}`;
  const rng = new SeededRNG(`${world.seed}::maezumo::${id}`);
  const entrant = generateFullRikishi({
    id,
    rng,
    currentYear: world.year,
    rank: "jonokuchi",
    division: "jonokuchi",
    side: index % 2 === 0 ? "east" : "west",
    rankNumber: 900 + index,
  });
  const stat = MAEZUMO_CALLUP_STAT;
  return {
    ...entrant,
    isMaezumo: true,
    isEphemeralMaezumo: true,
    // Real maezumo entrants are unattached (no stable yet) — a fake "maezumo"
    // heyaId produces dangling refs across requests/events/NPC posture. The
    // field is a required string, so "" is the unattached convention (the
    // `!r.heyaId` guards throughout the tick phases already skip it).
    heyaId: "",
    stats: {
      ...entrant.stats,
      power: stat,
      speed: stat,
      technique: stat,
      stamina: stat,
      mental: stat,
      balance: stat,
      aggression: stat,
      experience: 0,
      adaptability: stat,
    },
  };
}

/**
 * One pass over `basho.matches` yielding both per-day participant sets and
 * resolved-bout counts per rikishi. Replaces the old per-rikishi match
 * rescan — the hachiban-zumo scan asks the same question for every
 * lower-division candidate, so the index costs O(matches) once instead of
 * O(rikishi × matches) per day.
 */
function matchDayIndex(
  basho: BashoState,
  day: number
): { busyToday: Set<string>; boutCounts: Map<string, number> } {
  const busyToday = new Set<string>();
  const boutCounts = new Map<string, number>();
  for (const m of basho.matches) {
    if (m.day === day) {
      busyToday.add(m.eastRikishiId);
      busyToday.add(m.westRikishiId);
    }
    if (m.result) {
      boutCounts.set(m.eastRikishiId, (boutCounts.get(m.eastRikishiId) ?? 0) + 1);
      boutCounts.set(m.westRikishiId, (boutCounts.get(m.westRikishiId) ?? 0) + 1);
    }
  }
  return { busyToday, boutCounts };
}

/** Pick the hachiban-zumo filler — a lower-division man finishing his 7th. */
function pickEighthBoutMan(
  world: WorldState,
  skip: Set<string>,
  boutCounts: Map<string, number>
): Rikishi | undefined {
  const candidates: Rikishi[] = [];
  for (const div of ["makushita", "sandanme", "jonidan", "jonokuchi"] as const) {
    for (const r of activeDivisionRoster(world, div)) {
      if (r.injured || skip.has(r.id)) continue;
      // ≥6 completed: he completes his 7th on today's card, then fights the 8th.
      if ((boutCounts.get(r.id) ?? 0) >= LOWER_DIVISION_BOUT_COUNT - 1) candidates.push(r);
    }
  }
  candidates.sort(byBottomRank);
  return candidates[0];
}

export function planDivisionCallups(args: {
  world: WorldState;
  basho: BashoState;
  day: number;
  divisions?: Division[];
}): DivisionCallupPlan {
  const { world, basho, day } = args;
  const plan: DivisionCallupPlan = {
    excludeIds: new Map(),
    includePool: new Map(),
    fixedBouts: new Map(),
    maezumoToAdd: [],
  };
  // Parity checks run top-down in JSA cascade order; args.divisions only
  // selects WHICH divisions schedule today, never the direction of the scan.
  const scheduledSet = new Set<Division>(args.divisions ?? [...CALLUP_CASCADE_ORDER]);
  const order = CALLUP_CASCADE_ORDER.filter((d) => scheduledSet.has(d)) as Division[];

  // Single O(matches) pass — the hachiban-zumo scan would otherwise re-scan
  // every resolved match per lower-division candidate (~1.5M compares/day),
  // and the participant filter avoids a second pass for busyToday.
  const { busyToday, boutCounts } = matchDayIndex(basho, day);
  const excluded = (d: Division) => plan.excludeIds.get(d) ?? new Set<string>();
  const excludedEverywhere = () => {
    const all = new Set<string>();
    for (const s of plan.excludeIds.values()) for (const id of s) all.add(id);
    return all;
  };
  const rosterOf = (d: Division) =>
    activeDivisionRoster(world, d).filter((r) => !excluded(d).has(r.id) && !busyToday.has(r.id));
  const pushFixed = (d: Division, m: MatchSchedule) => {
    const list = plan.fixedBouts.get(d) ?? [];
    list.push(m);
    plan.fixedBouts.set(d, list);
  };
  const markExcluded = (d: Division, id: string) => {
    const s = plan.excludeIds.get(d) ?? new Set<string>();
    s.add(id);
    plan.excludeIds.set(d, s);
  };
  const boutId = (e: string, w: string) => `b-${world.year}-${basho.bashoName}-d${day}-${e}-${w}`;

  for (let i = 0; i < order.length; i++) {
    const D = order[i];
    if (!needsScheduleForDay(D, day)) continue;

    // Makuuchi keeps the W B juryo-callup semantics verbatim.
    if (D === "makuuchi") {
      const roster = rosterOf(D);
      if (roster.length % 2 === 1 && roster.length >= 3) {
        const cross = planJuryoCallupForMakuuchi(world, basho, day);
        if (cross) {
          markExcluded("makuuchi", cross.makuuchiId);
          markExcluded("juryo", cross.juryoId);
          pushFixed("makuuchi", {
            boutId: boutId(cross.makuuchiId, cross.juryoId),
            day,
            eastRikishiId: cross.makuuchiId,
            westRikishiId: cross.juryoId,
            crossDivisionCallupId: cross.juryoId,
          });
        }
      }
      continue;
    }

    // Juryo fills roster shortfall via pool-merge (existing semantics) — the
    // plan merely fixes WHICH makushita men go, before their card is set.
    if (D === "juryo") {
      const roster = rosterOf(D);
      const oddSlots = getDivisionExpectedSize(D) - roster.length;
      if (oddSlots <= 0) {
        // Parity fallback: even expected size but odd actual pool.
        if (roster.length % 2 === 0) continue;
      }
      const taken = excludedEverywhere();
      const makushitaPool = activeDivisionRoster(world, "makushita")
        .filter((r) => !r.injured && !taken.has(r.id) && !busyToday.has(r.id))
        .sort(byTopRank);
      let need = Math.max(oddSlots, roster.length % 2 === 1 ? 1 : 0);
      need = Math.min(need, 5, makushitaPool.length);
      // Keep the merged juryo pool even (within the 5-man joi cap).
      const cap = Math.min(5, makushitaPool.length);
      if ((roster.length + need) % 2 === 1 && need < cap) need++;
      const callups = makushitaPool.slice(0, Math.max(0, need));
      if (callups.length > 0) plan.includePool.set("juryo", callups);
      for (const c of callups) markExcluded("makushita", c.id);
      continue;
    }

    // Lower divisions: odd pool → top man of a lower division, fixed bout.
    const roster = rosterOf(D).sort(byBottomRank);
    if (roster.length % 2 === 0) continue;
    const bottom = roster[0];

    // Scan every division below D in cascade order — a donor division need
    // not be scheduling its own card today to supply its top man.
    let callup: Rikishi | undefined;
    const lowerDivs = CALLUP_CASCADE_ORDER.slice(CALLUP_CASCADE_ORDER.indexOf(D) + 1) as Division[];
    for (const lower of lowerDivs) {
      if (callup) break;
      const taken = excludedEverywhere();
      callup = activeDivisionRoster(world, lower)
        .filter((r) => !r.injured && !taken.has(r.id) && !busyToday.has(r.id) && !r.isMaezumo)
        .sort(byTopRank)[0];
      if (callup) markExcluded(lower, callup.id);
    }

    if (!callup && D === "jonokuchi") {
      callup = resolveJonokuchiFill(world, basho, day, excludedEverywhere(), plan, boutCounts);
    }

    if (!callup) continue; // documented edge — the odd man sits.
    markExcluded(D, bottom.id);
    const isEighth =
      !callup.isMaezumo && day === EIGHTH_BOUT_DAY && (boutCounts.get(callup.id) ?? 0) > 0;
    pushFixed(D, {
      boutId: boutId(bottom.id, callup.id),
      day,
      eastRikishiId: bottom.id,
      westRikishiId: callup.id,
      crossDivisionCallupId: callup.id,
      ...(callup.isMaezumo ? {} : isEighth ? { eighthBoutForRikishiId: callup.id } : {}),
    });
  }

  return plan;
}

/**
 * Jonokuchi fill: reuse an available maezumo entrant, mint one under the cap,
 * or — on the last lower-division day — pull a man finishing his 7th for an
 * 8th bout.
 */
function resolveJonokuchiFill(
  world: WorldState,
  basho: BashoState,
  day: number,
  taken: Set<string>,
  plan: DivisionCallupPlan,
  boutCounts: Map<string, number>
): Rikishi | undefined {
  const existing: Rikishi[] = [];
  let liveMaezumo = 0;
  for (const r of world.rikishi.values()) {
    // Only minted fillers balance a card — enrolled shin-deshi fight their
    // own maezumo preliminary (maezumoPrelims.ts).
    if (!isEphemeralMaezumoEntrant(r) || r.isRetired) continue;
    liveMaezumo++;
    if (!r.injured && !r.isKyujo && !taken.has(r.id)) existing.push(r);
  }
  existing.sort((a, b) => (a.id < b.id ? -1 : 1));
  if (existing[0]) return existing[0];
  if (liveMaezumo + plan.maezumoToAdd.length < MAEZUMO_MINT_CAP) {
    const entrant = mintMaezumoEntrant(world, basho, liveMaezumo + plan.maezumoToAdd.length);
    plan.maezumoToAdd.push(entrant);
    return entrant;
  }
  if (day === EIGHTH_BOUT_DAY) return pickEighthBoutMan(world, taken, boutCounts);
  return undefined;
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

  // W L: the whole callup cascade is planned up front — a rikishi called up
  // is excluded from his own division's card and paired on the receiving
  // division's card, exactly as the JSA builds the torikumi.
  const plan = planDivisionCallups({
    world: args.world,
    basho: args.basho,
    day: args.day,
    divisions,
  });

  const builder = createImpactBuilder("scheduleAllDivisionsDay");
  for (const maezumo of plan.maezumoToAdd) builder.addRikishi(maezumo);

  // Surface callups involving the player's stable — a player's rikishi
  // stepping onto a higher card (or hosting one) is player-facing news.
  const playerHeyaId = args.world.playerHeyaId;
  if (playerHeyaId) {
    const rikishiById = args.world.rikishi;
    const playerRikishiIds = new Set<string>();
    for (const r of rikishiById.values()) {
      if (r.heyaId === playerHeyaId) playerRikishiIds.add(r.id);
    }
    const fixedBouts = [...plan.fixedBouts.values()].flat();
    for (const bout of fixedBouts) {
      const involvesPlayer =
        playerRikishiIds.has(bout.eastRikishiId) || playerRikishiIds.has(bout.westRikishiId);
      if (!involvesPlayer || !bout.crossDivisionCallupId) continue;
      const callup = rikishiById.get(bout.crossDivisionCallupId);
      if (!callup) continue;
      // When the player owns both sides, the callup angle is the news.
      const playerParticipantId = playerRikishiIds.has(callup.id)
        ? callup.id
        : playerRikishiIds.has(bout.eastRikishiId)
          ? bout.eastRikishiId
          : bout.westRikishiId;
      const playerRikishi = rikishiById.get(playerParticipantId);
      const isCallup = playerParticipantId === callup.id;
      builder.logEvent(
        "BASHO_STATUS",
        "basho",
        {
          status: "callup",
          rikishiId: playerParticipantId,
          shikona: playerRikishi?.shikona,
          callupId: callup.id,
          callupShikona: callup.shikona,
          role: isCallup ? "called_up" : "host",
          day: args.day,
          division: callup.division,
        },
        { heyaId: playerHeyaId, rikishiId: playerParticipantId, importance: "notable" }
      );
    }
  }

  const out: MatchSchedule[] = [];
  for (const div of divisions) {
    const { scheduled, impact } = scheduleDivisionDay({
      world: args.world,
      basho: args.basho,
      division: div,
      day: args.day,
      seed: args.seed,
      excludeIds: plan.excludeIds.get(div),
      extraBouts: plan.fixedBouts.get(div),
      extraPoolIds: plan.includePool.get(div)?.map((r) => r.id),
    });
    out.push(...scheduled);
    builder.merge(impact);
  }

  // W L — cross-division leftover pass: the hard bars (no stablemates,
  // no rematches) can leave a rikishi without a legal in-division
  // partner. The JSA absorbs such leftovers across divisions — a real
  // torikumi never forces a violation and never declares a bye while a
  // legal pairing exists anywhere on the sheet.
  out.push(...pairCrossDivisionLeftovers(args, divisions, plan, out, builder));

  // §3 maezumo — shin-deshi preliminaries ride on the jonokuchi card days.
  if (divisions.includes("jonokuchi")) {
    const busy = new Set(out.flatMap((m) => [m.eastRikishiId, m.westRikishiId]));
    const mzScheduled = scheduleMaezumoDay(args.world, args.basho, args.day, busy);
    if (mzScheduled.length > 0) {
      out.push(...mzScheduled);
      builder.appendToWorldArray("basho.matches", mzScheduled);
    }
  }
  return { scheduled: out, impact: builder.build() };
}

/**
 * Pairs rikishi left unpaired by the hard-rule sweeps across divisions.
 * Greedy scan over leftovers from every scheduled division: each rikishi
 * takes the first remaining partner who passes `scorePairing` under the
 * standard rules — stablemates and rematches are still never allowed.
 * Cross-division pairs tag the lower-division participant as the callup
 * for downstream stat accounting.
 */
function pairCrossDivisionLeftovers(
  args: { world: WorldState; basho: BashoState; day: number; seed: string },
  divisions: Division[],
  plan: ReturnType<typeof planDivisionCallups>,
  scheduled: MatchSchedule[],
  builder: ReturnType<typeof createImpactBuilder>
): MatchSchedule[] {
  const busy = new Set(scheduled.flatMap((m) => [m.eastRikishiId, m.westRikishiId]));
  const leftovers: Rikishi[] = [];
  for (const div of divisions) {
    // Only divisions that ran a card today can leave leftovers — sweeping an
    // off-day division's whole roster paired lower-division rikishi on every
    // even day, doubling their bout count past the 7-bout cadence.
    if (!needsScheduleForDay(div, args.day)) continue;
    for (const r of activeDivisionRoster(args.world, div)) {
      if (!busy.has(r.id) && !plan.excludeIds.get(div)?.has(r.id)) leftovers.push(r);
    }
  }
  if (leftovers.length < 2) return [];

  const bashoForDay: BashoState =
    args.basho.day === args.day
      ? args.basho
      : { ...args.basho, day: args.day, currentDay: args.day };
  const faced = buildFacedSet(bashoForDay);
  for (const m of scheduled) faced.add(pairKey(m.eastRikishiId, m.westRikishiId));

  const claimed = new Set<string>();
  const extras: MatchSchedule[] = [];
  for (let i = 0; i < leftovers.length; i++) {
    const a = leftovers[i];
    if (claimed.has(a.id)) continue;
    for (let j = i + 1; j < leftovers.length; j++) {
      const b = leftovers[j];
      if (claimed.has(b.id)) continue;
      const p = scorePairing({
        basho: bashoForDay,
        a,
        b,
        day: args.day,
        facedPairs: faced,
      });
      if (!p) continue;
      claimed.add(a.id);
      claimed.add(b.id);
      faced.add(pairKey(a.id, b.id));
      extras.push({
        boutId: `b-${args.world.year}-${args.basho.bashoName}-d${args.day}-${p.eastId}-${p.westId}`,
        day: args.day,
        eastRikishiId: p.eastId,
        westRikishiId: p.westId,
        dramaticContext: extractDramaContext(p),
        ...(a.division !== b.division
          ? {
              crossDivisionCallupId:
                divisions.indexOf(a.division) < divisions.indexOf(b.division) ? a.id : b.id,
            }
          : {}),
      });
      break;
    }
  }
  if (extras.length > 0) builder.appendToWorldArray("basho.matches", extras);
  return extras;
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
  options: {
    seed: string;
    day?: number;
    excludeIds?: ReadonlySet<string>;
    callupIds?: readonly string[];
  }
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
  let pool = activeDivisionRoster(world, division).filter((r) => !options.excludeIds?.has(r.id));
  const expectedSize = getDivisionExpectedSize(division);
  const actualSize = pool.length;

  // Check for odd slots (injured or kyujo)
  const oddSlots = expectedSize - actualSize;

  const callupIdSet = new Set<string>();
  if (oddSlots > 0 || options.callupIds?.length) {
    let callups: Rikishi[];
    if (options.callupIds?.length) {
      // W L — the top-down plan already chose these men before the makushita
      // card was built, so they are never "busy today".
      callups = options.callupIds
        .map((id) => world.rikishi.get(id))
        .filter((r): r is Rikishi => !!r && !r.injured && !r.isKyujo);
    } else {
      // Legacy self-selection — call up top Makushita (Ms1-Ms5). Exclude
      // rikishi already scheduled for this day — makushita is scheduled
      // before juryo, so without this a call-up gets two bouts.
      const busyToday = new Set(
        basho.matches
          .filter((m) => m.day === day)
          .flatMap((m) => [m.eastRikishiId, m.westRikishiId])
      );
      const makushitaPool = activeDivisionRoster(world, "makushita")
        .filter((r) => !r.injured && !r.isKyujo && !busyToday.has(r.id))
        .sort(byTopRank);
      callups = makushitaPool.slice(0, Math.min(oddSlots, 5, makushitaPool.length));
    }

    // Temporarily move callups to Juryo for scheduling
    pool = [...pool, ...callups];
    for (const c of callups) callupIdSet.add(c.id);
  }

  // Use a temporary basho state to avoid early pollution
  const boutsPerDay = Math.floor(pool.length / 2);
  if (boutsPerDay <= 0) return { scheduled: [], impact: builder.build() };

  // For lower divisions and Juryo, we still use the lower division swiss logic or similar.
  // NOTE: no `division` filter — the pool intentionally mixes juryo with
  // makushita callups; passing division: "juryo" silently dropped every
  // callup, leaving a healthy juryo rikishi unpaired (phantom absence at
  // performance publication).
  // `rivalriesState` is forwarded here (and by the makuuchi path) but NOT by
  // the true lower-division call — juryo is sekitori, so heat-aware pairing
  // applies; the lower-division absence stays a documented design choice.
  let finalPairings = buildLowerDivisionSwiss(basho, pool, {
    seed: `${options.seed}-juryo-crossover-day${day}`,
    day,
    rivalriesState: world.rivalriesState,
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

  const scheduled: MatchSchedule[] = finalPairings.map((p) => {
    const callupId = callupIdSet.has(p.eastId)
      ? p.eastId
      : callupIdSet.has(p.westId)
        ? p.westId
        : undefined;
    return {
      boutId: `b-${world.year}-${basho.bashoName}-d${day}-${p.eastId}-${p.westId}`,
      day,
      eastRikishiId: p.eastId,
      westRikishiId: p.westId,
      dramaticContext: extractDramaContext(p),
      ...(callupId ? { crossDivisionCallupId: callupId } : {}),
    };
  });

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

/**
 * §3 JSA rolling torikumi target day:
 * - Pre-basho / Day 1: Days 1 and 2 are announced together (target = 2).
 * - Days 2–13: pairings are announced rolling 1 day ahead (target = day + 1).
 * - Day 14: Day 15 (Senshuraku) pairings are HELD until Day 14 bouts resolve (target = 14).
 * - Day 15: Day 15 is posted once Day 14 concludes (target = 15).
 */
export function computeRollingTorikumiTargetDay(currentDay: number): number {
  if (currentDay <= 1) return 2;
  if (currentDay <= 13) return currentDay + 1;
  if (currentDay === 14) return 14;
  return 15;
}

/**
 * Ensure the basho's torikumi is posted through the rolling target day
 * (or an explicit `throughDay` override). Steps day-by-day so each newly
 * posted day's pairings enter `facedSet` before the following lookahead day
 * is paired.
 */
export function ensureRollingTorikumi(world: WorldState, throughDay?: number): StateImpact {
  const builder = createImpactBuilder("ensureRollingTorikumi");
  const basho = world.currentBasho;
  if (!basho) return builder.build();

  const currentDay = Math.max(1, basho.day ?? 1);
  const targetDay = Math.min(15, throughDay ?? computeRollingTorikumiTargetDay(currentDay));
  let runningWorld = world;
  let maxPosted = basho.postedThroughDay ?? 0;

  for (let d = currentDay; d <= targetDay; d++) {
    const currentBasho = runningWorld.currentBasho;
    if (!currentBasho) break;
    const alreadyScheduled = currentBasho.matches.some((m) => m.day === d);
    if (!alreadyScheduled && needsScheduleForDay("makuuchi", d)) {
      const dayImpact = ensureDaySchedule(runningWorld, d);
      builder.merge(dayImpact);
      runningWorld = resolveImpacts(runningWorld, [dayImpact]);
    }
    if (d > maxPosted) maxPosted = d;
  }

  if (basho.postedThroughDay !== maxPosted && maxPosted > 0) {
    builder.updateWorldField("currentBasho", {
      ...basho,
      postedThroughDay: maxPosted,
    });
  }

  return builder.build();
}

/**
 * §3 rolling torikumi withdrawal reconciliation:
 * When a rikishi withdraws (kyūjō), every already-posted card is LOCKED —
 * his matches stay on the sheet and each resolves as a fusenshō
 * (walkover win for the opponent, 不戦敗 for the withdrawn rikishi) when
 * that day arrives. Published torikumi are never re-paired.
 */
export function reconcileFutureScheduleForWithdrawals(
  world: WorldState,
  withdrawnRikishiId: string
): StateImpact {
  const builder = createImpactBuilder("reconcileFutureScheduleForWithdrawals");
  const basho = world.currentBasho;
  if (!basho || !Array.isArray(basho.matches)) return builder.build();

  const target = world.rikishi.get(withdrawnRikishiId);
  if (target) {
    builder.updateRikishi(withdrawnRikishiId, { isKyujo: true });
  }
  // Posted matches are retained verbatim — day resolution turns each
  // unresolved bout involving the kyūjō rikishi into a fusenshō.

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
