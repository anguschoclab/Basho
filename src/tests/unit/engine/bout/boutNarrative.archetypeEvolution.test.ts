import { describe, it, expect } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import type { PbpLine, PbpTag } from "@/engine/bout/boutNarrative";
import { mockRikishi } from "../utils";
import type { BoutResult } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";

function makeBoutResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "test-bout-1",
    day: 7,
    eastId: "r1",
    westId: "r2",
    winner: "east",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    duration: 8,
    log: [],
    upset: false,
    kenshoEnvelopes: 0,
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
    ...overrides,
  } as BoutResult;
}

function getLines(result: BoutResult): PbpLine[] {
  return result.pbpLines ?? [];
}

function hasTag(l: PbpLine, tag: PbpTag): boolean {
  return (l.tags ?? []).includes(tag);
}

describe("archetype evolution narrative (2.3)", () => {
  it("evolution line when archetypeHistory has entries and archetype changed", () => {
    const east = mockRikishi("r1", {
      rank: "maegashira",
      division: "makuuchi",
      archetypeHistory: [{ archetype: "oshi", year: 2020 }],
      combatProfile: {
        archetype: "yotsu",
        familyPreferences: { push: 0.3, grapple: 0.6, evade: 0.1 },
      } as never,
    });
    const west = mockRikishi("r2", { rank: "maegashira", division: "makuuchi" });
    const world = {
      rikishi: new Map([
        ["r1", east],
        ["r2", west],
      ]),
      year: 2025,
    } as unknown as WorldState;
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, undefined, 7, "evo-seed", world);
    const lines = getLines(result);
    const evoLines = lines.filter(
      (l) => l.phase === "pre_bout" && hasTag(l, "archetype_evolution")
    );

    expect(evoLines.length).toBeGreaterThanOrEqual(1);
  });

  it("no evolution line when archetypeHistory empty or undefined", () => {
    const east = mockRikishi("r1", { rank: "maegashira", division: "makuuchi" });
    const west = mockRikishi("r2", { rank: "maegashira", division: "makuuchi" });
    const world = {
      rikishi: new Map([
        ["r1", east],
        ["r2", west],
      ]),
      year: 2025,
    } as unknown as WorldState;
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, undefined, 7, "no-evo-seed", world);
    const lines = getLines(result);
    const evoLines = lines.filter((l) => hasTag(l, "archetype_evolution"));

    expect(evoLines.length).toBe(0);
  });

  it("no evolution line when archetype unchanged", () => {
    const east = mockRikishi("r1", {
      rank: "maegashira",
      division: "makuuchi",
      archetypeHistory: [{ archetype: "oshi", year: 2020 }],
      combatProfile: {
        archetype: "oshi",
        familyPreferences: { push: 0.6, grapple: 0.3, evade: 0.1 },
      } as never,
    });
    const west = mockRikishi("r2", { rank: "maegashira", division: "makuuchi" });
    const world = {
      rikishi: new Map([
        ["r1", east],
        ["r2", west],
      ]),
      year: 2025,
    } as unknown as WorldState;
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, undefined, 7, "unchanged-arch-seed", world);
    const lines = getLines(result);
    const evoLines = lines.filter((l) => hasTag(l, "archetype_evolution"));

    expect(evoLines.length).toBe(0);
  });

  it("template interpolates old and new style names", () => {
    const east = mockRikishi("r1", {
      rank: "maegashira",
      division: "makuuchi",
      shikona: "EvoRiki",
      archetypeHistory: [{ archetype: "oshi", year: 2020 }],
      combatProfile: {
        archetype: "yotsu",
        familyPreferences: { push: 0.3, grapple: 0.6, evade: 0.1 },
      } as never,
    });
    const west = mockRikishi("r2", { rank: "maegashira", division: "makuuchi" });
    const world = {
      rikishi: new Map([
        ["r1", east],
        ["r2", west],
      ]),
      year: 2025,
    } as unknown as WorldState;
    const result = makeBoutResult();

    generateBoutNarrative(result, east, west, undefined, 7, "interp-evo-seed", world);
    const lines = getLines(result);
    const evoLines = lines.filter(
      (l) => l.phase === "pre_bout" && hasTag(l, "archetype_evolution")
    );

    expect(evoLines.length).toBeGreaterThan(0);
    expect(evoLines[0].text).toContain("EvoRiki");
  });
});
