/**
 * Golden master characterization tests for updateBanzuke slot assignment.
 *
 * These tests capture the EXACT current output of updateBanzuke across diverse
 * scenarios. They are written BEFORE any optimization refactoring and verified
 * to PASS against the current (unmodified) code. After the optimization, the
 * snapshots must match byte-for-byte — any drift means the optimization has a
 * behavioral bug.
 *
 * Test-first methodology: these snapshots are the source of truth.
 */
import { describe, it, expect } from "vitest";
import { updateBanzuke } from "@/engine/banzuke";
import type {
  BanzukeEntry,
  BashoPerformance,
  RankPosition,
  Division,
  Rank,
} from "@/engine/types/banzuke";
import { toRankPosition, RANK_HIERARCHY } from "@/engine/types/banzuke";
import { makeMockWorld, mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeEntry(
  id: string,
  rank: Rank,
  rankNumber: number | undefined,
  side: "east" | "west",
  division: Division = "makuuchi"
): BanzukeEntry {
  return {
    rikishiId: id,
    position: { rank, rankNumber, side } as RankPosition,
    division,
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

/** Snapshot the assignment as a sorted array of "rikishiId -> division:rankString". */
function snapshotAssignment(result: ReturnType<typeof updateBanzuke>): string[] {
  return result.newBanzuke
    .map((e) => {
      const info = RANK_HIERARCHY[e.position.rank];
      const side = e.position.side === "east" ? "E" : "W";
      const num = e.position.rankNumber !== undefined ? String(e.position.rankNumber) : "";
      return `${e.rikishiId} -> ${e.division}:${info.nameJa}${num}${side}`;
    })
    .sort();
}

function buildWorld(
  entries: BanzukeEntry[],
  extraRikishi: { id: string; overrides?: Partial<ReturnType<typeof mockRikishi>> }[] = []
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
      })
    );
  }
  for (const r of extraRikishi) {
    world.rikishi.set(r.id, mockRikishi(r.id, r.overrides));
  }
  return world;
}

// ── Scenario 1: Diverse 100-rikishi field ──────────────────────────────────

