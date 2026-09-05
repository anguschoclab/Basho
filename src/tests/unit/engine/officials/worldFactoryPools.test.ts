import { describe, it, expect } from "vitest";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";

describe("WorldFactory — gyoji & shimpan pool generation", () => {
  it("generates a non-empty gyojiPool", () => {
    const world = generateInitialWorld("test-gyoji-pool");
    expect(world.gyojiPool).toBeDefined();
    expect(world.gyojiPool!.length).toBeGreaterThan(0);
  });

  it("generates a non-empty shimpanPool", () => {
    const world = generateInitialWorld("test-shimpan-pool");
    expect(world.shimpanPool).toBeDefined();
    expect(world.shimpanPool!.length).toBeGreaterThan(0);
  });

  it("generates at least 6 gyoji (one per rank)", () => {
    const world = generateInitialWorld("test-gyoji-count");
    expect(world.gyojiPool!.length).toBeGreaterThanOrEqual(6);
  });

  it("generates at least 5 shimpan (minimum for a panel)", () => {
    const world = generateInitialWorld("test-shimpan-count");
    expect(world.shimpanPool!.length).toBeGreaterThanOrEqual(5);
  });

  it("gyojiPool contains at least one tate-gyoji", () => {
    const world = generateInitialWorld("test-tate-gyoji");
    const tate = world.gyojiPool!.find((g) => g.rank === "tate");
    expect(tate).toBeDefined();
  });

  it("gyoji have accuracy in valid range (30-95)", () => {
    const world = generateInitialWorld("test-gyoji-accuracy");
    for (const g of world.gyojiPool!) {
      expect(g.accuracy).toBeGreaterThanOrEqual(30);
      expect(g.accuracy).toBeLessThanOrEqual(95);
    }
  });

  it("shimpan have accuracy in valid range (40-90)", () => {
    const world = generateInitialWorld("test-shimpan-accuracy");
    for (const s of world.shimpanPool!) {
      expect(s.accuracy).toBeGreaterThanOrEqual(40);
      expect(s.accuracy).toBeLessThanOrEqual(90);
    }
  });

  it("pool generation is deterministic for the same seed", () => {
    const w1 = generateInitialWorld("deterministic-seed");
    const w2 = generateInitialWorld("deterministic-seed");
    expect(w1.gyojiPool!.map((g) => g.id)).toEqual(w2.gyojiPool!.map((g) => g.id));
    expect(w1.shimpanPool!.map((s) => s.id)).toEqual(w2.shimpanPool!.map((s) => s.id));
  });
});
