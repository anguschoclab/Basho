/**
 * src/engine/bout/boutResolver.ts
 * ================================
 * Bout Resolver
 *
 * Responsibilities:
 * - Resolve bout results using spatial physics engine
 * - Apply rivalry modifiers to rikishi stats
 * - Detect kinboshi and ginboshi achievements
 * - Generate bout narrative
 * - Update rivalry state
 * - Calculate kensho (prize banners)
 * - Handle fusensho (walkover) scenarios
 *
 * @see boutPhysics for spatial physics engine
 * @see boutNarrative for narrative generation
 * @see RivalryService for rivalry updates
 */

import type { BoutContext } from "../bout/boutPhysics";
import type { Rikishi } from "../types/rikishi";
import type { BashoState, BoutResult } from "../types/basho";
import type { WorldState } from "../types/world";
import type { Side } from "../types/banzuke";
// We import the B+ spatial physics runner
import { resolveBoutPhysics, conditionMultiplier } from "./boutPhysics";
import { RivalryService } from "../systems/narrative/RivalryService";

import { clamp } from "../utils/math";
import type { BoutTactic } from "../types/combat";
import { createImpactBuilder } from "../core/ImpactBuilder";
import type { StateImpact } from "../core/StateImpact";
import { resolveSideTactics } from "./resolution/tactics";
import { applyOfficiating } from "./resolution/officiating";
import { enrichResult, applyTacticAftermath } from "./resolution/enrichment";
import { applyStakesAndKensho } from "./resolution/stakes";
import { applyGyojiOfficiation } from "./resolution/gyoji";
import {
  RIVALRY_HEAT_AGGRESSION_MULTIPLIER,
  RIVALRY_SPITE_MENTAL_MULTIPLIER,
  DEFAULT_YEAR,
  DEFAULT_DAY,
  DEFAULT_BASHO_NUMBER,
  RIVALRY_NORMALIZATION_DIVISOR,
  DEFAULT_STAT_VALUE,
  STAT_CLAMP_MIN,
  STAT_CLAMP_MAX,
} from "../../constants/engine/physics";

// Phase 8 complete: kimariteClassifier.ts owns all kimarite selection.
// kimariteEvaluator.ts has been deleted.
// Contention, achievement, and tactic aftermath logic extracted to dedicated modules.

/**
 * Pre-physics fusensho check.
 * If either rikishi is injured/absent, return a walkover result immediately
 * without running the physics simulation.
 */
function tryFusensho(bout: BoutContext, east: Rikishi, west: Rikishi): BoutResult | null {
  const eastAbsent = east.injured || east.isRetired || east.isKyujo;
  const westAbsent = west.injured || west.isRetired || west.isKyujo;

  if (!eastAbsent && !westAbsent) return null;

  const winnerSide: Side = westAbsent ? "east" : "west";
  const winner = winnerSide === "east" ? east : west;
  const loser = winnerSide === "east" ? west : east;

  return {
    boutId: bout.id,
    day: bout.day,
    winner: winnerSide,
    winnerRikishiId: winner.id,
    loserRikishiId: loser.id,
    kimarite: "fusensho",
    kimariteName: "Fusensh\u014d",
    stance: "no-grip",
    tachiaiWinner: winnerSide,
    duration: 0,
    excitementScore: 0,
    upset: false,
    isKinboshi: false,
    log: [{ phase: "finish", data: { event: "fusensho", absent: loser.id } }],
    kenshoEnvelopes: 0,
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
  };
}

