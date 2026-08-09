import { describe, it, expect } from "vitest";
import { NarrativeService } from "@/engine/systems/narrative/NarrativeService";
import { SeededRNG } from "@/engine/rng";
import type { StatBand } from "@/engine/systems/narrative/NarrativeBands";

describe("NarrativeService", () => {
  const rng = new SeededRNG("narrative-test");

  describe("getStatBand", () => {
    it("returns 'exceptional' for values >= 90", () => {
      expect(NarrativeService.getStatBand(95)).toBe("exceptional");
      expect(NarrativeService.getStatBand(90)).toBe("exceptional");
    });

    it("returns 'struggling' for very low values", () => {
      expect(NarrativeService.getStatBand(5)).toBe("struggling");
    });

    it("returns a valid band for mid-range values", () => {
      const band = NarrativeService.getStatBand(50);
      expect([
        "exceptional",
        "outstanding",
        "strong",
        "capable",
        "developing",
        "limited",
        "struggling",
      ]).toContain(band);
    });
  });

  describe("getStatLabel", () => {
    it("returns a non-empty string for each band", () => {
      const bands: StatBand[] = [
        "exceptional",
        "outstanding",
        "strong",
        "capable",
        "developing",
        "limited",
        "struggling",
      ];
      for (const band of bands) {
        const label = NarrativeService.getStatLabel(new SeededRNG(`label-${band}`), band);
        expect(label).toBeTruthy();
        expect(label.length).toBeGreaterThan(0);
      }
    });
  });

  describe("getStatLabelForValue", () => {
    it("combines band + label correctly", () => {
      const label = NarrativeService.getStatLabelForValue(rng, 95);
      expect(label).toBe(NarrativeService.getStatLabel(rng, NarrativeService.getStatBand(95)));
    });

    it("handles undefined (defaults to 50)", () => {
      const label = NarrativeService.getStatLabelForValue(rng, undefined);
      expect(label).toBe(NarrativeService.getStatLabel(rng, NarrativeService.getStatBand(50)));
    });
  });

  describe("describeAttribute", () => {
    it("returns non-empty prose for an attribute", () => {
      const prose = NarrativeService.describeAttribute(rng, "strength", 85);
      expect(prose).toBeTruthy();
      expect(prose.length).toBeGreaterThan(0);
    });
  });

  describe("getFatigueBand", () => {
    it("returns 'fresh' for low fatigue", () => {
      expect(NarrativeService.getFatigueBand(5)).toBe("fresh");
    });

    it("returns 'spent' for high fatigue", () => {
      expect(NarrativeService.getFatigueBand(95)).toBe("spent");
    });
  });

  describe("getMomentumBand", () => {
    it("returns 'on_fire' for very high momentum", () => {
      expect(NarrativeService.getMomentumBand(80)).toBe("on_fire");
    });

    it("returns 'in_crisis' for very low momentum", () => {
      expect(NarrativeService.getMomentumBand(-80)).toBe("in_crisis");
    });

    it("returns 'steady' for neutral momentum", () => {
      expect(NarrativeService.getMomentumBand(0)).toBe("steady");
    });
  });

  describe("getPotentialBand", () => {
    it("returns 'unknown' for undefined talent seed", () => {
      expect(NarrativeService.getPotentialBand(undefined)).toBe("unknown");
    });

    it("returns a valid band for a talent seed", () => {
      const band = NarrativeService.getPotentialBand(85);
      expect(["generational", "star", "solid", "average", "limited"]).toContain(band);
    });
  });

  describe("getRivalryHeatBand", () => {
    it("returns 'dormant' for low heat", () => {
      expect(NarrativeService.getRivalryHeatBand(5)).toBe("dormant");
    });

    it("returns 'legendary' for high heat", () => {
      expect(NarrativeService.getRivalryHeatBand(95)).toBe("legendary");
    });
  });

  describe("getAgeBand", () => {
    it("returns a valid band for a young age", () => {
      const band = NarrativeService.getAgeBand(18);
      expect(band).toBeTruthy();
    });

    it("returns a valid band for an old age", () => {
      const band = NarrativeService.getAgeBand(38);
      expect(band).toBeTruthy();
    });
  });

  describe("getWeightBand", () => {
    it("returns a valid band for typical weight", () => {
      const band = NarrativeService.getWeightBand(140);
      expect(band).toBeTruthy();
    });
  });

  describe("getHeightBand", () => {
    it("returns a valid band for typical height", () => {
      const band = NarrativeService.getHeightBand(180);
      expect(band).toBeTruthy();
    });
  });

  describe("getWinRateBand", () => {
    it("returns a valid band for high win rate", () => {
      const band = NarrativeService.getWinRateBand(0.8);
      expect(band).toBeTruthy();
    });

    it("normalizes 0-1 range to 0-100", () => {
      const bandFraction = NarrativeService.getWinRateBand(0.5);
      const bandPercent = NarrativeService.getWinRateBand(50);
      expect(bandFraction).toBe(bandPercent);
    });
  });

  describe("determinism", () => {
    it("produces same labels for same RNG seed", () => {
      const rng1 = new SeededRNG("det-test");
      const rng2 = new SeededRNG("det-test");
      expect(NarrativeService.getStatLabel(rng1, "exceptional")).toBe(
        NarrativeService.getStatLabel(rng2, "exceptional")
      );
    });
  });
});
