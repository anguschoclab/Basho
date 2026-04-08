import { describe, it, expect, vi } from 'vitest';
import { phase05_npcAI } from '../phase05_npcAI';
import * as npcAI from '../../../npcAI';

vi.mock('../../../npcAI', () => ({
  tickWeekNPC: vi.fn(),
}));

describe('Phase 5: NPC AI', () => {
  it('calls npcAI.tickWeekNPC and returns the world', () => {
    const mockWorld = { id: 'world-1' } as any;
    const result = phase05_npcAI(mockWorld);

    expect(npcAI.tickWeekNPC).toHaveBeenCalledWith(mockWorld);
    expect(result).toBe(mockWorld);
  });
});
