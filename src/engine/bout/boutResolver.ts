import type { BoutContext } from "../bout/boutPhysics";
import type { Rikishi, RikishiAchievements } from "../types/rikishi";
import type { BashoState, BoutResult, BashoName } from "../types/basho";
import type { WorldState } from "../types/world";
import type { Side } from "../types/banzuke";
// We import the new cleaned physics runner
import { resolveBoutPhysics } from "./boutPhysics";
// We import the pure narrative translator
import { generateBoutNarrative } from "./boutNarrative";
import { determineKimarite } from "./kimariteEvaluator";
import { KIMARITE_REGISTRY } from "../kimarite";
// Note: injuries module doesn't currently apply per-bout injuries.
import { RivalryService } from "../systems/narrative/RivalryService";
import { EntityCollection } from "../core/EntityCollection";
import { clamp } from "../utils/math";
import { decideBoutTacticOverride } from "../strategy/NPCStrategyService";

/**
 * Pre-physics fusensho check.
 * If either rikishi is injured/absent, return a walkover result immediately
 * without running the physics simulation.
 */
function tryFusensho(
  bout: BoutContext,
  east: Rikishi,
  west: Rikishi,
  basho: BashoState
): BoutResult | null {
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
    upset: false,
    isKinboshi: false,
    log: [{ phase: "finish", data: { event: "fusensho", absent: loser.id } }],
    kenshoEnvelopes: 0,
  };
}

export function resolveBout(
  bout: BoutContext,
  east: Rikishi,
  west: Rikishi,
  basho: BashoState,
  playerTactic?: import("../types/combat").BoutTactic,
  world?: WorldState
): BoutResult {
  // 0. Fusensho — injured/retired rikishi cannot fight; opponent wins by walkover
  const fusenshoResult = tryFusensho(bout, east, west, basho);
  if (fusenshoResult) return fusenshoResult;

  const ctxWithTactic = { ...bout, playerTactic };

  // --- PHASE 3: RIVALRY CONNECTIVITY ---
  let eastMod = 1.0;
  let westMod = 1.0;

  if (world) {
    const rivalryState = RivalryService.ensureRivalriesState(world);
    const rivalryKey = RivalryService.makeRivalryKey(east.id, west.id);
    const pair = rivalryState.pairs[rivalryKey];

    if (pair) {
      // High heat increases aggression and mental intensity
      const heat01 = pair.heat / 100;
      eastMod = 1.0 + (heat01 * 0.15); // Up to 15% boost
      westMod = 1.0 + (heat01 * 0.15);
    }
  }

  // Clone rikishi to apply temporary bout-only modifiers
  const eastBout = { ...east, aggression: clamp((east.aggression || 50) * eastMod, 0, 100) };
  const westBout = { ...west, aggression: clamp((west.aggression || 50) * westMod, 0, 100) };

  // NPC tactic override: desperation/rivalry pressure on key days
  let cpuTacticOverride = bout.cpuTacticOverride;
  if (!cpuTacticOverride && world) {
    const bashoDay = basho.day ?? 1;
    const standings = basho.standings;
    // Determine which side is the NPC (the non-player side)
    const npcSide = bout.playerSide === 'east' ? 'west' : bout.playerSide === 'west' ? 'east' : null;
    if (npcSide) {
      const npcRikishi = npcSide === 'east' ? east : west;
      const npcRecord = standings?.get(npcRikishi.id) ?? { wins: 0, losses: 0 };
      const rivalryKey = RivalryService.makeRivalryKey(east.id, west.id);
      const rivalryState = RivalryService.ensureRivalriesState(world);
      const rivalryHeat = rivalryState.pairs[rivalryKey]?.heat ?? 0;
      cpuTacticOverride = decideBoutTacticOverride(npcRecord, rivalryHeat, bashoDay);
    }
  }

  const ctxFinal = cpuTacticOverride ? { ...ctxWithTactic, cpuTacticOverride } : ctxWithTactic;

  // 1. Run deterministic physics
  const { result, engineSnapshot } = resolveBoutPhysics(ctxFinal, eastBout as Rikishi, westBout as Rikishi, basho);

  // 1.5. Override kimarite via strategy evaluator
  const winner = result.winner === 'east' ? east : west;
  const loser = result.winner === 'east' ? west : east;

  const overrideId = determineKimarite(result, winner, loser, engineSnapshot);
  if (overrideId !== result.kimarite) {
    const k = KIMARITE_REGISTRY.find((k) => k.id === overrideId);
    result.kimarite = overrideId as BoutResult['kimarite'];
    if (k) result.kimariteName = k.name;
  }

  const bashoName = (basho.bashoName ?? basho.name) as BashoName | undefined;

  // 2. Generate narrative based on data frames
  generateBoutNarrative(result, east, west, bashoName, bout.day, `${result.boutId}-pbp`);

  // 2.5. Achievement Detection (Gold & Silver Stars - v2)

  // Initialize achievements if missing
  const defaultAchievements = (): RikishiAchievements => ({
    kinboshiEarned: 0,
    ginboshiEarned: 0,
    kinboshiConceded: 0,
    ginboshiConceded: 0,
    specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 }
  });

  if (!winner.stats.achievements) winner.stats.achievements = defaultAchievements();
  if (!loser.stats.achievements) loser.stats.achievements = defaultAchievements();

  // Rule: Kinboshi (Gold Star) - Maegashira defeats Yokozuna (excluding Fusensho)
  if (winner.rank === 'maegashira' && loser.rank === 'yokozuna' && result.kimarite !== 'fusensho') {
    result.awardFact = 'kinboshi';
    result.isKinboshi = true;
    winner.stats.achievements.kinboshiEarned++;
    loser.stats.achievements.kinboshiConceded++;
  } 
  // Rule: Ginboshi (Silver Star) - Maegashira defeats Ozeki (excluding Fusensho)
  else if (winner.rank === 'maegashira' && loser.rank === 'ozeki' && result.kimarite !== 'fusensho') {
    result.awardFact = 'ginboshi';
    winner.stats.achievements.ginboshiEarned++;
    loser.stats.achievements.ginboshiConceded++;
  }

  // 3. Henka prestige penalty
  // Using henka wins the bout but costs momentum — crowd disapproval and
  // psychological debt from a dishonorable tachiai carry into the next bout.
  const tacticUsed = bout.playerTactic ?? (bout as any).cpuTacticOverride;
  if (tacticUsed === 'HENKA') {
    const henkaWinnerSide = bout.playerSide === 'east' ? east : west;
    // Only penalise the side that actually used it and won
    const winnerUsedHenka =
      (result.winner === 'east' && (bout.playerSide === 'east' || (bout as any).cpuTacticOverride !== undefined && result.winner !== bout.playerSide)) ||
      (result.winner === 'west' && (bout.playerSide === 'west' || (bout as any).cpuTacticOverride !== undefined && result.winner !== bout.playerSide));
    if (winnerUsedHenka) {
      winner.momentum = clamp((winner.momentum ?? 50) - 15, 0, 100);
    }
  }

  // 4. Update Rivalry State
  if (world) {
    RivalryService.onBoutResolved(world, {
      result,
      day: bout.day
    });
  }

  return result;
}

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
  const bout: BoutContext = { id: `sim-${seed}`, day: 1, rikishiEastId: east.id, rikishiWestId: west.id };
  return resolveBout(bout, east, west, fakeBasho);
}
