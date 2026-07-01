 
import { describe, it, expect, vi } from "vitest";
import { getOzekiStatus } from "@/engine/banzuke/ozekiLogic";
import * as banzukeHelpers from "@/engine/banzuke/banzukeHelpers";

vi.mock("@/engine/banzuke/banzukeHelpers", () => ({
  isMakeKoshi: vi.fn(),
}));

describe("getOzekiStatus — kadoban accumulation", () => {
  it("returns non-kadoban state if not make-koshi", () => {
    (banzukeHelpers.isMakeKoshi as vi.Mock).mockReturnValue(false);
    const result = getOzekiStatus(10, 5, 0, undefined);
    expect(result).toEqual({ isKadoban: false, consecutiveMakeKoshi: 0 });
  });

  it("becomes kadoban on first make-koshi", () => {
    (banzukeHelpers.isMakeKoshi as vi.Mock).mockReturnValue(true);
    const result = getOzekiStatus(7, 8, 0, undefined);
    expect(result).toEqual({ isKadoban: true, consecutiveMakeKoshi: 1 });
  });

  it("demoted on second consecutive make-koshi (consecutiveMakeKoshi accumulates)", () => {
    (banzukeHelpers.isMakeKoshi as vi.Mock).mockReturnValue(true);
    const result = getOzekiStatus(6, 9, 0, { isKadoban: true, consecutiveMakeKoshi: 1 });
    expect(result.consecutiveMakeKoshi).toBe(2);
    expect(result.isKadoban).toBe(false);
  });

  it("resets on kachi-koshi", () => {
    (banzukeHelpers.isMakeKoshi as vi.Mock).mockReturnValue(false);
    const result = getOzekiStatus(8, 7, 0, { isKadoban: true, consecutiveMakeKoshi: 1 });
    expect(result).toEqual({ isKadoban: false, consecutiveMakeKoshi: 0 });
  });

  it("accumulates from prev.consecutiveMakeKoshi, not from isKadoban toggle", () => {
    // Edge case: prev has isKadoban: false but consecutiveMakeKoshi: 1
    // (inconsistent state that could arise from serialization issues)
    // The accumulation should still produce consecutiveMakeKoshi: 2
    (banzukeHelpers.isMakeKoshi as vi.Mock).mockReturnValue(true);
    const result = getOzekiStatus(6, 9, 0, { isKadoban: false, consecutiveMakeKoshi: 1 });
    expect(result.consecutiveMakeKoshi).toBe(2);
  });

  it("handles third consecutive make-koshi correctly (accumulates beyond 2)", () => {
    // If somehow still ozeki with consecutiveMakeKoshi: 2, a third MK should accumulate
    (banzukeHelpers.isMakeKoshi as vi.Mock).mockReturnValue(true);
    const result = getOzekiStatus(5, 10, 0, { isKadoban: false, consecutiveMakeKoshi: 2 });
    expect(result.consecutiveMakeKoshi).toBe(3);
  });
});
