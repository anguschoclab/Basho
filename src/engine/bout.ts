// src/engine/bout.ts
// =======================================================
// Deterministic Bout Simulation Engine (v3.0 - Harmonized)
// - MERGED: Realistic Physics (Mass/Time) + Original PBP Hooks
// - Emits structured BoutLogEntry[] compatible with pbp.ts
// - Implements "Mizu-iri" (Water Break) & Realistic Timing
// - Preserves all 'GripEvent'/'StrikeEvent' strings for narrative
// =======================================================

import { rngFromSeed, SeededRNG } from "./rng";
import type { Rikishi } from "./types/rikishi";
import type { BoutResult, BoutLogEntry, BashoState, BashoName } from "./types/basho";
import type { Side } from "./types/banzuke";
import type { Stance, TacticalArchetype } from "./types/combat";

import { RANK_HIERARCHY } from "./banzuke";
import { KIMARITE_REGISTRY, type Kimarite } from "./kimarite";
import { resolveTacticalClash, determineCPUTactic } from "./h2h";

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
interface BoutContext {
  id: string;
  day: number;
  rikishiEastId: string;
  rikishiWestId: string;
  playerSide?: Side;
  playerTactic?: import("./types/combat").BoutTactic;
  cpuTacticOverride?: import("./types/combat").BoutTactic;
}

/** Defines the structure for engine state. */
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
  tacticalResult?: import("./types/combat").TacticalResult;
  playerSide?: import("./types/banzuke").Side;
  cpuTacticOverride?: import("./types/combat").BoutTactic;
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

// =========================================================
// OPPONENT-AWARE TACTICAL AI HEURISTICS
// Each archetype "reads" the opponent and adjusts behavior.
// Returns signed modifiers consumed by each bout phase.
// =========================================================

/** Defines the structure for tactical modifiers. */
interface TacticalModifiers {
  tachiaiAggression: number;   // bonus to tachiai force
  clinchPreference: "belt" | "push" | "neutral";  // preferred stance path
  clinchBonus: number;         // flat bonus in preferred clinch
  momentumPersistence: number; // chance to resist momentum swings (0-0.3)
  counterResist: number;       // reduces opponent counter chance
  finishBonus: number;         // bonus win% in finish phase
  fatigueEfficiency: number;   // fatigue drain multiplier (lower = better)
  description: string;         // narrative label for PBP
}

/**
 * Compute tactical modifiers.
 *  * @param self - The Self.
 *  * @param opponent - The Opponent.
 *  * @returns The result.
 */
