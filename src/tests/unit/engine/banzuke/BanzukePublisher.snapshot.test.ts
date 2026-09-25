/**
 * Banzuke snapshot persistence tests.
 *
 * publishBanzukeUpdate must persist the banzuke it produces so downstream
 * consumers (Recap "Banzuke Reveal", BanzukePage rank deltas, historyIndex)
 * have real data instead of empty structures:
 *
 *   - world.currentBanzuke            -> snapshot of the NEW banzuke
 *   - history[last].nextBanzuke       -> same snapshot, on the completed basho
 *   - historyIndex.banzukeByBasho[X]  -> the banzuke "produced by" basho X
 *   - historyIndex.basho[X]           -> summary incl. hasBanzukeSnapshot
 *   - historyIndex.rikishi            -> per-rikishi wins/losses for the basho
 *   - banzukeByBasho[prevKey]         -> self-healed fought-on snapshot when
 *                                      absent (first basho / legacy worlds)
 */
import { describe, it, expect } from "vitest";
import { publishBanzukeUpdate } from "@/engine/banzuke/BanzukePublisher";
import { buildBanzukeSnapshot } from "@/engine/banzuke/banzukeSnapshot";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeBashoKey } from "@/engine/historyIndex";
import { makeMockWorld, makeMockBasho, mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";
import type { BanzukeEntry, Division } from "@/engine/types/banzuke";

const YEAR = 2025;
const BASHO_NUMBER = 1; // hatsu
const COMPLETED_KEY = makeBashoKey(YEAR, BASHO_NUMBER);
const PREV_KEY = makeBashoKey(YEAR - 1, 6); // fictional prior kyushu for hatsu

function makeResultFixture(yusho: string) {
  return {
    id: `res-${COMPLETED_KEY}`,
    year: YEAR,
    bashoNumber: BASHO_NUMBER,
    bashoName: "hatsu",
    yusho,
    junYusho: [],
    prizes: { yushoAmount: 10_000_000, junYushoAmount: 0, specialPrizes: 0 },
  } as never;
}

/**
 * World with a completed hatsu 2025: 5 active makuuchi rikishi with varied
 * records so updateBanzuke has real performance data to move.
 */
function makePostBashoWorld(): WorldState {
  const rikishi = [
    mockRikishi("r_yoko", { rank: "yokozuna", rankNumber: undefined }),
    mockRikishi("r_ozeki", { rank: "ozeki", rankNumber: undefined }),
    mockRikishi("r_sek", { rank: "sekiwake", rankNumber: undefined }),
    mockRikishi("r_m5", { rank: "maegashira", rankNumber: 5 }),
    mockRikishi("r_m10", { rank: "maegashira", rankNumber: 10 }),
  ];
  const world = makeMockWorld({
    year: YEAR,
    cyclePhase: "post_basho",
    rikishi: new Map(rikishi.map((r) => [r.id, r])),
    history: [makeResultFixture("r_m5")],
    currentBasho: makeMockBasho({
      year: YEAR,
      bashoNumber: BASHO_NUMBER,
      bashoName: "hatsu",
      day: 15,
      standings: new Map([
        ["r_yoko", { wins: 8, losses: 7, absences: 0 }],
        ["r_ozeki", { wins: 9, losses: 6, absences: 0 }],
        ["r_sek", { wins: 7, losses: 8, absences: 0 }],
        ["r_m5", { wins: 14, losses: 1, absences: 0 }],
        ["r_m10", { wins: 3, losses: 12, absences: 0 }],
      ]),
    }),
  });
  return world;
}

describe("buildBanzukeSnapshot", () => {
  it("groups entries into divisions and carries the basho identity", () => {
    const entries: BanzukeEntry[] = [
      {
        rikishiId: "a",
        division: "makuuchi",
        position: { rank: "yokozuna", side: "east" },
      },
      {
        rikishiId: "b",
        division: "juryo",
        position: { rank: "juryo", side: "west", rankNumber: 3 },
      },
    ];
    const snap = buildBanzukeSnapshot(entries, YEAR, 2);

    expect(snap.year).toBe(YEAR);
    expect(snap.bashoNumber).toBe(2);

    // All six division keys present even when empty
    const divisions: Division[] = [
      "makuuchi",
      "juryo",
      "makushita",
      "sandanme",
      "jonidan",
      "jonokuchi",
    ];
    for (const d of divisions) {
      expect(snap.divisions[d]).toBeDefined();
      expect(Array.isArray(snap.divisions[d].assignments)).toBe(true);
      expect(Array.isArray(snap.divisions[d].slots)).toBe(true);
    }

    expect(snap.divisions.makuuchi.assignments).toHaveLength(1);
    expect(snap.divisions.makuuchi.assignments[0].rikishiId).toBe("a");
    expect(snap.divisions.makuuchi.assignments[0].position).toEqual({
      rank: "yokozuna",
      side: "east",
    });
    expect(snap.divisions.juryo.assignments).toHaveLength(1);
    expect(snap.divisions.makushita.assignments).toHaveLength(0);
  });
});

describe("publishBanzukeUpdate — banzuke snapshot persistence", () => {
  it("writes world.currentBanzuke matching the post-update rikishi ranks", () => {
    const world = makePostBashoWorld();
    const newWorld = resolveImpacts(world, [publishBanzukeUpdate(world)]);

    const snap = newWorld.currentBanzuke;
    expect(snap).toBeDefined();

    // Every assignment must equal the live rikishi's post-update rank fields
    let assignmentCount = 0;
    for (const div of Object.values(snap!.divisions)) {
      for (const a of div.assignments) {
        assignmentCount++;
        const r = newWorld.rikishi.get(a.rikishiId);
        expect(r).toBeDefined();
        expect(a.position.rank).toBe(r!.rank);
        expect(a.position.rankNumber).toBe(r!.rankNumber);
        expect(a.position.side).toBe(r!.side);
        expect(div.division).toBe(r!.division);
      }
    }
    expect(assignmentCount).toBeGreaterThan(0);
  });

  it("patches nextBanzuke onto the completed basho history entry", () => {
    const world = makePostBashoWorld();
    const newWorld = resolveImpacts(world, [publishBanzukeUpdate(world)]);

    const last = newWorld.history.at(-1)!;
    expect(last.nextBanzuke).toBeDefined();
    expect(last.nextBanzuke).toEqual(newWorld.currentBanzuke);
    // The "next" banzuke is the one in force for haru (basho 2)
    expect(last.nextBanzuke!.bashoNumber).toBe(2);
    expect(last.nextBanzuke!.year).toBe(YEAR);
  });

  it("populates historyIndex.banzukeByBasho for the completed basho and self-heals prevKey", () => {
    const world = makePostBashoWorld();
    const newWorld = resolveImpacts(world, [publishBanzukeUpdate(world)]);

    const idx = newWorld.historyIndex;
    expect(idx).toBeDefined();

    // Post-completed-basho banzuke registered under the completed basho's key
    expect(idx!.banzukeByBasho[COMPLETED_KEY]).toEqual(newWorld.currentBanzuke);

    // The banzuke the completed basho was fought on, keyed as "produced by
    // the previous basho" — self-healed for the inaugural basho. Its
    // year/bashoNumber describe the basho it applies to (the completed one).
    const foughtOn = idx!.banzukeByBasho[PREV_KEY];
    expect(foughtOn).toBeDefined();
    expect(foughtOn.year).toBe(YEAR);
    expect(foughtOn.bashoNumber).toBe(BASHO_NUMBER);

    // Fought-on snapshot must record the PRE-update ranks
    const foughtOnM5 = foughtOn.divisions.makuuchi.assignments.find(
      (a) => a.rikishiId === "r_m5"
    );
    expect(foughtOnM5?.position.rank).toBe("maegashira");
    expect(foughtOnM5?.position.rankNumber).toBe(5);
  });

  it("produces a real delta between the fought-on and new banzuke", () => {
    const world = makePostBashoWorld();
    const newWorld = resolveImpacts(world, [publishBanzukeUpdate(world)]);

    const idx = newWorld.historyIndex!;
    const before = idx.banzukeByBasho[PREV_KEY];
    const after = idx.banzukeByBasho[COMPLETED_KEY];

    const posOf = (
      snap: typeof before,
      id: string
    ): { rank: string; rankNumber?: number } | undefined => {
      for (const div of Object.values(snap.divisions)) {
        const a = div.assignments.find((x) => x.rikishiId === id);
        if (a) return { rank: a.position.rank, rankNumber: a.position.rankNumber };
      }
      return undefined;
    };

    let changed = 0;
    for (const id of newWorld.activeRikishiIds) {
      const b = posOf(before, id);
      const a = posOf(after, id);
      if (!b || !a) continue;
      if (b.rank !== a.rank || b.rankNumber !== a.rankNumber) changed++;
    }
    expect(changed).toBeGreaterThan(0);
  });

  it("marks the basho summary hasBanzukeSnapshot and indexes per-rikishi results", () => {
    const world = makePostBashoWorld();
    const newWorld = resolveImpacts(world, [publishBanzukeUpdate(world)]);

    const idx = newWorld.historyIndex!;
    expect(idx.basho[COMPLETED_KEY]).toBeDefined();
    expect(idx.basho[COMPLETED_KEY].hasBanzukeSnapshot).toBe(true);
    expect(idx.basho[COMPLETED_KEY].yusho).toBe("r_m5");

    const m5Entries = idx.rikishi["r_m5"] ?? [];
    const entry = m5Entries.find((e) => e.bashoKey === COMPLETED_KEY);
    expect(entry).toBeDefined();
    expect(entry!.wins).toBe(14);
    expect(entry!.losses).toBe(1);
  });

  it("keeps lifecycle writes intact alongside the new persistence", () => {
    const world = makePostBashoWorld();
    const newWorld = resolveImpacts(world, [publishBanzukeUpdate(world)]);

    expect(newWorld.cyclePhase).toBe("interim");
    expect(newWorld.currentBasho).toBeUndefined();
    expect(newWorld.currentBashoName).toBe("haru");
  });

  it("does not clobber an existing banzukeByBasho prevKey entry", () => {
    const world = makePostBashoWorld();
    // Seed a prior index entry under PREV_KEY with a sentinel snapshot
    const sentinel = buildBanzukeSnapshot(
      [
        {
          rikishiId: "sentinel",
          division: "makuuchi",
          position: { rank: "maegashira", side: "east", rankNumber: 1 },
        },
      ],
      YEAR - 1,
      6
    );
    world.historyIndex = {
      version: "1.0.0",
      bashoKeys: [],
      basho: {},
      banzukeByBasho: { [PREV_KEY]: sentinel },
      rikishi: {},
      lastSeenBashoForRikishi: {},
    };

    const newWorld = resolveImpacts(world, [publishBanzukeUpdate(world)]);
    expect(newWorld.historyIndex!.banzukeByBasho[PREV_KEY]).toEqual(sentinel);
    // ...while the completed-basho entry is still written
    expect(newWorld.historyIndex!.banzukeByBasho[COMPLETED_KEY]).toBeDefined();
  });

  it("still writes snapshots when history is empty (defensive path)", () => {
    const world = makePostBashoWorld();
    world.history = [];
    const newWorld = resolveImpacts(world, [publishBanzukeUpdate(world)]);

    expect(newWorld.currentBanzuke).toBeDefined();
    expect(newWorld.historyIndex?.banzukeByBasho[COMPLETED_KEY]).toBeDefined();
    expect(newWorld.historyIndex?.banzukeByBasho[PREV_KEY]).toBeDefined();
  });
});
