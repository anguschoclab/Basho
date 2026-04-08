// src/engine/bout/boutPhysics.ts
// =======================================================
// Deterministic Bout Simulation Engine (v4.1 - Modular)
// =======================================================

import { rngFromSeed, SeededRNG } from "../rng";
import type { Rikishi } from "../types/rikishi";
import type { BoutResult, BoutLogEntry, BashoState } from "../types/basho";
import type { Side } from "../types/banzuke";
import {
  Stance,
  TacticalFamily,
  TACTICAL_MATRIX,
  CombatAction,
  ARCHETYPE_PROFILES,
  EXTENDED_ARCHETYPE_PROFILES,
} from "../types/combat";
import type { CombatArchetype } from "../types/combat";
import type { EngineSnapshot } from "./kimariteEvaluator";
import { ARCHETYPE_MAP } from "./boutCalculations";

import { RANK_HIERARCHY } from "../types/banzuke";
import { KIMARITE_REGISTRY, type Kimarite } from "../kimarite";
import { 
  calculateActionPower, 
  pickMoveFromClass, 
  CalculationState 
} from "./boutCalculations";
import { 
  establishSymmetricGrip, 
  establishAsymmetricGrip, 
  establishMessyGrip,
  contestGripTick,
} from "./boutGrip";

/** Engine position vocabulary */
export type Position = "front" | "lateral" | "rear";
export type Advantage = "east" | "west" | "none";

/** Defines the structure for bout context. */
export interface BoutContext {
  id: string;
  day: number;
  rikishiEastId: string;
  rikishiWestId: string;
  playerSide?: Side;
  playerTactic?: import("../types/combat").BoutTactic;
  cpuTacticOverride?: import("../types/combat").BoutTactic;
}

/** Defines the structure for engine state. */
export interface EngineState extends CalculationState {
  tick: number;
  timeSeconds: number;
  stance: Stance;
  position: Position;
  advantage: Advantage;
  tachiaiWinner: Side;
  log: BoutLogEntry[];
  mizuiriDeclared: boolean;
  playerSide?: import("../types/banzuke").Side;
  playerTactic?: import("../types/combat").BoutTactic;
  cpuTacticOverride?: import("../types/combat").BoutTactic;
  nodawaActive: boolean;       // east blocked west's belt attempt at tachiai

  // Memory for narrative
  lastActionFamilyEast?: TacticalFamily;
  lastActionFamilyWest?: TacticalFamily;
  lastAdvantage?: Advantage;
  day: number;
  eastTacticalPivotTick?: number;
  westTacticalPivotTick?: number;

  // Kimarite evaluator signals
  winnerConsecutiveAdvantage: number; // ticks where current advantage holder held it
  loserLastActionFamily?: TacticalFamily; // what family the eventual loser used on fatal tick
  finalLoserBalanceDrain: number;       // damage taken on the losing tick
}

/** Safe read stat helper */
function stat(r: any, key: string, fallback = 50): number {
  const v = r?.[key];
  return Number.isFinite(v) ? v : fallback;
}

/** Basic rank tier helper */
function tierOf(r: Rikishi): number {
  return RANK_HIERARCHY[r.rank]?.tier ?? 99;
}

const jitter = (rng: SeededRNG, scale = 1) => (rng.next() - 0.5) * scale;

/**
 * Returns true if the trickster's henka attempt succeeds against an oncoming pusher.
 */
function checkHenkaTrick(
  trickster: Rikishi,
  opponent: Rikishi,
  tAct: import("../types/combat").CombatAction,
  oAct: import("../types/combat").CombatAction,
  rng: SeededRNG,
): boolean {
  if (tAct.family === 'trick' && oAct.family === 'push') {
    const tScore = stat(trickster, 'technique') + (stat(opponent, 'speed') * 1.5) + jitter(rng, 5);
    const oScore = stat(opponent, 'balance') + jitter(rng, 5);
    return tScore > oScore;
  }
  return false;
}

/**
 * Resolve grip clash: Triggered when wrestlers enter or maintain a belt grapple.
 */
