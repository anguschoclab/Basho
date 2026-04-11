import { describe, it, expect } from 'vitest';
import { phase05_npcAI } from '../phase05_npcAI';

describe('Phase 5: NPC AI', () => {
  it('delegates to phase01_week_npc_ai and returns the world', () => {
    const mockWorld = { 
      id: 'world-1',
      heyas: new Map(),
      oyakata: new Map(),
      trainingState: new Map(),
      playerHeyaId: 'player-heya',
      week: 1,
      year: 2025,
      calendar: { currentWeek: 1, year: 2025 }
    } as any;
    const result = phase05_npcAI(mockWorld);

    expect(result).toBeDefined();
    expect(result.id).toBe(mockWorld.id);
    expect(result.heyas).toStrictEqual(mockWorld.heyas);
    expect(result.oyakata).toStrictEqual(mockWorld.oyakata);
    expect(result.trainingState).toStrictEqual(mockWorld.trainingState);
    expect(result.npcScoutingPriorities).toEqual({});
  });
});
