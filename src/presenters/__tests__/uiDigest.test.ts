import type { StandingsTableRuntime } from '../../engine/types/basho';
// src/presenters/__tests__/uiDigest.test.ts
import { describe, it, expect } from 'vitest';
import { enrichRikishiForUI, formatRadarData, formatMetaTrends, getOzekiRunCandidates } from '../uiDigest';
import { mockRikishi as generateMockRikishi } from '../../engine/__tests__/utils';
import type { RikishiStats, Rikishi } from '../../engine/types/rikishi';
import type { WorldState } from '../../engine/types/world';

describe('UI Digest: Rikishi Perception Boundary', () => {
  it('MUST NOT leak raw numerical stats into the UI model', () => {
    const rawEngineRikishi = generateMockRikishi('r_1', { 
      stats: { strength: 85, technique: 40 } as unknown as RikishiStats
    });
    const uiRikishi = enrichRikishiForUI(rawEngineRikishi);

    // 1. Assert raw stats do not exist on the UI object
    expect((uiRikishi as Record<string, unknown>).stats).toBeUndefined();
    expect((uiRikishi as Record<string, unknown>).strength).toBeUndefined();
    
    // 2. Assert perceivedStats exists and contains string descriptors
    expect(uiRikishi.perceivedStats).toBeDefined();
    expect(typeof uiRikishi.perceivedStats.strength).toBe('string');
    
    // 3. Verify the hysteresis mapping (85 should map to something like 'Dominant')
    expect(uiRikishi.perceivedStats.strength).not.toBe('85');
    expect(uiRikishi.perceivedStats.strength.length).toBeGreaterThan(0);
  });


  it('MUST expose public biographical data correctly', () => {
    const rawEngineRikishi = generateMockRikishi('r_123', { shikona: 'Asashoryu' });
    const uiRikishi = enrichRikishiForUI(rawEngineRikishi);

    expect(uiRikishi.id).toBe('r_123');
    expect(uiRikishi.shikona).toBe('Asashoryu');
  });

  describe('formatRadarData (v2.0 Visuals)', () => {
    it('should map rikishi attributes to radar points with C5 labels', () => {
      const mockRikishi: Partial<Rikishi> = {
        power: 90,
        speed: 70,
        technique: 50,
        balance: 60,
        stamina: 80,
        aggression: 85
      };

      const result = formatRadarData(mockRikishi as Rikishi);
      expect(result).toHaveLength(5);
      expect(result[0].subject).toBe("Power");
      expect(result[0].A).toBe(5);
      // Removed label check // Banded label like "Dominant"
    });
  });

  describe('formatMetaTrends (Streamgraph Data)', () => {
    it('should format world history into stacked components totaling 100%', () => {
      const mockWorld: Partial<WorldState> = {
        history: [
          { bashoName: "hatsu", year: 2024, metaBias: "oshi" },
          { bashoName: "haru", year: 2024, metaBias: "yotsu" }
        ],
        bashoNumber: 2
      };

      const result = formatMetaTrends(mockWorld as WorldState);
      expect(result).toHaveLength(2);
      expect(result[0].basho).toBe("H24");
      expect(result[0].oshi + result[0].yotsu + result[0].hybrid).toBe(100);
      
      // Verification of Oshi bias
      expect(result[0].oshi).toBeGreaterThan(result[0].yotsu);
    });

    it('should return empty if no history', () => {
      const mockWorld: Partial<WorldState> = { history: [], bashoNumber: 0 };
      expect(formatMetaTrends(mockWorld as WorldState)).toEqual([]);
    });
  });

  describe('getOzekiRunCandidates', () => {
    it('returns empty array if no historyIndex', () => {
      const world = {
        rikishi: new Map(),
      } as unknown as WorldState;
      expect(getOzekiRunCandidates(world)).toEqual([]);
    });

    it('returns empty array if no candidates (sekiwake/komusubi)', () => {
        const mockR = generateMockRikishi('r1', { rank: 'maegashira' });
        const world = {
            historyIndex: { rikishi: {} },
            rikishi: new Map([['r1', mockR]]),
            heyas: new Map(),
        } as unknown as WorldState;

        expect(getOzekiRunCandidates(world)).toEqual([]);
    });

    it('calculates recent wins from last 3 basho results', () => {
        const mockR = generateMockRikishi('r1', { rank: 'sekiwake', heyaId: 'h2' });
        const world = {
            playerHeyaId: 'h1',
            historyIndex: {
                rikishi: {
                    'r1': [
                        { wins: 5 }, { wins: 8 }, { wins: 8 }, { wins: 10 }, { wins: 11 }
                    ] // should take last 3: 8+10+11 = 29
                }
            },
            rikishi: new Map([['r1', mockR]]),
            heyas: new Map(),
        } as unknown as WorldState;

        const res = getOzekiRunCandidates(world);
        expect(res).toHaveLength(1);
        expect(res[0].recentWins).toBe(29);
        expect(res[0].narrative).toBe("Building a solid case, but needs a spectacular finish.");
    });

    it('includes current basho standings in recent wins', () => {
        const mockR = generateMockRikishi('r1', { rank: 'sekiwake', heyaId: 'h2' });
        const world = {
            playerHeyaId: 'h1',
            historyIndex: {
                rikishi: {
                    'r1': [
                        { wins: 10 }, { wins: 10 }
                    ] // 20 so far
                }
            },
            rikishi: new Map([['r1', mockR]]),
            heyas: new Map(),
            currentBasho: {
                standings: new Map([['r1', { wins: 12 }]]) as StandingsTableRuntime
            }
        } as unknown as WorldState;

        const res = getOzekiRunCandidates(world);
        expect(res).toHaveLength(1);
        expect(res[0].recentWins).toBe(32); // 20 + 12
        expect(res[0].narrative).toBe("On the brink. A few more wins will secure the rank.");
    });

    it('filters NPC rikishi with < 20 wins, but includes player rikishi', () => {
        const npcR = generateMockRikishi('r1', { rank: 'sekiwake', heyaId: 'npc_heya' });
        const playerR = generateMockRikishi('r2', { rank: 'komusubi', heyaId: 'player_heya' });

        const world = {
            playerHeyaId: 'player_heya',
            historyIndex: {
                rikishi: {
                    'r1': [{ wins: 5 }, { wins: 5 }], // 10 total
                    'r2': [{ wins: 5 }, { wins: 5 }]  // 10 total
                }
            },
            rikishi: new Map([['r1', npcR], ['r2', playerR]]),
            heyas: new Map(),
        } as unknown as WorldState;

        const res = getOzekiRunCandidates(world);

        expect(res).toHaveLength(1); // Only playerR is returned
        expect(res[0].rikishi.id).toBe('r2');
        expect(res[0].recentWins).toBe(10);
    });

    it('sorts candidates descending by recentWins and assigns >=33 narrative', () => {
        const r1 = generateMockRikishi('r1', { rank: 'sekiwake', heyaId: 'h' });
        const r2 = generateMockRikishi('r2', { rank: 'komusubi', heyaId: 'h' });

        const world = {
            playerHeyaId: 'player_heya',
            historyIndex: {
                rikishi: {
                    'r1': [{ wins: 11 }, { wins: 11 }, { wins: 11 }], // 33 total
                    'r2': [{ wins: 12 }, { wins: 12 }, { wins: 10 }]  // 34 total
                }
            },
            rikishi: new Map([['r1', r1], ['r2', r2]]),
            heyas: new Map(),
        } as unknown as WorldState;

        const res = getOzekiRunCandidates(world);
        expect(res).toHaveLength(2);

        // Sorted by recentWins descending
        expect(res[0].rikishi.id).toBe('r2');
        expect(res[0].recentWins).toBe(34);
        expect(res[1].rikishi.id).toBe('r1');
        expect(res[1].recentWins).toBe(33);

        expect(res[0].narrative).toBe("Has reached the traditional 33-win threshold. An Ozeki promotion is imminent.");
        expect(res[1].narrative).toBe("Has reached the traditional 33-win threshold. An Ozeki promotion is imminent.");
    });
  });
});