function resolveGripClash(rng: SeededRNG, east: Rikishi, west: Rikishi, st: EngineState): void {
  const eastPref = east.combatProfile.preferredGrip;
  const westPref = west.combatProfile.preferredGrip;

  if (eastPref === westPref && eastPref !== 'none') {
    st.grappleState = establishSymmetricGrip(east, west, eastPref);
    st.log.push({ phase: 'engagement', data: { event: 'grip_stalemate', type: 'ai_yotsu' } });
    return;
  }

  if (eastPref !== westPref && eastPref !== 'none' && westPref !== 'none') {
    st.grappleState = establishAsymmetricGrip(rng, east, west);
    const winner = st.grappleState.gripAdvantage === 'east_strong' ? 'east' : 'west';
    st.log.push({ 
      phase: 'engagement', 
      data: { 
        event: 'grip_clash_resolved', 
        winner, 
        grip: winner === 'east' ? east.combatProfile.preferredGrip : west.combatProfile.preferredGrip 
      } 
    });
    return;
  }

  st.grappleState = establishMessyGrip(rng, east, west);
}

/**
 * AI Action Selection Logic.
 */
function selectAction(rng: SeededRNG, r: Rikishi, st: EngineState, opponent: Rikishi): CombatAction {
  const isEast = r.id === st.eastId;
  const isPlayer = st.playerSide && (st.playerSide === (isEast ? 'east' : 'west'));
  
  const tactic = isPlayer ? st.playerTactic : (st.cpuTacticOverride || 'STANDARD');

  if (st.tick === 0 && tactic === 'HENKA') {
    const move = pickMoveFromClass(rng, undefined, r, opponent, st, 'trick', 'hatakikomi');
    return {
      family: 'trick',
      intent: 'attack',
      targetKimariteClass: 'slap_pull',
      statWeighting: move.statWeights,
      moveId: move.id,
      isHighRisk: true
    };
  }

  const profile = r.combatProfile || { familyPreferences: { push: 25, belt: 25, trick: 25, speed: 25 } };
  const prefs = { ...profile.familyPreferences };

  if (tactic === 'OSHI_THRUST') {
     prefs.push *= 5.0;
     prefs.belt *= 0.1;
  } else if (tactic === 'YOTSU_BELT') {
     prefs.belt *= 5.0;
     prefs.push *= 0.1;
  }
  
  // Aggression (boosted by rivalry heat in boutResolver) shifts toward explosive push/speed
  const aggression = stat(r, 'aggression', 50);
  if (aggression > 65) {
    const boost = (aggression - 65) / 70;
    prefs.push = (prefs.push || 25) * (1 + boost);
    prefs.speed = (prefs.speed || 25) * (1 + boost * 0.7);
    prefs.belt = (prefs.belt || 25) * Math.max(0.5, 1 - boost * 0.6);
  }

  const roll = rng.next();
  let cumulative = 0;
  let family: TacticalFamily = 'push';
  const totalWeight = Object.values(prefs).reduce((a, b) => a + b, 0);
  const normalizedRoll = roll * totalWeight;

  for (const [fam, weight] of Object.entries(prefs)) {
    cumulative += weight;
    if (normalizedRoll < cumulative) {
      family = fam as TacticalFamily;
      if (family === 'belt' && st.stance !== 'belt-dominant') family = 'push';
      break;
    }
  }

  const intentRoll = rng.next();
  const intent: CombatAction['intent'] = intentRoll < 0.7 ? 'attack' : intentRoll < 0.9 ? 'defend' : 'counter';
  const move = pickMoveFromClass(rng, undefined, r, opponent, st, family);

  return {
    family,
    intent,
    targetKimariteClass: (move as any).kimariteClass || 'special',
    statWeighting: move.statWeights,
    moveId: move.id,
    isHighRisk: move.isHighRisk
  };
}

/**
 * Tachiai resolution.
 */
