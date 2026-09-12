import { describe, it, expect, vi } from "vitest";
import { runPipeline, emptyDeltas, defaultActiveModifiers } from "@/engine/tick/pipelineRunner";
import type { WorldState } from "@/engine/types/world";

describe("defaultActiveModifiers", () => {
  it("returns neutral raw component structure", () => {
    const am = defaultActiveModifiers();
    expect(am.facilityGrowthMult).toBe(1.0);
    expect(am.nutritionMult).toBe(1.0);
    expect(am.degeikoMult).toBe(1.0);
    expect(am.recoveryMultiplier).toBe(1.0);
    expect(am.financialPenalty).toBe(false);
    expect(am.moraleBoost).toBe(false);
    expect(am.styleDriftMults).toEqual({
      power: 1.0,
      speed: 1.0,
      technique: 1.0,
      balance: 1.0,
      stamina: 1.0,
      mental: 1.0,
    });
  });

  it("does not have trainingMultiplier field", () => {
    const am = defaultActiveModifiers() as any;
    expect(am.trainingMultiplier).toBeUndefined();
  });
});

describe("pipelineRunner - PERF flag", () => {
  it("tracks performance and posts message when __PERF__ is true", () => {
    const world = {
      id: "world",
      heyas: new Map(),
      rikishi: new Map(),
      count: 0,
    } as any;

    const originalPerf = (globalThis as any).__PERF__;
    const originalPostMessage = (globalThis as any).postMessage;

    (globalThis as any).__PERF__ = true;
    (globalThis as any).postMessage = vi.fn();

    try {
      // Test with StateImpact
      const phase1 = vi.fn(function mockPhase1(w) {
        const impact = {
          metadata: {},
          entities: {
            heyaUpdates: new Map([["h1", {} as any]])
          }
        };
        return impact as any;
      });

      const phase2 = vi.fn(function mockPhase2(w) {
        return { ...w, count: w.count * 2 };
      });

      runPipeline(world, [phase1, phase2]);

      expect(globalThis.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "PERF_TRACE",
          trace: expect.arrayContaining([
            expect.objectContaining({
              phaseName: expect.any(String), // name may be "Mock" or "mockPhase1"
              impactSize: 1, // 1 heyaUpdate
            }),
            expect.objectContaining({
               phaseName: expect.any(String),
               impactSize: undefined
            })
          ])
        })
      );
    } finally {
      if (originalPerf === undefined) {
        delete (globalThis as any).__PERF__;
      } else {
        (globalThis as any).__PERF__ = originalPerf;
      }

      if (originalPostMessage === undefined) {
        delete (globalThis as any).postMessage;
      } else {
        (globalThis as any).postMessage = originalPostMessage;
      }
    }
  });
});

describe("pipelineRunner", () => {
  it("runs phases in sequence", () => {
    const world = {
      id: "world",
      heyas: new Map(),
      rikishi: new Map(),
      count: 0,
    } as any;

    const phase1 = vi.fn((w) => ({ ...w, count: w.count + 1 }));
    const phase2 = vi.fn((w) => ({ ...w, count: w.count * 2 }));

    const result = runPipeline(world, [phase1, phase2]);

    expect(phase1).toHaveBeenCalled();
    expect(phase2).toHaveBeenCalled();
    expect((result as any).count).toBe(2);
  });

  it("rolls back to snapshot on phase error", () => {
    const world = {
      id: "world",
      heyas: new Map(),
      rikishi: new Map(),
      count: 0,
    } as any;

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const phase1 = vi.fn((w) => ({ ...w, count: 10 }));
    const badPhase = vi.fn((w) => {
      throw new Error("Boom");
    });
    const phase3 = vi.fn((w) => ({ ...w, count: w.count + 5 }));

    const result = runPipeline(world, [phase1, badPhase, phase3]);

    expect(phase1).toHaveBeenCalled();
    expect(badPhase).toHaveBeenCalled();
    expect(phase3).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();

    // badPhase throws, rolling back to phase1's result (10), then phase3 adds 5
    expect((result as any).count).toBe(15);

    consoleErrorSpy.mockRestore();
  });

  it("rolls back to snapshot if phase wipes core entity maps", () => {
    const world = {
      id: "world",
      heyas: new Map(),
      rikishi: new Map(),
      count: 0,
    } as any;

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const phase1 = vi.fn((w) => ({ ...w, count: 10 }));
    const badPhase = vi.fn((w) => ({ ...w, heyas: undefined })); // Wipes heyas
    const phase3 = vi.fn((w) => ({ ...w, count: w.count + 5 }));

    const result = runPipeline(world, [phase1, badPhase, phase3]);

    expect(phase1).toHaveBeenCalled();
    expect(badPhase).toHaveBeenCalled();
    expect(phase3).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();

    // badPhase throws validation error, rolling back to phase1's result (10)
    expect((result as any).count).toBe(15);

    consoleErrorSpy.mockRestore();
  });
});