describe("slotAssignmentCharacterization — diverse field", () => {
  it("scenario 1: 100 rikishi across all ranks with varied performances", () => {
    const entries: BanzukeEntry[] = [];
    const perfById = new Map<string, BashoPerformance>();

    // Sanyaku with varied results
    entries.push(makeEntry("y1", "yokozuna", undefined, "east"));
    perfById.set("y1", perf("y1", 13, 2));

    entries.push(makeEntry("o1", "ozeki", undefined, "east"));
    perfById.set("o1", perf("o1", 10, 5));

    entries.push(makeEntry("o2", "ozeki", undefined, "west"));
    perfById.set("o2", perf("o2", 8, 7));

    entries.push(makeEntry("s1", "sekiwake", undefined, "east"));
    perfById.set("s1", perf("s1", 11, 4)); // eligibleBestTier=2 (sekiwake 11+ wins → ozeki)

    entries.push(makeEntry("s2", "sekiwake", undefined, "west"));
    perfById.set("s2", perf("s2", 8, 7));

    entries.push(makeEntry("k1", "komusubi", undefined, "east"));
    perfById.set("k1", perf("k1", 10, 5)); // eligibleBestTier=3 (komusubi 10+ wins → sekiwake)

    entries.push(makeEntry("k2", "komusubi", undefined, "west"));
    perfById.set("k2", perf("k2", 7, 8));

    // Maegashira with varied results
    for (let i = 1; i <= 20; i++) {
      const id = `m${i}`;
      const side = i % 2 === 0 ? "west" : "east";
      entries.push(makeEntry(id, "maegashira", i, side as "east" | "west"));
      // Mix of performances
      const wins = [11, 8, 5, 7, 10, 9, 6, 4, 12, 8, 7, 5, 9, 11, 6, 8, 10, 3, 7, 8][i - 1];
      const losses = 15 - wins;
      const extras: Partial<BashoPerformance> = {};
      if (i === 1 && wins === 11) extras.yusho = true; // m1 yusho → eligibleBestTier=3
      if (i === 3 && wins <= 4) extras.yusho = false;
      perfById.set(id, perf(id, wins, losses, extras));
    }

    // Juryo
    for (let i = 1; i <= 14; i++) {
      const id = `j${i}`;
      const side = i % 2 === 0 ? "west" : "east";
      entries.push(makeEntry(id, "juryo", i, side as "east" | "west", "juryo"));
      perfById.set(id, perf(id, 8, 7));
    }

    // Makushita
    for (let i = 1; i <= 20; i++) {
      const id = `ms${i}`;
      const side = i % 2 === 0 ? "west" : "east";
      entries.push(makeEntry(id, "makushita", i, side as "east" | "west", "makushita"));
      perfById.set(id, perf(id, 5, 2));
    }

    // Sandanme
    for (let i = 1; i <= 15; i++) {
      const id = `sd${i}`;
      const side = i % 2 === 0 ? "west" : "east";
      entries.push(makeEntry(id, "sandanme", i, side as "east" | "west", "sandanme"));
      perfById.set(id, perf(id, 4, 3));
    }

    // Jonidan
    for (let i = 1; i <= 15; i++) {
      const id = `jd${i}`;
      const side = i % 2 === 0 ? "west" : "east";
      entries.push(makeEntry(id, "jonidan", i, side as "east" | "west", "jonidan"));
      perfById.set(id, perf(id, 4, 3));
    }

    // Jonokuchi with special promotions
    for (let i = 1; i <= 10; i++) {
      const id = `jk${i}`;
      const side = i % 2 === 0 ? "west" : "east";
      entries.push(makeEntry(id, "jonokuchi", i, side as "east" | "west", "jonokuchi"));
      if (i === 1) {
        perfById.set(id, perf(id, 7, 0, { yusho: true })); // jonokuchi yusho → tier 8
      } else if (i === 2) {
        perfById.set(id, perf(id, 4, 3)); // kachi-koshi → tier 9
      } else {
        perfById.set(id, perf(id, 2, 5));
      }
    }

    const world = buildWorld(entries);
    const result = updateBanzuke(entries, perfById, world, {});

    const snapshot = snapshotAssignment(result);
    // Verify every input rikishi got assigned
    expect(result.newBanzuke.length).toBe(entries.length);
    expect(new Set(result.newBanzuke.map((e) => e.rikishiId)).size).toBe(entries.length);

    // Golden master: exact snapshot
    expect(snapshot).toMatchInlineSnapshot(`
      [
        "j1 -> juryo:十両1E",
        "j10 -> juryo:十両5W",
        "j11 -> juryo:十両6E",
        "j12 -> juryo:十両6W",
        "j13 -> juryo:十両7E",
        "j14 -> juryo:十両7W",
        "j2 -> juryo:十両1W",
        "j3 -> juryo:十両2E",
        "j4 -> juryo:十両2W",
        "j5 -> juryo:十両3E",
        "j6 -> juryo:十両3W",
        "j7 -> juryo:十両4E",
        "j8 -> juryo:十両4W",
        "j9 -> juryo:十両5E",
        "jd1 -> makushita:幕下4W",
        "jd10 -> makushita:幕下9E",
        "jd11 -> makushita:幕下9W",
        "jd12 -> makushita:幕下10E",
        "jd13 -> makushita:幕下10W",
        "jd14 -> makushita:幕下11E",
        "jd15 -> makushita:幕下11W",
        "jd2 -> makushita:幕下5E",
        "jd3 -> makushita:幕下5W",
        "jd4 -> makushita:幕下6E",
        "jd5 -> makushita:幕下6W",
        "jd6 -> makushita:幕下7E",
        "jd7 -> makushita:幕下7W",
        "jd8 -> makushita:幕下8E",
        "jd9 -> makushita:幕下8W",
        "jk1 -> makuuchi:小結E",
        "jk10 -> makushita:幕下16E",
        "jk2 -> makushita:幕下12E",
        "jk3 -> makushita:幕下12W",
        "jk4 -> makushita:幕下13E",
        "jk5 -> makushita:幕下13W",
        "jk6 -> makushita:幕下14E",
        "jk7 -> makushita:幕下14W",
        "jk8 -> makushita:幕下15E",
        "jk9 -> makushita:幕下15W",
        "k1 -> makuuchi:関脇W",
        "k2 -> makuuchi:小結E",
        "m1 -> makuuchi:関脇E",
        "m10 -> makuuchi:前頭4E",
        "m11 -> makuuchi:前頭6E",
        "m12 -> makuuchi:前頭8W",
        "m13 -> makuuchi:前頭3E",
        "m14 -> makuuchi:前頭1E",
        "m15 -> makuuchi:前頭7W",
        "m16 -> makuuchi:前頭4W",
        "m17 -> makuuchi:前頭2E",
        "m18 -> makuuchi:前頭9W",
        "m19 -> makuuchi:前頭6W",
        "m2 -> makuuchi:前頭3W",
        "m20 -> makuuchi:前頭5E",
        "m3 -> makuuchi:前頭8E",
        "m4 -> makuuchi:前頭5W",
        "m5 -> makuuchi:前頭1W",
        "m6 -> makuuchi:前頭2W",
        "m7 -> makuuchi:前頭7E",
        "m8 -> makuuchi:前頭9E",
        "m9 -> makuuchi:小結W",
        "ms1 -> makuuchi:前頭10E",
        "ms10 -> makuuchi:前頭14W",
        "ms11 -> makuuchi:前頭15E",
        "ms12 -> makuuchi:前頭15W",
        "ms13 -> makuuchi:前頭16E",
        "ms14 -> makuuchi:前頭16W",
        "ms15 -> juryo:十両8E",
        "ms16 -> juryo:十両8W",
        "ms17 -> juryo:十両9E",
        "ms18 -> juryo:十両9W",
        "ms19 -> juryo:十両10E",
        "ms2 -> makuuchi:前頭10W",
        "ms20 -> juryo:十両10W",
        "ms3 -> makuuchi:前頭11E",
        "ms4 -> makuuchi:前頭11W",
        "ms5 -> makuuchi:前頭12E",
        "ms6 -> makuuchi:前頭12W",
        "ms7 -> makuuchi:前頭13E",
        "ms8 -> makuuchi:前頭13W",
        "ms9 -> makuuchi:前頭14E",
        "o1 -> makuuchi:大関E",
        "o2 -> makuuchi:大関E",
        "s1 -> makuuchi:大関W",
        "s2 -> makuuchi:関脇E",
        "sd1 -> juryo:十両11E",
        "sd10 -> makushita:幕下1W",
        "sd11 -> makushita:幕下2E",
        "sd12 -> makushita:幕下2W",
        "sd13 -> makushita:幕下3E",
        "sd14 -> makushita:幕下3W",
        "sd15 -> makushita:幕下4E",
        "sd2 -> juryo:十両11W",
        "sd3 -> juryo:十両12E",
        "sd4 -> juryo:十両12W",
        "sd5 -> juryo:十両13E",
        "sd6 -> juryo:十両13W",
        "sd7 -> juryo:十両14E",
        "sd8 -> juryo:十両14W",
        "sd9 -> makushita:幕下1E",
        "y1 -> makuuchi:横綱E",
      ]
    `);
  });
});

