// src/presenters/__tests__/uiDigest.test.ts
import { describe, it, expect } from 'vitest';
import { enrichRikishiForUI, formatRadarData, formatMetaTrends } from '../uiDigest';
import { mockRikishi as generateMockRikishi } from '../../engine/__tests__/utils';

describe('UI Digest: Rikishi Perception Boundary', () => {
  it('MUST NOT leak raw numerical stats into the UI model', () => {
    const rawEngineRikishi = generateMockRikishi('r_1', { 
      stats: { strength: 85, technique: 40 } as any 
    });
    const uiRikishi = enrichRikishiForUI(rawEngineRikishi);

    // 1. Assert raw stats do not exist on the UI object
    expect((uiRikishi as any).stats).toBeUndefined();
    expect((uiRikishi as any).strength).toBeUndefined();
    
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
      const mockRikishi: any = {
        power: 90,
        speed: 70,
        technique: 50,
        balance: 60,
        stamina: 80,
        aggression: 85
      };

      const result = formatRadarData(mockRikishi);
      expect(result).toHaveLength(6);
      expect(result[0].subject).toBe("Power");
      expect(result[0].A).toBe(90);
      expect(typeof result[0].label).toBe("string"); // Banded label like "Dominant"
    });
  });

  describe('formatMetaTrends (Streamgraph Data)', () => {
    it('should format world history into stacked components totaling 100%', () => {
      const mockWorld: any = {
        history: [
          { bashoName: "hatsu", year: 2024, metaBias: "oshi" },
          { bashoName: "haru", year: 2024, metaBias: "yotsu" }
        ],
        bashoNumber: 2
      };

      const result = formatMetaTrends(mockWorld);
      expect(result).toHaveLength(2);
      expect(result[0].basho).toBe("Hatsu 24");
      expect(result[0].oshi + result[0].yotsu + result[0].hybrid).toBe(100);
      
      // Verification of Oshi bias
      expect(result[0].oshi).toBeGreaterThan(result[0].yotsu);
    });

    it('should return empty if no history', () => {
      const mockWorld: any = { history: [], bashoNumber: 0 };
      expect(formatMetaTrends(mockWorld)).toEqual([]);
    });
  });
});
