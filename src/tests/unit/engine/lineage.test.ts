import { describe, it, expect } from "vitest";
import { assignMentor } from "@/engine/lineage";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import { mockRikishi, makeMockWorld, makeMockHeya } from "./utils";

function makeWorldWithRikishi(
  menteeId: string,
  mentorId: string,
  overrides: Partial<WorldState> = {}
): WorldState {
  const mentee = mockRikishi(menteeId, { heyaId: "heya_1" });
  const mentor = mockRikishi(mentorId, { heyaId: "heya_1" });
  const heya = makeMockHeya("heya_1", { rikishiIds: [menteeId, mentorId] });

  const world = makeMockWorld({
    rikishi: new Map([
      [menteeId, mentee],
      [mentorId, mentor],
    ]),
    heyas: new Map([["heya_1", heya]]),
    rivalriesState: {
      pairs: {},
      version: "1.0.0",
    } as any,
    ...overrides,
  });
  return world;
}

describe("assignMentor", () => {
  it("returns ok: false for self-mentoring", () => {
    const world = makeWorldWithRikishi("r1", "r1");
    const result = assignMentor(world, "r1", "r1");
    expect(result.ok).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("returns ok: false for invalid IDs", () => {
    const world = makeWorldWithRikishi("r1", "r2");
    const result = assignMentor(world, "r1", "nonexistent");
    expect(result.ok).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("updates mentee's mentorId", () => {
    const world = makeWorldWithRikishi("r1", "r2");
    const result = assignMentor(world, "r1", "r2");
    expect(result.ok).toBe(true);
    const updates = result.impact?.entities?.rikishiUpdates;
    if (updates instanceof Map) {
      const menteeUpdate = updates.get("r1");
      expect(menteeUpdate?.mentorId).toBe("r2");
    }
  });

  it("updates mentor's menteeIds", () => {
    const world = makeWorldWithRikishi("r1", "r2");
    const result = assignMentor(world, "r1", "r2");
    expect(result.ok).toBe(true);
    const updates = result.impact?.entities?.rikishiUpdates;
    if (updates instanceof Map) {
      const mentorUpdate = updates.get("r2");
      expect(mentorUpdate?.menteeIds).toContain("r1");
    }
  });

  it("creates rivalry pair with correct aId/bId when menteeId < mentorId", () => {
    const world = makeWorldWithRikishi("aaa", "zzz");
    const result = assignMentor(world, "aaa", "zzz");
    expect(result.ok).toBe(true);

    const rivalriesState = result.impact?.worldFields?.rivalriesState as any;
    const pairs = rivalriesState?.pairs ?? {};
    const pairKeys = Object.keys(pairs);
    expect(pairKeys.length).toBeGreaterThan(0);

    const pair = pairs[pairKeys[0]];
    // aId should be the smaller ID, bId should be the larger ID
    expect(pair.aId).toBe("aaa");
    expect(pair.bId).toBe("zzz");
  });

  it("creates rivalry pair with correct aId/bId when menteeId > mentorId", () => {
    const world = makeWorldWithRikishi("zzz", "aaa");
    const result = assignMentor(world, "zzz", "aaa");
    expect(result.ok).toBe(true);

    const rivalriesState = result.impact?.worldFields?.rivalriesState as any;
    const pairs = rivalriesState?.pairs ?? {};
    const pairKeys = Object.keys(pairs);
    expect(pairKeys.length).toBeGreaterThan(0);

    const pair = pairs[pairKeys[0]];
    // aId should be the smaller ID, bId should be the larger ID
    expect(pair.aId).toBe("aaa");
    expect(pair.bId).toBe("zzz");
  });

  it("aId is always the smaller ID and bId is always the larger ID", () => {
    // Test with numeric-like IDs where mentee > mentor
    const world1 = makeWorldWithRikishi("r99", "r01");
    const result1 = assignMentor(world1, "r99", "r01");
    expect(result1.ok).toBe(true);
    const rivalriesState1 = result1.impact?.worldFields?.rivalriesState as any;
    const pairs1 = rivalriesState1?.pairs ?? {};
    const pair1 = pairs1[Object.keys(pairs1)[0]];
    expect(pair1.aId).toBe("r01");
    expect(pair1.bId).toBe("r99");

    // Test with mentee < mentor
    const world2 = makeWorldWithRikishi("r01", "r99");
    const result2 = assignMentor(world2, "r01", "r99");
    expect(result2.ok).toBe(true);
    const rivalriesState2 = result2.impact?.worldFields?.rivalriesState as any;
    const pairs2 = rivalriesState2?.pairs ?? {};
    const pair2 = pairs2[Object.keys(pairs2)[0]];
    expect(pair2.aId).toBe("r01");
    expect(pair2.bId).toBe("r99");
  });

  it("removes previous mentor link when reassigning", () => {
    // First assign r1 -> r2
    const world = makeWorldWithRikishi("r1", "r2");
    const r1 = world.rikishi.get("r1") as Rikishi;
    r1.mentorId = "r2";
    const r2 = world.rikishi.get("r2") as Rikishi;
    r2.menteeIds = ["r1"];

    // Now reassign r1 -> r3
    const r3 = mockRikishi("r3", { heyaId: "heya_1" });
    world.rikishi.set("r3", r3);

    // Add lineage entry for previous mentor link
    world.lineage = [{ mentorId: "r2", menteeId: "r1", sinceYear: 2025, sinceWeek: 1 }];

    const result = assignMentor(world, "r1", "r3");
    expect(result.ok).toBe(true);

    // Previous mentor should have menteeIds updated to remove r1
    const updates = result.impact?.entities?.rikishiUpdates;
    if (updates instanceof Map) {
      const prevMentorUpdate = updates.get("r2");
      expect(prevMentorUpdate?.menteeIds).not.toContain("r1");
    }
  });
});
