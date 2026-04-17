/**
 * Tests h2hConfidence: returns a tachiai power bonus based on head-to-head record.
 * Formula: (wins/total - 0.5) * 8
 * Requires total >= 3 bouts; below that returns 0.
 */
import { describe, it, expect } from "vitest";
import { h2hConfidence } from "../boutPhysics";
import { mockRikishi } from "../../__tests__/utils";
import type { H2HRecord } from "../../types/records";

function makeRikishiWithH2H(id: string, opponentId: string, record: H2HRecord) {
  return mockRikishi(id, { h2h: { [opponentId]: record } });
}

describe("h2hConfidence", () => {
  it("returns positive bonus when record is mostly wins (3/4)", () => {
    const r = makeRikishiWithH2H("east", "west", {
      wins: 3, losses: 1,
      lastMatch: null, streak: 2,
    });
    const bonus = h2hConfidence(r, "west");
    // (3/4 - 0.5) * 8 = 0.25 * 8 = 2.0
    expect(bonus).toBeCloseTo(2.0, 4);
  });

  it("returns negative bonus (penalty) when record is mostly losses (1/4)", () => {
    const r = makeRikishiWithH2H("east", "west", {
      wins: 1, losses: 3,
      lastMatch: null, streak: -2,
    });
    const bonus = h2hConfidence(r, "west");
    // (1/4 - 0.5) * 8 = -0.25 * 8 = -2.0
    expect(bonus).toBeCloseTo(-2.0, 4);
  });

  it("returns 0 when record is exactly 50/50", () => {
    const r = makeRikishiWithH2H("east", "west", {
      wins: 2, losses: 2,
      lastMatch: null, streak: 0,
    });
    expect(h2hConfidence(r, "west")).toBeCloseTo(0, 4);
  });

  it("returns 0 when total bouts < 3 (insufficient sample)", () => {
    const r = makeRikishiWithH2H("east", "west", {
      wins: 2, losses: 0,
      lastMatch: null, streak: 2,
    });
    // total = 2, below threshold
    expect(h2hConfidence(r, "west")).toBe(0);
  });

  it("returns 0 when no h2h record exists for opponent", () => {
    const r = mockRikishi("east", { h2h: {} });
    expect(h2hConfidence(r, "unknown-opponent")).toBe(0);
  });

  it("caps positive bonus at +4 (domination scenario)", () => {
    // wins=10/total=10 → (1.0 - 0.5)*8 = 4.0
    const r = makeRikishiWithH2H("east", "west", {
      wins: 10, losses: 0,
      lastMatch: null, streak: 10,
    });
    expect(h2hConfidence(r, "west")).toBeCloseTo(4.0, 4);
  });
});