function computeTacticalModifiers(self: Rikishi, opponent: Rikishi): TacticalModifiers {
  const arch = self.archetype as TacticalArchetype;
  const oppArch = opponent.archetype as TacticalArchetype;
  const oppStyle = opponent.style ?? "hybrid";
  const selfStyle = self.style ?? "hybrid";
  const weightDiff = self.weight - opponent.weight;
  const techAdv = stat(self, "technique") - stat(opponent, "technique");
  const speedAdv = stat(self, "speed") - stat(opponent, "speed");

  // Base neutral modifiers
  const mods: TacticalModifiers = {
    tachiaiAggression: 0,
    clinchPreference: "neutral",
    clinchBonus: 0,
    momentumPersistence: 0,
    counterResist: 0,
    finishBonus: 0,
    fatigueEfficiency: 1.0,
    description: "Standard approach"
  };

  switch (arch) {
    case "oshi_specialist":
      // Oshi reads opponent weight: if opponent is much heavier, shift to lateral movement
      if (weightDiff < -30) {
        mods.tachiaiAggression = 4; // lighter approach, seek angles
        mods.clinchPreference = "push";
        mods.fatigueEfficiency = 0.92; // conserve energy for movement
        mods.description = "Lateral oshi — avoiding the heavier opponent's center";
      } else {
        mods.tachiaiAggression = 8; // full steam ahead
        mods.clinchPreference = "push";
        mods.clinchBonus = 5;
        mods.finishBonus = 0.03;
        mods.description = "Full-power oshi attack";
      }
      // Oshi vs yotsu: deny the belt at all costs
      if (oppStyle === "yotsu") {
        mods.clinchBonus += 4; // extra push conviction
        mods.counterResist = 0.04; // harder to counter raw forward pressure
        mods.description = "Deny the belt — relentless forward pressure";
      }
      // Oshi vs counter_specialist: temper aggression to avoid traps
      if (oppArch === "counter_specialist") {
        mods.tachiaiAggression -= 3;
        mods.momentumPersistence = 0.08; // more cautious, hold position
        mods.description = "Measured oshi — wary of counter timing";
      }
      break;

    case "yotsu_specialist":
      mods.clinchPreference = "belt";
      mods.clinchBonus = 6;
      mods.momentumPersistence = 0.10; // belt grip provides stability
      // Yotsu vs oshi: survive the initial blast, then establish grip
      if (oppStyle === "oshi" || oppArch === "oshi_specialist") {
        mods.tachiaiAggression = -2; // absorb rather than clash
        mods.counterResist = 0.05; // harder to push off the belt
        mods.fatigueEfficiency = 0.90; // efficient at extended grappling
        mods.description = "Absorb the tachiai, hunt the belt";
      }
      // Yotsu vs another yotsu: technique battle
      if (oppStyle === "yotsu") {
        mods.clinchBonus += 3;
        mods.finishBonus = techAdv > 10 ? 0.04 : -0.02;
        mods.description = "Belt-fighting showdown — technique decides";
      }
      // Yotsu vs speedster: close distance fast
      if (oppArch === "speedster") {
        mods.tachiaiAggression = 5; // must close the gap
        mods.description = "Close the distance — deny the speedster space";
      }
      break;

    case "speedster":
      mods.fatigueEfficiency = 0.88; // efficient movement
      // Speedster vs heavy opponents: use movement, avoid center collisions
      if (weightDiff < -20) {
        mods.tachiaiAggression = -4; // sidestep approach
        mods.clinchPreference = "neutral"; // keep distance
        mods.momentumPersistence = 0.05;
        mods.finishBonus = 0.02; // opportunistic finish
        mods.description = "Movement sumo — using speed to neutralize size";
      } else {
        mods.tachiaiAggression = 2;
        mods.description = "Quick and aggressive";
      }
      // Speedster vs yotsu: avoid getting locked into belt battle
      if (oppStyle === "yotsu") {
        mods.clinchPreference = "push"; // keep them at arm's length
        mods.clinchBonus = 3;
        mods.description = "Stay mobile — never let them grab the belt";
      }
      // Speedster vs oshi: lateral evasion
      if (oppArch === "oshi_specialist") {
        mods.counterResist = 0.06;
        mods.description = "Dodge the freight train — lateral evasion";
      }
      break;

    case "trickster":
      mods.fatigueEfficiency = 0.90;
      // Trickster reads everyone: exploit weaknesses
      if (stat(opponent, "mental") < 45) {
        mods.tachiaiAggression = 3; // disorient a mentally weak opponent
        mods.finishBonus = 0.03;
        mods.description = "Exploit mental weakness — feints and misdirection";
      }
      // Trickster vs power fighters: use their momentum against them
      if (oppArch === "oshi_specialist" || weightDiff < -25) {
        mods.counterResist = 0.08;
        mods.tachiaiAggression = -5; // let them overcommit
        mods.description = "Matador sumo — sidestep and redirect";
      }
      // Trickster vs yotsu: prevent grip with erratic movement
      if (oppStyle === "yotsu") {
        mods.clinchPreference = "neutral";
        mods.clinchBonus = 2;
        mods.description = "Keep it messy — deny clean grips";
      }
      // Trickster vs counter: battle of wits
      if (oppArch === "counter_specialist") {
        mods.momentumPersistence = 0.12;
        mods.description = "Mirror match — reading the reader";
      }
      break;

    case "all_rounder":
      // All-rounder adapts to opponent's weakest area
      if (oppStyle === "oshi") {
        mods.clinchPreference = "belt"; // take it to the belt where oshi is weaker
        mods.clinchBonus = 3;
        mods.description = "Exploit oshi weakness — transition to belt";
      } else if (oppStyle === "yotsu") {
        mods.clinchPreference = "push"; // keep yotsu specialist off the belt
        mods.clinchBonus = 2;
        mods.description = "Keep the yotsu specialist at bay";
      } else {
        mods.clinchPreference = "neutral";
        mods.description = "Read and adapt — no fixed plan";
      }
      mods.momentumPersistence = 0.06; // steady, hard to shift
      mods.fatigueEfficiency = 0.95;
      // All-rounder targets opponent's lowest stat axis
      if (speedAdv > 15) {
        mods.finishBonus = 0.02;
      } else if (techAdv > 15) {
        mods.finishBonus = 0.02;
      }
      break;

    case "hybrid_oshi_yotsu":
      // Hybrid reads what the opponent is bad at and goes there
      if (oppStyle === "oshi") {
        mods.clinchPreference = "belt"; // transition if they can't grapple
        mods.clinchBonus = 4;
        mods.description = "Transition game — switching to belt vs oshi fighter";
      } else if (oppStyle === "yotsu") {
        mods.clinchPreference = "push"; // keep yotsu off balance
        mods.clinchBonus = 3;
        mods.description = "Push-first — denying the belt specialist";
      } else {
        mods.clinchPreference = "neutral";
        mods.description = "Flexible approach — reading the situation";
      }
      mods.tachiaiAggression = 3;
      mods.momentumPersistence = 0.05;
      break;

    case "counter_specialist":
      // Counter specialist reads aggression: more aggressive opponent = better counter setup
      const oppAgg = stat(opponent, "aggression");
      if (oppAgg > 60 || oppArch === "oshi_specialist") {
        mods.tachiaiAggression = -6; // absorb, don't fight force with force
        mods.counterResist = 0.10; // they're built to absorb and redirect
        mods.finishBonus = 0.03;
        mods.fatigueEfficiency = 0.85; // very efficient when defending
        mods.description = "Absorb and redirect — turning aggression into opportunity";
      } else {
        mods.tachiaiAggression = 0;
        mods.counterResist = 0.05;
        mods.description = "Patient counter — waiting for the opening";
      }
      // Counter vs trickster: both reactive, becomes a chess match
      if (oppArch === "trickster") {
        mods.momentumPersistence = 0.10;
        mods.finishBonus = 0.01;
        mods.description = "Precision duel — two reactive fighters testing each other";
      }
      // Counter vs yotsu: fight on the belt where timing matters
      if (oppStyle === "yotsu") {
        mods.clinchPreference = "belt";
        mods.clinchBonus = 2;
        mods.description = "Accept the belt battle — counter from the clinch";
      }
      break;
  }

  return mods;
}

