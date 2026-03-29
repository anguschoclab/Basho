import { describe, it, expect } from "vitest";
import { generateScandalHeadline, createDefaultMediaState } from "../media";
import { WorldState } from "../types/world";
import { Heya } from "../types/heya";

describe("generateScandalHeadline", () => {
  function createMockWorld(heyaId: string = "heya1"): WorldState {
    const world = {
      seed: "test",
      year: 2026,
      week: 1,
      heyas: new Map<string, Heya>([
        [heyaId, { id: heyaId, name: "Test Heya" } as Heya]
      ]),
      rikishi: new Map(),
      currentBashoName: "Hatsu"
    } as unknown as WorldState;
    return world;
  }

  it("should initialize mediaState if it is undefined", () => {
    const world = createMockWorld();
    expect(world.mediaState).toBeUndefined();

    const result = generateScandalHeadline({
      world,
      heyaId: "heya1",
      type: "scandal",
      severity: "minor",
      reason: "Tax evasion",
      description: "Unpaid taxes"
    });

    expect(result).not.toBeNull();
    expect(world.mediaState).toBeDefined();
    // Verify that applyHeadlineEffects actually added something or changed the state
    // But testing that world.mediaState exists is the primary requirement.
  });

  it("should return null if heyaId does not exist in world.heyas", () => {
    const world = createMockWorld();

    const result = generateScandalHeadline({
      world,
      heyaId: "nonexistent_heya",
      type: "scandal",
      severity: "minor",
      reason: "Tax evasion",
      description: "Unpaid taxes"
    });

    expect(result).toBeNull();
  });

  it("should generate a valid minor scandal headline", () => {
    const world = createMockWorld();

    const result = generateScandalHeadline({
      world,
      heyaId: "heya1",
      type: "scandal",
      severity: "minor",
      reason: "Tax evasion",
      description: "Unpaid taxes"
    });

    expect(result).not.toBeNull();
    expect(result?.tier).toBe("local");
    expect(result?.tone).toBe("neutral");
    expect(result?.impact).toBe(30);
    expect(result?.tags).toEqual(["discipline", "scandal", "minor"]);
    expect(result?.title).toMatch(/Minor Infraction at Test Heya|Slap on the Wrist for Test Heya|JSA Reminds Test Heya of Strict Traditions|Test Heya Receives JSA Warning/);
    expect(result?.subtitle).toBe("Unpaid taxes");
    expect(result?.heyaIds).toEqual(["heya1"]);
    expect(result?.beat).toBe("discipline");
  });

  it("should generate a valid critical scandal headline with a fine", () => {
    const world = createMockWorld();

    const result = generateScandalHeadline({
      world,
      heyaId: "heya1",
      type: "scandal",
      severity: "critical",
      reason: "Brawl",
      description: "Bar fight incident",
      fineAmount: 5000000
    });

    expect(result).not.toBeNull();
    expect(result?.tier).toBe("main_event");
    expect(result?.tone).toBe("controversy");
    expect(result?.impact).toBe(80);
    expect(result?.tags).toEqual(["discipline", "scandal", "critical"]);
    expect(result?.subtitle).toContain("A ¥5,000,000 fine has been levied.");
    expect(result?.subtitle).toContain("Bar fight incident");
  });

  it("should generate a valid status_change headline (e.g., forced_merger/welfare_review)", () => {
    const world = createMockWorld();

    const result = generateScandalHeadline({
      world,
      heyaId: "heya1",
      type: "status_change",
      severity: "major",
      reason: "Welfare Review",
      description: "Failed basic inspection"
    });

    expect(result).not.toBeNull();
    expect(result?.tier).toBe("national");
    expect(result?.tone).toBe("concern");
    expect(result?.impact).toBe(55);
    expect(result?.tags).toEqual(["discipline", "status_change", "major"]);
    expect(result?.title).toMatch(/Test Heya Placed on Probation|JSA Puts Test Heya on Notice|Mounting Pressure Forces JSA to Restrict Test Heya/);
    expect(result?.subtitle).toBe("Failed basic inspection");
  });
});
