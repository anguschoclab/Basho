// src/engine/bout.ts
// =======================================================
// Deterministic Bout Simulation Engine (v3.0 - Harmonized)
// - MERGED: Realistic Physics (Mass/Time) + Original PBP Hooks
// - Emits structured BoutLogEntry[] compatible with pbp.ts
// - Implements "Mizu-iri" (Water Break) & Realistic Timing
// - Preserves all 'GripEvent'/'StrikeEvent' strings for narrative
// =======================================================

import { rngFromSeed, SeededRNG } from "../rng";
import type { Rikishi } from "../types/rikishi";
import type { BoutResult, BoutLogEntry, BashoState, BashoName } from "../types/basho";
import type { Side } from "../types/banzuke";
import {
  Stance,
  TacticalArchetype,
  RikishiArchetype,
  TacticalFamily,
  TACTICAL_MATRIX,
  CombatAction,
  CombatProfile,
  NarrativeContext,
  TickResolutionEvent,
  GrappleState,
  HandPosition,
  ARCHETYPE_PROFILES
} from "../types/combat";

import { RANK_HIERARCHY } from "../types/banzuke";
import { KIMARITE_REGISTRY, getKimariteCount, type Kimarite, type KimariteClass, getKimariteByClass, getKimariteForFamily } from "../kimarite";
import { resolveTacticalClash, determineCPUTactic } from "../h2h";

/** Engine position vocabulary (IMPORTANT) — canonical source, re-exported by pbp.ts */
export type Position = "front" | "lateral" | "rear";
/** Type representing advantage. */
export type Advantage = "east" | "west" | "none";

// --- PBP HOOKS (Preserved for compatibility) ---
/** Type representing grip event. */
type GripEvent =
  | "migi_yotsu_established"
  | "hidari_yotsu_established"
  | "double_inside"
  | "over_under"
  | "no_grip_scramble"
  | "grip_break";

/** Type representing strike event. */
type StrikeEvent =
  | "tsuppari_barrage"
  | "nodowa_pressure"
  | "harite_slap"
  | "throat_attack"
  | "shoulder_blast";

/** Type representing edge event. */
type EdgeEvent =
  | "bales_at_tawara"
  | "steps_out_then_recovers"
  | "heel_on_straw"
  | "dancing_escape"
  | "turns_the_tables"
  | "slips_but_survives";

/** Type representing momentum shift reason. */
type MomentumShiftReason =
  | "tachiai_win"
  | "timing_counter"
  | "grip_change"
  | "footwork_angle"
  | "fatigue_turn"
  | "mistake"
  | "physics_wall"  // NEW
  | "mizu_iri"     // NEW
  | "tactical_adaptation"; // NEW

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
export interface EngineState {
  tick: number;
  timeSeconds: number; // NEW: Track real time
  stance: Stance;
  position: Position;
  advantage: Advantage;
  tachiaiWinner: Side;
  fatigueEast: number;
  fatigueWest: number;
  balanceEast: number; // NEW: Universal Defense pool
  balanceWest: number; // NEW
  log: BoutLogEntry[];
  mizuiriDeclared: boolean; // NEW
  tacticalResult?: import("../types/combat").TacticalResult;
  playerSide?: import("../types/banzuke").Side;
  playerTactic?: import("../types/combat").BoutTactic;
  cpuTacticOverride?: import("../types/combat").BoutTactic;
  eastId: string;
  westId: string;
  // Memory for narrative
  lastActionFamilyEast?: TacticalFamily;
  lastActionFamilyWest?: TacticalFamily;
  lastAdvantage?: Advantage;
  day: number;
  grappleState: GrappleState;
  eastTacticalPivotTick?: number; // v1.7
  westTacticalPivotTick?: number; // v1.7
}

const _clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const clamp01 = (n: number) => _clamp(n, 0, 1);

