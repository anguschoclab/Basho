import { SeededRNG } from "../rng";
import type { Rikishi } from "../types/rikishi";
import type { CombatAction, TacticalFamily, TacticalArchetype, KimariteClass } from "../types/combat";
import { ARCHETYPE_PROFILES } from "../types/combat";
import { KIMARITE_REGISTRY, type Kimarite } from "../kimarite";

/** State used for physics engine, simplified here for calculation purposes. */
export interface CalculationState {
  balanceEast: number;
  balanceWest: number;
  fatigueEast: number;
  fatigueWest: number;
  eastId: string;
  westId: string;
  advantage: "east" | "west" | "none";
  position: "front" | "lateral" | "rear";
  stance: string;
  grappleState: any;
}

/** Safe read stat helper */
function stat(r: any, key: string, fallback = 50): number {
  const v = r?.[key];
  return Number.isFinite(v) ? v : fallback;
}

/**
 * Height Leverage Helper: Calculates Gravity Delta bonuses.
 */
export function calculateHeightLeverage(attacker: Rikishi, defender: Rikishi, targetFamily: TacticalFamily): number {
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

/**
 * Calculate Action Power based on Move-Specific Math.
 */
export function calculateActionPower(r: Rikishi, action: CombatAction, opponent: Rikishi, st: CalculationState): number {
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

  // 5. Fatigue drain
  const fatiguePenalty = (stat(r, 'fatigue', 0)) * 0.4;
  power -= fatiguePenalty;

  // Grip Multipliers
  if (action.family === 'belt') {
    if (st.grappleState.gripAdvantage === (r.id === st.eastId ? 'moro_zashi_east' : 'moro_zashi_west')) {
      power *= 1.3; // Double inside bonus
    } else if (st.grappleState.gripAdvantage === (r.id === st.eastId ? 'west_strong' : 'east_strong')) {
      power *= 0.85; // Awkward grip penalty
    }

    const depth = r.id === st.eastId ? st.grappleState.east.depth : st.grappleState.west.depth;
    if (depth === 'maemitsu') {
      power *= 1.15; // Pulling leverage bonus
    }
  }

  return Math.max(1, power * weightLiability);
}

/**
 * Check if a move's state gates are met.
 */
export function checkKimariteRequirements(k: Kimarite, attacker: Rikishi, defender: Rikishi, st: CalculationState): boolean {
  const isGrappling = st.grappleState.gripAdvantage !== 'neutral' || 
                      st.stance === 'belt-dominant' || 
                      st.stance === 'migi-yotsu' || 
                      st.stance === 'hidari-yotsu';

  if (k.requiresBeltGrip && !isGrappling) return false;
  if (!k.requirements) return true;
  const req = k.requirements;

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
 * Picker for moves from a class.
 */
export function pickMoveFromClass(rng: SeededRNG, moveClass: KimariteClass | undefined, attacker: Rikishi, defender: Rikishi, st: CalculationState, family?: TacticalFamily, moveId?: string): Kimarite {
  if (moveId) {
    const m = KIMARITE_REGISTRY.find(k => k.id === moveId);
    if (m) return m;
  }

  let possible = KIMARITE_REGISTRY.filter(k => checkKimariteRequirements(k, attacker, defender, st));
  
  if (moveClass) {
    possible = possible.filter(k => (k as any).kimariteClass === moveClass);
  } else if (family) {
    possible = possible.filter(k => k.tacticalFamily === family);
  }
  
  if (possible.length === 0) {
    possible = KIMARITE_REGISTRY.filter(k => checkKimariteRequirements(k, attacker, defender, st));
    if (possible.length === 0) return KIMARITE_REGISTRY[0]; 
  }

  const arch = ARCHETYPE_PROFILES[attacker.combatProfile.archetype as TacticalArchetype] || ARCHETYPE_PROFILES.all_rounder;
  const favored = attacker.combatProfile.favoredKimarite || [];

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
