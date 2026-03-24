import { describe, it, expect } from 'vitest';
import { onBoutResolved } from '../economics';
import type { Rikishi } from '../types/rikishi';
import type { WorldState } from '../types/world';

describe('Economics - Award Synergies', () => {
  const createRikishi = (id: string, heyaId: string): Rikishi => ({
    id,
    shikona: id,
    rank: 'maegashira',
    division: 'makuuchi',
    heyaId,
    economics: { cash: 0, retirementFund: 0, careerKenshoWon: 0, kinboshiCount: 0, totalEarnings: 0, currentBashoEarnings: 0, popularity: 50 },
    stats: {
      achievements: { kinboshiEarned: 0, ginboshiEarned: 0, kinboshiConceded: 0, ginboshiConceded: 0 }
    },
    combatProfile: {
      familyPreferences: { push: 1, belt: 1, trick: 1, speed: 1 },
      preferredGrip: 'none',
      preferredGripDepth: 'standard'
    }
  } as any);

  const mockWorld: WorldState = {
    seed: 'test-seed',
    heyas: new Map([['heya-1', { id: 'heya-1', funds: 1000000 }]]),
    rikishi: new Map(),
  } as any;

  it('should award large Kensho windfall for Kinboshi', () => {
    const winner = createRikishi('r1', 'heya-1');
    const loser = createRikishi('r2', 'heya-1');
    const result = { winner: 'east', awardFact: 'kinboshi' };
    const context = { match: { day: 1 }, result, east: winner, west: loser };

    onBoutResolved(mockWorld, context as any);

    // Kinboshi: 15-30 envelopes. ¥70,000 each. 
    // Min: 15 * 70k = 1.05M. Rikishi net (after 50% split and 30% retirement) = 1.05M * 0.5 * 0.7 = 367,500
    expect(result.kenshoEnvelopes).toBeGreaterThanOrEqual(15);
    expect(result.kenshoEnvelopes).toBeLessThanOrEqual(30);
    expect(winner.economics.cash).toBeGreaterThanOrEqual(367500);
    
    // Marketability: +5
    expect((winner as any).marketability).toBe(55);
    expect(winner.economics.popularity).toBe(60); // 50 + (5*2)
  });

  it('should award moderate Kensho windfall for Ginboshi', () => {
    const winner = createRikishi('r1', 'heya-1');
    const loser = createRikishi('r2', 'heya-1');
    const result = { winner: 'east', awardFact: 'ginboshi' };
    const context = { match: { day: 1 }, result, east: winner, west: loser };

    onBoutResolved(mockWorld, context as any);

    // Ginboshi: 5-10 envelopes.
    expect(result.kenshoEnvelopes).toBeGreaterThanOrEqual(5);
    expect(result.kenshoEnvelopes).toBeLessThanOrEqual(10);
    
    // Marketability: +2
    expect((winner as any).marketability).toBe(52);
    expect(winner.economics.popularity).toBe(54);
  });
});
