// src/engine/bout.ts
// =======================================================
// Deterministic Bout Simulation Engine (v3.0 - Harmonized)
// - MERGED: Realistic Physics (Mass/Time) + Original PBP Hooks
// - Emits structured BoutLogEntry[] compatible with pbp.ts
// - Implements "Mizu-iri" (Water Break) & Realistic Timing
// - Preserves all 'GripEvent'/'StrikeEvent' strings for narrative
// =======================================================

import { rngFromSeed } from "./rng";
import { SeededRNG } from "./utils/SeededRNG";
import type {
  Rikishi,
  BoutResult,
  BoutLogEntry,
  BashoState,
  BashoName,
  Side,
  Stance,
  TacticalArchetype
} from "./types";

import { RANK_HIERARCHY } from "./banzuke";
import { KIMARITE_REGISTRY, type Kimarite } from "./kimarite";
import { buildPbpFromBoutResult, type PbpContext, type PbpLine } from "./pbp";
import { generateNarrative } from "./narrative";

/** Engine position vocabulary (IMPORTANT) */
export type Position = "front" | "lateral" | "rear";
export type Advantage = "east" | "west" | "none";

// --- PBP HOOKS (Preserved for compatibility) ---
type GripEvent =
  | "migi_yotsu_established"
  | "hidari_yotsu_established"
  | "double_inside"
  | "over_under"
  | "no_grip_scramble"
  | "grip_break";

type StrikeEvent =
  | "tsuppari_barrage"
  | "nodowa_pressure"
  | "harite_slap"
  | "throat_attack"
  | "shoulder_blast";

type EdgeEvent =
  | "bales_at_tawara"
  | "steps_out_then_recovers"
  | "heel_on_straw"
  | "dancing_escape"
  | "turns_the_tables"
  | "slips_but_survives";

type MomentumShiftReason =
  | "tachiai_win"
  | "timing_counter"
  | "grip_change"
  | "footwork_angle"
  | "fatigue_turn"
  | "mistake"
  | "physics_wall"  // NEW
  | "mizu_iri";     // NEW

interface BoutContext {
  id: string;
  day: number;
  rikishiEastId: string;
  rikishiWestId: string;
}

interface EngineState {
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
}

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const clamp01 = (n: number) => clamp(n, 0, 1);

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

function chooseSideByScore(eastScore: number, westScore: number): Side {
  return eastScore >= westScore ? "east" : "west";
}

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

/** * PHYSICS HELPER: Calculate effective "Force" 
 * Combines raw Power with Mass (Weight). 
 */
function calculateCollisionForce(r: Rikishi): number {
  const massFactor = (r.weight - 100) * 0.5; 
  return stat(r, "power") * 0.7 + Math.max(0, massFactor) * 0.3;
}

/** * PHYSICS HELPER: Calculate "Stability" 
 * Combines Balance with Mass.
 */
function calculateStability(r: Rikishi): number {
  const massFactor = (r.weight - 100) * 0.6;
  return stat(r, "balance") * 0.6 + Math.max(0, massFactor) * 0.4;
}

/**
 * MASTERY HELPER: Calculate compatibility of a move with current body
 */
function calculateMoveCompatibility(r: Rikishi, k: Kimarite): number {
  let score = 1.0;
  if (k.kimariteClass === "lift") {
    if (stat(r, "strength") < 40) score *= 0.5;
    if (stat(r, "strength") > 70) score *= 1.2;
  }
  if (k.kimariteClass === "trip") {
    if (stat(r, "speed") < 40) score *= 0.6; 
    if (stat(r, "technique") > 70) score *= 1.1;
  }
  if (k.kimariteClass === "throw") {
    if (stat(r, "technique") < 40) score *= 0.7; 
  }
  if (k.kimariteClass === "force_out" || k.kimariteClass === "push") {
    if (r.weight < 120 && stat(r, "power") < 40) score *= 0.8; 
  }
  return score;
}

/** =========================
 * Phase 1 — Tachiai
 * ========================= */

