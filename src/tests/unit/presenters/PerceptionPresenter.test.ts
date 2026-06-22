import { describe, it, expect } from "vitest";
import {
  getHealthBadge,
  getMediaHeatLabel,
  getMediaToneColor,
} from "@/presenters/PerceptionPresenter";
import { Rikishi } from "../../engine/types/rikishi";

describe("PerceptionPresenter", () => {
  describe("getHealthBadge", () => {
    it("returns 'Recovering' if injured and injuryWeeksRemaining > 0", () => {
      const rikishi = { injured: true, injuryWeeksRemaining: 1 } as Rikishi;
      expect(getHealthBadge(rikishi)).toBe("Recovering");
    });

    it("returns health-based badge if injured is true but injuryWeeksRemaining is 0", () => {
      const rikishi = {
        injured: true,
        injuryWeeksRemaining: 0,
        stats: { stamina: 100 },
        fatigue: 0,
      } as Rikishi;
      expect(getHealthBadge(rikishi)).toBe("Fresh");
    });

    it("returns 'Fresh' if health >= 80", () => {
      const rikishi = { stats: { stamina: 80 }, fatigue: 0 } as Rikishi;
      expect(getHealthBadge(rikishi)).toBe("Fresh");
    });

    it("returns 'Worn' if health >= 50 and < 80", () => {
      const rikishi = { stats: { stamina: 100 }, fatigue: 30 } as Rikishi;
      expect(getHealthBadge(rikishi)).toBe("Worn");

      const edge = { stats: { stamina: 50 }, fatigue: 0 } as Rikishi;
      expect(getHealthBadge(edge)).toBe("Worn");
    });

    it("returns 'Struggling' if health >= 20 and < 50", () => {
      const rikishi = { stats: { stamina: 100 }, fatigue: 60 } as Rikishi;
      expect(getHealthBadge(rikishi)).toBe("Struggling");

      const edge = { stats: { stamina: 20 }, fatigue: 0 } as Rikishi;
      expect(getHealthBadge(edge)).toBe("Struggling");
    });

    it("returns 'Critical' if health < 20", () => {
      const rikishi = { stats: { stamina: 100 }, fatigue: 90 } as Rikishi;
      expect(getHealthBadge(rikishi)).toBe("Critical");
    });

    it("defaults stamina to 50 and fatigue to 0 if not provided", () => {
      // health = 50 - 0 = 50 -> "Worn"
      const rikishi = {} as Rikishi;
      expect(getHealthBadge(rikishi)).toBe("Worn");
    });
  });

  describe("getMediaHeatLabel", () => {
    it("returns 'Red Hot' for heat >= 85", () => {
      expect(getMediaHeatLabel(85)).toEqual({ label: "Red Hot", color: "#ef4444" });
      expect(getMediaHeatLabel(100)).toEqual({ label: "Red Hot", color: "#ef4444" });
    });

    it("returns 'Rising' for heat >= 60 and < 85", () => {
      expect(getMediaHeatLabel(60)).toEqual({ label: "Rising", color: "#f59e0b" });
      expect(getMediaHeatLabel(84)).toEqual({ label: "Rising", color: "#f59e0b" });
    });

    it("returns 'Notable' for heat >= 30 and < 60", () => {
      expect(getMediaHeatLabel(30)).toEqual({ label: "Notable", color: "#10b981" });
      expect(getMediaHeatLabel(59)).toEqual({ label: "Notable", color: "#10b981" });
    });

    it("returns 'Under the Radar' for heat < 30", () => {
      expect(getMediaHeatLabel(29)).toEqual({ label: "Under the Radar", color: "#6b7280" });
      expect(getMediaHeatLabel(0)).toEqual({ label: "Under the Radar", color: "#6b7280" });
      expect(getMediaHeatLabel(-10)).toEqual({ label: "Under the Radar", color: "#6b7280" });
    });
  });

  describe("getMediaToneColor", () => {
    it("returns expected colors for known tones", () => {
      expect(getMediaToneColor("praise")).toBe("#34d399");
      expect(getMediaToneColor("hype")).toBe("#f472b6");
      expect(getMediaToneColor("concern")).toBe("#fbbf24");
      expect(getMediaToneColor("controversy")).toBe("#f87171");
      expect(getMediaToneColor("disrespect")).toBe("#9ca3af");
    });

    it("returns default color for unknown or unhandled tones", () => {
      expect(getMediaToneColor("unknown" as any)).toBe("#94a3b8");
    });
  });
});