// ── Scenario 2: Fallback (more sanyaku slots than eligible candidates) ─────

describe("slotAssignmentCharacterization — fallback", () => {
  it("scenario 2: empty sanyaku ranks force fallback assignment from maegashira", () => {
    // No yokozuna/ozeki/sekiwake/komusubi — all sanyaku slots filled via fallback
    const entries: BanzukeEntry[] = [];
    const perfById = new Map<string, BashoPerformance>();

    for (let i = 1; i <= 42; i++) {
      const id = `m${i}`;
      const side = i % 2 === 0 ? "west" : "east";
      entries.push(makeEntry(id, "maegashira", i, side as "east" | "west"));
      perfById.set(id, perf(id, 8, 7));
    }

    const world = buildWorld(entries);
    const result = updateBanzuke(entries, perfById, world, {});

    const snapshot = snapshotAssignment(result);
    expect(result.newBanzuke.length).toBe(42);
    expect(snapshot).toMatchInlineSnapshot(`
      [
        "m1 -> makuuchi:大関E",
        "m10 -> makuuchi:前頭2W",
        "m11 -> makuuchi:前頭3E",
        "m12 -> makuuchi:前頭3W",
        "m13 -> makuuchi:前頭4E",
        "m14 -> makuuchi:前頭4W",
        "m15 -> makuuchi:前頭5E",
        "m16 -> makuuchi:前頭5W",
        "m17 -> makuuchi:前頭6E",
        "m18 -> makuuchi:前頭6W",
        "m19 -> makuuchi:前頭7E",
        "m2 -> makuuchi:大関W",
        "m20 -> makuuchi:前頭7W",
        "m21 -> makuuchi:前頭8E",
        "m22 -> makuuchi:前頭8W",
        "m23 -> makuuchi:前頭9E",
        "m24 -> makuuchi:前頭9W",
        "m25 -> makuuchi:前頭10E",
        "m26 -> makuuchi:前頭10W",
        "m27 -> makuuchi:前頭11E",
        "m28 -> makuuchi:前頭11W",
        "m29 -> makuuchi:前頭12E",
        "m3 -> makuuchi:関脇E",
        "m30 -> makuuchi:前頭12W",
        "m31 -> makuuchi:前頭13E",
        "m32 -> makuuchi:前頭13W",
        "m33 -> makuuchi:前頭14E",
        "m34 -> makuuchi:前頭14W",
        "m35 -> makuuchi:前頭15E",
        "m36 -> makuuchi:前頭15W",
        "m37 -> makuuchi:前頭16E",
        "m38 -> makuuchi:前頭16W",
        "m39 -> makuuchi:前頭17E",
        "m4 -> makuuchi:関脇W",
        "m40 -> makuuchi:前頭17W",
        "m41 -> makuuchi:前頭18E",
        "m42 -> makuuchi:前頭18W",
        "m5 -> makuuchi:小結E",
        "m6 -> makuuchi:小結W",
        "m7 -> makuuchi:前頭1E",
        "m8 -> makuuchi:前頭1W",
        "m9 -> makuuchi:前頭2E",
      ]
    `);
  });
});