/**
 * Resolve a bout between two rikishi.
 * Main orchestrator for bout resolution using spatial physics engine.
 *
 * Algorithm:
 * 1. Check for fusensho (walkover) if either rikishi is injured/retired
 * 2. Apply rivalry modifiers to rikishi stats (aggression, mental)
 * 3. Determine NPC tactic override for key days
 * 4. Run B+ spatial physics engine to resolve bout
 * 5. Generate narrative based on data frames
 * 6. Detect kinboshi and ginboshi achievements
 * 7. Apply henka prestige penalty
 * 8. Update rivalry state
 * 9. Calculate kensho (prize banners) and envelopes
 *
 * @param {BoutContext} bout - The bout context.
 * @param {Rikishi} east - East rikishi.
 * @param {Rikishi} west - West rikishi.
 * @param {BashoState} basho - Current basho state.
 * @param {import("../types/combat").BoutTactic} [playerTactic] - Player tactic override.
 * @param {WorldState} [world] - World state for rivalry and kensho data.
 * @returns {{ result: BoutResult; impact: StateImpact }} Bout result and state impact.
 *
 * @example
 * ```ts
 * const { result, impact } = resolveBout(bout, east, west, basho, playerTactic, world);
 * const updatedWorld = resolveImpacts(world, [impact]);
 * ```
 */
export function resolveBout(
  bout: BoutContext,
  east: Rikishi,
  west: Rikishi,
  basho: BashoState,
  playerTactic?: BoutTactic,
  world?: WorldState
): { result: BoutResult; impact: StateImpact } {
  const builder = createImpactBuilder("resolveBout");

  // 0. Fusensho — injured/retired rikishi cannot fight; opponent wins by walkover
  const fusenshoResult = tryFusensho(bout, east, west);
  if (fusenshoResult) return { result: fusenshoResult, impact: builder.build() };

  // --- PHASE 3: RIVALRY CONNECTIVITY ---
  let eastRivalry = { heat: 0, spite: 0 };
  let westRivalry = { heat: 0, spite: 0 };

  if (world) {
    const rivalryState = RivalryService.ensureRivalriesState(world);
    const rivalryKey = RivalryService.makeRivalryKey(east.id, west.id);
    const pair = rivalryState.pairs[rivalryKey];

    if (pair) {
      eastRivalry = { heat: pair.heat, spite: pair.spite };
      westRivalry = { heat: pair.heat, spite: pair.spite };
    }
  }

  // Clone rikishi to apply temporary bout-only modifiers (aggression + mental)
  const eastBout = applyRivalryToRikishi(east, eastRivalry);
  const westBout = applyRivalryToRikishi(west, westRivalry);

  const { eastTactic, westTactic, ctxFinal } = resolveSideTactics(
    bout,
    east,
    west,
    basho,
    playerTactic,
    world,
    eastRivalry.heat
  );

  // 1. Run B+ spatial physics engine
  const meta = world?.meta;
  const { result: physicsResult } = resolveBoutPhysics(
    ctxFinal,
    eastBout as Rikishi,
    westBout as Rikishi,
    basho,
    meta
  );

  // 1.5/1.6. Kinjite disqualification + scandal + yaocho detection
  const { result } = applyOfficiating(
    bout,
    physicsResult,
    eastBout as Rikishi,
    westBout as Rikishi,
    basho,
    eastTactic,
    westTactic,
    world,
    builder
  );

  const winner = result.winner === "east" ? east : west;
  const loser = result.winner === "east" ? west : east;

  // 2. Achievements, career highlights, dramatic context, narrative
  enrichResult(bout, result, east, west, winner, loser, basho, world, builder);

  // 3. Tactic aftermath (fatigue, momentum, injury multiplier) — per side.
  applyTacticAftermath(bout, result, east, west, eastTactic, westTactic, builder);

  // 4/5. Title stakes, rivalry update, kimarite stats, kensho
  applyStakesAndKensho(world, east, west, winner, result, bout, basho, builder);

  // 6. Gyoji officiation — assign a gyoji to this bout and record career stats
  applyGyojiOfficiation(world, result, basho, builder);

  return { result, impact: builder.build() };
}