function resolveTachiai(rng: SeededRNG, east: Rikishi, west: Rikishi, st: EngineState) {
  // Make tachiai primarily about explosion + timing + aggression + MASS (Physics)
  const eastForce = 
    stat(east, "speed") * 0.35 + 
    stat(east, "aggression") * 0.25 + 
    calculateCollisionForce(east) * 0.30 + 
    stat(east, "balance") * 0.10 +
    jitter(rng, 6);

  const westForce = 
    stat(west, "speed") * 0.35 + 
    stat(west, "aggression") * 0.25 + 
    calculateCollisionForce(west) * 0.30 + 
    stat(west, "balance") * 0.10 +
    jitter(rng, 6);

  // Archetype Bonus
  const eastArchBonus = east.archetype === "oshi_specialist" ? 10 : 0;
  const westArchBonus = west.archetype === "oshi_specialist" ? 10 : 0;

  const finalEast = eastForce + eastArchBonus;
  const finalWest = westForce + westArchBonus;

  const winner = chooseSideByScore(finalEast, finalWest);
  const margin = Math.abs(finalEast - finalWest);

  st.tachiaiWinner = winner;
  st.advantage = winner;
  st.position = "front";
  
  // Time: Fast explosion
  st.timeSeconds += 1 + rng.next();

  st.log.push({
    phase: "tachiai",
    description: `${winner === "east" ? east.shikona : west.shikona} wins the tachiai`,
    data: {
      winner,
      margin: Math.round(margin * 10) / 10,
      eastScore: Math.round(finalEast * 10) / 10,
      westScore: Math.round(finalWest * 10) / 10,
      position: st.position,
      advantage: st.advantage
    }
  } as any);
}

/** =========================
 * Phase 2 — Clinch / Stance
 * ========================= */

function resolveClinch(rng: SeededRNG, east: Rikishi, west: Rikishi, st: EngineState) {
  const leader: Side = st.advantage === "none" ? st.tachiaiWinner : (st.advantage as Side);
  const leaderR = leader === "east" ? east : west;
  const trailerR = leader === "east" ? west : east;

  // PHYSICS: Style weakness check
  let dominanceMod = 0;
  if (trailerR.weakAgainstStyles?.includes(leaderR.style)) {
    dominanceMod += 15;
  }

  const beltSkill =
    stat(leaderR, "technique") * 0.40 +
    stat(leaderR, "strength") * 0.25 +
    stat(leaderR, "balance") * 0.20 +
    stat(leaderR, "experience") * 0.15 +
    (leaderR.archetype === "yotsu_specialist" ? 10 : 0) +
    jitter(rng, 5);

  const pushSkill =
    stat(leaderR, "power") * 0.45 +
    stat(leaderR, "aggression") * 0.25 +
    calculateCollisionForce(leaderR) * 0.15 + // Heavy helps push
    stat(leaderR, "speed") * 0.15 +
    (leaderR.archetype === "oshi_specialist" ? 10 : 0) +
    jitter(rng, 5);

  // Opponent resistance (Physics Stability)
  const resist = calculateStability(trailerR) - dominanceMod + jitter(rng, 4);

  const beltEdge = beltSkill - resist;
  const pushEdge = pushSkill - resist;

  let stance: Stance = "no-grip";
  let gripEvent: GripEvent = "no_grip_scramble";
  let strikeEvent: StrikeEvent | undefined = undefined;
  let adv: Advantage = st.advantage;

  const beltP = clamp01(0.48 + beltEdge / 120);
  const pushP = clamp01(0.45 + pushEdge / 120);
  const roll = rng.next();

  if (roll < beltP && beltP >= pushP) {
    // Belt path
    const yotsuRoll = rng.next();
    if (yotsuRoll < 0.45) {
      stance = "migi-yotsu";
      gripEvent = "migi_yotsu_established";
    } else if (yotsuRoll < 0.9) {
      stance = "hidari-yotsu";
      gripEvent = "hidari_yotsu_established";
    } else {
      stance = "belt-dominant";
      gripEvent = rng.next() < 0.5 ? "double_inside" : "over_under";
    }

    // Yotsu specialists hold advantage better in belt stances
    if (leaderR.archetype !== "yotsu_specialist" && rng.next() < 0.25) adv = "none";

  } else if (roll < beltP + pushP) {
    // Push path
    stance = "push-dominant";
    gripEvent = "no_grip_scramble";
    const strikeRoll = rng.next();
    strikeEvent =
      strikeRoll < 0.25
        ? "tsuppari_barrage"
        : strikeRoll < 0.45
        ? "nodowa_pressure"
        : strikeRoll < 0.62
        ? "harite_slap"
        : strikeRoll < 0.78
        ? "shoulder_blast"
        : "throat_attack";

    // Oshi specialists hold advantage better here
    if (leaderR.archetype !== "oshi_specialist" && rng.next() < 0.28) adv = "none";

  } else {
    // Scramble
    stance = "no-grip";
    gripEvent = "no_grip_scramble";
    adv = "none";
  }

  st.stance = stance;
  st.advantage = adv;
  
  // Time: Add duration based on activity
  st.timeSeconds += calculatePhaseTime(rng, stance, "high");

  st.log.push({
    phase: "clinch",
    description:
      stance === "push-dominant"
        ? "They settle into oshi pressure"
        : stance === "no-grip"
        ? "No grip — scramble for position"
        : "Belt contact established",
    data: {
      stance,
      advantage: st.advantage,
      position: st.position,
      gripEvent,
      strikeEvent
    }
  } as any);
}

