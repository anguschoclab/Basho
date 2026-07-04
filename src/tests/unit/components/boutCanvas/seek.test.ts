import { describe, it, expect } from "vitest";
import { seekToPhase, computeGlobalProgress } from "@/components/game/boutReplay/boutCanvas/seek";

const UNIFORM_DURATIONS = [1000, 1000, 1000, 1000, 1000, 1000, 0];
const PULL_DURATIONS = [2500, 1200, 1000, 1500, 1200, 2200, 0];

describe("seekToPhase", () => {
  it("returns phaseIndex 0, phaseProgress 0 for globalProgress = 0", () => {
    const result = seekToPhase(0, UNIFORM_DURATIONS);
    expect(result.phaseIndex).toBe(0);
    expect(result.phaseProgress).toBe(0);
  });

  it("returns last non-zero phase at progress 1 for globalProgress = 1", () => {
    const result = seekToPhase(1, UNIFORM_DURATIONS);
    expect(result.phaseIndex).toBe(5);
    expect(result.phaseProgress).toBe(1);
  });

  it("returns mid phase at 0.5 for uniform durations", () => {
    const result = seekToPhase(0.5, UNIFORM_DURATIONS);
    // 6 phases × 1000ms = 6000ms total. 0.5 × 6000 = 3000ms = end of phase 2
    expect(result.phaseIndex).toBe(2);
    expect(result.phaseProgress).toBe(1);
  });

  it("returns correct phase for non-uniform (pull) durations at 0.5", () => {
    const total = PULL_DURATIONS.reduce((a, b) => a + b, 0); // 9600
    const targetMs = 0.5 * total; // 4800
    let elapsed = 0;
    let expectedPhase = 0;
    for (let i = 0; i < PULL_DURATIONS.length; i++) {
      if (targetMs <= elapsed + PULL_DURATIONS[i]) {
        expectedPhase = i;
        break;
      }
      elapsed += PULL_DURATIONS[i];
    }
    const result = seekToPhase(0.5, PULL_DURATIONS);
    expect(result.phaseIndex).toBe(expectedPhase);
  });

  it("lands in ritual phase for 0.25 with pull bout durations", () => {
    const result = seekToPhase(0.25, PULL_DURATIONS);
    expect(result.phaseIndex).toBe(0);
    expect(result.phaseProgress).toBeGreaterThan(0);
    expect(result.phaseProgress).toBeLessThan(1);
  });

  it("clamps globalProgress > 1 to last non-zero phase at progress 1", () => {
    const result = seekToPhase(1.5, UNIFORM_DURATIONS);
    expect(result.phaseIndex).toBe(5);
    expect(result.phaseProgress).toBe(1);
  });

  it("clamps globalProgress < 0 to phaseIndex 0 at progress 0", () => {
    const result = seekToPhase(-0.5, UNIFORM_DURATIONS);
    expect(result.phaseIndex).toBe(0);
    expect(result.phaseProgress).toBe(0);
  });

  it("returns phaseIndex 0, phaseProgress 0 for empty durations array", () => {
    const result = seekToPhase(0.5, []);
    expect(result.phaseIndex).toBe(0);
    expect(result.phaseProgress).toBe(0);
  });

  it("returns phaseIndex 0, phaseProgress 0 for all-zero durations", () => {
    const result = seekToPhase(0.5, [0, 0, 0, 0, 0, 0, 0]);
    expect(result.phaseIndex).toBe(0);
    expect(result.phaseProgress).toBe(0);
  });

  it("returns phaseIndex 0 with near-zero progress for tiny globalProgress", () => {
    const result = seekToPhase(0.001, UNIFORM_DURATIONS);
    expect(result.phaseIndex).toBe(0);
    expect(result.phaseProgress).toBeCloseTo(0.006, 2);
  });
});

describe("computeGlobalProgress", () => {
  it("returns globalProgress 0 for phase 0, progress 0", () => {
    const result = computeGlobalProgress(0, 0, UNIFORM_DURATIONS);
    expect(result.globalProgress).toBe(0);
    expect(result.elapsedMs).toBe(0);
    expect(result.totalDurationMs).toBe(6000);
  });

  it("returns globalProgress 1 for last non-zero phase at progress 1", () => {
    const result = computeGlobalProgress(5, 1, UNIFORM_DURATIONS);
    expect(result.globalProgress).toBe(1);
    expect(result.elapsedMs).toBe(6000);
  });

  it("returns correct fraction for mid phase, mid progress", () => {
    const result = computeGlobalProgress(2, 0.5, UNIFORM_DURATIONS);
    expect(result.globalProgress).toBeCloseTo(0.41667, 4);
    expect(result.elapsedMs).toBe(2500);
  });

  it("clamps phaseIndex out of bounds (high) to last phase", () => {
    const result = computeGlobalProgress(10, 0.5, UNIFORM_DURATIONS);
    expect(result.globalProgress).toBeLessThanOrEqual(1);
    expect(result.elapsedMs).toBeLessThanOrEqual(result.totalDurationMs);
  });

  it("clamps phaseIndex out of bounds (negative) to 0", () => {
    const result = computeGlobalProgress(-1, 0.5, UNIFORM_DURATIONS);
    expect(result.globalProgress).toBeGreaterThanOrEqual(0);
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it("returns globalProgress 0 for empty durations", () => {
    const result = computeGlobalProgress(2, 0.5, []);
    expect(result.globalProgress).toBe(0);
    expect(result.totalDurationMs).toBe(0);
  });

  it("returns globalProgress 0 for all-zero durations", () => {
    const result = computeGlobalProgress(2, 0.5, [0, 0, 0]);
    expect(result.globalProgress).toBe(0);
    expect(result.totalDurationMs).toBe(0);
  });

  it("computes correct elapsedMs for non-uniform durations", () => {
    const result = computeGlobalProgress(2, 0.5, PULL_DURATIONS);
    const expectedElapsed = PULL_DURATIONS[0] + PULL_DURATIONS[1] + PULL_DURATIONS[2] * 0.5;
    expect(result.elapsedMs).toBe(expectedElapsed);
    expect(result.totalDurationMs).toBe(9600);
  });

  it("round-trip: seekToPhase(0.5) then computeGlobalProgress → ~0.5", () => {
    const seek = seekToPhase(0.5, PULL_DURATIONS);
    const computed = computeGlobalProgress(seek.phaseIndex, seek.phaseProgress, PULL_DURATIONS);
    expect(computed.globalProgress).toBeCloseTo(0.5, 4);
  });
});
