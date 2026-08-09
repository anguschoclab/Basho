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
import type { BashoState, BoutResult, BashoName } from "../types/basho";
import type { WorldState } from "../types/world";
import { DEFAULT_START_YEAR } from "../../constants/engine/calendar";
import type { Side } from "../types/banzuke";
// We import the B+ spatial physics runner
import { resolveBoutPhysics, conditionMultiplier } from "./boutPhysics";
// We import the pure narrative translator
import { generateBoutNarrative } from "./boutNarrative";
import { KIMARITE_REGISTRY } from "../kimarite";
import { RivalryService } from "../systems/narrative/RivalryService";
import { RNGRegistry } from "../core/RNGRegistry";
import {
  calculateKenshoEnvelopes,
  assignKenshoBanners,
  determineBoutImportance,
} from "../systems/economy/KenshoService";

import { clamp } from "../utils/math";
import { decideBoutTacticOverride } from "../strategy/NPCStrategyService";
import { createImpactBuilder } from "../core/ImpactBuilder";
import type { StateImpact } from "../core/StateImpact";
import { isYushoContention, isPlayoffScenario } from "./boutContention";
import { detectKinboshi } from "./boutAchievements";
import { recordCareerHighlight, type CareerHighlight } from "./CareerHighlights";
import { computeTacticAftermath } from "./boutTacticAftermath";
import { tryHansoku } from "./kinjite";
import { checkYaocho } from "./yaocho";
import { reportScandal } from "../systems/governance/ScandalService";
import {
  assignGyojiToBout,
  recordGyojiBout,
} from "../systems/officials/GyojiService";
import {
  KENSHO_BASE_COUNT_LOW,
  KENSHO_BASE_COUNT_MID,
  KENSHO_BASE_COUNT_HIGH,
  KENSHO_BASE_COUNT_PEAK,
  KENSHO_RNG_MIN,
  KENSHO_RNG_RANGE,
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
  playerTactic?: import("../types/combat").BoutTactic,
  world?: WorldState
): { result: BoutResult; impact: StateImpact } {
  const builder = createImpactBuilder("resolveBout");

  // 0. Fusensho — injured/retired rikishi cannot fight; opponent wins by walkover
  const fusenshoResult = tryFusensho(bout, east, west);
  if (fusenshoResult) return { result: fusenshoResult, impact: builder.build() };

  const ctxWithTactic = { ...bout, playerTactic };

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

  // NPC tactic override: desperation/rivalry pressure on key days
  let cpuTacticOverride = bout.cpuTacticOverride;
  if (!cpuTacticOverride && world) {
    const bashoDay = basho.day ?? 1;
    const standings = basho.standings;
    // Determine which side is the NPC (the non-player side)
    const npcSide =
      bout.playerSide === "east" ? "west" : bout.playerSide === "west" ? "east" : null;
    if (npcSide) {
      const npcRikishi = npcSide === "east" ? east : west;
      const npcRecord = standings?.get(npcRikishi.id) ?? { wins: 0, losses: 0 };
      const rivalryKey = RivalryService.makeRivalryKey(east.id, west.id);
      const rivalryState = RivalryService.ensureRivalriesState(world);
      const rivalryHeat = rivalryState.pairs[rivalryKey]?.heat ?? 0;
      cpuTacticOverride = decideBoutTacticOverride(npcRecord, rivalryHeat, bashoDay);
    }
  }

  const ctxFinal = cpuTacticOverride ? { ...ctxWithTactic, cpuTacticOverride } : ctxWithTactic;

  // 1. Run B+ spatial physics engine
  const meta = world?.meta;
  const { result: physicsResult } = resolveBoutPhysics(
    ctxFinal,
    eastBout as Rikishi,
    westBout as Rikishi,
    basho,
    meta
  );

  // 1.5. Kinjite (forbidden technique) check — high-aggression/low-technique
  // winner may be disqualified via hansoku, flipping the result.
  // Only active for player bouts (not AutoSim observer mode) to avoid
  // disrupting long-term deterministic simulations.
  const hansokuSeed = `${basho.id ?? "basho"}-${bout.id}-kinjite`;
  const enableKinjite = bout.playerSide !== undefined;
  const { result: hansokuResult, fouledHeyaId } = enableKinjite
    ? tryHansoku(bout, physicsResult, eastBout as Rikishi, westBout as Rikishi, basho, hansokuSeed)
    : { result: physicsResult, fouledHeyaId: null };
  const result = hansokuResult;

  // Trigger scandal for the fouled rikishi's heya
  if (fouledHeyaId && world) {
    const scandalImpact = reportScandal(
      world,
      fouledHeyaId,
      "major",
      "Forbidden technique (hansoku) disqualification"
    );
    builder.merge(scandalImpact);
  }

  // 1.6. Yaocho (match-fixing) detection — checks for suspicious patterns
  if (world && enableKinjite) {
    const yaochoImpact = checkYaocho(world, result, basho, bout.day ?? 1, `${hansokuSeed}-yaocho`);
    builder.merge(yaochoImpact);
  }

  const winner = result.winner === "east" ? east : west;
  const loser = result.winner === "east" ? west : east;

  // Enrich kimariteName from registry (classifier returns id; registry has display name)
  const k = KIMARITE_REGISTRY.find((k) => k.id === result.kimarite);
  if (k) result.kimariteName = k.name;

  const bashoName = (basho.bashoName ?? basho.name) as BashoName | undefined;

  // 2. Achievement Detection (Gold & Silver Stars - v2)
  // Must run BEFORE generateBoutNarrative so awardFact is set when
  // the narrative generator checks for kinboshi/ginboshi award lines.
  const { winnerAchievements, loserAchievements, kinboshiDelta } = detectKinboshi(
    result,
    winner,
    loser
  );
  result.isKinboshi = !!kinboshiDelta;
  if (kinboshiDelta) {
    result.awardFact = "kinboshi";
  }

  // 2.1. Record career highlights for the winner
  const bashoLabel = `${basho.year ?? world?.year ?? DEFAULT_START_YEAR}-${bashoName ?? "unknown"}`;
  const winnerHighlights: CareerHighlight[] = [];
  const winnerWins = winner.currentBashoWins ?? 0;
  const winnerLosses = winner.currentBashoLosses ?? 0;

  // Debut win
  if (!winner.careerHistory || winner.careerHistory.length === 0) {
    winnerHighlights.push({
      type: "debut_win",
      basho: bashoLabel,
      opponent: loser.id,
      description: `First career win over ${loser.shikona}`,
    });
  }
  // 7-7 pressure win
  if (winnerWins === 7 && winnerLosses === 7) {
    winnerHighlights.push({
      type: "seven_seven_win",
      basho: bashoLabel,
      opponent: loser.id,
      description: `Won 7-7 pressure bout on day ${bout.day}`,
    });
  }
  // Kinboshi
  if (kinboshiDelta) {
    winnerHighlights.push({
      type: "kinboshi",
      basho: bashoLabel,
      opponent: loser.id,
      description: `Upset win over ${loser.shikona} (${loser.rank ?? "unknown"})`,
    });
  }
  // Apply highlights to winner
  if (winnerHighlights.length > 0) {
    let updatedWinner = winner;
    for (const hl of winnerHighlights) {
      updatedWinner = recordCareerHighlight(updatedWinner, hl);
    }
    builder.updateRikishi(winner.id, {
      careerHighlights: updatedWinner.careerHighlights,
    });
  }

  // 2.5. Copy dramatic context from match schedule onto result
  const match = basho.matches?.find((m) => m.boutId === result.boutId);
  if (match?.dramaticContext) {
    result.dramaticContext = match.dramaticContext;
  }

  // 2.6. Generate narrative based on data frames
  generateBoutNarrative(
    result,
    east,
    west,
    bashoName,
    bout.day,
    `${result.boutId}-pbp`,
    world || ({} as WorldState)
  );

  // Update achievements via StateImpact
  builder.updateRikishi(winner.id, {
    stats: { ...winner.stats, achievements: winnerAchievements },
  });
  builder.updateRikishi(loser.id, {
    stats: { ...loser.stats, achievements: loserAchievements },
  });

  // Track kinboshi earned this basho for per-basho stipend calculation
  if (kinboshiDelta) {
    const currentKinboshi = basho.kinboshiThisBasho ?? {};
    const nextKinboshi = {
      ...currentKinboshi,
      [winner.id]: (currentKinboshi[winner.id] ?? 0) + 1,
    };
    builder.updateWorldField("currentBasho", {
      ...basho,
      kinboshiThisBasho: nextKinboshi,
    });
  }

  // 3. Tactic aftermath (fatigue, momentum, injury multiplier)
  const { playerUpdate, cpuUpdate, injuryMultiplier } = computeTacticAftermath(
    bout,
    result,
    winner,
    loser,
    cpuTacticOverride
  );
  if (Object.keys(playerUpdate).length > 0) {
    const playerRikishiId = bout.playerSide === "east" ? east.id : west.id;
    builder.updateRikishi(playerRikishiId, playerUpdate);
  }
  if (Object.keys(cpuUpdate).length > 0) {
    const cpuRikishiId =
      bout.playerSide === "east" ? west.id : bout.playerSide === "west" ? east.id : undefined;
    if (cpuRikishiId) builder.updateRikishi(cpuRikishiId, cpuUpdate);
  }
  result.tacticInjuryRiskMultiplier = injuryMultiplier;

  // 4. Update Rivalry State
  let rivalryImpact = createImpactBuilder("rivalry").build();
  if (world) {
    rivalryImpact = RivalryService.onBoutResolved(world, {
      result,
      day: bout.day,
    });

    // E4: Track global kimarite stats for Era Drift
    if (result.kimarite && result.kimarite !== "fusensho") {
      const stats = { ...(world.globalKimariteStats || {}) };
      stats[result.kimarite] = (stats[result.kimarite] || 0) + 1;
      builder.updateWorldField("globalKimariteStats", stats);
    }

    // 5. Kensho (Prize Banners)
    const kenshoRng = RNGRegistry.getSystemRNG(world, "kensho", `kensho-${result.boutId}`);

    // Check for yusho contention and playoff scenarios
    const yushoContention = isYushoContention(east, west, basho);
    const playoff = isPlayoffScenario(east, west, basho);

    // Determine importance for banner count
    const importance = determineBoutImportance(
      east.rank,
      west.rank,
      bout.day,
      yushoContention,
      playoff
    );

    // Set bout result flags for narrative and UI
    result.isYushoRace = yushoContention;
    result.isTitleStakes = playoff || yushoContention;

    if (world.sponsorPool) {
      // Base banner count: random based on importance
      const baseCountMap = {
        low: KENSHO_BASE_COUNT_LOW,
        mid: KENSHO_BASE_COUNT_MID,
        high: KENSHO_BASE_COUNT_HIGH,
        peak: KENSHO_BASE_COUNT_PEAK,
      };
      const bannerCount = Math.floor(
        baseCountMap[importance] * (KENSHO_RNG_MIN + kenshoRng.next() * KENSHO_RNG_RANGE)
      );

      const banners = assignKenshoBanners(
        result.boutId,
        bannerCount,
        importance,
        world.sponsorPool,
        kenshoRng
      );
      (result as BoutResult & { kenshoBanners?: unknown[] }).kenshoBanners = banners;

      const awardFact = result.awardFact ?? undefined;
      result.kenshoEnvelopes = calculateKenshoEnvelopes(
        world,
        winner,
        banners,
        awardFact,
        kenshoRng
      );
    }
  }

  // Merge rivalry impact into main builder
  builder.merge(rivalryImpact);

  // 6. Gyoji officiation — assign a gyoji to this bout and record career stats
  if (world?.gyojiPool && world.gyojiPool.length > 0) {
    const boutImportance = result.isTitleStakes
      ? 90
      : result.isYushoRace
        ? 75
        : 50;
    const gyoji = assignGyojiToBout(world.gyojiPool, result.boutId, boutImportance);
    if (gyoji) {
      result.gyojiId = gyoji.id;
      const bashoNameStr = (basho.bashoName ?? basho.name ?? "unknown") as string;
      const bashoYear = basho.year ?? world?.year ?? DEFAULT_START_YEAR;
      const updatedGyoji = recordGyojiBout(gyoji, bashoNameStr, bashoYear, !!result.monoii);
      const updatedPool = world.gyojiPool.map((g) =>
        g.id === updatedGyoji.id ? updatedGyoji : g
      );
      builder.updateWorldField("gyojiPool", updatedPool);
    }
  }

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