/** Create deterministic small noise */
function jitter(rng: SeededRNG, scale = 1): number {
  return (rng.next() - 0.5) * scale;
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

/**
 * Choose side by score.
 *  * @param eastScore - The East score.
 *  * @param westScore - The West score.
 *  * @returns The result.
 */
function chooseSideByScore(eastScore: number, westScore: number): Side {
  return eastScore >= westScore ? "east" : "west";
}

/**
 * Other side.
 *  * @param side - The Side.
 *  * @returns The result.
 */
function otherSide(side: Side): Side {
  return side === "east" ? "west" : "east";
}

/** * TIME HELPER: Calculate seconds elapsed for a phase
 * Oshi = Fast / Explosive
 * Yotsu = Slower / Heavy
 */
function calculatePhaseTime(rng: SeededRNG, stance: Stance, intensity: "high" | "low"): number {
  let base = 0;
  if (intensity === "high") {
    // Action moments (Pushing, Throwing)
    base = stance === "push-dominant" ? 2 : 4; 
  } else {
    // Stalemate moments (Leaning, Gripping)
    base = stance === "push-dominant" ? 4 : 15; // Yotsu stalemates are long
  }
  const variance = rng.next() * (base * 0.5);
  return Math.round(base + variance);
}

/**
 * MASTERY HELPER: Calculate compatibility of a move with current body
 */
function calculateMoveCompatibility(r: Rikishi, k: Kimarite): number {
  return 1.0; // Simplified for move-driven model
}

/**
 * Helper to pick a specific Kimarite from a class for the finish
 */
function pickMoveFromClass(rng: SeededRNG, moveClass: KimariteClass | undefined, attacker: Rikishi, defender: Rikishi, st: EngineState, family?: TacticalFamily, moveId?: string): Kimarite {
  if (moveId) {
    const m = KIMARITE_REGISTRY.find(k => k.id === moveId);
    if (m) return m;
  }

  // 1. Filter valid moves for this state
  let possible = KIMARITE_REGISTRY.filter(k => checkKimariteRequirements(k, attacker, defender, st));
  
  // 2. Filter by requested Class or Family if provided
  if (moveClass) {
    possible = possible.filter(k => (k as any).kimariteClass === moveClass);
  } else if (family) {
    possible = possible.filter(k => k.tacticalFamily === family);
  }
  
  if (possible.length === 0) {
    possible = KIMARITE_REGISTRY.filter(k => checkKimariteRequirements(k, attacker, defender, st));
    if (possible.length === 0) return KIMARITE_REGISTRY[0]; // Absolute fallback (yorikiri)
  }

  const arch = ARCHETYPE_PROFILES[attacker.combatProfile.archetype as TacticalArchetype] || ARCHETYPE_PROFILES.all_rounder;
  const favored = attacker.combatProfile.favoredKimarite || [];

  // 3. Weighted selection
  const weights = possible.map(m => {
    let w = m.baseWeight || 1;
    if (m.rarity === 'uncommon') w *= 0.55;
    else if (m.rarity === 'rare') w *= 0.20;
    else if (m.rarity === 'legendary') w *= 0.05;

    if (arch.preferredClasses.includes((m as any).kimariteClass)) w *= 1.5;
    if (favored.includes(m.id)) w *= 3.0;
    return w;
  });

  const totalWeight = weights.reduce((s, val) => s + val, 0);
  const roll = rng.next() * totalWeight;
  let cumulative = 0;

  for (let i = 0; i < possible.length; i++) {
    cumulative += weights[i];
    if (roll < cumulative) return possible[i];
  }

  return possible[0];
}

/**
 * Height Leverage Helper: Calculates Gravity Delta bonuses
 */
function calculateHeightLeverage(attacker: Rikishi, defender: Rikishi, targetFamily: TacticalFamily): number {
  const heightA = attacker.height || 180;
  const heightD = defender.height || 180;
  
  // High center of gravity bonus (Taller)
  if (heightA > heightD + 10) {
    if (targetFamily === 'belt') return 1.15; // Nageite / Lifting bonus
  }
  
  // Low center of gravity bonus (Shorter)
  if (heightA < heightD - 10) {
    if (targetFamily === 'push' || targetFamily === 'speed') return 1.15; // Push / Kakeite (leg trips) bonus
  }
  
  return 1.0;
}

// =========================================================
// MOVE-DRIVEN ACTION ENGINE (v4.0 - Move-Based)
// =========================================================

/**
 * REQUIREMENTS HELPER: Check if a move's state gates are met
 */
export function checkKimariteRequirements(k: Kimarite, attacker: Rikishi, defender: Rikishi, st: EngineState): boolean {
  const isGrappling = st.grappleState.gripAdvantage !== 'neutral' || 
                      st.stance === 'belt-dominant' || 
                      st.stance === 'migi-yotsu' || 
                      st.stance === 'hidari-yotsu';

  if (k.requiresBeltGrip && !isGrappling) return false;
  if (!k.requirements) return true;
  const req = k.requirements;

  // edgeOfRing: Advantage against attacker or very low balance
  if (req.edgeOfRing) {
    const isAtEdge = st.advantage === (attacker.id === st.eastId ? 'west' : 'east') || 
                     (attacker.id === st.eastId ? st.balanceEast : st.balanceWest) < 25;
    if (!isAtEdge) return false;
  }

  if (req.maxAttackerBalance !== undefined) {
    const bal = attacker.id === st.eastId ? st.balanceEast : st.balanceWest;
    if (bal > req.maxAttackerBalance) return false;
  }

  if (req.minStrengthDifferential !== undefined) {
    const diff = stat(attacker, 'strength') - stat(defender, 'strength');
    if (diff < req.minStrengthDifferential) return false;
  }

  if (req.canFlank) {
    if (st.position !== 'lateral' && st.position !== 'rear') return false;
  }

  if (req.requiresWeightAdvantage) {
    if ((attacker.weight || 150) < (defender.weight || 150) + 10) return false;
  }

  if (req.isDesperation) {
    const bal = attacker.id === st.eastId ? st.balanceEast : st.balanceWest;
    const isLosing = st.advantage === (attacker.id === st.eastId ? 'west' : 'east');
    if (bal > 30 || !isLosing) return false;
  }

  if (req.requiredGrip) {
    const grip = attacker.id === st.eastId ? st.grappleState.east : st.grappleState.west;
    if (req.requiredGrip.rightHand && grip.rightHand !== req.requiredGrip.rightHand) return false;
    if (req.requiredGrip.leftHand && grip.leftHand !== req.requiredGrip.leftHand) return false;
    if (req.requiredGrip.anyHand && grip.rightHand !== req.requiredGrip.anyHand && grip.leftHand !== req.requiredGrip.anyHand) return false;
    if (req.requiredGrip.depth && grip.depth !== req.requiredGrip.depth) return false;
  }

  return true;
}

/**
 * AI Action Selection Logic
 */
function selectAction(rng: SeededRNG, r: Rikishi, st: EngineState, opponent: Rikishi): CombatAction {
  const isEast = r.id === st.eastId;
  const isPlayer = st.playerSide && (st.playerSide === (isEast ? 'east' : 'west'));
  
  // v1.7 Mid-Bout Tactical Intelligence (CPU Only)
  if (!isPlayer && st.tick > 5) {
     const mental = stat(r, 'mental');
     const balance = isEast ? st.balanceEast : st.balanceWest;
     const lastPivot = isEast ? st.eastTacticalPivotTick : st.westTacticalPivotTick;
     
     // Smarter rikishi pivot when losing balance (A8.1 compliant)
     if (mental > 60 && balance < 35 && (!lastPivot || st.tick - lastPivot > 20)) {
        const currentTactic = st.cpuTacticOverride || 'STANDARD';
        let newTactic: import("../types/combat").BoutTactic = currentTactic;

        // Advantage check: if opponent has advantage, pivot to defensive/trick tactic
        if (st.advantage === (isEast ? 'west' : 'east')) {
           // If we're being pushed and have high technique, try to SLAP DOWN (OSHI -> TRICK)
           if (st.stance === 'push-dominant' && stat(r, 'technique') > 60) {
              newTactic = 'HENKA'; // Desperation slap-down
           } else if (st.stance === 'push-dominant') {
              newTactic = 'YOTSU_BELT'; // Try to grab and stabilize
           } else if (st.stance === 'belt-dominant') {
              newTactic = 'OSHI_THRUST'; // Try to break the grip with thrusts
           }
        }

        if (newTactic !== currentTactic) {
           st.cpuTacticOverride = newTactic;
           if (isEast) st.eastTacticalPivotTick = st.tick;
           else st.westTacticalPivotTick = st.tick;

           st.log.push({
              phase: 'engagement',
              data: {
                 event: 'tactical_adaptation',
                 side: isEast ? 'east' : 'west',
                 reason: 'balance_critical',
                 newTactic
              }
           });
        }
     }
  }

  const tactic = isPlayer ? st.playerTactic : (st.cpuTacticOverride || 'STANDARD');

  // Handle Henka (Force trick on Tachiai only)
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

  // Handle Tactic Biases
  const profile = r.combatProfile || { familyPreferences: { push: 25, belt: 25, trick: 25, speed: 25 } };
  const prefs = { ...profile.familyPreferences };

  if (tactic === 'OSHI_THRUST') {
    prefs.push *= 5.0;
    prefs.belt *= 0.1;
  } else if (tactic === 'YOTSU_BELT') {
    prefs.belt *= 5.0;
    prefs.push *= 0.1;
  }
  
  // v1.3.1 Dynamic Tactical Shifts
  // 1. Trickster Edge Case: If in a belt state, prioritize belt moves for survival
  if (r.archetype === 'trickster' && st.stance.includes('yotsu')) {
    prefs.belt *= 3.0;
    prefs.trick *= 0.5;
  }

  // 2. Mental AI Logic: Avoid weight deficits
  const mental = stat(r, 'mental');
  const weightDiff = (opponent.weight || 150) - (r.weight || 150);
  
  if (mental > 60 && weightDiff > 30) {
    // Small wrestler avoids push/belt against giants
    prefs.push *= 0.2;
    prefs.belt *= 0.5;
    prefs.trick *= 2.0;
    prefs.speed *= 1.5;
  }

  // 3. Normalized weighted selection
  const roll = rng.next();
  let cumulative = 0;
  let family: TacticalFamily = 'push';
  
  const totalWeight = Object.values(prefs).reduce((a, b) => a + b, 0);
  const normalizedRoll = roll * totalWeight;

  for (const [fam, weight] of Object.entries(prefs)) {
    cumulative += weight;
    if (normalizedRoll < cumulative) {
      family = fam as TacticalFamily;
      // Safety: Only pick 'belt' if we have a grip, otherwise preferred 'push'
      if (family === 'belt' && st.stance !== 'belt-dominant') family = 'push';
      break;
    }
  }

  // 2. Pick an Intent
  const intentRoll = rng.next();
  const intent: CombatAction['intent'] = intentRoll < 0.7 ? 'attack' : intentRoll < 0.9 ? 'defend' : 'counter';
      
  // 3. Pick a Move from the selected family
  const move = pickMoveFromClass(rng, undefined, r, opponent, st, family);

  return {
    family,
    intent,
    targetKimariteClass: (move as any).kimariteClass || 'special',
    statWeighting: move.statWeights,
    moveId: move.id, // Add moveId to CombatAction for penalty tracking
    isHighRisk: move.isHighRisk
  };
}

/**
 * Calculate Action Power based on Move-Specific Math (v1.3)
 */
export function calculateActionPower(r: Rikishi, action: CombatAction, opponent: Rikishi, st: EngineState): number {
  const w = action.statWeighting;
  const s = r.stats || r;
  const oppS = opponent.stats || opponent;
  
  let power = 0;
  
  // 1. Base Physicals Logic
  let strengthPower = stat(r, 'strength', s.strength);
  
  // Weight (Mass / Momentum) Interaction
  if (action.family === 'belt') {
    // Weight acts as a multiplier to strength for belt moves
    strengthPower *= (1 + (r.weight || 150) / 500);
  }
  
  power += (strengthPower * (w.strength || 0));
  power += (stat(r, 'weight', r.weight) * (w.weight || 0));
  power += (stat(r, 'technique', s.technique) * (w.technique || 0));
  power += (stat(r, 'speed', s.speed) * (w.speed || 0));

  // 2. Center of Gravity Leverage
  const leverage = calculateHeightLeverage(r, opponent, action.family);
  power *= leverage;

  // 3. Speed/Flanking: High speed temporarily zeros out Strength defense
  let opponentStrengthDefense = stat(opponent, 'strength', oppS.strength);
  if (action.family === 'speed' && stat(r, 'speed') > stat(opponent, 'speed') + 20) {
    opponentStrengthDefense = 0; // Out of position
  }

  // 4. Weight Liability
  // A heavy wrestler being slapped down or countered suffers Balance penalties
  let weightLiability = 1.0;
  if ((action.family === 'trick' || action.intent === 'counter') && (opponent.weight || 150) > 160) {
    weightLiability = 1.3; // Mass weaponized against them
  }

  // 5. Fatigue drain: Strength interaction
  if (w.strength > 0.3) {
    const side = (r.id === st.log[0]?.data?.eastId) ? 'east' : 'west'; // Approximate
    if (side === 'east') st.fatigueEast += 0.2;
    else st.fatigueWest += 0.2;
  }

  // 6. Final Power Calculation
  const fatiguePenalty = (r.fatigue || 0) * 0.4;
  power -= fatiguePenalty;

  // v1.6 Grip Multipliers
  if (action.family === 'belt') {
    if (st.grappleState.gripAdvantage === (r.id === st.eastId ? 'moro_zashi_east' : 'moro_zashi_west')) {
      power *= 1.3; // Double inside bonus
    } else if (st.grappleState.gripAdvantage === (r.id === st.eastId ? 'west_strong' : 'east_strong')) {
      power *= 0.85; // Awkward grip penalty
    }

    // v1.6.1 Maemitsu Bonus
    const depth = r.id === st.eastId ? st.grappleState.east.depth : st.grappleState.west.depth;
    if (depth === 'maemitsu') {
      power *= 1.15; // Pulling leverage bonus
    }
  }

  return Math.max(1, power * weightLiability);
}

/**
 * v1.6 resolveGripClash: Triggered when wrestlers enter or maintain a belt grapple
 */
export function resolveGripClash(rng: SeededRNG, east: Rikishi, west: Rikishi, st: EngineState): void {
  const eastPref = east.combatProfile.preferredGrip;
  const westPref = west.combatProfile.preferredGrip;

  // Ai-Yotsu (Symmetric - e.g., both prefer Migi)
  if (eastPref === westPref && eastPref !== 'none') {
    st.grappleState = establishSymmetricGrip(east, west, eastPref);
    st.log.push({ phase: 'engagement', data: { event: 'grip_stalemate', type: 'ai_yotsu' } });
    return;
  }

  // Kenka-Yotsu (Asymmetric - Migi vs Hidari)
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
  if (st.grappleState.gripAdvantage.startsWith('moro_zashi')) {
    const winner = st.grappleState.gripAdvantage === 'moro_zashi_east' ? 'east' : 'west';
    st.log.push({ phase: 'engagement', data: { event: 'moro_zashi_secured', winner } });
  }
}

function establishSymmetricGrip(east: Rikishi, west: Rikishi, pref: 'migi' | 'hidari'): GrappleState {
  // In Ai-Yotsu, both get one hand inside on their preferred side
  return {
    east: { 
      rightHand: pref === 'migi' ? 'inside' : 'outside', 
      leftHand: pref === 'migi' ? 'outside' : 'inside',
      depth: east.combatProfile.preferredGripDepth
    },
    west: { 
      rightHand: pref === 'migi' ? 'inside' : 'outside', 
      leftHand: pref === 'migi' ? 'outside' : 'inside',
      depth: west.combatProfile.preferredGripDepth
    },
    gripAdvantage: 'neutral'
  };
}

function establishAsymmetricGrip(rng: SeededRNG, east: Rikishi, west: Rikishi): GrappleState {
  const eastPower = stat(east, 'technique') + stat(east, 'speed') / 2 + jitter(rng, 10);
  const westPower = stat(west, 'technique') + stat(west, 'speed') / 2 + jitter(rng, 10);

  const winner = eastPower > westPower ? 'east' : 'west';
  
  if (winner === 'east') {
    const pref = east.combatProfile.preferredGrip;
    return {
      east: { 
        rightHand: pref === 'migi' ? 'inside' : 'outside', 
        leftHand: pref === 'hidari' ? 'inside' : 'outside',
        depth: east.combatProfile.preferredGripDepth
      },
      west: { 
        rightHand: pref === 'migi' ? 'blocked' : 'outside', 
        leftHand: pref === 'hidari' ? 'blocked' : 'outside',
        depth: 'standard' 
      },
      gripAdvantage: 'east_strong'
    };
  } else {
    const pref = west.combatProfile.preferredGrip;
    return {
      east: { 
        rightHand: pref === 'migi' ? 'blocked' : 'outside', 
        leftHand: pref === 'hidari' ? 'blocked' : 'outside',
        depth: 'standard'
      },
      west: { 
        rightHand: pref === 'migi' ? 'inside' : 'outside', 
        leftHand: pref === 'hidari' ? 'inside' : 'outside',
        depth: west.combatProfile.preferredGripDepth
      },
      gripAdvantage: 'west_strong'
    };
  }
}

function establishMessyGrip(rng: SeededRNG, east: Rikishi, west: Rikishi): GrappleState {
  const roll = rng.next();
  if (roll < 0.1) {
    // Rare Moro-zashi!
    const winner = rng.next() < 0.5 ? 'east' : 'west';
    return {
      east: { rightHand: winner === 'east' ? 'inside' : 'blocked', leftHand: winner === 'east' ? 'inside' : 'blocked', depth: 'deep' },
      west: { rightHand: winner === 'west' ? 'inside' : 'blocked', leftHand: winner === 'west' ? 'inside' : 'blocked', depth: 'deep' },
      gripAdvantage: winner === 'east' ? 'moro_zashi_east' : 'moro_zashi_west'
    };
  }
  return {
    east: { rightHand: 'outside', leftHand: 'outside', depth: 'standard' },
    west: { rightHand: 'outside', leftHand: 'outside', depth: 'standard' },
    gripAdvantage: 'neutral'
  };
}

// =========================================================
// OPPONENT-AWARE TACTICAL AI HEURISTICS
// Each archetype "reads" the opponent and adjusts behavior.
// Returns signed modifiers consumed by each bout phase.
// =========================================================

// DELETED: Legacy Opponent-Aware Tactical AI

/** =========================
 * Phase 1 — Tachiai
 * ========================= */

function resolveTachiai(rng: SeededRNG, east: Rikishi, west: Rikishi, st: EngineState): { earlyWinner?: Side, earlyKimarite?: string } | void {
  // 1. Both Rikishi select actions for the Tachiai
  const eastAction = selectAction(rng, east, st, west);
  const westAction = selectAction(rng, west, st, east);

  // 2. Trickster Henka Check (Phase 1: The Charge)
  const resolveHenka = (trickster: Rikishi, opponent: Rikishi, trickSide: Side, trickAction: CombatAction, oppAction: CombatAction) => {
    if (trickAction.family === 'trick' && oppAction.family === 'push') {
       // Calculation: Technique + (Opponent Speed * 1.5) VS Opponent Balance
       const tricksterScore = stat(trickster, 'technique') + (stat(opponent, 'speed') * 1.5) + jitter(rng, 5);
       const opponentScore = stat(opponent, 'balance') + jitter(rng, 5);

       if (tricksterScore > opponentScore) {
          st.advantage = trickSide;
          st.tachiaiWinner = trickSide;
          st.position = "lateral";
          st.log.push({
            phase: "tachiai",
            data: { 
              winner: trickSide, 
              trick: 'henka', 
              eastAction, 
              westAction,
              leverage: 2.0 
            }
          });
          st.timeSeconds += 0.5 + jitter(rng, 0.2); // Add minimal charge time even for Henka
          return { earlyWinner: trickSide, earlyKimarite: 'hatakikomi' };
       }
    }
    return null;
  };

  const eastHenka = resolveHenka(east, west, "east", eastAction, westAction);
  if (eastHenka) {
    st.log.push({
      phase: 'tachiai',
      data: { event: 'henka_success', winner: 'east', trick: 'henka' }
    });
    return eastHenka;
  }
  const westHenka = resolveHenka(west, east, "west", westAction, eastAction);
  if (westHenka) {
    st.log.push({
      phase: 'tachiai',
      data: { event: 'henka_success', winner: 'west', trick: 'henka' }
    });
    return westHenka;
  }

  // 3. Normal Tachiai Clash logic with Leverage
  let eastLeverage = 1.0;
  let westLeverage = 1.0;

  if (TACTICAL_MATRIX[eastAction.family].includes(westAction.family)) {
      eastLeverage += 0.4;
  } else if (TACTICAL_MATRIX[westAction.family].includes(eastAction.family)) {
      westLeverage += 0.4;
  }

  const finalEast = calculateActionPower(east, eastAction, west, st) * eastLeverage + jitter(rng, 5);
  const finalWest = calculateActionPower(west, westAction, east, st) * westLeverage + jitter(rng, 5);

  const winner = chooseSideByScore(finalEast, finalWest);
  const margin = Math.abs(finalEast - finalWest);

  st.tachiaiWinner = winner;
  st.advantage = winner;
  st.position = "front";
  st.timeSeconds += 1 + rng.next();

  // v1.6 Grip Resolution
  if (eastAction.family === 'belt' || westAction.family === 'belt') {
    resolveGripClash(rng, east, west, st);
    st.stance = "belt-dominant";
  }

  st.log.push({
    phase: "tachiai",
    data: {
      winner,
      eastAction,
      westAction,
      eastPower: Math.round(finalEast),
      westPower: Math.round(finalWest),
      margin: Math.round(margin * 10) / 10,
      advantage: st.advantage,
      // Pass narrative payload for early wins or variety
      tickResolutionEvent: {
        tickNumber: 0,
        attacker: winner === 'east' ? east : west,
        defender: winner === 'east' ? west : east,
        action: winner === 'east' ? eastAction : westAction,
        powerDifferential: margin,
        context: {
          attackerFatigueLevel: 'fresh',
          defenderBalanceLevel: 'planted',
          isEdgeOfRing: false,
          isRepeatedAction: false,
          isReversal: false,
          isRivalry: false,
          isChampionshipBout: false
        }
      }
    }
  });
}

/** =========================
 * Phase 2 — Engagement
 * ========================= */

function resolveActionTick(rng: SeededRNG, east: Rikishi, west: Rikishi, st: EngineState): { winner?: Side, kimarite?: Kimarite } | void {
  st.tick += 1;
  st.timeSeconds += 2;

  // 1. AI selects actions
  const eastAction = selectAction(rng, east, st, west);
  const westAction = selectAction(rng, west, st, east);

  // v1.6 Grip Resolution (Ongoing)
  if (st.stance === "belt-dominant" || eastAction.family === 'belt' || westAction.family === 'belt') {
    resolveGripClash(rng, east, west, st);
    if (st.stance !== "belt-dominant") st.stance = "belt-dominant";
  } else if (eastAction.family === 'push' && westAction.family === 'push') {
    st.stance = "push-dominant";
  }

  // 2. Check RPS Matrix for Leverage
  let eastRelLeverage = 1.0;
  let westRelLeverage = 1.0;

  if (TACTICAL_MATRIX[eastAction.family].includes(westAction.family)) {
    eastRelLeverage += 0.4;
  } else if (TACTICAL_MATRIX[westAction.family].includes(eastAction.family)) {
    westRelLeverage += 0.4;
  }

  // 3. Execute Move-Specific Math
  const eastPower = calculateActionPower(east, eastAction, west, st) * eastRelLeverage + jitter(rng, 5);
  const westPower = calculateActionPower(west, westAction, east, st) * westRelLeverage + jitter(rng, 5);

  // 4. Update Balance Pools (Universal Defense)
  const eastSoak = stat(east, 'balance') / 20;
  const westSoak = stat(west, 'balance') / 20;

  let eastDamage = Math.max(0, westPower - eastPower - eastSoak);
  let westDamage = Math.max(0, eastPower - westPower - westSoak);

  // v1.3 Execution Penalty: High Risk failure
  if (eastAction.isHighRisk && eastPower < westPower) {
    eastDamage += (westPower - eastPower) * 0.5; // 50% extra penalty for high risk fail
    st.log.push({ phase: 'engagement', data: { event: 'high_risk_fail', side: 'east', moveId: eastAction.moveId } });
  }
  if (westAction.isHighRisk && westPower < eastPower) {
    westDamage += (eastPower - westPower) * 0.5;
    st.log.push({ phase: 'engagement', data: { event: 'high_risk_fail', side: 'west', moveId: westAction.moveId } });
  }

  st.balanceEast -= eastDamage;
  st.balanceWest -= westDamage;

  // v1.6 Narrative Payloads
  const buildEvent = (side: Side): TickResolutionEvent => ({
    tickNumber: st.tick,
    attacker: side === 'east' ? east : west,
    defender: side === 'east' ? west : east,
    action: side === 'east' ? eastAction : westAction,
    powerDifferential: side === 'east' ? eastPower - westPower : westPower - eastPower,
    context: {
      attackerFatigueLevel: (side === 'east' ? st.fatigueEast : st.fatigueWest) > 80 ? 'exhausted' : 'fresh',
      defenderBalanceLevel: (side === 'east' ? st.balanceWest : st.balanceEast) < 20 ? 'critical' : 'planted',
      isEdgeOfRing: false,
      isRepeatedAction: false,
      isReversal: false,
      isRivalry: false,
      isChampionshipBout: false
    }
  });

  // Final Log for the Tick (Consumable by boutNarrative.ts)
  st.log.push({
    phase: 'engagement',
    data: {
      event: 'tick_end',
      tick: st.tick,
      balanceEast: st.balanceEast,
      balanceWest: st.balanceWest,
      eastAction,
      westAction,
      tickResolutionEvent: buildEvent(eastPower > westPower ? 'east' : 'west')
    }
  });

  // 5. Update Fatigue & Momentum
  st.fatigueEast += 0.5 + (westPower / 200);
  st.fatigueWest += 0.5 + (eastPower / 200);
  
  if (eastPower > westPower + 5) east.momentum = Math.min(100, (east.momentum || 50) + 3);
  else if (westPower > eastPower + 5) west.momentum = Math.min(100, (west.momentum || 50) + 3);

  // 6. Positional Shifts
  if (eastPower > westPower * 1.3) st.advantage = "east";
  else if (westPower > eastPower * 1.3) st.advantage = "west";

  // Edge Reversal Check (Mental Stat)
  if (st.advantage === 'west' && stat(east, 'mental') > 70 && st.balanceEast < 20 && rng.next() < 0.2) {
    // Utchari trigger!
    return { winner: "east", kimarite: KIMARITE_REGISTRY.find(k => k.id === 'utchari') as Kimarite };
  }

  // 7. Victory Check (Balance hits 0)
  if (st.balanceWest <= 0) {
    // 2. Determine victory move (kimarite)
    const move = pickMoveFromClass(rng, eastAction.targetKimariteClass, east, west, st, eastAction.family, eastAction.moveId);
    st.advantage = "east";
    return { winner: "east", kimarite: move };
  } else if (st.balanceEast <= 0) {
    // 2. Determine victory move (kimarite)
    const move = pickMoveFromClass(rng, westAction.targetKimariteClass, west, east, st, westAction.family, westAction.moveId);
    st.advantage = "west";
    return { winner: "west", kimarite: move };
  }

  // 8. Construct Narrative Context
  const sideWithAdvantage = eastPower > westPower ? 'east' : (westPower > eastPower ? 'west' : 'none');
  const attacker = sideWithAdvantage === 'west' ? west : east;
  const defender = sideWithAdvantage === 'west' ? east : west;
  const attackerAction = sideWithAdvantage === 'west' ? westAction : eastAction;
  
  const attackerFatigue = sideWithAdvantage === 'west' ? st.fatigueWest : st.fatigueEast;
  const defenderBalance = sideWithAdvantage === 'west' ? st.balanceEast : st.balanceWest;
  const attackerLastFamily = sideWithAdvantage === 'west' ? st.lastActionFamilyWest : st.lastActionFamilyEast;

  const h2h = attacker.h2h?.[defender.id];
  const isRivalry = !!(h2h && (h2h.wins + h2h.losses) >= 3);
  const isChampionshipBout = st.day === 15 && (attacker.currentBashoWins ?? 0) >= 10 && (defender.currentBashoWins ?? 0) >= 10;

  const narrativeContext: NarrativeContext = {
    attackerFatigueLevel: attackerFatigue > 60 ? 'exhausted' : attackerFatigue > 30 ? 'gasping' : 'fresh',
    defenderBalanceLevel: defenderBalance < 20 ? 'critical' : defenderBalance < 50 ? 'wobbling' : 'planted',
    isEdgeOfRing: defenderBalance < 25 || st.advantage !== 'none',
    isRepeatedAction: attackerAction.family === attackerLastFamily,
    isReversal: st.lastAdvantage !== 'none' && st.lastAdvantage !== sideWithAdvantage,
    isRivalry,
    isChampionshipBout
  };

  const tickResolutionEvent: TickResolutionEvent = {
    tickNumber: st.tick,
    attacker,
    defender,
    action: attackerAction,
    powerDifferential: Math.abs(eastPower - westPower),
    context: narrativeContext
  };

  // 9. Update Memory
  st.lastActionFamilyEast = eastAction.family;
  st.lastActionFamilyWest = westAction.family;
  st.lastAdvantage = sideWithAdvantage;

  // 10. Log State Update
  st.log.push({
    phase: "engagement",
    data: {
      tick: st.tick,
      eastAction,
      westAction,
      eastPower: Math.round(eastPower),
      westPower: Math.round(westPower),
      balanceEast: Math.max(0, Math.round(st.balanceEast)),
      balanceWest: Math.max(0, Math.round(st.balanceWest)),
      advantage: st.advantage,
      time: st.timeSeconds,
      tickResolutionEvent // Inject the new payload
    }
  });
}

/** =========================
 * Phase 3 — Momentum ticks
 * ========================= */

// DELETED: Legacy Momentum Ticks & Finish Logic

/** =========================
 * Public API
 * ========================= */

export function resolveBoutPhysics(bout: BoutContext, east: Rikishi, west: Rikishi, basho: BashoState): BoutResult {
  // Deterministic seed
  const bashoId = basho.id ?? "basho";
  const year = basho.year ?? 0;
  const seed = `${bashoId}-${year}-${bout.day}-${east.id}-${west.id}`;
  const rng = rngFromSeed(seed, "bout", "root");

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
    balanceEast: stat(east, 'balance'), // Initialize pools
    balanceWest: stat(west, 'balance'),
    log: [],
    mizuiriDeclared: false,
    playerSide: bout.playerSide,
    playerTactic: bout.playerTactic,
    cpuTacticOverride: bout.cpuTacticOverride,
    eastId: east.id,
    westId: west.id,
    lastAdvantage: 'none',
    grappleState: {
      east: { rightHand: 'outside', leftHand: 'outside', depth: 'standard' },
      west: { rightHand: 'outside', leftHand: 'outside', depth: 'standard' },
      gripAdvantage: 'neutral'
    }
  };

  // 1. Tachiai Phase
  const tachiaiResult = resolveTachiai(rng, east, west, st);

  let finalWinner: Side | undefined;
  let finalKimarite: Kimarite | undefined;

  if (tachiaiResult && tachiaiResult.earlyWinner) {
    finalWinner = tachiaiResult.earlyWinner;
    finalKimarite = (KIMARITE_REGISTRY.find(k => k.id === tachiaiResult.earlyKimarite) as Kimarite) || KIMARITE_REGISTRY[0];
  } else {
    // 2. Engagement Phase (Action Loop)
    // No more arbitrary target ticks; we loop until victory or max time
    const MAX_TICKS = 120;
    for (let i = 0; i < MAX_TICKS; i++) {
      const tickResult = resolveActionTick(rng, east, west, st);
      if (tickResult && tickResult.winner) {
          finalWinner = tickResult.winner;
          finalKimarite = tickResult.kimarite;
          break;
      }
      
      // Mizu-iri check (4 Minutes)
      if (st.timeSeconds > 240) {
          // Force a resolution if mizu-iri reached
          finalWinner = st.advantage === "none" ? (st.tachiaiWinner as Side) : (st.advantage as Side);
          const attacker = finalWinner === 'east' ? east : west;
          const defender = finalWinner === 'east' ? west : east;
          finalKimarite = pickMoveFromClass(rng, "force_out", attacker, defender, st);
          break;
      }
    }
    
    // Safety fallback
    if (!finalWinner) {
        finalWinner = st.advantage === "none" ? "east" : (st.advantage as Side);
        const attacker = finalWinner === 'east' ? east : west;
        const defender = finalWinner === 'east' ? west : east;
        finalKimarite = pickMoveFromClass(rng, "force_out", attacker, defender, st);
    }
  }

  // 3. Finalize Result
  st.log.push({
    phase: "finish",
    data: {
      winner: finalWinner,
      kimarite: finalKimarite?.id,
      kimariteName: finalKimarite?.name,
      advantage: st.advantage,
      time: st.timeSeconds
    }
  });

  const eastTier = tierOf(east);
  const westTier = tierOf(west);
  const upset = (finalWinner === "east" && eastTier > westTier + 1) || (finalWinner === "west" && westTier > eastTier + 1);
  const isKinboshi = (finalWinner === "east" && eastTier === 5 && westTier === 1) || (finalWinner === "west" && westTier === 5 && eastTier === 1);

  return {
    boutId: bout.id,
    winner: finalWinner,
    winnerRikishiId: finalWinner === "east" ? east.id : west.id,
    loserRikishiId: finalWinner === "east" ? west.id : east.id,
    kimarite: finalKimarite?.id || "yorikiri",
    kimariteName: finalKimarite?.name || "Yorikiri",
    stance: st.stance,
    tachiaiWinner: st.tachiaiWinner,
    duration: Math.max(1, Math.ceil(st.timeSeconds)),
    upset,
    isKinboshi,
    log: st.log
  } as BoutResult;
}

/** Convenience helper for tests/sim screens */
function simulateBoutPhysics(east: Rikishi, west: Rikishi, seed: string): BoutResult {
  const rng = rngFromSeed(seed, "bout", "root");
  const bashoName: BashoName = "hatsu" ;

  const fakeBasho: BashoState = {
    id: "sim",
    year: 2025,
    day: 1,
    bashoName,
    bashoNumber: 1,
    matches: [],
    standings: new Map(),
    isActive: false,
  };

  const bout: BoutContext = { id: `sim-${seed}`, day: 1, rikishiEastId: east.id, rikishiWestId: west.id };

  // Salt IDs for variance in repeated sims
  const saltedEast = { ...east, id: `${east.id}-sim-${Math.floor(rng.next() * 1e6)}` } as Rikishi;
  const saltedWest = { ...west, id: `${west.id}-sim-${Math.floor(rng.next() * 1e6)}` } as Rikishi;

  return resolveBoutPhysics(bout, saltedEast, saltedWest, fakeBasho);
}
