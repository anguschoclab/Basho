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

// @ts-nocheck
import type { BoutContext } from "../bout/boutPhysics";
import type { Rikishi, RikishiAchievements } from "../types/rikishi";
import type { BashoState, BoutResult, BashoName } from "../types/basho";
import type { WorldState } from "../types/world";
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
} from "../systems/economics/KenshoService";

import { clamp } from "../utils/math";
import { decideBoutTacticOverride } from "../strategy/NPCStrategyService";
import { createImpactBuilder } from "../core/ImpactBuilder";
import type { StateImpact } from "../core/StateImpact";

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
  const CONTENTION_WINDOW = 2;
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
  if (basho.day !== 15) return false;

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
  const { result } = resolveBoutPhysics(
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
      momentum: clamp((winner.momentum ?? 50) - 15, 0, 100),
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
    const baseCountMap = { low: 2, mid: 5, high: 12, peak: 25 };
    const bannerCount = Math.floor(baseCountMap[importance] * (0.8 + kenshoRng.next() * 0.4));

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
        value
      );
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
  const heat01 = rivalry.heat / 100;
  const spite01 = rivalry.spite / 100;
  const condMult = conditionMultiplier(r.condition ?? 100);
  return {
    ...r,
    aggression: clamp((r.aggression || 50) * (1 + heat01 * 0.15), 0, 100),
    mental: clamp((r.mental || 50) * (1 + spite01 * 0.2), 0, 100),
    power: clamp((r.power || 50) * condMult, 0, 100),
    speed: clamp((r.speed || 50) * condMult, 0, 100),
    technique: clamp((r.technique || 50) * condMult, 0, 100),
    balance: clamp((r.balance || 50) * condMult, 0, 100),
    stamina: clamp((r.stamina || 50) * condMult, 0, 100),
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
export function simulateBout(east: Rikishi, west: Rikishi, seed: string): BoutResult {
  const fakeBasho: BashoState = {
    id: "sim",
    year: 2025,
    day: 1,
    bashoName: "hatsu",
    bashoNumber: 1,
    matches: [],
    standings: new Map(),
    isActive: false,
  };
  const bout: BoutContext = {
    id: `sim-${seed}`,
    day: 1,
    rikishiEastId: east.id,
    rikishiWestId: west.id,
  };
  const { result } = resolveBout(bout, east, west, fakeBasho);
  return result;
}