function resolveTachiai(rng: SeededRNG, east: Rikishi, west: Rikishi, st: EngineState): { earlyWinner?: Side, earlyKimarite?: string } | void {
  const eastAction = selectAction(rng, east, st, west);
  const westAction = selectAction(rng, west, st, east);

  if (checkHenkaTrick(east, west, eastAction, westAction, rng)) {
    st.advantage = "east";
    st.tachiaiWinner = "east";
    st.position = "lateral";
    st.log.push({ phase: 'tachiai', data: { event: 'henka_success', winner: 'east', trick: 'henka' } });
    return { earlyWinner: "east", earlyKimarite: 'hatakikomi' };
  }
  if (checkHenkaTrick(west, east, westAction, eastAction, rng)) {
    st.advantage = "west";
    st.tachiaiWinner = "west";
    st.position = "lateral";
    st.log.push({ phase: 'tachiai', data: { event: 'henka_success', winner: 'west', trick: 'henka' } });
    return { earlyWinner: "west", earlyKimarite: 'hatakikomi' };
  }

  let eastLeverage = 1.0;
  let westLeverage = 1.0;
  if (TACTICAL_MATRIX[eastAction.family].includes(westAction.family)) eastLeverage += 0.4;
  else if (TACTICAL_MATRIX[westAction.family].includes(eastAction.family)) westLeverage += 0.4;

  // Wire in archetype tachiaiBonus (was defined but never applied — confirmed dead code).
  // Check EXTENDED_ARCHETYPE_PROFILES first (tsuppari: +7, defensive: -4),
  // then fall through to ARCHETYPE_PROFILES via ARCHETYPE_MAP.
  const eastArch =
    EXTENDED_ARCHETYPE_PROFILES[east.combatProfile?.archetype as CombatArchetype] ??
    ARCHETYPE_PROFILES[ARCHETYPE_MAP[east.combatProfile?.archetype as CombatArchetype]] ??
    ARCHETYPE_PROFILES.all_rounder;
  const westArch =
    EXTENDED_ARCHETYPE_PROFILES[west.combatProfile?.archetype as CombatArchetype] ??
    ARCHETYPE_PROFILES[ARCHETYPE_MAP[west.combatProfile?.archetype as CombatArchetype]] ??
    ARCHETYPE_PROFILES.all_rounder;

  const finalEast = calculateActionPower(east, eastAction, west, st) * eastLeverage
    + eastArch.tachiaiBonus
    + jitter(rng, 5);
  const finalWest = calculateActionPower(west, westAction, east, st) * westLeverage
    + westArch.tachiaiBonus
    + jitter(rng, 5);

  const winner = finalEast >= finalWest ? "east" : "west";
  const margin = Math.abs(finalEast - finalWest);

  st.tachiaiWinner = winner;
  st.advantage = winner;
  st.winnerConsecutiveAdvantage = 1;
  st.position = "front";
  st.timeSeconds += 1 + rng.next();

  // Tachiai impact: losing the tachiai delivers an opening balance shock
  // (brings average bout duration closer to real makuuchi ~7s)
  const tachiaiImpact = 8 + Math.min(12, margin * 0.3);
  if (winner === "east") st.balanceWest -= tachiaiImpact;
  else st.balanceEast -= tachiaiImpact;

  // Belt action at tachiai — establish grip; check for nodowa (push blocks grab)
  if (eastAction.family === 'belt' || westAction.family === 'belt') {
    // Nodowa: oshi/tsuppari wins tachiai against belt-seeking opponent
    if (eastAction.family === 'push' && westAction.family === 'belt' && winner === 'east') {
      st.nodawaActive = true;
      st.log.push({ phase: 'tachiai', data: { event: 'nodowa', side: 'east' } });
    } else if (westAction.family === 'push' && eastAction.family === 'belt' && winner === 'west') {
      st.nodawaActive = true;
      st.log.push({ phase: 'tachiai', data: { event: 'nodowa', side: 'west' } });
    } else {
      resolveGripClash(rng, east, west, st);
      st.stance = "belt-dominant";
    }
  }

  st.log.push({
    phase: "tachiai",
    data: { winner, eastAction, westAction, eastPower: Math.round(finalEast), westPower: Math.round(finalWest), margin, tachiaiImpact }
  });
}

/**
 * Single tick resolution.
 */
