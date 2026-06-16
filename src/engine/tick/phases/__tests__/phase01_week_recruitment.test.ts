import { describe, it, expect } from "vitest";
import { phase01_week_recruitment } from "../phase01_week_recruitment";
import { makeMockWorld, makeMockHeya } from "../../../../tests/unit/engine/utils";
import { resolveImpacts } from "../../../core/ImpactResolver";

describe("phase01_week_recruitment flag consumption", () => {
  it("consumes recruitmentIntent scout_youth", () => {
    const heya = makeMockHeya("h1", []);
    const world = makeMockWorld({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      transientContext: { recruitmentIntent: "scout_youth" } as never,
    });

    const impact = phase01_week_recruitment(world);
    const updatedWorld = resolveImpacts(world, [impact]);

    // Flag should be consumed
    const tc = updatedWorld.transientContext as Record<string, unknown> | undefined;
    expect(tc?.recruitmentIntent).toBeUndefined();
  });

  it("consumes recruitmentIntent recruit_veteran", () => {
    const heya = makeMockHeya("h1", []);
    const world = makeMockWorld({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      transientContext: { recruitmentIntent: "recruit_veteran" } as never,
    });

    const impact = phase01_week_recruitment(world);
    const updatedWorld = resolveImpacts(world, [impact]);

    // Flag should be consumed
    const tc = updatedWorld.transientContext as Record<string, unknown> | undefined;
    expect(tc?.recruitmentIntent).toBeUndefined();
  });
});
