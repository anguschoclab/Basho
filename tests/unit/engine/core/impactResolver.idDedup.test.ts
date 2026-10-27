/**
 * impactResolver.idDedup.test.ts
 *
 * The applyEntityUpdates merge path is the single chokepoint for entity
 * patches. ID-list fields (heya.rikishiIds, heya.staffIds,
 * rikishi.tsukebitoIds, rikishi.menteeIds) must be deduplicated when a
 * patch lands so no write path can persist duplicate IDs.
 */
import { describe, it, expect } from "vitest";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import {
  createImpactBuilder,
  updateHeyaImpact,
  updateRikishiImpact,
} from "@/engine/core/ImpactBuilder";
import { makeMockWorld, mockRikishi, makeMockHeya } from "@tests/unit/engine/utils";

function makeFixtureWorld() {
  return makeMockWorld({
    rikishi: new Map([["r1", mockRikishi("r1", { heyaId: "h1" })]]),
    heyas: new Map([["h1", makeMockHeya("h1", { rikishiIds: ["r1"] })]]),
  });
}

describe("resolveImpacts — ID-list deduplication at the update chokepoint", () => {
  it("dedupes rikishiIds in heyaUpdates", () => {
    const next = resolveImpacts(makeFixtureWorld(), [
      updateHeyaImpact("h1", { rikishiIds: ["r1", "r1", "r2", "r2"] }, "test"),
    ]);
    expect(next.heyas.get("h1")?.rikishiIds).toEqual(["r1", "r2"]);
  });

  it("dedupes staffIds in heyaUpdates", () => {
    const next = resolveImpacts(makeFixtureWorld(), [
      updateHeyaImpact("h1", { staffIds: ["s1", "s1", "s2"] }, "test"),
    ]);
    expect(next.heyas.get("h1")?.staffIds).toEqual(["s1", "s2"]);
  });

  it("dedupes tsukebitoIds in rikishiUpdates (deep-merge path)", () => {
    const next = resolveImpacts(makeFixtureWorld(), [
      updateRikishiImpact("r1", { tsukebitoIds: ["j1", "j1", "j2"] }, "test"),
    ]);
    expect(next.rikishi.get("r1")?.tsukebitoIds).toEqual(["j1", "j2"]);
  });

  it("dedupes menteeIds in rikishiUpdates", () => {
    const next = resolveImpacts(makeFixtureWorld(), [
      updateRikishiImpact("r1", { menteeIds: ["m1", "m1"] }, "test"),
    ]);
    expect(next.rikishi.get("r1")?.menteeIds).toEqual(["m1"]);
  });

  it("dedupes rikishiIds carried by an added heya", () => {
    const impact = createImpactBuilder("test")
      .addHeya(makeMockHeya("h2", { rikishiIds: ["r9", "r9", "r8"], oyakataId: "o1" }))
      .build();
    const next = resolveImpacts(makeFixtureWorld(), [impact]);
    expect(next.heyas.get("h2")?.rikishiIds).toEqual(["r9", "r8"]);
  });

  it("leaves clean lists untouched and preserves order", () => {
    const next = resolveImpacts(makeFixtureWorld(), [
      updateHeyaImpact("h1", { rikishiIds: ["r3", "r1", "r2"] }, "test"),
    ]);
    expect(next.heyas.get("h1")?.rikishiIds).toEqual(["r3", "r1", "r2"]);
  });
});