// ── Scenario 3: Ozeki guard (demoted ozeki not re-seated in ozeki slot) ────

describe("slotAssignmentCharacterization — ozeki guard", () => {
  it("scenario 3: demoted ozeki is assigned to sekiwake or below, not ozeki", () => {
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
    expect(o2Entry!.position.rank).not.toBe("ozeki");

    expect(snapshotAssignment(result)).toMatchInlineSnapshot(`
      [
        "k1 -> makuuchi:関脇E",
        "k2 -> makuuchi:小結E",
        "m1 -> makuuchi:小結W",
        "m10 -> makuuchi:前頭5E",
        "m11 -> makuuchi:前頭5W",
        "m12 -> makuuchi:前頭6E",
        "m13 -> makuuchi:前頭6W",
        "m14 -> makuuchi:前頭7E",
        "m15 -> makuuchi:前頭7W",
        "m16 -> makuuchi:前頭8E",
        "m17 -> makuuchi:前頭8W",
        "m18 -> makuuchi:前頭9E",
        "m19 -> makuuchi:前頭9W",
        "m2 -> makuuchi:前頭1E",
        "m20 -> makuuchi:前頭10E",
        "m21 -> makuuchi:前頭10W",
        "m22 -> makuuchi:前頭11E",
        "m23 -> makuuchi:前頭11W",
        "m24 -> makuuchi:前頭12E",
        "m25 -> makuuchi:前頭12W",
        "m26 -> makuuchi:前頭13E",
        "m27 -> makuuchi:前頭13W",
        "m28 -> makuuchi:前頭14E",
        "m29 -> makuuchi:前頭14W",
        "m3 -> makuuchi:前頭1W",
        "m30 -> makuuchi:前頭15E",
        "m31 -> makuuchi:前頭15W",
        "m32 -> makuuchi:前頭16E",
        "m33 -> makuuchi:前頭16W",
        "m34 -> makuuchi:前頭17E",
        "m35 -> makuuchi:前頭17W",
        "m36 -> makuuchi:前頭18E",
        "m4 -> makuuchi:前頭2E",
        "m5 -> makuuchi:前頭2W",
        "m6 -> makuuchi:前頭3E",
        "m7 -> makuuchi:前頭3W",
        "m8 -> makuuchi:前頭4E",
        "m9 -> makuuchi:前頭4W",
        "o1 -> makuuchi:大関E",
        "o2 -> makuuchi:関脇W",
        "s1 -> makuuchi:大関W",
        "s2 -> makuuchi:関脇E",
      ]
    `);
  });
});

// ── Scenario 4: Ozeki reclaim (demoted ozeki at sekiwake with 10+ wins) ────

