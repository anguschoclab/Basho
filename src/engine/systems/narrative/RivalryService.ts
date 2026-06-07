/**
 * src/engine/systems/narrative/RivalryService.ts
 * ==============================================
 * Stateful orchestration for the Rivalry System.
 *
 * Responsibilities:
 * 1. State Hydration (ensureRivalriesState)
 * 2. Weekly Decay Tick (applyRivalryWeeklyDecay)
 * 3. Bout Hook Orchestration (updateRivalriesFromBout)
 *
 * Goal: Service-oriented architecture with clear dependencies.
 */

import type { WorldState } from "../../types/world";
import type { Id } from "../../types/common";
import { EntityCollection } from "../../core/EntityCollection";
import { RNGRegistry } from "../../core/RNGRegistry";
import { EntityService } from "../../core/EntityService";
import type { Rikishi } from "../../types/rikishi";
import { clamp } from "../../utils/math";
import {
  type RivalriesState,
  type RivalryPairState,
  type RivalryKey,
} from "../../../constants/engine/rivalry";
import { applyBoutToPairState, deriveTone } from "./RivalryHeatService";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import type { BoutResult } from "../../types/basho";
import {
  BOUT_DURATION_CLOSENESS_DIVISOR,
  BOUT_DURATION_DOMINATION_DIVISOR,
  HEAT_SPIKE_THRESHOLDS,
  CLOSENESS_DECAY_RATE,
  SPITE_DECAY_RATE,
  TOP_RIVALRY_PAIRS_TO_SEED,
  NATIONALITY_RIVALRY_BONUS,
} from "../../../constants/engine/narrative";
import {
  BASHO_FINAL_DAY,
  RIVALRY_DECAY_WEEKS_SHORT,
  RIVALRY_DECAY_WEEKS_MEDIUM,
  RIVALRY_DECAY_WEEKS_LONG,
  RIVALRY_DECAY_RATE_SHORT,
  RIVALRY_DECAY_RATE_MEDIUM,
  RIVALRY_DECAY_RATE_LONG,
  RIVALRY_HEAT_MIN,
  RIVALRY_MEETINGS_MIN,
  RANK_DIFF_BONUS_BASE,
  RANK_DIFF_BONUS_MULTIPLIER,
  RANK_DIFF_MAX,
  RIVALRY_RNG_THRESHOLD,
  RIVALRY_CLOSENESS_DEFAULT,
  RIVALRY_DOMINATION_DEFAULT,
  STYLE_CLASH_BONUS,
  SAME_DIVISION_BONUS,
  AGE_PROXIMITY_BONUS_BASE,
  AGE_PROXIMITY_MULTIPLIER,
  AGE_PROXIMITY_MAX_DIFF,
  RIVALRY_INITIAL_HEAT_MIN,
  RIVALRY_INITIAL_HEAT_MAX,
  SPARRING_RIVALRY_WEEKS_THRESHOLD,
  SPARRING_INITIAL_HEAT_MIN,
  SPARRING_INITIAL_HEAT_MAX,
  HEYA_HEAT_GAIN_TITLE_STAKES,
  HEYA_HEAT_GAIN_NORMAL,
} from "../../../constants/engine/rivalry";
import { getRikishi } from "../../queries";

/**
 * Unified Rivalry Service.
 * Provides stateful orchestration for the Rivalry System including state hydration,
 * weekly decay, and bout hook orchestration.
 *
 * @example
 * ```ts
 * const state = RivalryService.ensureRivalriesState(world);
 * const impact = RivalryService.onBoutResolved(world, { result, day: 5 });
 * const decayImpact = RivalryService.applyWeeklyDecay(world);
 * ```
 */
