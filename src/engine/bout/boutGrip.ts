import { rngFromSeed, SeededRNG } from "../rng";
import type { Rikishi } from "../types/rikishi";
import type { GrappleState } from "../types/combat";

/** Establishment of a deterministic small noise */
function jitter(rng: SeededRNG, scale = 1): number {
  return (rng.next() - 0.5) * scale;
}

/** Safe read stat helper */
function stat(r: any, key: string, fallback = 50): number {
  const v = r?.[key];
  return Number.isFinite(v) ? v : fallback;
}

/**
 * Establishment of symmetric grip.
 * In Ai-Yotsu, both get one hand inside on their preferred side.
 */
export function establishSymmetricGrip(east: Rikishi, west: Rikishi, pref: 'migi' | 'hidari'): GrappleState {
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

/**
 * Establishment of asymmetric grip (Kenka-Yotsu).
 */
export function establishAsymmetricGrip(rng: SeededRNG, east: Rikishi, west: Rikishi): GrappleState {
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

/**
 * Establishment of messy/scrambled grip.
 */
export function establishMessyGrip(rng: SeededRNG, east: Rikishi, west: Rikishi): GrappleState {
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