function resolveActionTick(rng: SeededRNG, east: Rikishi, west: Rikishi, st: EngineState): { winner?: Side, kimarite?: Kimarite } | void {
  st.tick += 1;
  st.timeSeconds += 2;

  let eastAction = selectAction(rng, east, st, west);
  let westAction = selectAction(rng, west, st, east);

  // Nodowa expiry: blocks belt action for one tick
  if (st.nodawaActive) {
    if (eastAction.family === 'belt') eastAction = { ...eastAction, family: 'push' };
    if (westAction.family === 'belt') westAction = { ...westAction, family: 'push' };
    st.nodawaActive = false;
  }

  if (st.stance === "belt-dominant" || eastAction.family === 'belt' || westAction.family === 'belt') {
    // Evolve grip per-tick instead of re-rolling from scratch
    st.grappleState = contestGripTick(rng, east, west, st.grappleState);
    if (st.stance !== "belt-dominant") st.stance = "belt-dominant";
  } else if (eastAction.family === 'push' && westAction.family === 'push') {
    st.stance = "push-dominant";
  }

  let eastRelLev = 1.0;
  let westRelLev = 1.0;
  if (TACTICAL_MATRIX[eastAction.family].includes(westAction.family)) eastRelLev += 0.4;
  else if (TACTICAL_MATRIX[westAction.family].includes(eastAction.family)) westRelLev += 0.4;

  // Within-bout stamina curve: bouts beyond tick 8 get progressively decisive
  const staminaMult = st.tick > 8
    ? Math.max(0.6, 1 - (st.tick - 8) * 0.03)
    : 1.0;

  const eastPower = calculateActionPower(east, eastAction, west, st) * eastRelLev * staminaMult + jitter(rng, 5);
  const westPower = calculateActionPower(west, westAction, east, st) * westRelLev * staminaMult + jitter(rng, 5);

  const eastSoak = stat(east, 'balance') / 20;
  const westSoak = stat(west, 'balance') / 20;

  let eastDamage = Math.max(0, westPower - eastPower - eastSoak);
  let westDamage = Math.max(0, eastPower - westPower - westSoak);

  // High risk penalty
  if (eastAction.isHighRisk && eastPower < westPower) eastDamage += (westPower - eastPower) * 0.5;
  if (westAction.isHighRisk && westPower < eastPower) westDamage += (eastPower - westPower) * 0.5;

  st.balanceEast -= eastDamage;
  st.balanceWest -= westDamage;

  // Track last action families for kimarite evaluator
  st.lastActionFamilyEast = eastAction.family;
  st.lastActionFamilyWest = westAction.family;

  // Track consecutive advantage streak
  const tickAdvantage: Advantage = eastDamage > westDamage ? "west" : westDamage > eastDamage ? "east" : st.advantage;
  if (tickAdvantage !== "none" && tickAdvantage === st.advantage) {
    st.winnerConsecutiveAdvantage += 1;
  } else if (tickAdvantage !== "none") {
    st.advantage = tickAdvantage;
    st.winnerConsecutiveAdvantage = 1;
  }

  // Victory check
  if (st.balanceWest <= 0) {
    st.loserLastActionFamily = westAction.family;
    st.finalLoserBalanceDrain = westDamage;
    const move = pickMoveFromClass(rng, eastAction.targetKimariteClass, east, west, st, eastAction.family, eastAction.moveId);
    st.advantage = "east";
    return { winner: "east", kimarite: move };
  } else if (st.balanceEast <= 0) {
    st.loserLastActionFamily = eastAction.family;
    st.finalLoserBalanceDrain = eastDamage;
    const move = pickMoveFromClass(rng, westAction.targetKimariteClass, west, east, st, westAction.family, westAction.moveId);
    st.advantage = "west";
    return { winner: "west", kimarite: move };
  }

  st.log.push({
    phase: "engagement",
    data: { tick: st.tick, eastAction, westAction, balanceEast: Math.max(0, Math.round(st.balanceEast)), balanceWest: Math.max(0, Math.round(st.balanceWest)), advantage: st.advantage }
  });
}

/**
 * Main entrance to bout physics.
 */