describe("slotAssignmentCharacterization — ozeki reclaim", () => {
  it("scenario 4: demoted ozeki at sekiwake with 10 wins reclaims ozeki slot", () => {
    const entries: BanzukeEntry[] = [
      makeEntry("y1", "yokozuna", undefined, "east"),
      makeEntry("o1", "ozeki", undefined, "east"),
      makeEntry("reclaim", "sekiwake", undefined, "east"),
      makeEntry("s2", "sekiwake", undefined, "west"),
      makeEntry("k1", "komusubi", undefined, "east"),
      makeEntry("k2", "komusubi", undefined, "west"),
      ...Array.from({ length: 36 }, (_, i) =>
        makeEntry(`m${i + 1}`, "maegashira", i + 1, i % 2 ? "west" : "east")
      ),
    ];

    const perfById = new Map<string, BashoPerformance>([
      ["y1", perf("y1", 13, 2)],
      ["o1", perf("o1", 10, 5)],
      ["reclaim", perf("reclaim", 10, 5)], // 10 wins at sekiwake → eligibleBestTier=2
      ["s2", perf("s2", 8, 7)],
      ["k1", perf("k1", 8, 7)],
      ["k2", perf("k2", 8, 7)],
    ]);
    for (let i = 1; i <= 36; i++) perfById.set(`m${i}`, perf(`m${i}`, 8, 7));

    const world = buildWorld(entries, [
      { id: "reclaim", overrides: { wasDemotedFromOzeki: true } },
    ]);

    const result = updateBanzuke(entries, perfById, world, {});

    const reclaimEntry = result.newBanzuke.find((e) => e.rikishiId === "reclaim");
    expect(reclaimEntry).toBeDefined();
    expect(reclaimEntry!.position.rank).toBe("ozeki");

    expect(snapshotAssignment(result)).toMatchInlineSnapshot(`
      [
        "k1 -> makuuchi:関脇W",
        "k2 -> makuuchi:小結E",
        "m1 -> makuuchi:小結W",
        "m10 -> makuuchi:前頭5E",
        "m11 -> makuuchi:前頭5W",
        "m12 -> makuuchi:前頭6E",
        "m13 -> makuuchi:前頭6W",
        "m14 -> makuuchi:前頭7E",
        "m15 -> makuuchi:前頭7W",
        "m16 -> makuuchi:前頭8E",
        "m17 -> makuuchi:前頭8W",
        "m18 -> makuuchi:前頭9E",
        "m19 -> makuuchi:前頭9W",
        "m2 -> makuuchi:前頭1E",
        "m20 -> makuuchi:前頭10E",
        "m21 -> makuuchi:前頭10W",
        "m22 -> makuuchi:前頭11E",
        "m23 -> makuuchi:前頭11W",
        "m24 -> makuuchi:前頭12E",
        "m25 -> makuuchi:前頭12W",
        "m26 -> makuuchi:前頭13E",
        "m27 -> makuuchi:前頭13W",
        "m28 -> makuuchi:前頭14E",
        "m29 -> makuuchi:前頭14W",
        "m3 -> makuuchi:前頭1W",
        "m30 -> makuuchi:前頭15E",
        "m31 -> makuuchi:前頭15W",
        "m32 -> makuuchi:前頭16E",
        "m33 -> makuuchi:前頭16W",
        "m34 -> makuuchi:前頭17E",
        "m35 -> makuuchi:前頭17W",
        "m36 -> makuuchi:前頭18E",
        "m4 -> makuuchi:前頭2E",
        "m5 -> makuuchi:前頭2W",
        "m6 -> makuuchi:前頭3E",
        "m7 -> makuuchi:前頭3W",
        "m8 -> makuuchi:前頭4E",
        "m9 -> makuuchi:前頭4W",
        "o1 -> makuuchi:大関E",
        "reclaim -> makuuchi:大関W",
        "s2 -> makuuchi:関脇E",
        "y1 -> makuuchi:横綱E",
      ]
    `);
  });
});

// ── Scenario 5: More candidates than slots ─────────────────────────────────

