/**
 * bashoProjections.officials.test.ts — tests officials projection exposes gyoji pool.
 * Plan Feature 6 Test-First Protocol item 6.
 */
import { describe, it, expect } from "vitest";
import { projectOfficials } from "@/presenters/officialsProjections";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";

describe("projectOfficials", () => {
  it("returns projection with gyoji and shimpan from world", () => {
    const world = generateInitialWorld("officials-proj-test");
    const projection = projectOfficials(world);
    expect(projection).toBeDefined();
    expect(projection.gyoji.length).toBeGreaterThan(0);
    expect(projection.shimpan.length).toBeGreaterThan(0);
  });

  it("gyoji DTOs include rank, accuracy, and boutsOfficiated", () => {
    const world = generateInitialWorld("officials-dto-test");
    const projection = projectOfficials(world);
    const g = projection.gyoji[0];
    expect(g.id).toBeDefined();
    expect(g.name).toBeDefined();
    expect(g.rank).toBeDefined();
    expect(g.accuracy).toBeGreaterThan(0);
    expect(g.boutsOfficiated).toBeGreaterThanOrEqual(0);
  });
});