/** =========================
 * Phase 1 — Tachiai
 * ========================= */

function resolveTachiai(rng: SeededRNG, east: Rikishi, west: Rikishi, st: EngineState, eastTac?: TacticalModifiers, westTac?: TacticalModifiers) {
  // Make tachiai primarily about explosion + timing + aggression + MASS (Physics)
  const eastForce = 
    stat(east, "speed") * 0.35 + 
    stat(east, "aggression") * 0.25 + 
    calculateCollisionForce(east) * 0.30 + 
    stat(east, "balance") * 0.10 +
    (eastTac?.tachiaiAggression ?? 0) +
    jitter(rng, 6);

  const westForce = 
    stat(west, "speed") * 0.35 + 
    stat(west, "aggression") * 0.25 + 
    calculateCollisionForce(west) * 0.30 + 
    stat(west, "balance") * 0.10 +
    (westTac?.tachiaiAggression ?? 0) +
    jitter(rng, 6);

  // Archetype Bonus — oshi gets significant tachiai advantage
  const eastArchBonus = east.archetype === "oshi_specialist" ? 14 : east.archetype === "hybrid_oshi_yotsu" ? 5 : 0;
  const westArchBonus = west.archetype === "oshi_specialist" ? 14 : west.archetype === "hybrid_oshi_yotsu" ? 5 : 0;

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
    data: {
      winner,
      margin: Math.round(margin * 10) / 10,
      eastScore: Math.round(finalEast * 10) / 10,
      westScore: Math.round(finalWest * 10) / 10,
      position: st.position,
      advantage: st.advantage
    }
  });
}

/** =========================
 * Phase 2 — Clinch / Stance
 * ========================= */

