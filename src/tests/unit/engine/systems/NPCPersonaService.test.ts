/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from "vitest";
import { ensurePersonaForOyakata, getManagerPersona } from "@/engine/systems/NPCPersonaService";
import { makeMockWorld, makeMockHeya } from "../utils";
import type { Oyakata } from "@/engine/types/oyakata";
import type { Rikishi } from "@/engine/types/rikishi";

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

describe("getManagerPersona — styleBias is a valid StyleBias value", () => {
  it("returns a styleBias that is one of oshi/yotsu/neutral", () => {
    const heya = makeMockHeya("h1", { oyakataId: "o1", rikishiIds: ["r1", "r2"] });
    const oyakata: Oyakata = {
      id: "o1",
      heyaId: "h1",
      archetype: "mentor",
      traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
      birthYear: 1960,
    } as unknown as Oyakata;

    const r1 = { id: "r1", heyaId: "h1", style: "oshi" } as unknown as Rikishi;
    const r2 = { id: "r2", heyaId: "h1", style: "oshi" } as unknown as Rikishi;

    const world = makeMockWorld({
      heyas: new Map([["h1", heya]]),
      oyakata: new Map([["o1", oyakata]]),
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
      ]),
    });

    const persona = getManagerPersona(world, "h1");
    expect(["oshi", "yotsu", "neutral"]).toContain(persona.styleBias);
  });
});