export function resolveBoutPhysics(bout: BoutContext, east: Rikishi, west: Rikishi, basho: BashoState): { result: BoutResult; engineSnapshot: EngineSnapshot } {
  const seed = `${basho.id || "basho"}-${basho.year || 0}-${bout.day}-${east.id}-${west.id}`;
  const rng = rngFromSeed(seed, "bout", "root");

  // Archetype-based starting balance multiplier.
  // Oshi/tsuppari fighters commit forward aggressively — less stable at rest.
  // Defensive/giant fighters are immovable — harder to budge.
  function archetypeBalanceMult(r: Rikishi): number {
    const arch = r.combatProfile?.archetype as CombatArchetype | undefined;
    if (arch === 'oshi' || arch === 'tsuppari') return 0.80;
    if (arch === 'defensive') return 1.10;
    if (arch === 'giant') return 1.15;
    return 1.0;
  }

  const st: EngineState = {
    tick: 0,
    timeSeconds: 0,
    stance: "no-grip",
    position: "front",
    advantage: "none",
    tachiaiWinner: "east",
    fatigueEast: 0,
    fatigueWest: 0,
    day: bout.day,
    balanceEast: stat(east, 'balance') * archetypeBalanceMult(east),
    balanceWest: stat(west, 'balance') * archetypeBalanceMult(west),
    eastId: east.id,
    westId: west.id,
    log: [],
    mizuiriDeclared: false,
    nodawaActive: false,
    playerSide: bout.playerSide,
    playerTactic: bout.playerTactic,
    cpuTacticOverride: bout.cpuTacticOverride,
    winnerConsecutiveAdvantage: 0,
    loserLastActionFamily: undefined,
    finalLoserBalanceDrain: 0,
    grappleState: {
      east: { rightHand: 'outside', leftHand: 'outside', depth: 'standard' },
      west: { rightHand: 'outside', leftHand: 'outside', depth: 'standard' },
      gripAdvantage: 'neutral'
    }
  };

  const tachiaiRes = resolveTachiai(rng, east, west, st);
  let finalWinner: Side | undefined;
  let finalKimarite: Kimarite | undefined;

  if (tachiaiRes && tachiaiRes.earlyWinner) {
    finalWinner = tachiaiRes.earlyWinner;
    finalKimarite = (KIMARITE_REGISTRY.find(k => k.id === tachiaiRes.earlyKimarite) as Kimarite) || KIMARITE_REGISTRY[0];
  } else {
    for (let i = 0; i < 120; i++) {
      const res = resolveActionTick(rng, east, west, st);
      if (res && res.winner) {
          finalWinner = res.winner;
          finalKimarite = res.kimarite;
          break;
      }
      if (st.timeSeconds > 240) {
          finalWinner = st.advantage === "none" ? st.tachiaiWinner : st.advantage;
          finalKimarite = pickMoveFromClass(rng, "force_out", finalWinner === 'east' ? east : west, finalWinner === 'east' ? west : east, st);
          break;
      }
    }
    if (!finalWinner) {
        finalWinner = st.advantage === "none" ? "east" : st.advantage;
        finalKimarite = pickMoveFromClass(rng, "force_out", finalWinner === 'east' ? east : west, finalWinner === 'east' ? west : east, st);
    }
  }

  st.log.push({ phase: "finish", data: { winner: finalWinner, kimarite: finalKimarite?.id, kimariteName: finalKimarite?.name, time: st.timeSeconds } });

  const eT = tierOf(east);
  const wT = tierOf(west);
  const upset = (finalWinner === "east" && eT > wT + 1) || (finalWinner === "west" && wT > eT + 1);
  const isKinboshi = (finalWinner === "east" && eT === 5 && wT === 1) || (finalWinner === "west" && wT === 5 && eT === 1);

  const result: BoutResult = {
    boutId: bout.id,
    winner: finalWinner as Side,
    winnerRikishiId: finalWinner === "east" ? east.id : west.id,
    loserRikishiId: finalWinner === "east" ? west.id : east.id,
    kimarite: (finalKimarite?.id || "yorikiri") as BoutResult['kimarite'],
    kimariteName: finalKimarite?.name || "Yorikiri",
    stance: st.stance,
    tachiaiWinner: st.tachiaiWinner,
    duration: Math.max(1, Math.ceil(st.timeSeconds)),
    upset,
    isKinboshi,
    log: st.log,
    kenshoEnvelopes: 0
  };

  const engineSnapshot: EngineSnapshot = {
    stance: st.stance,
    grappleState: st.grappleState,
    balanceEast: st.balanceEast,
    balanceWest: st.balanceWest,
    position: st.position,
    advantage: st.advantage,
    winnerConsecutiveAdvantage: st.winnerConsecutiveAdvantage,
    loserLastActionFamily: st.loserLastActionFamily,
    finalLoserBalanceDrain: st.finalLoserBalanceDrain,
  };

  return { result, engineSnapshot };
}
