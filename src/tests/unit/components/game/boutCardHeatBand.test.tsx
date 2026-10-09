/**
 * boutCardHeatBand.test.tsx
 *
 * Regression test for divergent rivalry heat bands (audit H4 / R1).
 *
 * The engine canonical banding lives in NarrativeBands
 * (dormant/simmering/heated/fierce/legendary at 20/40/65/85), exposed to UI
 * via `toRivalryHeatBand` (engineAccess). `boutCardTypes.getHeatBand` instead
 * invented a parallel scale (cold/warm/hot/inferno at 25/50/75), so the bout
 * card labels the same rivalry differently from the rest of the app —
 * e.g. heat 30 is "simmering" canonically but rendered "warm" on the card.
 *
 * The fix consolidates on the canonical bands; this pins parity.
 */
import { describe, it, expect } from "vitest";
import { getHeatBand, HEAT_CONFIG } from "@/components/game/boutCardTypes";
import { toRivalryHeatBand } from "@/engine/descriptorBands";

const CANONICAL_BANDS = ["dormant", "simmering", "heated", "fierce", "legendary"];

describe("bout card heat band parity", () => {
  it("getHeatBand agrees with the canonical engine banding across the range", () => {
    for (let heat = 0; heat <= 100; heat += 5) {
      expect(getHeatBand(heat)).toBe(toRivalryHeatBand(heat));
    }
  });

  it("HEAT_CONFIG only defines canonical band keys", () => {
    expect(Object.keys(HEAT_CONFIG).sort()).toEqual([...CANONICAL_BANDS].sort());
  });
});
