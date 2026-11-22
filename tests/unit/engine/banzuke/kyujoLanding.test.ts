/**
 * Spec (RED) — kyūjō demotion depth, jōi cushion, early announcements.
 *
 * Real JSA practice (dataset 19): a full-basho kyūjō is scored as losses
 * for the record, but the LANDING is cushioned —
 *   makuuchi 0-0-15  → mid-juryo (~12–15 rank positions, NOT off-sheet)
 *   juryo 0-0-15     → mid-makushita
 *   lower-division   → roughly one division drop
 * Current code: baseDelta (0−15)/2 ≈ −8 → desiredKey pushes ~+8000 keys,
 * past the entire printed sheet (jonokuchi ≈ 10002+). Fix = landing floor
 * on absence-dominated records, NOT a multiplier (the 1.4–2.5× multiplier
 * was deliberately removed — banzukeCommittee.ts:8-10).
 */
import { describe, it, expect } from "vitest";
import { updateBanzuke } from "@/engine/banzuke/banzukeOps";
import type { BanzukeEntry, BashoPerformance, RankPosition } from "@/engine/types/banzuke";
import { makeMockWorld, mockRikishi } from "@tests/unit/engine/utils";
import type { WorldState } from "@/engine/types/world";

function entry(
  id: string,
  rank: string,
  rankNumber: number | undefined,
  side: "east" | "west",
  division: string
): BanzukeEntry {
  return {
    rikishiId: id,
    position: { rank, rankNumber, side } as RankPosition,
    division: division as BanzukeEntry["division"],
  };
}

function perf(id: string, wins: number, losses: number, absences = 0): BashoPerformance {
  return { rikishiId: id, wins, losses, absences };
}

function buildWorld(entries: BanzukeEntry[]): WorldState {
  const world = makeMockWorld();
  for (const e of entries) {
    world.rikishi.set(
      e.rikishiId,
      mockRikishi(e.rikishiId, {
        rank: e.position.rank as never,
        rankNumber: e.position.rankNumber as never,
        division: e.division as never,
        side: e.position.side as never,
      })
    );
  }
  return world;
}

/** Full lower-sheet so landings have real slots. */
function fullSheet(kyujoId: string): { entries: BanzukeEntry[]; perfs: Map<string, BashoPerformance> } {
  const entries: BanzukeEntry[] = [];
  const perfs = new Map<string, BashoPerformance>();
  for (let i = 1; i <= 42; i++) {
    const id = i === 21 ? kyujoId : `m${i}`;
    entries.push(entry(id, "maegashira", i, i % 2 ? "east" : "west", "makuuchi"));
    perfs.set(id, id === kyujoId ? perf(id, 0, 0, 15) : perf(id, 8, 7));
  }
  for (let i = 1; i <= 28; i++) {
    entries.push(entry(`j${i}`, "juryo", i, i % 2 ? "east" : "west", "juryo"));
    perfs.set(`j${i}`, perf(`j${i}`, 8, 7));
  }
  for (let i = 1; i <= 60; i++) {
    entries.push(entry(`ms${i}`, "makushita", i, i % 2 ? "east" : "west", "makushita"));
    perfs.set(`ms${i}`, perf(`ms${i}`, 4, 3));
  }
  return { entries, perfs };
}

describe("kyūjō landing floor (absence-dominated records)", () => {
  it("a full-kyūjō maegashira lands in the juryo band, not off the sheet", () => {
    const { entries, perfs } = fullSheet("kyujoM");
    const world = buildWorld(entries);
    const result = updateBanzuke(entries, perfs, world, {});
    const landed = result.newBanzuke.find((e) => e.rikishiId === "kyujoM");
    expect(landed).toBeDefined();
    // Real target: mid-juryo. Never below the printed sheet.
    expect(landed!.position.rank).toBe("juryo");
    expect((landed!.position as { rankNumber?: number }).rankNumber ?? 99).toBeLessThanOrEqual(14);
  });

  it("a full-kyūjō juryo lands in makushita, still sekitori-adjacent", () => {
    const entries: BanzukeEntry[] = [];
    const perfs = new Map<string, BashoPerformance>();
    for (let i = 1; i <= 28; i++) {
      const id = i === 14 ? "kyujoJ" : `j${i}`;
      entries.push(entry(id, "juryo", i, i % 2 ? "east" : "west", "juryo"));
      perfs.set(id, id === "kyujoJ" ? perf(id, 0, 0, 15) : perf(id, 8, 7));
    }
    for (let i = 1; i <= 60; i++) {
      entries.push(entry(`ms${i}`, "makushita", i, i % 2 ? "east" : "west", "makushita"));
      perfs.set(`ms${i}`, perf(`ms${i}`, 4, 3));
    }
    const world = buildWorld(entries);
    const result = updateBanzuke(entries, perfs, world, {});
    const landed = result.newBanzuke.find((e) => e.rikishiId === "kyujoJ");
    expect(landed).toBeDefined();
    expect(landed!.position.rank).toBe("makushita");
  });
});

describe("jōi cushion (K–M4 demotion relief)", () => {
  it("a komusubi with a mediocre record falls less than a deep maegashira with the same record", () => {
    const entries: BanzukeEntry[] = [
      entry("k1", "komusubi", undefined, "east", "makuuchi"),
      entry("m10", "maegashira", 10, "east", "makuuchi"),
      ...Array.from({ length: 40 }, (_, i) =>
        entry(`m${i + 1}`, "maegashira", i + 1 <= 9 ? i + 1 : i + 2, i % 2 ? "west" : "east", "makuuchi")
      ),
    ];
    const perfs = new Map<string, BashoPerformance>([
      ["k1", perf("k1", 6, 9)],
      ["m10", perf("m10", 6, 9)],
    ]);
    for (let i = 1; i <= 41; i++) perfs.set(`m${i}`, perf(`m${i}`, 8, 7));
    const world = buildWorld(entries);
    const result = updateBanzuke(entries, perfs, world, {});
    const k1Landed = result.newBanzuke.find((e) => e.rikishiId === "k1");
    const m10Landed = result.newBanzuke.find((e) => e.rikishiId === "m10");
    expect(k1Landed).toBeDefined();
    expect(m10Landed).toBeDefined();
    const k1Num = (k1Landed!.position as { rankNumber?: number }).rankNumber ?? 99;
    const m10Num = (m10Landed!.position as { rankNumber?: number }).rankNumber ?? 99;
    // Jōi cushion: same 6-9 record, but K falls less deeply than M10.
    expect(k1Num).toBeLessThan(m10Num);
  });
});

describe("announcement classes", () => {
  it("BanzukeUpdateResult distinguishes early-announced vs embargoed movements", () => {
    const { entries, perfs } = fullSheet("kyujoM");
    const world = buildWorld(entries);
    const result = updateBanzuke(entries, perfs, world, {});
    // Early announcements: Y/O promotions + Ms→J juryo promotions only.
    // J→M stays embargoed until the official banzuke reveal.
    const r = result as unknown as {
      earlyAnnouncements?: Array<{ rikishiId: string; kind: string }>;
      embargoedMovements?: Array<{ rikishiId: string }>;
    };
    expect(Array.isArray(r.earlyAnnouncements)).toBe(true);
    expect(Array.isArray(r.embargoedMovements)).toBe(true);
  });
});
