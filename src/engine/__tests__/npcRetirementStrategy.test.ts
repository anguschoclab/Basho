import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DefaultRetirementStrategy, getRetirementStrategy } from '../npcRetirementStrategy';
import { EventBus } from '../events';
import { checkRetirement } from '../lifecycle';
import type { WorldState } from '../types/world';
import type { Heya } from '../types/heya';
import type { Oyakata } from '../types/oyakata';
import type { Rikishi } from '../types/rikishi';

// Mock dependencies
vi.mock('../events', () => ({
  EventBus: {
    retirement: vi.fn(),
  },
}));

vi.mock('../lifecycle', () => ({
  checkRetirement: vi.fn(),
}));

describe('npcRetirementStrategy', () => {
  let mockWorld: WorldState;
  let mockHeya: Heya;
  let mockOyakata: Oyakata;

  beforeEach(() => {
    vi.clearAllMocks();

    mockWorld = {
      calendar: { year: 2026 },
      seed: 12345,
      rikishi: new Map<string, Rikishi>(),
    } as unknown as WorldState;

    mockHeya = {
      id: 'heya-1',
      rikishiIds: [],
    } as unknown as Heya;

    mockOyakata = {
      id: 'oyakata-1',
      archetype: 'kind',
    } as unknown as Oyakata;
  });

  describe('getRetirementStrategy', () => {
    it('should return DefaultRetirementStrategy regardless of archetype', () => {
      expect(getRetirementStrategy('strict')).toBe(DefaultRetirementStrategy);
      expect(getRetirementStrategy('tyrant')).toBe(DefaultRetirementStrategy);
      expect(getRetirementStrategy('')).toBe(DefaultRetirementStrategy);
    });
  });

  describe('DefaultRetirementStrategy.evaluateRetirements', () => {
    it('should do nothing if heya has no rikishi', () => {
      mockHeya.rikishiIds = [];
      DefaultRetirementStrategy.evaluateRetirements(mockWorld, mockHeya, mockOyakata);
      expect(checkRetirement).not.toHaveBeenCalled();
      expect(EventBus.retirement).not.toHaveBeenCalled();
    });

    it('should skip rikishi ids that do not exist in world.rikishi', () => {
      mockHeya.rikishiIds = ['missing-1', 'missing-2'];
      DefaultRetirementStrategy.evaluateRetirements(mockWorld, mockHeya, mockOyakata);
      expect(checkRetirement).not.toHaveBeenCalled();
      expect(mockHeya.rikishiIds).toEqual(['missing-1', 'missing-2']);
    });

    it('should do nothing if checkRetirement returns null', () => {
      const rId = 'rikishi-1';
      const mockRikishi = { id: rId } as Rikishi;
      mockHeya.rikishiIds = [rId];
      mockWorld.rikishi.set(rId, mockRikishi);

      vi.mocked(checkRetirement).mockReturnValue(null);

      DefaultRetirementStrategy.evaluateRetirements(mockWorld, mockHeya, mockOyakata);

      expect(checkRetirement).toHaveBeenCalledWith(mockRikishi, 2026, 12345);
      expect(EventBus.retirement).not.toHaveBeenCalled();
      expect(mockHeya.rikishiIds).toContain(rId);
      expect(mockWorld.rikishi.has(rId)).toBe(true);
    });

    it('should retire rikishi, emit event, and remove from heya and world if checkRetirement returns a reason', () => {
      const rId = 'rikishi-1';
      const mockRikishi = { id: rId, shikona: 'Taro' } as Rikishi;
      mockHeya.rikishiIds = [rId, 'other-id'];
      mockWorld.rikishi.set(rId, mockRikishi);
      mockWorld.rikishi.set('other-id', { id: 'other-id' } as Rikishi);

      const retirementReason = 'Age';
      vi.mocked(checkRetirement).mockImplementation((r) => {
          if(r.id === rId) return retirementReason;
          return null;
      });

      DefaultRetirementStrategy.evaluateRetirements(mockWorld, mockHeya, mockOyakata);

      expect(checkRetirement).toHaveBeenCalledWith(mockRikishi, 2026, 12345);
      expect(EventBus.retirement).toHaveBeenCalledWith(mockWorld, rId, mockHeya.id, 'Taro', retirementReason);

      // Should remove only the retired rikishi
      expect(mockHeya.rikishiIds).toEqual(['other-id']);
      expect(mockWorld.rikishi.has(rId)).toBe(false);
      expect(mockWorld.rikishi.has('other-id')).toBe(true);
    });

    it('should use fallback year and seed if calendar or seed is missing', () => {
      const rId = 'rikishi-1';
      const mockRikishi = { id: rId } as Rikishi;
      mockHeya.rikishiIds = [rId];
      mockWorld.rikishi.set(rId, mockRikishi);

      // Remove calendar and set year instead
      mockWorld.calendar = undefined as any;
      mockWorld.year = 2028;
      mockWorld.seed = undefined as any;

      vi.mocked(checkRetirement).mockReturnValue(null);

      DefaultRetirementStrategy.evaluateRetirements(mockWorld, mockHeya, mockOyakata);

      // Should fall back to world.year (2028) and undefined seed
      expect(checkRetirement).toHaveBeenCalledWith(mockRikishi, 2028, undefined);
    });
  });
});
