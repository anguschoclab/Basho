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
import type { Stance, TacticalArchetype, RikishiArchetype } from "../types/combat";

import { RANK_HIERARCHY } from "../banzuke";
import { KIMARITE_REGISTRY, getKimariteCount, type Kimarite, getKimariteByClass } from "../kimarite";
import { resolveTacticalClash, determineCPUTactic } from "../h2h";
import { 
  TacticalFamily, 
  TACTICAL_MATRIX, 
  CombatAction, 
  ARCHETYPE_PROFILES,
  ActionPreference 
} from "../types/combat";

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
  log: BoutLogEntry[];
  mizuiriDeclared: boolean; // NEW
  tacticalResult?: import("../types/combat").TacticalResult;
  playerSide?: import("../types/banzuke").Side;
  cpuTacticOverride?: import("../types/combat").BoutTactic;
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
function pickMoveFromClass(rng: SeededRNG, kimariteClass: import('../types/combat').KimariteClass | undefined): Kimarite {
  const matches = getKimariteByClass(kimariteClass || 'force_out');
  if (matches.length === 0) return KIMARITE_REGISTRY[0]; // Fallback
  return matches[rng.int(0, matches.length - 1)];
}

// =========================================================
// MOVE-DRIVEN ACTION ENGINE (v4.0 - Move-Based)
// =========================================================

/**
 * AI Action Selection Logic
 */
function selectAction(rng: SeededRNG, r: Rikishi, st: EngineState): CombatAction {
  const profile = ARCHETYPE_PROFILES[r.archetype];
  const prefs = profile.actionPreferences;
  
  // 1. Pick a Tactical Family based on weighted preferences
  const roll = rng.next();
  let cumulative = 0;
  let family: TacticalFamily = 'push';
  
  for (const [fam, weight] of Object.entries(prefs)) {
    cumulative += weight as number;
    if (roll < cumulative) {
      family = fam as TacticalFamily;
      break;
    }
  }

  // 2. Pick an Intent (simplistic for now: most are attack)
  const intentRoll = rng.next();
  const intent: CombatAction['intent'] = intentRoll < 0.7 ? 'attack' : intentRoll < 0.9 ? 'defend' : 'counter';

  // 3. Select a target Kimarite Class that fits the family
  // Simplified mapping for the engine
  let targetClass: import('../types/combat').KimariteClass = 'push';
  if (family === 'push') targetClass = rng.next() < 0.6 ? 'force_out' : 'push';
  else if (family === 'belt') targetClass = rng.next() < 0.5 ? 'throw' : 'lift';
  else if (family === 'trick') targetClass = rng.next() < 0.6 ? 'slap_pull' : 'evasion';
  else if (family === 'speed') targetClass = rng.next() < 0.7 ? 'trip' : 'rear';

  // 4. Define Stat Weighting for THIS specific move
  const statWeighting = { strength: 0, weight: 0, technique: 0, speed: 0, balance: 0 };
  switch (targetClass) {
    case 'force_out': statWeighting.strength = 0.6; statWeighting.weight = 0.4; break;
    case 'push': statWeighting.strength = 0.5; statWeighting.speed = 0.3; statWeighting.weight = 0.2; break;
    case 'throw': statWeighting.technique = 0.5; statWeighting.strength = 0.3; statWeighting.balance = 0.2; break;
    case 'lift': statWeighting.strength = 0.8; statWeighting.weight = 0.2; break;
    case 'slap_pull': statWeighting.technique = 0.6; statWeighting.speed = 0.4; break;
    case 'trip': statWeighting.speed = 0.6; statWeighting.technique = 0.4; break;
    case 'rear': statWeighting.speed = 0.8; statWeighting.technique = 0.2; break;
    case 'evasion': statWeighting.speed = 0.7; statWeighting.balance = 0.3; break;
    default: statWeighting.strength = 0.5; statWeighting.technique = 0.5;
  }

  return {
    family,
    intent,
    targetKimariteClass: targetClass,
    statWeighting
  };
}

/**
 * Calculate Action Power based on Move-Specific Math
 */