/** =========================
 * Phase 3 — Momentum ticks
 * ========================= */

function resolveMomentumTick(rng: SeededRNG, east: Rikishi, west: Rikishi, st: EngineState) {
  st.tick += 1;

  // PHYSICS: Pushing a heavier opponent drains more stamina
  const eastLoad = west.weight > east.weight ? (west.weight - east.weight) / 200 : 0;
  const westLoad = east.weight > west.weight ? (east.weight - west.weight) / 200 : 0;

  const baseDrain = 0.6 + rng.next() * 0.7;

  st.fatigueEast += (baseDrain + eastLoad) * (st.advantage === "east" ? 0.9 : 1.15);
  st.fatigueWest += (baseDrain + westLoad) * (st.advantage === "west" ? 0.9 : 1.15);

  const fatiguePressure = clamp01((st.fatigueEast + st.fatigueWest) / 80);

  // Time Progression & Mizu-iri
  const isStalemate = st.advantage === "none";
  const intensity = isStalemate && st.stance !== "push-dominant" ? "low" : "high";
  st.timeSeconds += calculatePhaseTime(rng, st.stance, intensity);

  // MIZU-IRI CHECK (4 Minutes / 240s)
  if (st.timeSeconds > 240 && !st.mizuiriDeclared) {
    st.mizuiriDeclared = true;
    st.fatigueEast += 15; // Break fatigue cost
    st.fatigueWest += 15;
    st.log.push({
      phase: "momentum",
      description: "Mizu-iri! The Gyoji halts the marathon bout for a water break.",
      data: { tick: st.tick, reason: "mizu_iri", time: st.timeSeconds }
    } as any);
    return; // Skip normal event processing this tick
  }

  // EVENT ROLL
  const eventRoll = rng.next();

  // 1) Physics Wall (Immovable Object) - NEW
  const pusher = st.advantage === "east" ? east : west;
  const defender = st.advantage === "east" ? west : east;
  
  if (st.stance === "push-dominant" && defender.weight > pusher.weight * 1.4) {
    if (eventRoll < 0.12) {
      st.advantage = otherSide(st.advantage as Side);
      st.log.push({
        phase: "momentum",
        description: `Stopped cold by ${defender.shikona}'s massive weight!`,
        data: { 
          tick: st.tick, 
          position: st.position,
          reason: "physics_wall", 
          advantage: st.advantage 
        }
      } as any);
      return;
    }
  }

  // 2) Footwork angle / lateral motion
  if (eventRoll < 0.25) { // Slightly increased chance
    if (st.position === "front") st.position = "lateral";
    else if (st.position === "lateral" && rng.next() < 0.25) st.position = "rear";

    const reason: MomentumShiftReason = "footwork_angle";
    const eastSpeed = stat(east, "speed");
    const westSpeed = stat(west, "speed");
    const angledSide: Side = eastSpeed + jitter(rng, 4) >= westSpeed ? "east" : "west";

    if (st.position === "rear") st.advantage = angledSide;

    st.log.push({
      phase: "momentum",
      description: st.position === "rear" ? "Rear position danger!" : "Angle and footwork",
      data: {
        tick: st.tick,
        position: st.position,
        reason,
        advantage: st.advantage
      }
    } as any);
    return;
  }

  // 3) Edge dance / tawara moments
  if (eventRoll < 0.40) {
    const adv = st.advantage !== "none" ? st.advantage : st.tachiaiWinner;
    const edgeEvent: EdgeEvent = rng.next() < 0.5 ? "bales_at_tawara" : "heel_on_straw";

    st.log.push({
      phase: "momentum",
      description: "Tawara pressure at the edge!",
      data: {
        tick: st.tick,
        position: st.position,
        reason: "tachiai_win",
        edgeEvent,
        advantage: adv
      }
    } as any);
    return;
  }

  // 4) Recovery / timing counter
  if (eventRoll < 0.55) {
    const currentAdv: Advantage = st.advantage;
    if (currentAdv !== "none") {
      const disadvantaged: Side = otherSide(currentAdv as Side);
      const disR = disadvantaged === "east" ? east : west;
      
      // Counter chance: technique + balance + archetype bonus
      const archBonus = (disR.archetype === "trickster" || disR.archetype === "counter_specialist") ? 0.15 : 0;
      
      const counterChance = clamp01(
        0.10 +
          stat(disR, "technique") / 220 +
          stat(disR, "balance") / 260 +
          stat(disR, "experience") / 350 +
          fatiguePressure * 0.20 + 
          archBonus
      );

      if (rng.next() < counterChance) {
        st.advantage = "none";
        st.log.push({
          phase: "momentum",
          description: "A recovery and counter!",
          data: {
            tick: st.tick,
            position: st.position,
            reason: "timing_counter",
            edgeEvent: "turns_the_tables",
            recovery: true,
            advantage: st.advantage
          }
        } as any);
        return;
      }
    }
  }

  // 5) Fatigue swing (leader changes)
  if (eventRoll < 0.65) {
    const eastDrive = stat(east, "power") + stat(east, "balance") - st.fatigueEast * 1.2 + jitter(rng, 8);
    const westDrive = stat(west, "power") + stat(west, "balance") - st.fatigueWest * 1.2 + jitter(rng, 8);

    if (Math.abs(eastDrive - westDrive) > 10) {
      st.advantage = eastDrive > westDrive ? "east" : "west";
      st.log.push({
        phase: "momentum",
        description: "Fatigue shows—momentum swings!",
        data: {
          tick: st.tick,
          position: st.position,
          reason: "fatigue_turn",
          advantage: st.advantage
        }
      } as any);
      return;
    }
  }

  // Default steady pressure tick
  st.log.push({
    phase: "momentum",
    description: intensity === "low" ? "Heavy leaning..." : "Steady struggle",
    data: {
      tick: st.tick,
      position: st.position,
      reason: st.advantage === "none" ? ("mistake" as MomentumShiftReason) : ("tachiai_win" as MomentumShiftReason),
      advantage: st.advantage,
      fatigueEast: Math.round(st.fatigueEast * 10) / 10,
      fatigueWest: Math.round(st.fatigueWest * 10) / 10,
      time: st.timeSeconds
    }
  } as any);
}

