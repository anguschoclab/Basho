import { describe, it, expect } from 'vitest';
import { getHealthBadge, getMediaHeatLabel, getMediaToneColor } from '../PerceptionPresenter';
import { mockRikishi } from '../../engine/__tests__/utils';
import type { Rikishi } from '../../engine/types/rikishi';

describe('PerceptionPresenter', () => {
  describe('getHealthBadge', () => {
    it('returns "Recovering" if rikishi is injured and has injury weeks remaining', () => {
      const rikishi = mockRikishi('1', { injured: true, injuryWeeksRemaining: 1 });
      expect(getHealthBadge(rikishi)).toBe('Recovering');
    });

    it('returns "Fresh" when health (stamina - fatigue) is >= 80', () => {
      // 100 - 10 = 90
      const rikishi = mockRikishi('2', { stamina: 100, fatigue: 10, injured: false, injuryWeeksRemaining: 0 });
      expect(getHealthBadge(rikishi)).toBe('Fresh');

      // exactly 80
      const rikishi2 = mockRikishi('3', { stamina: 100, fatigue: 20, injured: false, injuryWeeksRemaining: 0 });
      expect(getHealthBadge(rikishi2)).toBe('Fresh');
    });

    it('returns "Worn" when health is >= 50 and < 80', () => {
      // 90 - 20 = 70
      const rikishi = mockRikishi('4', { stamina: 90, fatigue: 20, injured: false, injuryWeeksRemaining: 0 });
      expect(getHealthBadge(rikishi)).toBe('Worn');

      // exactly 50
      const rikishi2 = mockRikishi('5', { stamina: 100, fatigue: 50, injured: false, injuryWeeksRemaining: 0 });
      expect(getHealthBadge(rikishi2)).toBe('Worn');
    });

    it('returns "Struggling" when health is >= 20 and < 50', () => {
      // 60 - 20 = 40
      const rikishi = mockRikishi('6', { stamina: 60, fatigue: 20, injured: false, injuryWeeksRemaining: 0 });
      expect(getHealthBadge(rikishi)).toBe('Struggling');

      // exactly 20
      const rikishi2 = mockRikishi('7', { stamina: 50, fatigue: 30, injured: false, injuryWeeksRemaining: 0 });
      expect(getHealthBadge(rikishi2)).toBe('Struggling');
    });

    it('returns "Critical" when health is < 20', () => {
      // 30 - 20 = 10
      const rikishi = mockRikishi('8', { stamina: 30, fatigue: 20, injured: false, injuryWeeksRemaining: 0 });
      expect(getHealthBadge(rikishi)).toBe('Critical');
    });

    it('handles undefined stamina and fatigue gracefully, falling back to 50/0 (health 50 = "Worn")', () => {
      // Cast to any to simulate missing properties if types were bypassed, though mockRikishi might set them.
      // We will explicitly pass undefined for these to test the default coalescing.
      const rikishi = mockRikishi('9', { injured: false, injuryWeeksRemaining: 0 } as any);
      rikishi.stamina = undefined as any;
      rikishi.fatigue = undefined as any;

      expect(getHealthBadge(rikishi)).toBe('Worn');
    });
  });

  describe('getMediaHeatLabel', () => {
    it('returns Red Hot label when heat >= 85', () => {
      expect(getMediaHeatLabel(85)).toEqual({ label: 'Red Hot', color: '#ef4444' });
      expect(getMediaHeatLabel(100)).toEqual({ label: 'Red Hot', color: '#ef4444' });
    });

    it('returns Rising label when heat >= 60 and < 85', () => {
      expect(getMediaHeatLabel(60)).toEqual({ label: 'Rising', color: '#f59e0b' });
      expect(getMediaHeatLabel(84)).toEqual({ label: 'Rising', color: '#f59e0b' });
    });

    it('returns Notable label when heat >= 30 and < 60', () => {
      expect(getMediaHeatLabel(30)).toEqual({ label: 'Notable', color: '#10b981' });
      expect(getMediaHeatLabel(59)).toEqual({ label: 'Notable', color: '#10b981' });
    });

    it('returns Under the Radar label when heat < 30', () => {
      expect(getMediaHeatLabel(29)).toEqual({ label: 'Under the Radar', color: '#6b7280' });
      expect(getMediaHeatLabel(0)).toEqual({ label: 'Under the Radar', color: '#6b7280' });
    });
  });

  describe('getMediaToneColor', () => {
    it('returns correct color mapping for each tone', () => {
      expect(getMediaToneColor('praise')).toBe('#34d399');
      expect(getMediaToneColor('hype')).toBe('#f472b6');
      expect(getMediaToneColor('concern')).toBe('#fbbf24');
      expect(getMediaToneColor('controversy')).toBe('#f87171');
      expect(getMediaToneColor('disrespect')).toBe('#9ca3af');
      expect(getMediaToneColor('unknown' as any)).toBe('#94a3b8');
    });
  });
});
