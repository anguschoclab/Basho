import { describe, it, expect } from "vitest";
import { validateConstruction } from "@/engine/systems/economy/infrastructureValidation";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { CONSTRUCTION_COST_LEVEL_MULTIPLIER } from "@/constants/engine/economyExtended";

describe("infrastructureValidation", () => {
  it("returns ok=true when heya exists, funds sufficient, no conflicts", () => {
    const world = MockFactory.createWorld({ year: 2025 });
    const heya = MockFactory.createHeya("heya-1", { funds: 100_000_000 });
    world.heyas.set(heya.id, heya);

    const result = validateConstruction(world, heya.id, "weights_room");
    expect(result.ok).toBe(true);
    expect(result.cost).toBe(15_000_000);
    expect(result.nextLevel).toBe(1);
  });

  it("returns ok=false when heya not found", () => {
    const world = MockFactory.createWorld({ year: 2025 });
    const result = validateConstruction(world, "nonexistent", "weights_room");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("heya_not_found");
  });

  it("returns ok=false when facility not found", () => {
    const world = MockFactory.createWorld({ year: 2025 });
    const heya = MockFactory.createHeya("heya-1", { funds: 100_000_000 });
    world.heyas.set(heya.id, heya);
    const result = validateConstruction(world, heya.id, "nonexistent" as never);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("facility_not_found");
  });

  it("returns ok=false when already under construction", () => {
    const world = MockFactory.createWorld({ year: 2025 });
    const heya = MockFactory.createHeya("heya-1", {
      funds: 100_000_000,
      infrastructure: {
        weights_room: { level: 1, status: "under_construction" },
      },
    });
    world.heyas.set(heya.id, heya);
    const result = validateConstruction(world, heya.id, "weights_room");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("already_under_construction");
  });

  it("returns ok=false when insufficient funds", () => {
    const world = MockFactory.createWorld({ year: 2025 });
    const heya = MockFactory.createHeya("heya-1", { funds: 1_000_000 });
    world.heyas.set(heya.id, heya);
    const result = validateConstruction(world, heya.id, "weights_room");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("insufficient_funds");
  });

  it("scales cost with current level", () => {
    const world = MockFactory.createWorld({ year: 2025 });
    const heya = MockFactory.createHeya("heya-1", {
      funds: 100_000_000,
      infrastructure: {
        weights_room: { level: 1, status: "active" },
      },
    });
    world.heyas.set(heya.id, heya);
    const result = validateConstruction(world, heya.id, "weights_room");
    const expectedCost = 15_000_000 * (1 + 1 * CONSTRUCTION_COST_LEVEL_MULTIPLIER);
    expect(result.ok).toBe(true);
    expect(result.cost).toBe(expectedCost);
    expect(result.nextLevel).toBe(2);
  });

  it("returns ok=false when regional presence insufficient", () => {
    const world = MockFactory.createWorld({ year: 2025 });
    const heya = MockFactory.createHeya("heya-1", {
      funds: 100_000_000,
      regionalPresence: { Mongolia: 10 },
    });
    world.heyas.set(heya.id, heya);
    const result = validateConstruction(world, heya.id, "academy_mongolia");
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Insufficient presence");
  });

  it("returns ok=true when regional presence meets requirement", () => {
    const world = MockFactory.createWorld({ year: 2025 });
    const heya = MockFactory.createHeya("heya-1", {
      funds: 100_000_000,
      regionalPresence: { Mongolia: 85 },
    });
    world.heyas.set(heya.id, heya);
    const result = validateConstruction(world, heya.id, "academy_mongolia");
    expect(result.ok).toBe(true);
  });
});