export const RivalryService = {
  /**
   * Ensure rivalry state exists on world.
   * Hydrates the rivalries state if it doesn't exist.
   *
   * @param {WorldState} world - The current world state.
   * @returns {RivalriesState} The existing or newly created rivalries state.
   */
  ensureRivalriesState(world: WorldState): RivalriesState {
    return EntityService.ensureState(world, "rivalriesState", () => ({
      version: "1.0.0",
      pairs: {},
    }));
  },

  /**
   * Canonical Pair Key Generator.
   * Creates a consistent key for a rivalry pair regardless of order.
   *
   * @param {Id} aId - First rikishi ID.
   * @param {Id} bId - Second rikishi ID.
   * @returns {RivalryKey} Canonical rivalry key (smaller ID first).
   *
   * @example
   * ```ts
   * const key1 = RivalryService.makeRivalryKey("rikishi1", "rikishi2");
   * const key2 = RivalryService.makeRivalryKey("rikishi2", "rikishi1");
   * console.log(key1 === key2); // true
   * ```
   */
  makeRivalryKey(aId: Id, bId: Id): RivalryKey {
    return aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
  },

  /**
   * Authoritative Bout Hook.
   * Updates rivalry state based on bout results.
   * Returns StateImpact describing rivalry updates instead of mutating state directly.
   *
   * Algorithm:
   * 1. Ensure rivalry state exists
   * 2. Get or create fresh pair state
   * 3. Apply bout results to pair state
   * 4. Detect heat spikes and log events
   * 5. Update stable (heya-level) rivalries
   *
   * @param {WorldState} world - The current world state.
   * @param {{ result: BoutResult; day?: number }} args - Bout result and optional day number.
   * @param {BoutResult} args.result - The bout result data.
   * @param {number} [args.day] - The day number (1-15).
   * @returns {StateImpact} Impact describing rivalry updates.
   *
   * @example
   * ```ts
   * const impact = RivalryService.onBoutResolved(world, { result, day: 15 });
   * const updatedWorld = resolveImpacts(world, [impact]);
   * ```
   */
  onBoutResolved(world: WorldState, args: { result: BoutResult; day?: number }): StateImpact {
    const { result } = args;
    if (!result.winnerRikishiId || !result.loserRikishiId) {
      return createImpactBuilder("onBoutResolvedRivalries").build();
    }

    const builder = createImpactBuilder("onBoutResolvedRivalries");
    const state = this.ensureRivalriesState(world);
    const key = this.makeRivalryKey(result.winnerRikishiId, result.loserRikishiId);
    const week = world.calendar?.currentWeek || 0;

    const rng = RNGRegistry.getSystemRNG(world, "rivalry", `bout-${key}-${week}`);
    const existing =
      state.pairs[key] ??
      this.createFreshPair(result.winnerRikishiId, result.loserRikishiId, world);

    const next = applyBoutToPairState(existing, {
      rng,
      isWinForA: result.winnerRikishiId === existing.aId,
      isLossForA: result.loserRikishiId === existing.aId,
      isKinboshi: !!result.isKinboshi,
      isTitleStakes: !!result.isTitleStakes,
      closeness01: result.duration ? Math.min(1.0, result.duration / BOUT_DURATION_CLOSENESS_DIVISOR) : RIVALRY_CLOSENESS_DEFAULT,
      domination01: result.duration ? Math.max(0.0, 1.0 - result.duration / BOUT_DURATION_DOMINATION_DIVISOR) : RIVALRY_DOMINATION_DEFAULT,
      isUpset: !!result.upset,
      isFinalDay: args.day === BASHO_FINAL_DAY,
      isYushoRace: !!result.isYushoRace,
      week,
    });

    // Detection for heat spikes (crosses thresholds)
    const oldHeat = existing.heat;
    const newHeat = next.heat;
    const thresholds = HEAT_SPIKE_THRESHOLDS;
    const thresholdCrossed = thresholds.find((t) => oldHeat <= t && newHeat > t);

    if (thresholdCrossed) {
      const rA = EntityCollection.getRikishiById(world, existing.aId);
      const rB = EntityCollection.getRikishiById(world, existing.bId);
      if (rA && rB) {
        builder.logEvent(
          "RIVALRY_HEAT_SPIKE",
          "rivalry",
          {
            shikona: rA.shikona,
            rival: rB.shikona,
            winner: result.winnerRikishiId === rA.id ? rA.shikona : rB.shikona,
            loser: result.loserRikishiId === rA.id ? rA.shikona : rB.shikona,
            heat: newHeat,
            threshold: thresholdCrossed,
          },
          { importance: "headline" }
        );
      }
    }

    // Build the updated rivalries state
    const updatedPairs = { ...state.pairs };

    // Update pairs
    updatedPairs[key] = next;

    // --- STABLE RIVALRY MERGE ---
    const heyaAId = result.winnerHeyaId || "";
    const heyaBId = result.loserHeyaId || "";
    const updatedHeyaPairs = { ...(state.heyaRivalryPairs || {}) };

    if (heyaAId && heyaBId && heyaAId !== heyaBId) {
      const hKey = heyaAId < heyaBId ? `${heyaAId}|${heyaBId}` : `${heyaBId}|${heyaAId}`;
      const existingH = updatedHeyaPairs[hKey] || {
        id: hKey,
        heyaAId: heyaAId < heyaBId ? heyaAId : heyaBId,
        heyaBId: heyaAId < heyaBId ? heyaBId : heyaAId,
        heat: 0,
        aWins: 0,
        bWins: 0,
      };

      const hHeatGain = result.isTitleStakes ? HEYA_HEAT_GAIN_TITLE_STAKES : HEYA_HEAT_GAIN_NORMAL;
      updatedHeyaPairs[hKey] = {
        ...existingH,
        heat: Math.min(100, existingH.heat + hHeatGain),
        aWins: existingH.aWins + (result.winnerHeyaId === existingH.heyaAId ? 1 : 0),
        bWins: existingH.bWins + (result.winnerHeyaId === existingH.heyaBId ? 1 : 0),
      };
    }

    builder.updateWorldField("rivalriesState", {
      version: state.version,
      pairs: updatedPairs,
      heyaRivalryPairs: updatedHeyaPairs,
    });

    return builder.build();
  },

  /**
   * Weekly Decay Tick.
   * Applies natural decay to rivalry heat, closeness, and spite over time.
   * Returns StateImpact describing rivalry decay instead of mutating state directly.
   *
   * Algorithm:
   * 1. Calculate decay based on weeks since last meeting
   * 2. Apply decay to heat, closeness, and spite
   * 3. Auto-cull stale rivalries (low heat, few meetings, long time since meeting)
   *
   * @param {WorldState} world - The current world state.
   * @returns {StateImpact} Impact describing rivalry decay.
   *
   * @example
   * ```ts
   * const impact = RivalryService.applyWeeklyDecay(world);
   * const updatedWorld = resolveImpacts(world, [impact]);
   * ```
   */
  applyWeeklyDecay(world: WorldState): StateImpact {
    const builder = createImpactBuilder("applyWeeklyDecay");
    const state = this.ensureRivalriesState(world);
    const week = world.calendar?.currentWeek || 0;

    const finalPairs: Record<string, RivalryPairState> = {};

    for (const key in state.pairs) {
      const pair = state.pairs[key];
      const weeksSince = week - pair.lastMetWeek;
      const decay = weeksSince <= RIVALRY_DECAY_WEEKS_SHORT ? RIVALRY_DECAY_RATE_SHORT : weeksSince <= RIVALRY_DECAY_WEEKS_MEDIUM ? RIVALRY_DECAY_RATE_MEDIUM : RIVALRY_DECAY_RATE_LONG;

      const updatedPair = {
        ...pair,
        heat: clamp(pair.heat - decay, 0, 100),
        closeness: clamp(pair.closeness - CLOSENESS_DECAY_RATE, 0, 100),
        spite: clamp(pair.spite - SPITE_DECAY_RATE, 0, 100),
        tone: deriveTone(pair),
      };

      // Auto-cull
      if (!(updatedPair.heat < RIVALRY_HEAT_MIN && updatedPair.meetings < RIVALRY_MEETINGS_MIN && weeksSince > RIVALRY_DECAY_WEEKS_LONG)) {
        finalPairs[key] = updatedPair;
      }
    }

    builder.updateWorldField("rivalriesState", {
      version: state.version,
      pairs: finalPairs,
    });

    return builder.build();
  },

  /**
   * Factory for a fresh rivalry pair.
   * Creates a new rivalry pair state with default values.
   *
   * @param {Id} id1 - First rikishi ID.
   * @param {Id} id2 - Second rikishi ID.
   * @param {WorldState} world - The current world state.
   * @returns {RivalryPairState} A fresh rivalry pair state.
   *
   * @example
   * ```ts
   * const pair = RivalryService.createFreshPair(rikishi1.id, rikishi2.id, world);
   * console.log(pair.heat); // 0
   * console.log(pair.tone); // "respect"
   * ```
   */
  createFreshPair(id1: Id, id2: Id, world: WorldState): RivalryPairState {
    const [aId, bId] = id1 < id2 ? [id1, id2] : [id2, id1];
    const rA = EntityCollection.getRikishiById(world, aId);
    const rB = EntityCollection.getRikishiById(world, bId);

    return {
      key: `${aId}|${bId}`,
      aId,
      bId,
      heat: 0,
      meetings: 0,
      lastMetWeek: world.calendar?.currentWeek || 0,
      aWins: 0,
      bWins: 0,
      closeness: 0,
      spite: 0,
      tone: "respect",
      triggers: {},
      sameHeya: !!rA && !!rB && rA.heyaId === rB.heyaId,
    };
  },

  /**
   * Seed Initial Rivalries (P0-C1).
   * Generates interesting initial grudges based on style clash and rank proximity.
   * Returns StateImpact describing initial rivalries.
   *
   * Algorithm:
   * 1. Get all makuuchi and juryo rikishi
   * 2. Evaluate pairs based on style clash, nationality, rank proximity, age proximity
   * 3. Sort by score and seed top 12 pairs with warm heat
   * 4. Assign random tones to seeded rivalries
   *
   * @param {WorldState} world - The current world state.
   * @returns {StateImpact} Impact describing initial rivalries.
   *
   * @example
   * ```ts
   * const impact = RivalryService.seedInitialRivalries(world);
   * const updatedWorld = resolveImpacts(world, [impact]);
   * ```
   */
  seedInitialRivalries(world: WorldState): StateImpact {
    const builder = createImpactBuilder("seedInitialRivalries");
    const state = this.ensureRivalriesState(world);
    // ⚡ Bolt Optimization: Use direct iteration instead of Array.from().map().filter()
    const makuuchiJuryo: Rikishi[] = [];
    for (const id of world.activeRikishiIds) {
      const r = getRikishi(world, id);
      if (r && (r.division === "makuuchi" || r.division === "juryo")) {
        makuuchiJuryo.push(r);
      }
    }

    const candidates: Array<{ a: Rikishi; b: Rikishi; score: number }> = [];

    // Evaluate pairs
    for (let i = 0; i < makuuchiJuryo.length; i++) {
      for (let j = i + 1; j < makuuchiJuryo.length; j++) {
        const a = makuuchiJuryo[i];
        const b = makuuchiJuryo[j];

        if (a.heyaId === b.heyaId) continue;

        let score = 0;
        // Style clash: Push vs Belt is classic
        if (a.style !== b.style) score += STYLE_CLASH_BONUS;

        // Origin or Nationality clash
        if (a.nationality !== b.nationality) score += NATIONALITY_RIVALRY_BONUS;

        // Rank proximity (same division, close rank numbers)
        if (a.division === b.division) {
          score += SAME_DIVISION_BONUS;
          const rankDiff = Math.abs((a.rankNumber ?? 1) - (b.rankNumber ?? 1));
          if (rankDiff <= RANK_DIFF_MAX) score += RANK_DIFF_BONUS_BASE - rankDiff * RANK_DIFF_BONUS_MULTIPLIER;
        }

        // Age proximity
        const ageDiff = Math.abs(a.birthYear - b.birthYear);
        if (ageDiff <= AGE_PROXIMITY_MAX_DIFF) score += AGE_PROXIMITY_BONUS_BASE - ageDiff * AGE_PROXIMITY_MULTIPLIER;

        candidates.push({ a, b, score });
      }
    }

    // Sort descending by score
    candidates.sort((c1, c2) => c2.score - c1.score);

    // Seed top pairs
    const toSeed = candidates.slice(0, TOP_RIVALRY_PAIRS_TO_SEED);
    const rng = RNGRegistry.getSystemRNG(world, "rivalry", `init`);

    const nextPairs = { ...state.pairs };
    for (const { a, b } of toSeed) {
      const key = this.makeRivalryKey(a.id, b.id);
      const pair = this.createFreshPair(a.id, b.id, world);
      pair.heat = rng.int(RIVALRY_INITIAL_HEAT_MIN, RIVALRY_INITIAL_HEAT_MAX); // Warm heat
      pair.tone = rng.pick(["grudge", "bad_blood", "public_hype", "respect"]);
      nextPairs[key] = pair;
    }

    builder.updateWorldField("rivalriesState", {
      ...state,
      pairs: nextPairs,
    });

    return builder.build();
  },

  /**
   * Seed a rivalry from extended sparring partnership.
   * Called when a sparring pair reaches 12+ weeks of activity.
   * Uses RNG to determine if a rivalry should be seeded (40% chance).
   * Initial rivalry heat depends on sparring chemistry (friction = higher heat).
   *
   * @param {WorldState} world - The current world state.
   * @param {string} aId - First rikishi ID.
   * @param {string} bId - Second rikishi ID.
   * @param {string} chemistry - Sparring chemistry state ("friction", "rut", "neutral").
   * @param {number} weeksActive - Number of weeks the pair has been sparring.
   * @returns {StateImpact} Impact describing rivalry seeding (or empty if no rivalry seeded).
   *
   * @example
   * ```ts
   * const impact = RivalryService.maybeSeedSparringRivalry(world, "r1", "r2", "friction", 12);
   * const updatedWorld = resolveImpacts(world, [impact]);
   * ```
   */
  maybeSeedSparringRivalry(
    world: WorldState,
    aId: string,
    bId: string,
    chemistry: string,
    weeksActive: number
  ): StateImpact {
    const builder = createImpactBuilder("maybeSeedSparringRivalry");

    // Only friction pairs can seed rivalries
    if (chemistry !== "friction") return builder.build();

    // Only seed after 12+ weeks of sparring
    if (weeksActive < SPARRING_RIVALRY_WEEKS_THRESHOLD) return builder.build();

    const state = this.ensureRivalriesState(world);
    const key = this.makeRivalryKey(aId, bId);

    // Don't seed if rivalry already exists
    if (state.pairs[key]) return builder.build();

    // 40% chance to seed rivalry
    const rng = RNGRegistry.getSystemRNG(world, "rivalry", `sparring-${key}-${weeksActive}`);
    if (rng.next() > RIVALRY_RNG_THRESHOLD) return builder.build();

    // Get rikishi for event logging
    const rA = EntityCollection.getRikishiById(world, aId);
    const rB = EntityCollection.getRikishiById(world, bId);
    if (!rA || !rB) return builder.build();

    const initialHeat = rng.int(SPARRING_INITIAL_HEAT_MIN, SPARRING_INITIAL_HEAT_MAX);

    // Determine tone based on chemistry
    let tone = "respect";
    if (chemistry === "friction") {
      tone = rng.pick(["grudge", "bad_blood", "public_hype"]);
    } else if (chemistry === "rut") {
      tone = rng.pick(["respect", "mentor_student"]);
    } else {
      tone = rng.pick(["respect", "public_hype", "unstable"]);
    }

    // Create new rivalry pair
    const pair = this.createFreshPair(aId, bId, world);
    pair.heat = initialHeat;
    pair.tone = tone as any;
    pair.triggers.sparring = weeksActive;

    // Update rivalry state
    const updatedPairs = { ...state.pairs };
    updatedPairs[key] = pair;

    builder.updateWorldField("rivalriesState", {
      ...state,
      pairs: updatedPairs,
    });

    // Log event
    builder.logEvent(
      "SPARRING_RIVALRY_SEEDED",
      "rivalry",
      {
        shikona: rA.shikona,
        rival: rB.shikona,
        chemistry,
        weeksActive,
        heat: initialHeat,
        tone,
      },
      { importance: "notable" }
    );

    return builder.build();
  },
};
