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
import type { Rikishi, RikishiAchievements } from "../types/rikishi";
import type { BashoState, BoutResult, BashoName } from "../types/basho";
import type { WorldState } from "../types/world";
import type { Side } from "../types/banzuke";
import type { EngineSnapshot } from "../types/combat-spatial";
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
import {
  CONTENTION_WINDOW,
  FINAL_DAY,
  HENKA_MOMENTUM_PENALTY,
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

/**
 * Check if a bout is in yusho contention.
 * Returns true if both rikishi are within 2 wins of the basho leader.
 *
 * @param {Rikishi} east - East rikishi.
 * @param {Rikishi} west - West rikishi.
 * @param {BashoState} basho - Current basho state.
 * @returns {boolean} True if bout is in yusho contention.
 *
 * @example
 * ```ts
 * const inContention = isYushoContention(east, west, basho);
 * if (inContention) console.log("Yusho contention bout!");
 * ```
 */
function isYushoContention(east: Rikishi, west: Rikishi, basho: BashoState): boolean {
  const standings = basho.standings;
  if (!standings || standings.size === 0) return false;

  // Find the current leader(s) win count
  let maxWins = 0;
  for (const record of standings.values()) {
    if (record.wins > maxWins) {
      maxWins = record.wins;
    }
  }

  // Get east and west win counts
  const eastRecord = standings.get(east.id);
  const westRecord = standings.get(west.id);
  const eastWins = eastRecord?.wins ?? 0;
  const westWins = westRecord?.wins ?? 0;

  // Both must be within 2 wins of the leader (contention window)
  const eastInContention = maxWins - eastWins <= CONTENTION_WINDOW;
  const westInContention = maxWins - westWins <= CONTENTION_WINDOW;

  return eastInContention && westInContention;
}

/**
 * Check if this bout is a playoff scenario.
 * Returns true if this is the final day and both rikishi are tied for the lead.
 *
 * @param {Rikishi} east - East rikishi.
 * @param {Rikishi} west - West rikishi.
 * @param {BashoState} basho - Current basho state.
 * @returns {boolean} True if bout is a playoff scenario.
 *
 * @example
 * ```ts
 * const isPlayoff = isPlayoffScenario(east, west, basho);
 * if (isPlayoff) console.log("Playoff bout!");
 * ```
 */
function isPlayoffScenario(east: Rikishi, west: Rikishi, basho: BashoState): boolean {
  // Playoffs only happen on day 15 (final day)
  if (basho.day !== FINAL_DAY) return false;

  const standings = basho.standings;
  if (!standings || standings.size === 0) return false;

  const eastRecord = standings.get(east.id);
  const westRecord = standings.get(west.id);
  const eastWins = eastRecord?.wins ?? 0;
  const westWins = westRecord?.wins ?? 0;

  // Find leader win count
  let maxWins = 0;
  for (const record of standings.values()) {
    if (record.wins > maxWins) {
      maxWins = record.wins;
    }
  }

  // Both must be tied for the lead on the final day
  return eastWins === maxWins && westWins === maxWins && eastWins === westWins;
}

/**
 * Pre-physics fusensho check.
 * If either rikishi is injured/absent, return a walkover result immediately
 * without running the physics simulation.
 *
 * @param {BoutContext} bout - The bout context.
 * @param {Rikishi} east - East rikishi.
 * @param {Rikishi} west - West rikishi.
 * @returns {BoutResult | null} Walkover result or null if both rikishi are present.
 *
 * @example
 * ```ts
 * const fusenshoResult = tryFusensho(bout, east, west);
 * if (fusenshoResult) return { result: fusenshoResult, impact: builder.build() };
 * ```
 */
function tryFusensho(bout: BoutContext, east: Rikishi, west: Rikishi): BoutResult | null {
  const eastAbsent = east.injured || east.isRetired;
  const westAbsent = west.injured || west.isRetired;

  if (!eastAbsent && !westAbsent) return null;

  // If both absent (very rare), east wins by convention
  const winnerSide: Side = westAbsent ? "east" : "west";
  const winner = winnerSide === "east" ? east : west;
  const loser = winnerSide === "east" ? west : east;

  return {
    boutId: bout.id,
    winner: winnerSide,
    winnerRikishiId: winner.id,
    loserRikishiId: loser.id,
    kimarite: "fusensho",
    kimariteName: "Fusenshō",
    stance: "no-grip",
    tachiaiWinner: winnerSide,
    duration: 0,
    excitementScore: 0,
    upset: false,
    isKinboshi: false,
    log: [{ phase: "finish", data: { event: "fusensho", absent: loser.id } }],
    kenshoEnvelopes: 0,
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
): { result: BoutResult; impact: StateImpact; engineSnapshot?: EngineSnapshot } {
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
  const { result, engineSnapshot } = resolveBoutPhysics(
    ctxFinal,
    eastBout as Rikishi,
    westBout as Rikishi,
    basho,
    meta
  );

  const winner = result.winner === "east" ? east : west;
  const loser = result.winner === "east" ? west : east;

  // Enrich kimariteName from registry (classifier returns id; registry has display name)
  const k = KIMARITE_REGISTRY.find((k) => k.id === result.kimarite);
  if (k) result.kimariteName = k.name;

  const bashoName = (basho.bashoName ?? basho.name) as BashoName | undefined;

  // 2. Generate narrative based on data frames
  generateBoutNarrative(
    result,
    east,
    west,
    bashoName,
    bout.day,
    `${result.boutId}-pbp`,
    world || ({} as WorldState)
  );

  // 2.5. Achievement Detection (Gold & Silver Stars - v2)

  // Initialize achievements if missing
  const defaultAchievements = (): RikishiAchievements => ({
    kinboshiEarned: 0,
    ginboshiEarned: 0,
    kinboshiConceded: 0,
    ginboshiConceded: 0,
    specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
    mochikyukinPoints: 0,
  });

  const winnerAchievements = winner.stats.achievements || defaultAchievements();
  const loserAchievements = loser.stats.achievements || defaultAchievements();

  // Rule: Kinboshi (Gold Star) - Maegashira defeats Yokozuna (excluding Fusensho)
  if (winner.rank === "maegashira" && loser.rank === "yokozuna" && result.kimarite !== "fusensho") {
    result.awardFact = "kinboshi";
    result.isKinboshi = true;
    winnerAchievements.kinboshiEarned++;
    loserAchievements.kinboshiConceded++;
    // Track kinboshi earned this basho for per-basho stipend calculation
    if (basho.kinboshiThisBasho) {
      basho.kinboshiThisBasho[winner.id] = (basho.kinboshiThisBasho[winner.id] ?? 0) + 1;
    } else {
      basho.kinboshiThisBasho = { [winner.id]: 1 };
    }
  }
  // Rule: Ginboshi (Silver Star) - Maegashira defeats Ozeki (excluding Fusensho)
  else if (
    winner.rank === "maegashira" &&
    loser.rank === "ozeki" &&
    result.kimarite !== "fusensho"
  ) {
    result.awardFact = "ginboshi";
    winnerAchievements.ginboshiEarned++;
    loserAchievements.ginboshiConceded++;
  }

  // Update achievements via StateImpact
  builder.updateRikishi(winner.id, {
    stats: { ...winner.stats, achievements: winnerAchievements },
  });
  builder.updateRikishi(loser.id, {
    stats: { ...loser.stats, achievements: loserAchievements },
  });

  // 3. Henka prestige penalty
  // Using henka wins the bout but costs momentum — crowd disapproval and
  // psychological debt from a dishonorable tachiai carry into the next bout.
  // CI-05: Simplified logic using resolved cpuTacticOverride (not re-read from bout).
  const playerHenkaWon =
    bout.playerTactic === "HENKA" &&
    result.winner === bout.playerSide &&
    result.kimarite !== "fusensho";

  const cpuHenkaWon =
    cpuTacticOverride === "HENKA" &&
    result.kimarite !== "fusensho" &&
    ((bout.playerSide === "east" && result.winner === "west") ||
      (bout.playerSide === "west" && result.winner === "east") ||
      !bout.playerSide);

  if (playerHenkaWon || cpuHenkaWon) {
    builder.updateRikishi(winner.id, {
      momentum: clamp((winner.momentum ?? 50) - HENKA_MOMENTUM_PENALTY, 0, 100),
    });
  }

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

    // Base banner count: random based on importance
    const baseCountMap = { low: KENSHO_BASE_COUNT_LOW, mid: KENSHO_BASE_COUNT_MID, high: KENSHO_BASE_COUNT_HIGH, peak: KENSHO_BASE_COUNT_PEAK };
    const bannerCount = Math.floor(baseCountMap[importance] * (KENSHO_RNG_MIN + kenshoRng.next() * KENSHO_RNG_RANGE));

    const banners = assignKenshoBanners(
      result.boutId,
      bannerCount,
      importance,
      world.sponsorPool!,
      kenshoRng
    );
    (result as BoutResult & { kenshoBanners?: unknown[] }).kenshoBanners = banners;

    const awardFact = result.awardFact ?? undefined;
    result.kenshoEnvelopes = calculateKenshoEnvelopes(world, winner, banners, awardFact, kenshoRng);
  }

  // Merge rivalry impact into main builder
  if (rivalryImpact.entities?.rikishiUpdates) {
    for (const [id, update] of rivalryImpact.entities.rikishiUpdates) {
      builder.updateRikishi(id, update);
    }
  }
  if (rivalryImpact.worldFields) {
    for (const [field, value] of Object.entries(rivalryImpact.worldFields)) {
      builder.updateWorldField(
        field as unknown as
          | "history"
          | "year"
          | "week"
          | "dayIndexGlobal"
          | "cyclePhase"
          | "_postBashoMeta"
          | "_recruitmentWindow"
          | "closedHeyas"
          | "currentBasho"
          | "currentBashoName"
          | "ozekiKadoban"
          | "_interimDaysRemaining"
          | "_postBashoDays"
          | "calendar"
          | "history"
          | "almanacSnapshots"
          | "mediaState"
          | "ftue"
          | "rivalriesState"
          | "_preBashoAssessment"
          | "sponsorPool"
          | "myosekiMarket"
          | "_daysSinceLastWeeklyTick",
        value as never
      );
    }
  }

  return { result, impact: builder.build(), engineSnapshot };
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
    aggression: clamp((r.stats.aggression || DEFAULT_STAT_VALUE) * (1 + heat01 * RIVALRY_HEAT_AGGRESSION_MULTIPLIER), STAT_CLAMP_MIN, STAT_CLAMP_MAX),
    mental: clamp((r.stats.mental || DEFAULT_STAT_VALUE) * (1 + spite01 * RIVALRY_SPITE_MENTAL_MULTIPLIER), STAT_CLAMP_MIN, STAT_CLAMP_MAX),
    power: clamp((r.stats.power || DEFAULT_STAT_VALUE) * condMult, STAT_CLAMP_MIN, STAT_CLAMP_MAX),
    speed: clamp((r.stats.speed || DEFAULT_STAT_VALUE) * condMult, STAT_CLAMP_MIN, STAT_CLAMP_MAX),
    technique: clamp((r.stats.technique || DEFAULT_STAT_VALUE) * condMult, STAT_CLAMP_MIN, STAT_CLAMP_MAX),
    balance: clamp((r.stats.balance || DEFAULT_STAT_VALUE) * condMult, STAT_CLAMP_MIN, STAT_CLAMP_MAX),
    stamina: clamp((r.stats.stamina || DEFAULT_STAT_VALUE) * condMult, STAT_CLAMP_MIN, STAT_CLAMP_MAX),
  } as Rikishi;
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
export function simulateBout(east: Rikishi, west: Rikishi, seed: string): { result: BoutResult; engineSnapshot?: EngineSnapshot } {
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
  const { result, engineSnapshot } = resolveBout(bout, east, west, fakeBasho);
  return { result, engineSnapshot };
}