function resolveClinch(rng: SeededRNG, east: Rikishi, west: Rikishi, st: EngineState, eastTac?: TacticalModifiers, westTac?: TacticalModifiers) {
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

  // Tactical AI: leader's clinch preference shifts probabilities
  const leaderTac = leader === "east" ? eastTac : westTac;
  const tacBeltShift = leaderTac?.clinchPreference === "belt" ? 0.08 : leaderTac?.clinchPreference === "push" ? -0.06 : 0;
  const tacPushShift = leaderTac?.clinchPreference === "push" ? 0.08 : leaderTac?.clinchPreference === "belt" ? -0.06 : 0;
  const tacClinchBonus = leaderTac?.clinchBonus ?? 0;

  const beltP = clamp01(0.48 + beltEdge / 120 + tacBeltShift + tacClinchBonus / 200);
  const pushP = clamp01(0.45 + pushEdge / 120 + tacPushShift + tacClinchBonus / 200);
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
    data: {
      stance,
      advantage: st.advantage,
      position: st.position,
      gripEvent,
      strikeEvent
    }
  });
}

/** =========================
 * Phase 3 — Momentum ticks
 * ========================= */

function resolveMomentumTick(rng: SeededRNG, east: Rikishi, west: Rikishi, st: EngineState, eastTac?: TacticalModifiers, westTac?: TacticalModifiers) {
  st.tick += 1;

  // PHYSICS: Pushing a heavier opponent drains more stamina
  const eastLoad = west.weight > east.weight ? (west.weight - east.weight) / 200 : 0;
  const westLoad = east.weight > west.weight ? (east.weight - west.weight) / 200 : 0;

  const baseDrain = 0.6 + rng.next() * 0.7;

  // Tactical AI: fatigue efficiency modifies drain rate
  const eastEfficiency = eastTac?.fatigueEfficiency ?? 1.0;
  const westEfficiency = westTac?.fatigueEfficiency ?? 1.0;

  st.fatigueEast += (baseDrain + eastLoad) * (st.advantage === "east" ? 0.9 : 1.15) * eastEfficiency;
  st.fatigueWest += (baseDrain + westLoad) * (st.advantage === "west" ? 0.9 : 1.15) * westEfficiency;

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
      data: { tick: st.tick, reason: "mizu_iri", time: st.timeSeconds }
    });
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
        data: { 
          tick: st.tick, 
          position: st.position,
          reason: "physics_wall", 
          advantage: st.advantage 
        }
      });
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
      data: {
        tick: st.tick,
        position: st.position,
        reason,
        advantage: st.advantage
      }
    });
    return;
  }

  // 3) Edge dance / tawara moments
  if (eventRoll < 0.40) {
    const adv = st.advantage !== "none" ? st.advantage : st.tachiaiWinner;
    const edgeEvent: EdgeEvent = rng.next() < 0.5 ? "bales_at_tawara" : "heel_on_straw";

    st.log.push({
      phase: "momentum",
      data: {
        tick: st.tick,
        position: st.position,
        reason: "tachiai_win",
        edgeEvent,
        advantage: adv
      }
    });
    return;
  }

  // 4) Recovery / timing counter
  if (eventRoll < 0.55) {
    const currentAdv: Advantage = st.advantage;
    if (currentAdv !== "none") {
      const disadvantaged: Side = otherSide(currentAdv as Side);
      const disR = disadvantaged === "east" ? east : west;
      
      // Counter chance: technique + balance + archetype bonus
      // Counter specialist bonus reduced to prevent dominance
      const archBonus = disR.archetype === "counter_specialist" ? 0.08 : disR.archetype === "trickster" ? 0.10 : 0;
      
      // Tactical AI: the advantaged side's counterResist reduces opponent counter chance
      const advSide = currentAdv as Side;
      const advTac = advSide === "east" ? eastTac : westTac;
      const counterResistMod = advTac?.counterResist ?? 0;

      const counterChance = clamp01(
        0.08 +
          stat(disR, "technique") / 250 +
          stat(disR, "balance") / 300 +
          stat(disR, "experience") / 400 +
          fatiguePressure * 0.15 + 
          archBonus -
          counterResistMod  // opponent's tactical counter-resistance
      );

      if (rng.next() < counterChance) {
        st.advantage = "none";
        st.log.push({
          phase: "momentum",
          data: {
            tick: st.tick,
            position: st.position,
            reason: "timing_counter",
            edgeEvent: "turns_the_tables",
            recovery: true,
            advantage: st.advantage
          }
        });
        return;
      }
    }
  }

  // 5) Fatigue swing (leader changes)
  if (eventRoll < 0.65) {
    const eastDrive = stat(east, "power") + stat(east, "balance") - st.fatigueEast * 1.2 + jitter(rng, 8);
    const westDrive = stat(west, "power") + stat(west, "balance") - st.fatigueWest * 1.2 + jitter(rng, 8);

    if (Math.abs(eastDrive - westDrive) > 10) {
      const newAdv: Side = eastDrive > westDrive ? "east" : "west";
      // Tactical AI: momentum persistence — current leader resists swing
      const currentLeaderTac = st.advantage === "east" ? eastTac : st.advantage === "west" ? westTac : undefined;
      const persistChance = currentLeaderTac?.momentumPersistence ?? 0;
      if (newAdv !== st.advantage && st.advantage !== "none" && rng.next() < persistChance) {
        // Leader holds position through tactical discipline — no swing
      } else {
        st.advantage = newAdv;
      }
      st.log.push({
        phase: "momentum",
        data: {
          tick: st.tick,
          position: st.position,
          reason: "fatigue_turn",
          advantage: st.advantage
        }
      });
      return;
    }
  }

  // Default steady pressure tick
  st.log.push({
    phase: "momentum",
    data: {
      tick: st.tick,
      position: st.position,
      reason: st.advantage === "none" ? ("mistake" as MomentumShiftReason) : ("tachiai_win" as MomentumShiftReason),
      advantage: st.advantage,
      fatigueEast: Math.round(st.fatigueEast * 10) / 10,
      fatigueWest: Math.round(st.fatigueWest * 10) / 10,
      time: st.timeSeconds
    }
  });
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
    const reqStances: Stance[] = Array.isArray(k.requiredStances) ? k.requiredStances : [];
    if (reqStances.length > 0 && !reqStances.includes(st.stance)) return false;

    const vector = k.vector as "front" | "lateral" | "rear" | undefined;
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
    const base = Number.isFinite(k.baseWeight) ? k.baseWeight : 1;
    const rarity = k.rarity as "common" | "uncommon" | "rare" | "legendary" | undefined;
    const rarityMult = rarity === "legendary" ? 0.05 : rarity === "rare" ? 0.2 : rarity === "uncommon" ? 0.55 : 1.0;

    const affinity = k.styleAffinity?.[attacker.style ?? "hybrid"] ?? 0;
    
    let w = base * rarityMult + affinity * 0.4;

    // 1. Archetype Bonus
    const archBonus = (k.archetypeBonus?.[attacker.archetype] ?? 0);
    w += archBonus * 8; 

    // 2. Favored Move (Dynamic Mastery & Compatibility)
    if (attacker.favoredKimarite?.includes(k.id)) {
      const expFactor = _clamp(stat(attacker, "experience") / 80, 0, 1);
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

/**
 * Resolve finish.
 *  * @param rng - The Rng.
 *  * @param east - The East.
 *  * @param west - The West.
 *  * @param st - The St.
 *  * @param eastTac - The East tac.
 *  * @param westTac - The West tac.
 *  * @returns The result.
 */
function resolveFinish(rng: SeededRNG, east: Rikishi, west: Rikishi, st: EngineState, eastTac?: TacticalModifiers, westTac?: TacticalModifiers): { winner: Side; kimarite: Kimarite } {
  const adv = st.advantage !== "none" ? st.advantage : st.tachiaiWinner;
  const attacker = adv === "east" ? east : west;
  const defender = adv === "east" ? west : east;

  // Base Chance — power now contributes to finish (helps oshi)
  const eastWinBase = 
    0.5 + 
    (adv === "east" ? 0.18 : adv === "west" ? -0.18 : 0) +
    (stat(east, "balance") - stat(west, "balance")) / 450 +
    (stat(east, "technique") - stat(west, "technique")) / 500 +
    (stat(east, "power") - stat(west, "power")) / 600 +
    (st.fatigueWest - st.fatigueEast) / 140 +
    jitter(rng, 0.06);

  let eastWinP = clamp01(eastWinBase);

  // Apply tactical win probability shift
  if (st.tacticalResult && st.playerSide) {
    if (st.playerSide === "east") eastWinP += st.tacticalResult.winProbabilityShift;
    else eastWinP -= st.tacticalResult.winProbabilityShift;
    eastWinP = clamp01(eastWinP);
  }

  // Tactical AI: finish bonus from opponent-aware heuristics
  eastWinP += (eastTac?.finishBonus ?? 0);
  eastWinP -= (westTac?.finishBonus ?? 0);

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
     st.log.push({ phase: "finish", data: { reversal: true } });
  }

  const finalWinnerR = winner === "east" ? east : west;
  const finalLoserR = winner === "east" ? west : east;

  const kimarite = pickFinishKimarite(rng, st, finalWinnerR, finalLoserR);

  st.timeSeconds += 2; // Finish takes a moment

  st.log.push({
    phase: "finish",
    data: {
      winner,
      kimarite: kimarite.id,
      kimariteName: kimarite.name,
      position: st.position,
      advantage: st.advantage, // Use updated advantage
      time: st.timeSeconds
    }
  });

  return { winner, kimarite };
}

