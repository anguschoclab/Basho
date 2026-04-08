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
  if (roll < 0.03) {
    // Rare Moro-zashi (reduced from 10% → 3% to match real JSA rate)
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

/**
 * Evolves grip depth and hand positions per engagement tick.
 *
 * Called every tick during belt-dominant stances instead of re-rolling from
 * scratch, giving realistic per-tick grip contest evolution. A significant
 * technique differential shifts the winning side's grip progressively deeper.
 *
 * Depth progression: standard → deep → maemitsu
 * Hand progression: outside → inside (requires margin > 15)
 */
export function contestGripTick(
  rng: SeededRNG,
  east: Rikishi,
  west: Rikishi,
  current: GrappleState
): GrappleState {
  const eastTech = stat(east, 'technique') + (rng.next() - 0.5) * 8;
  const westTech = stat(west, 'technique') + (rng.next() - 0.5) * 8;
  const margin = Math.abs(eastTech - westTech);

  // Small margins (< 12) — stalemate, grip unchanged
  if (margin < 12) return current;

  const winner: 'east' | 'west' = eastTech > westTech ? 'east' : 'west';
  const next: GrappleState = {
    east: { ...current.east },
    west: { ...current.west },
    gripAdvantage: current.gripAdvantage,
  };

  const winningSide = next[winner];

  // Depth evolution: requires increasingly larger margins
  if (margin > 20 && winningSide.depth === 'standard') {
    winningSide.depth = 'deep';
  } else if (margin > 30 && winningSide.depth === 'deep') {
    winningSide.depth = 'maemitsu';
  }

  // Hand position improvement: outside → inside (probabilistic, requires margin > 15)
  if (margin > 15) {
    if (winningSide.rightHand === 'outside' && rng.next() < 0.30) {
      winningSide.rightHand = 'inside';
    }
    if (winningSide.leftHand === 'outside' && rng.next() < 0.30) {
      winningSide.leftHand = 'inside';
    }
  }

  // Recompute grip advantage based on inside hands
  const eastInside = (next.east.rightHand === 'inside' ? 1 : 0) + (next.east.leftHand === 'inside' ? 1 : 0);
  const westInside = (next.west.rightHand === 'inside' ? 1 : 0) + (next.west.leftHand === 'inside' ? 1 : 0);

  if (eastInside === 2 && westInside < 2) {
    next.gripAdvantage = 'moro_zashi_east';
  } else if (westInside === 2 && eastInside < 2) {
    next.gripAdvantage = 'moro_zashi_west';
  } else if (eastInside > westInside) {
    next.gripAdvantage = 'east_strong';
  } else if (westInside > eastInside) {
    next.gripAdvantage = 'west_strong';
  } else {
    next.gripAdvantage = 'neutral';
  }

  return next;
}
