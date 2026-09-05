/**
 * WorldFactory.gyoji.test.ts — tests gyoji/shimpan pool generation at world creation.
 * Plan Feature 6 Test-First Protocol items 1-2.
 */
import { describe, it, expect } from "vitest";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";

describe("WorldFactory gyoji/shimpan pool generation", () => {
  it("generates a non-empty gyojiPool at world creation", () => {
    const world = generateInitialWorld("gyoji-test");
    expect(world.gyojiPool).toBeDefined();
    expect(world.gyojiPool!.length).toBeGreaterThan(0);
  });

  it("generates gyoji across multiple ranks", () => {
    const world = generateInitialWorld("gyoji-ranks-test");
    const ranks = new Set(world.gyojiPool!.map((g) => g.rank));
    expect(ranks.size).toBeGreaterThan(1);
  });

  it("generates a non-empty shimpanPool with at least 5 shimpan", () => {
    const world = generateInitialWorld("shimpan-test");
    expect(world.shimpanPool).toBeDefined();
    expect(world.shimpanPool!.length).toBeGreaterThanOrEqual(5);
  });

  it("gyoji have accuracy stats", () => {
    const world = generateInitialWorld("gyoji-accuracy-test");
    for (const g of world.gyojiPool!) {
      expect(g.accuracy).toBeGreaterThan(0);
      expect(g.accuracy).toBeLessThanOrEqual(100);
      expect(g.boutsOfficiated).toBe(0);
    }
  });
});