/** =========================
 * Phase 4 — Finish
 * ========================= */

function pickFinishKimarite(rng: SeededRNG, st: EngineState, east: Rikishi, west: Rikishi): Kimarite {
  const leaderSide = st.advantage !== "none" ? (st.advantage as Side) : st.tachiaiWinner;
  const attacker = leaderSide === "east" ? east : west;
  const defender = leaderSide === "east" ? west : east;

  // Filter registry
  const pool = KIMARITE_REGISTRY.filter((k) => {
    if (k.category === "forfeit" || k.category === "result") return false;

    // Stance guard
    const reqStances: Stance[] = Array.isArray((k as any).requiredStances) ? (k as any).requiredStances : [];
    if (reqStances.length > 0 && !reqStances.includes(st.stance)) return false;

    const vector = (k as any).vector as "front" | "lateral" | "rear" | undefined;
    if (vector && vector !== st.position) return false;

    // Hard Physics Gate (Impossible moves)
    if (k.kimariteClass === "lift") {
       if (defender.weight > stat(attacker, "strength") * 3.5) return false; 
    }

    return true;
  });

  const fallback = KIMARITE_REGISTRY.find((k) => k.id === "yorikiri") ?? KIMARITE_REGISTRY[0];
  const usable = pool.length > 0 ? pool : [fallback].filter(Boolean);

  // Weighted pick
  const weighted = usable.map((k) => {
    const base = Number.isFinite((k as any).baseWeight) ? (k as any).baseWeight : 1;
    const rarity = (k as any).rarity as "common" | "uncommon" | "rare" | "legendary" | undefined;
    const rarityMult = rarity === "legendary" ? 0.05 : rarity === "rare" ? 0.2 : rarity === "uncommon" ? 0.55 : 1.0;

    const affinity = (k as any).styleAffinity?.[attacker.style ?? "hybrid"] ?? 0;
    
    let w = base * rarityMult + affinity * 0.4;

    // 1. Archetype Bonus
    const archBonus = (k.archetypeBonus?.[attacker.archetype] ?? 0);
    w += archBonus * 8; 

    // 2. Favored Move (Dynamic Mastery & Compatibility)
    if (attacker.favoredKimarite?.includes(k.id)) {
      const expFactor = clamp(stat(attacker, "experience") / 80, 0, 1);
      const masteryBonus = 1.0 + (1.5 * expFactor);
      const bodyFit = calculateMoveCompatibility(attacker, k);
      w *= (masteryBonus * bodyFit);
    }

    // 3. Positional modifiers
    if (st.position === "rear") w *= 1.7;
    if (st.stance === "push-dominant") w *= 1.2;

    // 4. Soft Physics Gate (Discourage bad physics)
    if (k.kimariteClass === "force_out" && defender.weight > attacker.weight + 40) {
      w *= 0.3; // Very hard to push out much heavier opponents
    }

    w *= 1 + jitter(rng, 0.05);

    return { k, w: Math.max(0.0001, w) };
  });

  const total = weighted.reduce((s, it) => s + it.w, 0);
  let roll = rng.next() * total;

  for (const it of weighted) {
    roll -= it.w;
    if (roll <= 0) return it.k;
  }
  return weighted[weighted.length - 1]?.k ?? fallback;
}

