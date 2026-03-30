import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkNaturalizations } from '../naturalization';
import { mockRikishi } from './utils';
import type { WorldState } from '../types/world';

// Mock dependencies
vi.mock('../events', () => ({
  logEngineEvent: vi.fn(),
  EventBus: {}
}));

vi.mock('../media', () => ({
  generateGovernanceHeadline: vi.fn(),
}));

import { logEngineEvent } from '../events';
import { generateGovernanceHeadline } from '../media';

describe('naturalization system', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createWorld(rikishis: any[]): WorldState {
    const world = {
      year: 2025,
      rikishi: new Map(),
      heyas: new Map(),
    } as unknown as WorldState;

    rikishis.forEach(r => {
      world.rikishi.set(r.id, r);
      if (!world.heyas.has(r.heyaId)) {
        world.heyas.set(r.heyaId, { id: r.heyaId, name: `Heya ${r.heyaId}` } as any);
      }
    });

    return world;
  }

  it('skips Japanese rikishi', () => {
    const jpRikishi = mockRikishi('jp_1', { nationality: 'Japan', careerWins: 500 });
    const world = createWorld([jpRikishi]);

    checkNaturalizations(world);

    expect(jpRikishi.nationality).toBe('Japan');
    expect(logEngineEvent).not.toHaveBeenCalled();
    expect(generateGovernanceHeadline).not.toHaveBeenCalled();
  });

  it('skips ineligible foreign rikishi', () => {
    const usRikishi = mockRikishi('us_1', {
      nationality: 'USA',
      careerWins: 300,
      rank: 'maegashira',
      birthYear: 2000 // age 25
    });
    const world = createWorld([usRikishi]);

    checkNaturalizations(world);

    expect(usRikishi.nationality).toBe('USA');
    expect(logEngineEvent).not.toHaveBeenCalled();
    expect(generateGovernanceHeadline).not.toHaveBeenCalled();
  });

  it('processes eligible foreign rikishi but skips if chance is >= 5', () => {
    // For id "test_1" and year 2025, the chance is 54 (>= 5)
    const eligibleRikishi = mockRikishi('test_1', {
      nationality: 'USA',
      careerWins: 450, // eligible
    });
    const world = createWorld([eligibleRikishi]);

    checkNaturalizations(world);

    expect(eligibleRikishi.nationality).toBe('USA');
    expect(logEngineEvent).not.toHaveBeenCalled();
    expect(generateGovernanceHeadline).not.toHaveBeenCalled();
  });

  it('processes eligible foreign rikishi and naturalizes if chance < 5', () => {
    // For id "test_2" and year 2025, the chance is 3 (< 5)
    const eligibleRikishi = mockRikishi('test_2', {
      nationality: 'Mongolia',
      origin: 'Mongolia',
      careerWins: 450, // eligible
      heyaId: 'heya_1',
      name: 'Mongol Wrestler',
      shikona: 'Mongol Wrestler'
    });
    const world = createWorld([eligibleRikishi]);

    checkNaturalizations(world);

    expect(eligibleRikishi.nationality).toBe('Japan');
    expect(logEngineEvent).toHaveBeenCalledWith(world, expect.objectContaining({
      type: 'NATURALIZATION',
      rikishiId: 'test_2',
      heyaId: 'heya_1',
      data: { originalNationality: 'Mongolia', newNationality: 'Japan' }
    }));
    expect(generateGovernanceHeadline).toHaveBeenCalledWith(expect.objectContaining({
      world,
      heyaId: 'heya_1',
      type: 'milestone',
      severity: 'major'
    }));
  });

  it('considers ozeki with >= 350 wins eligible', () => {
     // Test with an id that will trigger chance < 5, e.g. "test_2"
     const ozeki = mockRikishi('test_2', {
      nationality: 'Mongolia',
      origin: 'Mongolia',
      rank: 'ozeki',
      careerWins: 360, // eligible for ozeki
      heyaId: 'heya_1'
    });
    const world = createWorld([ozeki]);

    checkNaturalizations(world);

    expect(ozeki.nationality).toBe('Japan');
    expect(logEngineEvent).toHaveBeenCalled();
  });

  it('considers yokozuna >= 28 years old eligible', () => {
    // Test with an id that will trigger chance < 5, e.g. "test_2"
    const yokozuna = mockRikishi('test_2', {
     nationality: 'Mongolia',
     origin: 'Mongolia',
     rank: 'yokozuna',
     careerWins: 200, // normally not eligible, but rank/age makes them eligible
     birthYear: 1995, // 30 years old in 2025
     heyaId: 'heya_1'
   });
   const world = createWorld([yokozuna]);

   checkNaturalizations(world);

   expect(yokozuna.nationality).toBe('Japan');
   expect(logEngineEvent).toHaveBeenCalled();
 });
});