function calculateActionPower(r: Rikishi, action: CombatAction, opponent?: Rikishi): number {
  const w = action.statWeighting;
  const s = r.stats || r; // back-compat
  
  let power = 0;
  power += (stat(r, 'strength', s.strength) * (w.strength || 0));
  power += (stat(r, 'weight', r.weight) * (w.weight || 0)); // weight is direct on rikishi
  power += (stat(r, 'technique', s.technique) * (w.technique || 0));
  power += (stat(r, 'speed', s.speed) * (w.speed || 0));
  power += (stat(r, 'balance', s.balance) * (w.balance || 0));

  // Apply Fatigue penalty
  const fatiguePenalty = (r.fatigue || 0) * 0.5;
  power -= fatiguePenalty;

  // Momentum bonus
  const momentumBonus = (r.momentum || 50) / 10;
  power += momentumBonus;

  // Specific Opponent Defense Omits
  if (opponent && action.targetKimariteClass === 'trip') {
    power -= (stat(opponent, 'balance') * 0.5);
  }

  return Math.max(1, power);
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
  const eastAction = selectAction(rng, east, st);
  const westAction = selectAction(rng, west, st);

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
          return { earlyWinner: trickSide, earlyKimarite: 'hatakikomi' };
       }
    }
    return null;
  };

  const eastHenka = resolveHenka(east, west, "east", eastAction, westAction);
  if (eastHenka) return eastHenka;
  const westHenka = resolveHenka(west, east, "west", westAction, eastAction);
  if (westHenka) return westHenka;

  // 3. Normal Tachiai Clash logic with Leverage
  let eastLeverage = 1.0;
  let westLeverage = 1.0;

  if (TACTICAL_MATRIX[eastAction.family].includes(westAction.family)) {
      eastLeverage += 0.4;
  } else if (TACTICAL_MATRIX[westAction.family].includes(eastAction.family)) {
      westLeverage += 0.4;
  }

  const finalEast = calculateActionPower(east, eastAction) * eastLeverage + jitter(rng, 5);
  const finalWest = calculateActionPower(west, westAction) * westLeverage + jitter(rng, 5);

  const winner = chooseSideByScore(finalEast, finalWest);
  const margin = Math.abs(finalEast - finalWest);

  st.tachiaiWinner = winner;
  st.advantage = winner;
  st.position = "front";
  st.timeSeconds += 1 + rng.next();

  st.log.push({
    phase: "tachiai",
    data: {
      winner,
      eastAction,
      westAction,
      eastPower: Math.round(finalEast),
      westPower: Math.round(finalWest),
      margin: Math.round(margin * 10) / 10,
      advantage: st.advantage
    }
  });
}

/** =========================
 * Phase 2 — Engagement
 * ========================= */

function resolveActionTick(rng: SeededRNG, east: Rikishi, west: Rikishi, st: EngineState): { winner?: Side, kimarite?: Kimarite } | void {
  st.tick += 1;
  st.timeSeconds += 2;

  // 1. AI selects actions based on current stance and archetype
  const eastAction = selectAction(rng, east, st);
  const westAction = selectAction(rng, west, st);

  // 2. Check RPS Matrix for Leverage
  let eastLeverage = 1.0;
  let westLeverage = 1.0;

  if (TACTICAL_MATRIX[eastAction.family].includes(westAction.family)) {
      eastLeverage += 0.4; // 40% mechanical advantage for countering
  } else if (TACTICAL_MATRIX[westAction.family].includes(eastAction.family)) {
      westLeverage += 0.4;
  }

  // 3. Execute Move-Specific Math
  const eastPower = calculateActionPower(east, eastAction, west) * eastLeverage + jitter(rng, 5);
  const westPower = calculateActionPower(west, westAction, east) * westLeverage + jitter(rng, 5);

  // 4. Update Fatigue & Momentum
  st.fatigueEast += 0.5 + (westPower / 100);
  st.fatigueWest += 0.5 + (eastPower / 100);
  
  if (eastPower > westPower + 10) east.momentum = Math.min(100, (east.momentum || 50) + 5);
  else if (westPower > eastPower + 10) west.momentum = Math.min(100, (west.momentum || 50) + 5);

  // 5. Stance / Position Shifts (Simplified)
  if (eastPower > westPower * 1.5) st.advantage = "east";
  else if (westPower > eastPower * 1.5) st.advantage = "west";
  else if (rng.next() < 0.2) st.advantage = "none";

  if (st.advantage !== "none" && rng.next() < 0.15) st.position = "lateral";
  else st.position = "front";

  // 6. Finish Resolution (Phase 3: Critical Failure)
  const THRESHOLD = 2.4; 
  if (eastPower > westPower * THRESHOLD) {
      return { winner: "east", kimarite: pickMoveFromClass(rng, eastAction.targetKimariteClass) };
  } else if (westPower > eastPower * THRESHOLD) {
      return { winner: "west", kimarite: pickMoveFromClass(rng, westAction.targetKimariteClass) };
  }

  // 7. Log State Update
  st.log.push({
    phase: "engagement",
    data: {
      tick: st.tick,
      eastAction,
      westAction,
      eastPower: Math.round(eastPower),
      westPower: Math.round(westPower),
      advantage: st.advantage,
      time: st.timeSeconds
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
    log: [],
    mizuiriDeclared: false,
    playerSide: bout.playerSide
  };

  // 1. Tachiai Phase
  const tachiaiResult = resolveTachiai(rng, east, west, st);

  let finalWinner: Side | undefined;
  let finalKimarite: Kimarite | undefined;

  if (tachiaiResult && tachiaiResult.earlyWinner) {
    finalWinner = tachiaiResult.earlyWinner;
    finalKimarite = KIMARITE_REGISTRY.find(k => k.id === tachiaiResult.earlyKimarite) || KIMARITE_REGISTRY[0];
  } else {
    // 2. Engagement Phase (Action Loop)
    // No more arbitrary target ticks; we loop until victory or max time
    const MAX_TICKS = 40;
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
          finalKimarite = pickMoveFromClass(rng, "force_out");
          break;
      }
    }
    
    // Safety fallback
    if (!finalWinner) {
        finalWinner = st.advantage === "none" ? "east" : (st.advantage as Side);
        finalKimarite = pickMoveFromClass(rng, "force_out");
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
    duration: Math.round(st.timeSeconds),
    upset,
    isKinboshi,
    log: st.log
  } as BoutResult;
}

/** Convenience helper for tests/sim screens */
export function simulateBoutPhysics(east: Rikishi, west: Rikishi, seed: string): BoutResult {
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