describe("slotAssignmentCharacterization — more candidates than slots", () => {
  it("scenario 5: excess candidates are left unassigned when slots run out", () => {
    // 50 maegashira candidates but the makuuchi template only has 42 slots
    // (with 0 sanyaku, all 42 are maegashira). The remaining 8 go to juryo/etc.
    const entries: BanzukeEntry[] = [];
    const perfById = new Map<string, BashoPerformance>();
    for (let i = 1; i <= 50; i++) {
      const id = `m${i}`;
      const side = i % 2 === 0 ? "west" : "east";
      entries.push(makeEntry(id, "maegashira", i, side as "east" | "west"));
      perfById.set(id, perf(id, 7, 8)); // all make-koshi, stay maegashira
    }

    const world = buildWorld(entries);
    const result = updateBanzuke(entries, perfById, world, {});

    // All 50 should still be assigned (lower divisions absorb overflow)
    expect(result.newBanzuke.length).toBe(50);
    expect(snapshotAssignment(result)).toMatchInlineSnapshot(`
      [
        "m1 -> makuuchi:大関E",
        "m10 -> makuuchi:前頭2W",
        "m11 -> makuuchi:前頭3E",
        "m12 -> makuuchi:前頭3W",
        "m13 -> makuuchi:前頭4E",
        "m14 -> makuuchi:前頭4W",
        "m15 -> makuuchi:前頭5E",
        "m16 -> makuuchi:前頭5W",
        "m17 -> makuuchi:前頭6E",
        "m18 -> makuuchi:前頭6W",
        "m19 -> makuuchi:前頭7E",
        "m2 -> makuuchi:大関W",
        "m20 -> makuuchi:前頭7W",
        "m21 -> makuuchi:前頭8E",
        "m22 -> makuuchi:前頭8W",
        "m23 -> makuuchi:前頭9E",
        "m24 -> makuuchi:前頭9W",
        "m25 -> makuuchi:前頭10E",
        "m26 -> makuuchi:前頭10W",
        "m27 -> makuuchi:前頭11E",
        "m28 -> makuuchi:前頭11W",
        "m29 -> makuuchi:前頭12E",
        "m3 -> makuuchi:関脇E",
        "m30 -> makuuchi:前頭12W",
        "m31 -> makuuchi:前頭13E",
        "m32 -> makuuchi:前頭13W",
        "m33 -> makuuchi:前頭14E",
        "m34 -> makuuchi:前頭14W",
        "m35 -> makuuchi:前頭15E",
        "m36 -> makuuchi:前頭15W",
        "m37 -> makuuchi:前頭16E",
        "m38 -> makuuchi:前頭16W",
        "m39 -> makuuchi:前頭17E",
        "m4 -> makuuchi:関脇W",
        "m40 -> makuuchi:前頭17W",
        "m41 -> makuuchi:前頭18E",
        "m42 -> makuuchi:前頭18W",
        "m43 -> juryo:十両1E",
        "m44 -> juryo:十両1W",
        "m45 -> juryo:十両2E",
        "m46 -> juryo:十両2W",
        "m47 -> juryo:十両3E",
        "m48 -> juryo:十両3W",
        "m49 -> juryo:十両4E",
        "m5 -> makuuchi:小結E",
        "m50 -> juryo:十両4W",
        "m6 -> makuuchi:小結W",
        "m7 -> makuuchi:前頭1E",
        "m8 -> makuuchi:前頭1W",
        "m9 -> makuuchi:前頭2E",
      ]
    `);
  });
});

// ── Scenario 6: More slots than candidates ─────────────────────────────────

describe("slotAssignmentCharacterization — more slots than candidates", () => {
  it("scenario 6: only 5 candidates with full template — most slots empty", () => {
    const entries: BanzukeEntry[] = [
      makeEntry("r1", "maegashira", 1, "east"),
      makeEntry("r2", "maegashira", 2, "west"),
      makeEntry("r3", "maegashira", 3, "east"),
      makeEntry("r4", "maegashira", 4, "west"),
      makeEntry("r5", "maegashira", 5, "east"),
    ];

    const perfById = new Map<string, BashoPerformance>();
    for (const e of entries) perfById.set(e.rikishiId, perf(e.rikishiId, 8, 7));

    const world = buildWorld(entries);
    const result = updateBanzuke(entries, perfById, world, {});

    // Only 5 candidates → only 5 slots filled
    expect(result.newBanzuke.length).toBe(5);
    expect(new Set(result.newBanzuke.map((e) => e.rikishiId)).size).toBe(5);
    expect(snapshotAssignment(result)).toMatchInlineSnapshot(`
      [
        "r1 -> makuuchi:大関E",
        "r2 -> makuuchi:大関W",
        "r3 -> makuuchi:関脇E",
        "r4 -> makuuchi:関脇W",
        "r5 -> makuuchi:小結E",
      ]
    `);
  });
});

