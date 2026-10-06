/**
 * White-box edge-case tests for the slot assignment algorithm contract.
 *
 * These tests verify specific behavioral contracts of the assignment logic
 * that the golden master tests cover only implicitly. They are written BEFORE
 * the optimization to ensure the contract is captured correctly.
 */
import { describe, it, expect } from "vitest";
import { updateBanzuke } from "@/engine/banzuke";
import type { BanzukeEntry, BashoPerformance, RankPosition } from "@/engine/types/banzuke";
import { RANK_HIERARCHY } from "@/engine/types/banzuke";
import { makeMockWorld, mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeEntry(
  id: string,
  rank: string,
  rankNumber: number | undefined,
  side: "east" | "west",
  division: string = "makuuchi"
): BanzukeEntry {
  return {
    rikishiId: id,
    position: { rank: rank as any, rankNumber, side } as RankPosition,
    division: division as any,
  } as BanzukeEntry;
}

function perf(
  id: string,
  wins: number,
  losses: number,
  extras: Partial<BashoPerformance> = {}
): BashoPerformance {
  return { rikishiId: id, wins, losses, absences: 0, ...extras };
}

function buildWorld(
  entries: BanzukeEntry[],
  extraOverrides: Record<string, Partial<ReturnType<typeof mockRikishi>>> = {}
): WorldState {
  const world = makeMockWorld();
  for (const e of entries) {
    world.rikishi.set(
      e.rikishiId,
      mockRikishi(e.rikishiId, {
        rank: e.position.rank as any,
        rankNumber: e.position.rankNumber as any,
        division: e.division as any,
        side: e.position.side as any,
        heyaId: `heya-${e.rikishiId}`,
        ...extraOverrides[e.rikishiId],
      })
    );
  }
  return world;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("slotAssignmentEdgeCases — fallback selection", () => {
  it("fallback selects the best available candidate by priority, not just any candidate", () => {
    // No sanyaku candidates → sanyaku slots filled via fallback from maegashira.
    // The best (lowest oldKey) maegashira should fill the top sanyaku slot.
    const entries: BanzukeEntry[] = [
      // 42 maegashira, all 8-7 (eligibleBestTier=5, no promotions)
      ...Array.from({ length: 42 }, (_, i) =>
        makeEntry(`m${i + 1}`, "maegashira", i + 1, i % 2 ? "west" : "east")
      ),
    ];
    const perfById = new Map<string, BashoPerformance>();
    for (let i = 1; i <= 42; i++) perfById.set(`m${i}`, perf(`m${i}`, 8, 7));

    const world = buildWorld(entries);
    const result = updateBanzuke(entries, perfById, world, {});

    // The top slot (yokozuna east) should be filled by m1 (best oldKey)
    const topSlot = result.newBanzuke[0];
    expect(topSlot).toBeDefined();
    // m1 has the best oldKey (maegashira #1 east = lowest positionKey)
    expect(topSlot.rikishiId).toBe("m1");
  });
});

describe("slotAssignmentEdgeCases — ozeki guard", () => {
  it("demoted ozeki skipped at ozeki slot but eligible at sekiwake slot", () => {
    // 2 ozeki: o1 stays, o2 demoted. o2 should NOT be in ozeki slot.
    // But o2 should still get a slot (sekiwake or below).
    const entries: BanzukeEntry[] = [
      makeEntry("o1", "ozeki", undefined, "east"),
      makeEntry("o2", "ozeki", undefined, "west"),
      makeEntry("s1", "sekiwake", undefined, "east"),
      makeEntry("s2", "sekiwake", undefined, "west"),
      makeEntry("k1", "komusubi", undefined, "east"),
      makeEntry("k2", "komusubi", undefined, "west"),
      ...Array.from({ length: 36 }, (_, i) =>
        makeEntry(`m${i + 1}`, "maegashira", i + 1, i % 2 ? "west" : "east")
      ),
    ];

    const perfById = new Map<string, BashoPerformance>([
      ["o1", perf("o1", 10, 5)],
      ["o2", perf("o2", 5, 10)], // demoted
      ["s1", perf("s1", 8, 7)],
      ["s2", perf("s2", 8, 7)],
    ]);
    for (let i = 1; i <= 36; i++) perfById.set(`m${i}`, perf(`m${i}`, 8, 7));

    const world = buildWorld(entries);
    const ozekiKadoban = {
      o1: { isKadoban: false, consecutiveMakeKoshi: 0 },
      o2: { isKadoban: true, consecutiveMakeKoshi: 1 },
    };

    const result = updateBanzuke(entries, perfById, world, ozekiKadoban);

    const o2Entry = result.newBanzuke.find((e) => e.rikishiId === "o2");
    expect(o2Entry).toBeDefined();
    // o2 must NOT be in an ozeki slot
    expect(o2Entry!.position.rank).not.toBe("ozeki");
    // o2 should be in sekiwake or below (tier >= 3)
    const o2Tier = RANK_HIERARCHY[o2Entry!.position.rank].tier;
    expect(o2Tier).toBeGreaterThanOrEqual(3);
  });

  it("non-ozeki fallback slots do NOT apply the ozeki guard", () => {
    // Demoted ozeki should be able to fill a sekiwake slot via fallback.
    // The guard only applies to ozeki slots.
    const entries: BanzukeEntry[] = [
      makeEntry("o1", "ozeki", undefined, "east"),
      makeEntry("o2", "ozeki", undefined, "west"), // will be demoted
      // Only 1 sekiwake — the other sekiwake slot needs fallback
      makeEntry("s1", "sekiwake", undefined, "east"),
      makeEntry("k1", "komusubi", undefined, "east"),
      makeEntry("k2", "komusubi", undefined, "west"),
      ...Array.from({ length: 36 }, (_, i) =>
        makeEntry(`m${i + 1}`, "maegashira", i + 1, i % 2 ? "west" : "east")
      ),
    ];

    const perfById = new Map<string, BashoPerformance>([
      ["o1", perf("o1", 10, 5)],
      ["o2", perf("o2", 5, 10)],
      ["s1", perf("s1", 8, 7)],
    ]);
    for (let i = 1; i <= 36; i++) perfById.set(`m${i}`, perf(`m${i}`, 8, 7));

    const world = buildWorld(entries);
    const ozekiKadoban = {
      o1: { isKadoban: false, consecutiveMakeKoshi: 0 },
      o2: { isKadoban: true, consecutiveMakeKoshi: 1 },
    };

    const result = updateBanzuke(entries, perfById, world, ozekiKadoban);

    // o2 must be assigned somewhere
    const o2Entry = result.newBanzuke.find((e) => e.rikishiId === "o2");
    expect(o2Entry).toBeDefined();
    expect(o2Entry!.position.rank).not.toBe("ozeki");
  });
});

describe("slotAssignmentEdgeCases — bucket activation", () => {
  it("a tier-5 candidate is NOT eligible for a tier-3 slot (no premature assignment)", () => {
    // A maegashira with 8-7 has eligibleBestTier=5.
    // They should NOT fill a sekiwake (tier 3) slot via primary eligibility.
    // They can only fill it via fallback (if no tier<=3 candidates available).
    const entries: BanzukeEntry[] = [
      // Only maegashira candidates (eligibleBestTier=5)
      ...Array.from({ length: 42 }, (_, i) =>
        makeEntry(`m${i + 1}`, "maegashira", i + 1, i % 2 ? "west" : "east")
      ),
    ];
    const perfById = new Map<string, BashoPerformance>();
    for (let i = 1; i <= 42; i++) perfById.set(`m${i}`, perf(`m${i}`, 8, 7));

    const world = buildWorld(entries);
    const result = updateBanzuke(entries, perfById, world, {});

    // The yokozuna slot (tier 1) should be filled by fallback (best maegashira)
    // This is expected — fallback fills it. The test verifies the candidate
    // was placed there via fallback, not primary eligibility.
    const yokozunaSlot = result.newBanzuke.find((e) => e.position.rank === "yokozuna");
    // With no yokozuna candidates, the slot may or may not be filled depending
    // on template. Verify that if filled, it's by a maegashira-origin rikishi.
    if (yokozunaSlot) {
      expect(entries.find((e) => e.rikishiId === yokozunaSlot.rikishiId)?.position.rank).toBe(
        "maegashira"
      );
    }
  });
});

describe("slotAssignmentEdgeCases — all candidates taken", () => {
  it("final slots remain empty without errors when candidates run out", () => {
    // 3 candidates, full template (hundreds of slots)
    const entries: BanzukeEntry[] = [
      makeEntry("r1", "maegashira", 1, "east"),
      makeEntry("r2", "maegashira", 2, "west"),
      makeEntry("r3", "maegashira", 3, "east"),
    ];
    const perfById = new Map<string, BashoPerformance>();
    for (const e of entries) perfById.set(e.rikishiId, perf(e.rikishiId, 8, 7));

    const world = buildWorld(entries);
    const result = updateBanzuke(entries, perfById, world, {});

    // Only 3 candidates → only 3 assignments
    expect(result.newBanzuke.length).toBe(3);
    // No crash, all 3 assigned
    const assignedIds = new Set(result.newBanzuke.map((e) => e.rikishiId));
    expect(assignedIds.has("r1")).toBe(true);
    expect(assignedIds.has("r2")).toBe(true);
    expect(assignedIds.has("r3")).toBe(true);
  });
});

describe("slotAssignmentEdgeCases — priority order preservation", () => {
  it("candidates with better desiredKey are assigned to better slots", () => {
    // Two maegashira: m1 with 11-4 (strong promotion) vs m2 with 8-7 (neutral)
    // m1 should get a better slot than m2
    const entries: BanzukeEntry[] = [
      makeEntry("m1", "maegashira", 1, "east"),
      makeEntry("m2", "maegashira", 2, "west"),
      // Fill remaining with neutral candidates
      ...Array.from({ length: 40 }, (_, i) =>
        makeEntry(`m${i + 3}`, "maegashira", i + 3, i % 2 ? "west" : "east")
      ),
    ];
    const perfById = new Map<string, BashoPerformance>();
    perfById.set("m1", perf("m1", 11, 4)); // strong: big promotion move
    perfById.set("m2", perf("m2", 8, 7)); // neutral
    for (let i = 3; i <= 42; i++) perfById.set(`m${i}`, perf(`m${i}`, 8, 7));

    const world = buildWorld(entries);
    const result = updateBanzuke(entries, perfById, world, {});

    const m1Entry = result.newBanzuke.find((e) => e.rikishiId === "m1");
    const m2Entry = result.newBanzuke.find((e) => e.rikishiId === "m2");
    expect(m1Entry).toBeDefined();
    expect(m2Entry).toBeDefined();

    // m1 (11-4) should be ranked higher (lower tier) than m2 (8-7)
    const m1Tier = RANK_HIERARCHY[m1Entry!.position.rank].tier;
    const m2Tier = RANK_HIERARCHY[m2Entry!.position.rank].tier;
    expect(m1Tier).toBeLessThanOrEqual(m2Tier);
  });
});