/** =========================
 * Public API
 * ========================= */

export function resolveBout(bout: BoutContext, east: Rikishi, west: Rikishi, basho: BashoState): BoutResult {
  // Deterministic seed
  const bashoId = basho.id ?? "basho";
  const year = basho.year ?? 0;
  const bashoName = (basho.bashoName ?? basho.name) as BashoName | undefined;

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

  // Execute Tactical Clash if one side is a player
  let eastPlayerTactic = bout.playerSide === "east" ? bout.playerTactic : undefined;
  let westPlayerTactic = bout.playerSide === "west" ? bout.playerTactic : undefined;

  // Auto-sim fallback and CPU tactic determination
  if (bout.playerSide === "east") {
    eastPlayerTactic = eastPlayerTactic || determineCPUTactic(east, rng);
    westPlayerTactic = bout.cpuTacticOverride || determineCPUTactic(west, rng);
    st.tacticalResult = resolveTacticalClash(eastPlayerTactic, westPlayerTactic);
  } else if (bout.playerSide === "west") {
    westPlayerTactic = westPlayerTactic || determineCPUTactic(west, rng);
    eastPlayerTactic = bout.cpuTacticOverride || determineCPUTactic(east, rng);
    st.tacticalResult = resolveTacticalClash(westPlayerTactic, eastPlayerTactic);
  }

  const eastTactics = computeTacticalModifiers(east, west);
  const westTactics = computeTacticalModifiers(west, east);

    // Emit tactical strategy entries into the log for PBP consumption
  if (st.tacticalResult) {
    st.log.push({
      phase: "tactical",
      data: {
        tacticalEntry: true,
        tacticalResult: st.tacticalResult,
        side: bout.playerSide,
        eastArchetype: east.archetype,
        westArchetype: west.archetype
      }
    });
  } else {
    // Legacy generic logging
    if (eastTactics.description !== "Standard approach") {
      st.log.push({
        phase: "tactical",
        data: {
          tacticalEntry: true,
          side: "east",
          archetype: east.archetype,
          opponentArchetype: west.archetype,
          clinchPreference: eastTactics.clinchPreference,
          strategy: eastTactics.description,
        }
      });
    }
    if (westTactics.description !== "Standard approach") {
      st.log.push({
        phase: "tactical",
        data: {
          tacticalEntry: true,
          side: "west",
          archetype: west.archetype,
          opponentArchetype: east.archetype,
          clinchPreference: westTactics.clinchPreference,
          strategy: westTactics.description,
        }
      });
    }
  }


  // Phases — pass tactical modifiers
  resolveTachiai(rng, east, west, st, eastTactics, westTactics);
  resolveClinch(rng, east, west, st, eastTactics, westTactics);

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
    resolveMomentumTick(rng, east, west, st, eastTactics, westTactics);
  }

  const { winner, kimarite } = resolveFinish(rng, east, west, st, eastTactics, westTactics);

  // Upset heuristic
  // Kinboshi: Maegashira defeats Yokozuna
  const eastTier = tierOf(east);
  const westTier = tierOf(west);
  const upset = (winner === "east" && eastTier > westTier + 1) || (winner === "west" && westTier > eastTier + 1);
  
  // Kinboshi check - maegashira (tier 5) beating yokozuna (tier 1)
  const isKinboshi = (winner === "east" && eastTier === 5 && westTier === 1) || 
                     (winner === "west" && westTier === 5 && eastTier === 1);

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
    isKinboshi,
    log: st.log
  };

  return result;
}

/** Convenience helper for tests/sim screens */
export function simulateBout(east: Rikishi, west: Rikishi, seed: string): BoutResult {
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

  return resolveBout(bout, saltedEast, saltedWest, fakeBasho);
}
