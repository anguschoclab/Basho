import { describe, it, expect } from "vitest";
import { buildBanzukeRevealEntries } from "@/presenters/projections/recapBanzukeRevealProjections";
import { makeMockWorld, mockRikishi } from "../engine/utils";
import { createEmptyHistoryIndex } from "@/engine/historyIndex";
import type { BashoResult } from "@/engine/types/basho";
import type {
  BanzukeSnapshot,
  Division,
  RankPosition,
} from "@/engine/types/banzuke";

const ALL_DIVISIONS: Division[] = [
  "makuuchi",
  "juryo",
  "makushita",
  "sandanme",
  "jonidan",
  "jonokuchi",
];

function snap(
  year: number,
  bashoNumber: 1 | 2 | 3 | 4 | 5 | 6,
  assignments: Partial<Record<Division, { id: string; pos: RankPosition }[]>>
): BanzukeSnapshot {
  const divisions = {} as BanzukeSnapshot["divisions"];
  for (const d of ALL_DIVISIONS) {
    const list = assignments[d] ?? [];
    divisions[d] = {
      division: d,
      slots: list.map((a) => a.pos),
      assignments: list.map((a) => ({ rikishiId: a.id, position: a.pos })),
    };
  }
  return { year, bashoNumber, divisions };
}

const makuuchi = (rank: string, rankNumber?: number, side: "east" | "west" = "east"): RankPosition =>
  ({ rank, rankNumber, side }) as RankPosition;

function lastBasho(year = 2026, bashoNumber: 1 | 2 | 3 | 4 | 5 | 6 = 2): BashoResult {
  return {
    id: `b${bashoNumber}`,
    year,
    bashoNumber,
    bashoName: "haru",
    yusho: "r1",
    junYusho: [],
    prizes: { yushoAmount: 10, junYushoAmount: 0, specialPrizes: 0 },
  } as BashoResult;
}

describe("buildBanzukeRevealEntries", () => {
  it("returns [] when world or lastBasho is missing", () => {
    expect(buildBanzukeRevealEntries(null, lastBasho())).toEqual([]);
    expect(buildBanzukeRevealEntries(makeMockWorld(), null)).toEqual([]);
  });

  it("returns [] when currentBanzuke/historyIndex are absent", () => {
    const world = makeMockWorld({ rikishi: new Map([["r1", mockRikishi("r1")]]) });
    expect(buildBanzukeRevealEntries(world, lastBasho())).toEqual([]);
  });

  it("maps promotions, demotions, unchanged, and new entries", () => {
    // prev basho = 2026-1 (haru is basho 2, prev is hatsu)
    // prev basho = 2026-1 (haru is basho 2, prev is hatsu).
    // compareBanzuke compares rank TIERS, not rankNumber — an up/down
    // requires crossing a rank boundary (e.g. maegashira → komusubi).
    const prev = snap(2026, 1, {
      makuuchi: [
        { id: "r1", pos: makuuchi("maegashira", 10) }, // promoted to komusubi
        { id: "r2", pos: makuuchi("sekiwake") },       // demoted to maegashira
        { id: "r3", pos: makuuchi("sekiwake") },       // unchanged
        // r4 absent → new entry
      ],
      juryo: [
        { id: "r5", pos: makuuchi("juryo", 2) },       // juryo → makuuchi: division_change
      ],
    });
    const current = snap(2026, 2, {
      makuuchi: [
        { id: "r1", pos: makuuchi("komusubi") },
        { id: "r2", pos: makuuchi("maegashira", 9) },
        { id: "r3", pos: makuuchi("sekiwake") },
        { id: "r4", pos: makuuchi("maegashira", 14) },
        { id: "r5", pos: makuuchi("maegashira", 16) },
      ],
    });

    const idx = createEmptyHistoryIndex();
    idx.banzukeByBasho["2026-1"] = prev;

    const world = makeMockWorld({
      rikishi: new Map(
        ["r1", "r2", "r3", "r4", "r5"].map((id) => [id, mockRikishi(id, { shikona: `Shiko-${id}` })])
      ),
      currentBanzuke: current,
      historyIndex: idx,
    });

    const entries = buildBanzukeRevealEntries(world, lastBasho(2026, 2));
    const byId = new Map(entries.map((e) => [e.id, e]));

    expect(byId.get("r1")?.change).toBe("up");
    expect(byId.get("r1")?.shikona).toBe("Shiko-r1");
    // formatRankPosition renders Japanese rank names (e.g. 前頭10E) —
    // assert the rank number side of the move rather than the label.
    expect(byId.get("r1")?.oldRank).toContain("10");
    expect(byId.get("r1")?.newRank).not.toContain("10");
    expect(byId.get("r2")?.change).toBe("down");
    expect(byId.get("r3")?.change).toBe("none");
    expect(byId.get("r4")?.change).toBe("new");
    expect(byId.get("r4")?.oldRank).toBe("New Entry");
    // juryo → makuuchi: same-or-better tier shift across division boundary
    expect(byId.get("r5")?.change).toBe("division_change");
  });

  it("uses bashoNumber === 1 wrap rule (prev = year-1 basho 6)", () => {
    const prev = snap(2025, 6, { makuuchi: [{ id: "r1", pos: makuuchi("maegashira", 8) }] });
    const current = snap(2026, 1, { makuuchi: [{ id: "r1", pos: makuuchi("komusubi") }] });
    const idx = createEmptyHistoryIndex();
    idx.banzukeByBasho["2025-6"] = prev;

    const world = makeMockWorld({
      rikishi: new Map([["r1", mockRikishi("r1")]]),
      currentBanzuke: current,
      historyIndex: idx,
    });

    const entries = buildBanzukeRevealEntries(world, lastBasho(2026, 1));
    const r1 = entries.find((e) => e.id === "r1");
    // If the wrap rule were wrong, prev snapshot lookup would miss → "new".
    expect(r1?.change).toBe("up");
  });

  it("caps entries at maxEntries", () => {
    const mk = (n: number, div: Division = "jonokuchi") =>
      Array.from({ length: n }, (_, i) => ({ id: `n${i}`, pos: makuuchi("jonokuchi", i + 1) }));
    const current = snap(2026, 2, { jonokuchi: mk(30) });
    const idx = createEmptyHistoryIndex();
    // no prev snapshot → all "new"
    const world = makeMockWorld({
      rikishi: new Map(mk(30).map((a) => [a.id, mockRikishi(a.id)])),
      currentBanzuke: current,
      historyIndex: idx,
    });
    expect(buildBanzukeRevealEntries(world, lastBasho()).length).toBe(20);
    expect(buildBanzukeRevealEntries(world, lastBasho(), 5).length).toBe(5);
  });
});
