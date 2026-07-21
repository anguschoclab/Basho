/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from "vitest";
import { ensurePersonaForOyakata } from "@/engine/systems/NPCPersonaService";
import { makeMockWorld } from "../utils";
import type { Oyakata } from "@/engine/types/oyakata";

function makeOyakataWithoutPersona(): Oyakata {
  return {
    id: "o1",
    heyaId: "h1",
    archetype: "mentor",
    traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
    birthYear: 1960,
    // quirks and managerFlags intentionally undefined
  } as unknown as Oyakata;
}

describe("Bug R: ensurePersonaForOyakata does not mutate input oyakata", () => {
  it("returns persona data without mutating the original oyakata", () => {
    const world = makeMockWorld();
    const oyakata = makeOyakataWithoutPersona();
    const originalQuirks = oyakata.quirks;
    const originalFlags = oyakata.managerFlags;

    const result = ensurePersonaForOyakata(world, oyakata);

    // Original oyakata should NOT be mutated
    expect(oyakata.quirks).toBe(originalQuirks);
    expect(oyakata.managerFlags).toBe(originalFlags);

    // Result should have quirks and managerFlags
    expect(result.quirks).toBeDefined();
    expect(Array.isArray(result.quirks)).toBe(true);
    expect(result.quirks.length).toBeGreaterThan(0);
    expect(result.managerFlags).toBeDefined();
    expect(typeof result.managerFlags.welfareHawk).toBe("boolean");
    expect(typeof result.managerFlags.disciplineHawk).toBe("boolean");
    expect(typeof result.managerFlags.publicityHawk).toBe("boolean");
    expect(typeof result.managerFlags.nepotist).toBe("boolean");
  });

  it("returns existing quirks without regenerating when already set", () => {
    const world = makeMockWorld();
    const oyakata = makeOyakataWithoutPersona();
    const existingQuirks = ["Old-School Stickler", "Gambler's Instinct"];
    const existingFlags = {
      welfareHawk: true,
      disciplineHawk: false,
      publicityHawk: false,
      nepotist: false,
    };
    oyakata.quirks = existingQuirks;
    oyakata.managerFlags = existingFlags;

    const result = ensurePersonaForOyakata(world, oyakata);

    expect(result.quirks).toBe(existingQuirks);
    expect(result.managerFlags).toBe(existingFlags);
  });
});