function resolveFinish(rng: SeededRNG, east: Rikishi, west: Rikishi, st: EngineState): { winner: Side; kimarite: Kimarite } {
  const adv = st.advantage !== "none" ? st.advantage : st.tachiaiWinner;
  const attacker = adv === "east" ? east : west;
  const defender = adv === "east" ? west : east;

  // Base Chance
  const eastWinBase = 
    0.5 + 
    (adv === "east" ? 0.18 : adv === "west" ? -0.18 : 0) +
    (stat(east, "balance") - stat(west, "balance")) / 400 +
    (stat(east, "technique") - stat(west, "technique")) / 450 +
    (st.fatigueWest - st.fatigueEast) / 120 +
    jitter(rng, 0.06);

  let eastWinP = clamp01(eastWinBase);

  // Physics Modifier: Mass helps defend against force outs
  if (st.stance === "push-dominant") {
     const massDiff = (east.weight - west.weight) / 300; // Positive if east heavier
     // If east pushing west, mass helps east. If west pushing east, mass helps west.
     if (adv === "east") eastWinP += massDiff; 
     else eastWinP -= massDiff;
  }

  // Upset Logic (Composure)
  const defenderMental = stat(defender, "mental") / 1000;
  if (adv === "east") eastWinP -= defenderMental; // West defends
  else eastWinP += defenderMental; // East defends

  const winner: Side = rng.next() < eastWinP ? "east" : "west";

  // Reversal Check
  if (winner !== adv) {
     st.advantage = winner;
     st.log.push({ phase: "finish", description: "Incredible reversal at the edge!", data: { reversal: true } } as any);
  }

  const finalWinnerR = winner === "east" ? east : west;
  const finalLoserR = winner === "east" ? west : east;

  const kimarite = pickFinishKimarite(rng, st, finalWinnerR, finalLoserR);

  st.timeSeconds += 2; // Finish takes a moment

  st.log.push({
    phase: "finish",
    description: `${finalWinnerR.shikona} wins by ${kimarite.name}`,
    data: {
      winner,
      kimarite: kimarite.id,
      kimariteName: kimarite.name,
      position: st.position,
      advantage: st.advantage, // Use updated advantage
      time: st.timeSeconds
    }
  } as any);

  return { winner, kimarite };
}