/**
 * Applies temporary bout-only modifiers to a cloned rikishi:
 * - rivalry heat   → boosts aggression (up to +15%)
 * - rivalry spite  → boosts mental (up to +20%)
 * - condition      → scales power/speed/technique/balance/stamina (0.8–1.0×)
 *
 * @param {Rikishi} r - The rikishi to modify.
 * @param {{ heat: number; spite: number }} rivalry - Rivalry heat and spite values.
 * @returns {Rikishi} Cloned rikishi with bout-only modifiers applied.
 *
 * @example
 * ```ts
 * const eastBout = applyRivalryToRikishi(east, { heat: 50, spite: 30 });
 * const westBout = applyRivalryToRikishi(west, { heat: 50, spite: 30 });
 * ```
 */
export function applyRivalryToRikishi(
  r: Rikishi,
  rivalry: { heat: number; spite: number }
): Rikishi {
  const heat01 = rivalry.heat / RIVALRY_NORMALIZATION_DIVISOR;
  const spite01 = rivalry.spite / RIVALRY_NORMALIZATION_DIVISOR;
  const condMult = conditionMultiplier(r.condition ?? 100);
  return {
    ...r,
    stats: {
      ...r.stats,
      aggression: clamp(
        (r.stats.aggression ?? DEFAULT_STAT_VALUE) *
          (1 + heat01 * RIVALRY_HEAT_AGGRESSION_MULTIPLIER),
        STAT_CLAMP_MIN,
        STAT_CLAMP_MAX
      ),
      mental: clamp(
        (r.stats.mental ?? DEFAULT_STAT_VALUE) * (1 + spite01 * RIVALRY_SPITE_MENTAL_MULTIPLIER),
        STAT_CLAMP_MIN,
        STAT_CLAMP_MAX
      ),
      power: clamp(
        (r.stats.power ?? DEFAULT_STAT_VALUE) * condMult,
        STAT_CLAMP_MIN,
        STAT_CLAMP_MAX
      ),
      speed: clamp(
        (r.stats.speed ?? DEFAULT_STAT_VALUE) * condMult,
        STAT_CLAMP_MIN,
        STAT_CLAMP_MAX
      ),
      technique: clamp(
        (r.stats.technique ?? DEFAULT_STAT_VALUE) * condMult,
        STAT_CLAMP_MIN,
        STAT_CLAMP_MAX
      ),
      balance: clamp(
        (r.stats.balance ?? DEFAULT_STAT_VALUE) * condMult,
        STAT_CLAMP_MIN,
        STAT_CLAMP_MAX
      ),
      stamina: clamp(
        (r.stats.stamina ?? DEFAULT_STAT_VALUE) * condMult,
        STAT_CLAMP_MIN,
        STAT_CLAMP_MAX
      ),
    },
  };
}

/**
 * Simulate a bout between two rikishi without affecting world state.
 * Creates a fake basho context and resolves the bout for simulation purposes.
 *
 * @param {Rikishi} east - East rikishi.
 * @param {Rikishi} west - West rikishi.
 * @param {string} seed - Seed for deterministic simulation.
 * @returns {BoutResult} The bout result.
 *
 * @example
 * ```ts
 * const result = simulateBout(east, west, "simulation-seed");
 * console.log(result.winner, result.kimarite);
 * ```
 */
export function simulateBout(east: Rikishi, west: Rikishi, seed: string): { result: BoutResult } {
  const fakeBasho: BashoState = {
    // Fold the caller's seed into the basho id so it actually reaches the physics
    // RNG (resolveBoutPhysics seeds from basho.id + day + rikishi ids). Without
    // this the `seed` arg only set bout.id and every call with the same two
    // rikishi produced an identical bout.
    id: `sim-${seed}`,
    year: DEFAULT_YEAR,
    day: DEFAULT_DAY,
    bashoName: "hatsu",
    bashoNumber: DEFAULT_BASHO_NUMBER,
    matches: [],
    standings: new Map(),
    isActive: false,
  };
  const bout: BoutContext = {
    id: `sim-${seed}`,
    day: DEFAULT_DAY,
    rikishiEastId: east.id,
    rikishiWestId: west.id,
  };
  const { result } = resolveBout(bout, east, west, fakeBasho);
  return { result };
}