// ── Scenario 7: All same eligibleBestTier (pure priority order) ────────────

describe("slotAssignmentCharacterization — uniform eligibleBestTier", () => {
  it("scenario 7: all maegashira 8-7 — assignment is pure priority order", () => {
    const entries: BanzukeEntry[] = [];
    const perfById = new Map<string, BashoPerformance>();
    for (let i = 1; i <= 42; i++) {
      const id = `m${i}`;
      const side = i % 2 === 0 ? "west" : "east";
      entries.push(makeEntry(id, "maegashira", i, side as "east" | "west"));
      perfById.set(id, perf(id, 8, 7)); // all 8-7, eligibleBestTier=5 (default)
    }

    const world = buildWorld(entries);
    const result = updateBanzuke(entries, perfById, world, {});

    expect(result.newBanzuke.length).toBe(42);
    expect(snapshotAssignment(result)).toMatchInlineSnapshot(`
      [
        "m1 -> makuuchi:大関E",
        "m10 -> makuuchi:前頭2W",
        "m11 -> makuuchi:前頭3E",
        "m12 -> makuuchi:前頭3W",
        "m13 -> makuuchi:前頭4E",
        "m14 -> makuuchi:前頭4W",
        "m15 -> makuuchi:前頭5E",
        "m16 -> makuuchi:前頭5W",
        "m17 -> makuuchi:前頭6E",
        "m18 -> makuuchi:前頭6W",
        "m19 -> makuuchi:前頭7E",
        "m2 -> makuuchi:大関W",
        "m20 -> makuuchi:前頭7W",
        "m21 -> makuuchi:前頭8E",
        "m22 -> makuuchi:前頭8W",
        "m23 -> makuuchi:前頭9E",
        "m24 -> makuuchi:前頭9W",
        "m25 -> makuuchi:前頭10E",
        "m26 -> makuuchi:前頭10W",
        "m27 -> makuuchi:前頭11E",
        "m28 -> makuuchi:前頭11W",
        "m29 -> makuuchi:前頭12E",
        "m3 -> makuuchi:関脇E",
        "m30 -> makuuchi:前頭12W",
        "m31 -> makuuchi:前頭13E",
        "m32 -> makuuchi:前頭13W",
        "m33 -> makuuchi:前頭14E",
        "m34 -> makuuchi:前頭14W",
        "m35 -> makuuchi:前頭15E",
        "m36 -> makuuchi:前頭15W",
        "m37 -> makuuchi:前頭16E",
        "m38 -> makuuchi:前頭16W",
        "m39 -> makuuchi:前頭17E",
        "m4 -> makuuchi:関脇W",
        "m40 -> makuuchi:前頭17W",
        "m41 -> makuuchi:前頭18E",
        "m42 -> makuuchi:前頭18W",
        "m5 -> makuuchi:小結E",
        "m6 -> makuuchi:小結W",
        "m7 -> makuuchi:前頭1E",
        "m8 -> makuuchi:前頭1W",
        "m9 -> makuuchi:前頭2E",
      ]
    `);
  });
});

// ── Scenario 8: Single candidate, single slot ──────────────────────────────

describe("slotAssignmentCharacterization — minimal edge case", () => {
  it("scenario 8: single candidate assigned to top slot", () => {
    const entries = [makeEntry("solo", "maegashira", 1, "east")];
    const perfById = new Map([["solo", perf("solo", 8, 7)]]);
    const world = buildWorld(entries);
    const result = updateBanzuke(entries, perfById, world, {});

    expect(result.newBanzuke.length).toBe(1);
    expect(result.newBanzuke[0].rikishiId).toBe("solo");
    expect(snapshotAssignment(result)).toMatchInlineSnapshot(`
      [
        "solo -> makuuchi:大関E",
      ]
    `);
  });
});

// ── Scenario 9: Empty input ────────────────────────────────────────────────

describe("slotAssignmentCharacterization — empty input", () => {
  it("scenario 9: no candidates — empty result, no crash", () => {
    const world = makeMockWorld();
    const result = updateBanzuke([], new Map(), world, {});

    expect(result.newBanzuke.length).toBe(0);
    expect(result.events.length).toBe(0);
  });
});
