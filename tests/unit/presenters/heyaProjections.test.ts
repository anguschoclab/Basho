/**
 * heyaProjections.test.ts
 *
 * Equivalence pins for projectHeyaData / projectHeyaRosterWithAge:
 * roster resolution, age calculation, dangling-id skip, and deduplication.
 */
import { describe, it, expect, vi } from "vitest";
import {
  projectHeyaData,
  projectHeyaRosterWithAge,
} from "@/presenters/projections/heyaProjections";
import { makeMockWorld, mockRikishi, makeMockHeya } from "@tests/unit/engine/utils";
import type { Rikishi } from "@/engine/types/rikishi";
import type { Oyakata } from "@/engine/types/oyakata";

vi.mock("@/presenters/rikishi/index", () => ({
  projectRikishi: vi.fn((r: Rikishi) => ({ id: r.id, shikona: r.shikona })),
}));

function makeFixtureWorld() {
  const r1 = mockRikishi("r1", { heyaId: "h1", birthYear: 1995 });
  const r2 = mockRikishi("r2", { heyaId: "h1", birthYear: 2000 });
  return makeMockWorld({
    rikishi: new Map([
      ["r1", r1],
      ["r2", r2],
    ]),
    heyas: new Map([["h1", makeMockHeya("h1", { rikishiIds: ["r1", "r2"], oyakataId: "o1" })]]),
    oyakata: new Map([["o1", { id: "o1", quirks: ["strict"], traits: { patience: 3 } } as unknown as Oyakata]]),
    year: 2025,
  });
}

describe("projectHeyaRosterWithAge", () => {
  it("projects the roster with ages from world.year - birthYear", () => {
    const result = projectHeyaRosterWithAge(makeFixtureWorld(), "h1");
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ rikishi: { id: "r1", shikona: "Wrestler-r1" }, age: 30 });
    expect(result[1]).toEqual({ rikishi: { id: "r2", shikona: "Wrestler-r2" }, age: 25 });
  });

  it("skips roster ids that do not resolve", () => {
    const world = makeFixtureWorld();
    world.heyas.get("h1")!.rikishiIds = ["r1", "ghost"];
    const result = projectHeyaRosterWithAge(world, "h1");
    expect(result.map((e) => e.rikishi.id)).toEqual(["r1"]);
  });

  it("does not produce duplicate entries for duplicate rikishiIds", () => {
    const world = makeFixtureWorld();
    world.heyas.get("h1")!.rikishiIds = ["r1", "r1", "r2"];
    const result = projectHeyaRosterWithAge(world, "h1");
    expect(result.map((e) => e.rikishi.id)).toEqual(["r1", "r2"]);
  });

  it("returns [] for a missing heya", () => {
    expect(projectHeyaRosterWithAge(makeFixtureWorld(), "nope")).toEqual([]);
  });
});

describe("projectHeyaData", () => {
  it("returns heya, oyakata, quirks, and traits", () => {
    const data = projectHeyaData(makeFixtureWorld(), "h1");
    expect(data?.heya.id).toBe("h1");
    expect(data?.oyakata?.id).toBe("o1");
    expect(data?.oyakataQuirks).toEqual(["strict"]);
    expect(data?.oyakataTraits).toEqual({ patience: 3 });
  });

  it("returns null for a missing heya", () => {
    expect(projectHeyaData(makeFixtureWorld(), "nope")).toBeNull();
  });
});