/** =========================
 * Public API
 * ========================= */

export function resolveBout(bout: BoutContext, east: Rikishi, west: Rikishi, basho: BashoState): BoutResult {
  // Deterministic seed
  const bashoId = (basho as any).id ?? "basho";
  const year = (basho as any).year ?? 0;
  const bashoName = ((basho as any).bashoName ?? (basho as any).name) as BashoName | undefined;

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
    mizuiriDeclared: false
  };

  // Phases
  resolveTachiai(rng, east, west, st);
  resolveClinch(rng, east, west, st);

  // BOUT LENGTH SIMULATION (Realistic Distribution)
  const roll = rng.next();
  let targetTicks = 2; // Default ~20s

  if (roll < 0.70) targetTicks = 1 + Math.floor(rng.next() * 3); // Fast (70%)
  else if (roll < 0.90) targetTicks = 4 + Math.floor(rng.next() * 5); // Medium (20%)
  else if (roll < 0.99) targetTicks = 9 + Math.floor(rng.next() * 12); // Long (9%)
  else targetTicks = 20 + Math.floor(rng.next() * 10); // Marathon/Mizu-iri (1%)

  // Oshi specialists end matches faster (win or lose)
  const vol = (stat(east, "speed") + stat(west, "speed")) / 200; 
  if (vol > 0.7 && east.style === "oshi" && west.style === "oshi") {
      targetTicks = Math.max(1, targetTicks - 2);
  }

  for (let i = 0; i < targetTicks; i++) {
    resolveMomentumTick(rng, east, west, st);
  }

  const { winner, kimarite } = resolveFinish(rng, east, west, st);

  // Upset heuristic
  const eastTier = tierOf(east);
  const westTier = tierOf(west);
  const upset = (winner === "east" && eastTier > westTier + 1) || (winner === "west" && westTier > eastTier + 1);

  const result: BoutResult = {
    boutId: bout.id,
    winner,
    winnerRikishiId: winner === "east" ? east.id : west.id,
    loserRikishiId: winner === "east" ? west.id : east.id,
    kimarite: kimarite.id,
    kimariteName: kimarite.name,
    stance: st.stance,
    tachiaiWinner: st.tachiaiWinner,
    duration: Math.round(st.timeSeconds), // Seconds
    upset,
    log: st.log
  } as any;

  // PBP Integration
  const pbpCtx: PbpContext = {
    seed: `${seed}-pbp`,
    day: bout.day,
    bashoName,
    east: { id: east.id, shikona: east.shikona, style: (east as any).style, archetype: (east as any).archetype },
    west: { id: west.id, shikona: west.shikona, style: (west as any).style, archetype: (west as any).archetype },
    kenshoCount: undefined,
    isKinboshiBout: upset && (eastTier === 1 || westTier === 1), // Kinboshi check
    isYushoRaceKeyBout: false
  };

  const pbpLines: PbpLine[] = buildPbpFromBoutResult(result, pbpCtx);

  // Extras for UI
  (result as any).pbpLines = pbpLines;
  (result as any).pbp = pbpLines.map((l) => l.text);
  (result as any).narrative = bashoName ? generateNarrative(east, west, result, bashoName, bout.day) : [];

  return result;
}

/** Convenience helper for tests/sim screens */
export function simulateBout(east: Rikishi, west: Rikishi, seed: string): BoutResult {
  const rng = rngFromSeed(seed, "bout", "root");
  const bashoName: BashoName = "hatsu" as any;

  const fakeBasho: BashoState = {
    id: "sim",
    year: 2024,
    day: 1,
    bashoName,
    bashoNumber: 1
  } as any;

  const bout: BoutContext = { id: `sim-${seed}`, day: 1, rikishiEastId: east.id, rikishiWestId: west.id };

  // Salt IDs for variance in repeated sims
  const saltedEast = { ...east, id: `${east.id}-sim-${Math.floor(rng.next() * 1e6)}` } as Rikishi;
  const saltedWest = { ...west, id: `${west.id}-sim-${Math.floor(rng.next() * 1e6)}` } as Rikishi;

  return resolveBout(bout, saltedEast, saltedWest, fakeBasho);
}
