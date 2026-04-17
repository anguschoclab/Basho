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
import { calculateKenshoEnvelopes, assignKenshoBanners } from "../systems/economics/KenshoService";

import { clamp } from "../utils/math";
import { decideBoutTacticOverride } from "../strategy/NPCStrategyService";
import { createImpactBuilder } from "../core/ImpactBuilder";
import type { StateImpact } from "../core/StateImpact";

// Phase 8 complete: kimariteClassifier.ts owns all kimarite selection.
// kimariteEvaluator.ts has been deleted.

/**
 * Pre-physics fusensho check.
 * If either rikishi is injured/absent, return a walkover result immediately
 * without running the physics simulation.
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
    duration: 1,
    excitementScore: 0,
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
  generateBoutNarrative(result, east, west, bashoName, bout.day, `${result.boutId}-pbp`);

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
    const banners = assignKenshoBanners(world, winner, loser, kenshoRng);
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
