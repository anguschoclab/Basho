import { describe, it, expect } from "vitest";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";

describe("initial pyramid distribution", () => {
  it("jonokuchi is smallest amateur tier (< 20% of active field)", () => {
    const world = generateInitialWorld("pyramid-test-seed");
    const active = Array.from(world.rikishi.values());
    const total = active.length;
    const jonokuchi = active.filter((r) => r.division === "jonokuchi").length;
    expect(jonokuchi / total).toBeLessThan(0.2);
  });

  it("total active roster is in (300, 650)", () => {
    const world = generateInitialWorld("pyramid-test-seed");
    const total = world.rikishi.size;
    expect(total).toBeGreaterThan(300);
    expect(total).toBeLessThan(650);
  });
});
