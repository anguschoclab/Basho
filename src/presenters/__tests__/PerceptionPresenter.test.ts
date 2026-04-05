import { describe, it, expect } from 'vitest';
import { getMediaToneColor, getHealthBadge, getMediaHeatLabel } from '../PerceptionPresenter';
import type { MediaTone } from '../../engine/types/media';
import { mockRikishi } from '../../engine/__tests__/utils';
import type { Rikishi } from '../../engine/types/rikishi';

describe('PerceptionPresenter', () => {

  describe('getMediaToneColor', () => {
    it('returns the correct color for "praise"', () => {
      expect(getMediaToneColor("praise")).toBe("#34d399");
    });

    it('returns the correct color for "hype"', () => {
      expect(getMediaToneColor("hype")).toBe("#f472b6");
    });

    it('returns the correct color for "concern"', () => {
      expect(getMediaToneColor("concern")).toBe("#fbbf24");
    });

    it('returns the correct color for "controversy"', () => {
      expect(getMediaToneColor("controversy")).toBe("#f87171");
    });

    it('returns the correct color for "disrespect"', () => {
      expect(getMediaToneColor("disrespect")).toBe("#9ca3af");
    });

    it('returns the default color for "neutral" or unknown values', () => {
      expect(getMediaToneColor("neutral" as MediaTone)).toBe("#94a3b8");
      expect(getMediaToneColor("unknown" as MediaTone)).toBe("#94a3b8");
    });
  });

  describe('getHealthBadge', () => {
    it('returns "Recovering" if rikishi is injured and has weeks remaining', () => {
      const rikishi = mockRikishi('r1', { injured: true, injuryWeeksRemaining: 1 });
      expect(getHealthBadge(rikishi)).toBe("Recovering");
    });

    it('calculates health based on stamina and fatigue', () => {
      // 80 - 0 = 80 => Fresh
      let rikishi = mockRikishi('r1', { stamina: 80, fatigue: 0 });
      expect(getHealthBadge(rikishi)).toBe("Fresh");

      // 80 - 10 = 70 => Worn
      rikishi = mockRikishi('r2', { stamina: 80, fatigue: 10 });
      expect(getHealthBadge(rikishi)).toBe("Worn");

      // 50 - 10 = 40 => Struggling
      rikishi = mockRikishi('r3', { stamina: 50, fatigue: 10 });
      expect(getHealthBadge(rikishi)).toBe("Struggling");

      // 20 - 5 = 15 => Critical
      rikishi = mockRikishi('r4', { stamina: 20, fatigue: 5 });
      expect(getHealthBadge(rikishi)).toBe("Critical");
    });

    it('uses default values if stamina or fatigue are missing', () => {
      // Create an object that is missing stamina and fatigue
      // mockRikishi provides a default stamina: 100, so we have to explicitly undefined them
      const mockObj = { injured: false, injuryWeeksRemaining: 0 } as Rikishi;
      expect(mockObj.stamina).toBeUndefined();
      expect(mockObj.fatigue).toBeUndefined();

      // Health = (undefined ?? 50) - (undefined ?? 0) = 50 - 0 = 50 => Worn
      expect(getHealthBadge(mockObj)).toBe("Worn");
    });
  });

  describe('getMediaHeatLabel', () => {
    it('returns correctly mapped labels and colors for heat scores', () => {
      expect(getMediaHeatLabel(90)).toEqual({ label: "Red Hot", color: "#ef4444" });
      expect(getMediaHeatLabel(85)).toEqual({ label: "Red Hot", color: "#ef4444" });

      expect(getMediaHeatLabel(70)).toEqual({ label: "Rising", color: "#f59e0b" });
      expect(getMediaHeatLabel(60)).toEqual({ label: "Rising", color: "#f59e0b" });

      expect(getMediaHeatLabel(40)).toEqual({ label: "Notable", color: "#10b981" });
      expect(getMediaHeatLabel(30)).toEqual({ label: "Notable", color: "#10b981" });

      expect(getMediaHeatLabel(20)).toEqual({ label: "Under the Radar", color: "#6b7280" });
      expect(getMediaHeatLabel(0)).toEqual({ label: "Under the Radar", color: "#6b7280" });
    });
  });
});
