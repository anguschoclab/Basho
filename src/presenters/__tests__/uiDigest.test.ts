// src/presenters/__tests__/uiDigest.test.ts
import { describe, it, expect } from 'vitest';
import { enrichRikishiForUI } from '../uiDigest';
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
});
