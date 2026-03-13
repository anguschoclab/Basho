import { describe, it, expect } from 'vitest';
import { calculateScoutingLevel } from '../src/engine/scouting';

describe('calculateScoutingLevel', () => {
  it('returns 100 immediately if isOwned is true', () => {
    expect(calculateScoutingLevel(true, 0, 'none')).toBe(100);
    expect(calculateScoutingLevel(true, 50, 'deep')).toBe(100);
    expect(calculateScoutingLevel(true, -10, 'light')).toBe(100);
  });

  it('returns 0 when observations are 0 and investment is none', () => {
    expect(calculateScoutingLevel(false, 0, 'none')).toBe(0);
  });

  it('adds 2 per observation up to a maximum passive base of 30', () => {
    // 5 observations * 2 = 10
    expect(calculateScoutingLevel(false, 5, 'none')).toBe(10);

    // 15 observations * 2 = 30
    expect(calculateScoutingLevel(false, 15, 'none')).toBe(30);

    // 20 observations * 2 = 40, but capped at 30
    expect(calculateScoutingLevel(false, 20, 'none')).toBe(30);

    // 100 observations * 2 = 200, but capped at 30
    expect(calculateScoutingLevel(false, 100, 'none')).toBe(30);
  });

  it('handles negative observations by clamping to 0', () => {
    expect(calculateScoutingLevel(false, -5, 'none')).toBe(0);
  });

  it('adds the correct investment bonus', () => {
    // 0 observations
    expect(calculateScoutingLevel(false, 0, 'none')).toBe(0);
    expect(calculateScoutingLevel(false, 0, 'light')).toBe(20);
    expect(calculateScoutingLevel(false, 0, 'standard')).toBe(40);
    expect(calculateScoutingLevel(false, 0, 'deep')).toBe(60);

    // 10 observations = 20 passive base
    expect(calculateScoutingLevel(false, 10, 'none')).toBe(20);
    expect(calculateScoutingLevel(false, 10, 'light')).toBe(40);
    expect(calculateScoutingLevel(false, 10, 'standard')).toBe(60);
    expect(calculateScoutingLevel(false, 10, 'deep')).toBe(80);
  });

  it('caps the final result at 100 and floors decimal observations', () => {
    // Max passive base (30) + Deep investment (60) = 90
    expect(calculateScoutingLevel(false, 15, 'deep')).toBe(90);

    // Even with excessive observations, it caps at 90 when not owned
    expect(calculateScoutingLevel(false, 100, 'deep')).toBe(90);
  });

  it('truncates floating point observations appropriately', () => {
    // 5.5 observations -> passive base = 11, final = 11
    expect(calculateScoutingLevel(false, 5.5, 'none')).toBe(11);

    // 5.9 observations -> passive base = 11.8, clampInt truncates to 11
    expect(calculateScoutingLevel(false, 5.9, 'none')).toBe(11);
  });
});
