import { describe, it, expect, vi } from "vitest";
import { runPipeline, emptyDeltas, defaultActiveModifiers } from "@/engine/tick/pipelineRunner";
import type { WorldState } from "@/engine/types/world";

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
    expect(result.count).toBe(2);
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
    expect(result.count).toBe(15);

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
    expect(result.count).toBe(15);

    consoleErrorSpy.mockRestore();
  });
});
