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
import { updateBanzuke } from "@/engine/banzuke/banzukeOps";
import type {
  BanzukeEntry,
  BashoPerformance,
  RankPosition,
  Division,
  Rank,
} from "@/engine/types/banzuke";
import { toRankPosition, RANK_HIERARCHY } from "@/engine/types/banzuke";
import { makeMockWorld, mockRikishi } from "@tests/unit/engine/utils";
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
        "j1 -> makuuchi:前頭6W",
        "j10 -> juryo:十両10E",
        "j11 -> juryo:十両10W",
        "j12 -> juryo:十両11E",
        "j13 -> juryo:十両11W",
        "j14 -> juryo:十両12E",
        "j2 -> juryo:十両6E",
        "j3 -> juryo:十両6W",
        "j4 -> juryo:十両7E",
        "j5 -> juryo:十両7W",
        "j6 -> juryo:十両8E",
        "j7 -> juryo:十両8W",
        "j8 -> juryo:十両9E",
        "j9 -> juryo:十両9W",
        "jd1 -> makushita:幕下14E",
        "jd10 -> makushita:幕下18W",
        "jd11 -> makushita:幕下19E",
        "jd12 -> makushita:幕下19W",
        "jd13 -> makushita:幕下20E",
        "jd14 -> makushita:幕下20W",
        "jd15 -> makushita:幕下21E",
        "jd2 -> makushita:幕下14W",
        "jd3 -> makushita:幕下15E",
        "jd4 -> makushita:幕下15W",
        "jd5 -> makushita:幕下16E",
        "jd6 -> makushita:幕下16W",
        "jd7 -> makushita:幕下17E",
        "jd8 -> makushita:幕下17W",
        "jd9 -> makushita:幕下18E",
        "jk1 -> makushita:幕下6E",
        "jk10 -> makushita:幕下25W",
        "jk2 -> makushita:幕下21W",
        "jk3 -> makushita:幕下22E",
        "jk4 -> makushita:幕下22W",
        "jk5 -> makushita:幕下23E",
        "jk6 -> makushita:幕下23W",
        "jk7 -> makushita:幕下24E",
        "jk8 -> makushita:幕下24W",
        "jk9 -> makushita:幕下25E",
        "k1 -> makuuchi:関脇E",
        "k2 -> makuuchi:前頭4E",
        "m1 -> makuuchi:関脇W",
        "m10 -> makuuchi:前頭5E",
        "m11 -> makuuchi:前頭7W",
        "m12 -> makuuchi:前頭10E",
        "m13 -> makuuchi:前頭3W",
        "m14 -> makuuchi:前頭1W",
        "m15 -> makuuchi:前頭9W",
        "m16 -> makuuchi:前頭5W",
        "m17 -> makuuchi:前頭2W",
        "m18 -> makuuchi:前頭11E",
        "m19 -> makuuchi:前頭8E",
        "m2 -> makuuchi:前頭4W",
        "m20 -> makuuchi:前頭6E",
        "m3 -> makuuchi:前頭8W",
        "m4 -> makuuchi:前頭7E",
        "m5 -> makuuchi:前頭2E",
        "m6 -> makuuchi:前頭3E",
        "m7 -> makuuchi:前頭9E",
        "m8 -> makuuchi:前頭10W",
        "m9 -> makuuchi:前頭1E",
        "ms1 -> juryo:十両1E",
        "ms10 -> juryo:十両5W",
        "ms11 -> makushita:幕下1E",
        "ms12 -> makushita:幕下1W",
        "ms13 -> makushita:幕下2E",
        "ms14 -> makushita:幕下2W",
        "ms15 -> makushita:幕下3E",
        "ms16 -> makushita:幕下3W",
        "ms17 -> makushita:幕下4E",
        "ms18 -> makushita:幕下4W",
        "ms19 -> makushita:幕下5E",
        "ms2 -> juryo:十両1W",
        "ms20 -> makushita:幕下5W",
        "ms3 -> juryo:十両2E",
        "ms4 -> juryo:十両2W",
        "ms5 -> juryo:十両3E",
        "ms6 -> juryo:十両3W",
        "ms7 -> juryo:十両4E",
        "ms8 -> juryo:十両4W",
        "ms9 -> juryo:十両5E",
        "o1 -> makuuchi:大関E",
        "o2 -> makuuchi:大関W",
        "s1 -> makuuchi:関脇E",
        "s2 -> makuuchi:小結E",
        "sd1 -> makushita:幕下6W",
        "sd10 -> makushita:幕下11E",
        "sd11 -> makushita:幕下11W",
        "sd12 -> makushita:幕下12E",
        "sd13 -> makushita:幕下12W",
        "sd14 -> makushita:幕下13E",
        "sd15 -> makushita:幕下13W",
        "sd2 -> makushita:幕下7E",
        "sd3 -> makushita:幕下7W",
        "sd4 -> makushita:幕下8E",
        "sd5 -> makushita:幕下8W",
        "sd6 -> makushita:幕下9E",
        "sd7 -> makushita:幕下9W",
        "sd8 -> makushita:幕下10E",
        "sd9 -> makushita:幕下10W",
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
        "m1 -> makuuchi:前頭1E",
        "m10 -> makuuchi:前頭5W",
        "m11 -> makuuchi:前頭6E",
        "m12 -> makuuchi:前頭6W",
        "m13 -> makuuchi:前頭7E",
        "m14 -> makuuchi:前頭7W",
        "m15 -> makuuchi:前頭8E",
        "m16 -> makuuchi:前頭8W",
        "m17 -> makuuchi:前頭9E",
        "m18 -> makuuchi:前頭9W",
        "m19 -> makuuchi:前頭10E",
        "m2 -> makuuchi:前頭1W",
        "m20 -> makuuchi:前頭10W",
        "m21 -> makuuchi:前頭11E",
        "m22 -> makuuchi:前頭11W",
        "m23 -> makuuchi:前頭12E",
        "m24 -> makuuchi:前頭12W",
        "m25 -> makuuchi:前頭13E",
        "m26 -> makuuchi:前頭13W",
        "m27 -> makuuchi:前頭14E",
        "m28 -> makuuchi:前頭14W",
        "m29 -> makuuchi:前頭15E",
        "m3 -> makuuchi:前頭2E",
        "m30 -> makuuchi:前頭15W",
        "m31 -> makuuchi:前頭16E",
        "m32 -> makuuchi:前頭16W",
        "m33 -> makuuchi:前頭17E",
        "m34 -> makuuchi:前頭17W",
        "m35 -> makuuchi:前頭18E",
        "m36 -> makuuchi:前頭18W",
        "m37 -> juryo:十両1E",
        "m38 -> juryo:十両1W",
        "m39 -> juryo:十両2E",
        "m4 -> makuuchi:前頭2W",
        "m40 -> juryo:十両2W",
        "m41 -> juryo:十両3E",
        "m42 -> juryo:十両3W",
        "m5 -> makuuchi:前頭3E",
        "m6 -> makuuchi:前頭3W",
        "m7 -> makuuchi:前頭4E",
        "m8 -> makuuchi:前頭4W",
        "m9 -> makuuchi:前頭5E",
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
        "k1 -> makuuchi:小結E",
        "k2 -> makuuchi:小結W",
        "m1 -> makuuchi:前頭1E",
        "m10 -> makuuchi:前頭5W",
        "m11 -> makuuchi:前頭6E",
        "m12 -> makuuchi:前頭6W",
        "m13 -> makuuchi:前頭7E",
        "m14 -> makuuchi:前頭7W",
        "m15 -> makuuchi:前頭8E",
        "m16 -> makuuchi:前頭8W",
        "m17 -> makuuchi:前頭9E",
        "m18 -> makuuchi:前頭9W",
        "m19 -> makuuchi:前頭10E",
        "m2 -> makuuchi:前頭1W",
        "m20 -> makuuchi:前頭10W",
        "m21 -> makuuchi:前頭11E",
        "m22 -> makuuchi:前頭11W",
        "m23 -> makuuchi:前頭12E",
        "m24 -> makuuchi:前頭12W",
        "m25 -> makuuchi:前頭13E",
        "m26 -> makuuchi:前頭13W",
        "m27 -> makuuchi:前頭14E",
        "m28 -> makuuchi:前頭14W",
        "m29 -> makuuchi:前頭15E",
        "m3 -> makuuchi:前頭2E",
        "m30 -> makuuchi:前頭15W",
        "m31 -> makuuchi:前頭16E",
        "m32 -> makuuchi:前頭16W",
        "m33 -> makuuchi:前頭17E",
        "m34 -> makuuchi:前頭17W",
        "m35 -> makuuchi:前頭18E",
        "m36 -> juryo:十両1E",
        "m4 -> makuuchi:前頭2W",
        "m5 -> makuuchi:前頭3E",
        "m6 -> makuuchi:前頭3W",
        "m7 -> makuuchi:前頭4E",
        "m8 -> makuuchi:前頭4W",
        "m9 -> makuuchi:前頭5E",
        "o1 -> makuuchi:大関E",
        "o2 -> makuuchi:関脇E",
        "s1 -> makuuchi:関脇E",
        "s2 -> makuuchi:関脇W",
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
        "k1 -> makuuchi:小結E",
        "k2 -> makuuchi:小結W",
        "m1 -> makuuchi:前頭1E",
        "m10 -> makuuchi:前頭5W",
        "m11 -> makuuchi:前頭6E",
        "m12 -> makuuchi:前頭6W",
        "m13 -> makuuchi:前頭7E",
        "m14 -> makuuchi:前頭7W",
        "m15 -> makuuchi:前頭8E",
        "m16 -> makuuchi:前頭8W",
        "m17 -> makuuchi:前頭9E",
        "m18 -> makuuchi:前頭9W",
        "m19 -> makuuchi:前頭10E",
        "m2 -> makuuchi:前頭1W",
        "m20 -> makuuchi:前頭10W",
        "m21 -> makuuchi:前頭11E",
        "m22 -> makuuchi:前頭11W",
        "m23 -> makuuchi:前頭12E",
        "m24 -> makuuchi:前頭12W",
        "m25 -> makuuchi:前頭13E",
        "m26 -> makuuchi:前頭13W",
        "m27 -> makuuchi:前頭14E",
        "m28 -> makuuchi:前頭14W",
        "m29 -> makuuchi:前頭15E",
        "m3 -> makuuchi:前頭2E",
        "m30 -> makuuchi:前頭15W",
        "m31 -> makuuchi:前頭16E",
        "m32 -> makuuchi:前頭16W",
        "m33 -> makuuchi:前頭17E",
        "m34 -> makuuchi:前頭17W",
        "m35 -> makuuchi:前頭18E",
        "m36 -> juryo:十両1E",
        "m4 -> makuuchi:前頭2W",
        "m5 -> makuuchi:前頭3E",
        "m6 -> makuuchi:前頭3W",
        "m7 -> makuuchi:前頭4E",
        "m8 -> makuuchi:前頭4W",
        "m9 -> makuuchi:前頭5E",
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
        "m1 -> makuuchi:前頭1E",
        "m10 -> makuuchi:前頭5W",
        "m11 -> makuuchi:前頭6E",
        "m12 -> makuuchi:前頭6W",
        "m13 -> makuuchi:前頭7E",
        "m14 -> makuuchi:前頭7W",
        "m15 -> makuuchi:前頭8E",
        "m16 -> makuuchi:前頭8W",
        "m17 -> makuuchi:前頭9E",
        "m18 -> makuuchi:前頭9W",
        "m19 -> makuuchi:前頭10E",
        "m2 -> makuuchi:前頭1W",
        "m20 -> makuuchi:前頭10W",
        "m21 -> makuuchi:前頭11E",
        "m22 -> makuuchi:前頭11W",
        "m23 -> makuuchi:前頭12E",
        "m24 -> makuuchi:前頭12W",
        "m25 -> makuuchi:前頭13E",
        "m26 -> makuuchi:前頭13W",
        "m27 -> makuuchi:前頭14E",
        "m28 -> makuuchi:前頭14W",
        "m29 -> makuuchi:前頭15E",
        "m3 -> makuuchi:前頭2E",
        "m30 -> makuuchi:前頭15W",
        "m31 -> makuuchi:前頭16E",
        "m32 -> makuuchi:前頭16W",
        "m33 -> makuuchi:前頭17E",
        "m34 -> makuuchi:前頭17W",
        "m35 -> makuuchi:前頭18E",
        "m36 -> makuuchi:前頭18W",
        "m37 -> juryo:十両1E",
        "m38 -> juryo:十両1W",
        "m39 -> juryo:十両2E",
        "m4 -> makuuchi:前頭2W",
        "m40 -> juryo:十両2W",
        "m41 -> juryo:十両3E",
        "m42 -> juryo:十両3W",
        "m43 -> juryo:十両4E",
        "m44 -> juryo:十両4W",
        "m45 -> juryo:十両5E",
        "m46 -> juryo:十両5W",
        "m47 -> juryo:十両6E",
        "m48 -> juryo:十両6W",
        "m49 -> juryo:十両7E",
        "m5 -> makuuchi:前頭3E",
        "m50 -> juryo:十両7W",
        "m6 -> makuuchi:前頭3W",
        "m7 -> makuuchi:前頭4E",
        "m8 -> makuuchi:前頭4W",
        "m9 -> makuuchi:前頭5E",
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
        "r1 -> makuuchi:前頭1E",
        "r2 -> makuuchi:前頭1W",
        "r3 -> makuuchi:前頭2E",
        "r4 -> makuuchi:前頭2W",
        "r5 -> makuuchi:前頭3E",
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
        "m1 -> makuuchi:前頭1E",
        "m10 -> makuuchi:前頭5W",
        "m11 -> makuuchi:前頭6E",
        "m12 -> makuuchi:前頭6W",
        "m13 -> makuuchi:前頭7E",
        "m14 -> makuuchi:前頭7W",
        "m15 -> makuuchi:前頭8E",
        "m16 -> makuuchi:前頭8W",
        "m17 -> makuuchi:前頭9E",
        "m18 -> makuuchi:前頭9W",
        "m19 -> makuuchi:前頭10E",
        "m2 -> makuuchi:前頭1W",
        "m20 -> makuuchi:前頭10W",
        "m21 -> makuuchi:前頭11E",
        "m22 -> makuuchi:前頭11W",
        "m23 -> makuuchi:前頭12E",
        "m24 -> makuuchi:前頭12W",
        "m25 -> makuuchi:前頭13E",
        "m26 -> makuuchi:前頭13W",
        "m27 -> makuuchi:前頭14E",
        "m28 -> makuuchi:前頭14W",
        "m29 -> makuuchi:前頭15E",
        "m3 -> makuuchi:前頭2E",
        "m30 -> makuuchi:前頭15W",
        "m31 -> makuuchi:前頭16E",
        "m32 -> makuuchi:前頭16W",
        "m33 -> makuuchi:前頭17E",
        "m34 -> makuuchi:前頭17W",
        "m35 -> makuuchi:前頭18E",
        "m36 -> makuuchi:前頭18W",
        "m37 -> juryo:十両1E",
        "m38 -> juryo:十両1W",
        "m39 -> juryo:十両2E",
        "m4 -> makuuchi:前頭2W",
        "m40 -> juryo:十両2W",
        "m41 -> juryo:十両3E",
        "m42 -> juryo:十両3W",
        "m5 -> makuuchi:前頭3E",
        "m6 -> makuuchi:前頭3W",
        "m7 -> makuuchi:前頭4E",
        "m8 -> makuuchi:前頭4W",
        "m9 -> makuuchi:前頭5E",
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
        "solo -> makuuchi:前頭1E",
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
