import { describe, it, expect } from "vitest";
import { bestTierAllowed } from "@/engine/banzuke/promotionLogic";
import { updateBanzuke } from "@/engine/banzuke";
import type { BanzukeEntry, BashoPerformance, RankPosition } from "@/engine/types/banzuke";
import { makeMockWorld, mockRikishi } from "../utils";

// ── Helpers ────────────────────────────────────────────────────────────────

function entry(rank: "sekiwake" | "komusubi" | "ozeki", id: string = "r1"): BanzukeEntry {
  return {
    rikishiId: id,
    position: { rank, side: "east" } as BanzukeEntry["position"],
    division: "makuuchi",
  };
}

function perf(
  wins: number,
  losses: number,
  extras: Partial<BashoPerformance> = {}
): BashoPerformance {
  return { rikishiId: "r1", wins, losses, ...extras };
}

const NONE = new Set<string>();

// ── bestTierAllowed: Ozeki reclaim tests ────────────────────────────────────

describe("Ozeki reclaim — bestTierAllowed", () => {
  it("demoted ozeki at sekiwake with 10 wins → tier 2 (reclaim to ozeki)", () => {
    const reclaimable = new Set(["r1"]);
    const result = bestTierAllowed(entry("sekiwake"), perf(10, 5), undefined, NONE, reclaimable);
    expect(result).toBe(2);
  });

  it("demoted ozeki at sekiwake with 9 wins → tier 3 (not enough wins to reclaim)", () => {
    const reclaimable = new Set(["r1"]);
    const result = bestTierAllowed(entry("sekiwake"), perf(9, 6), undefined, NONE, reclaimable);
    expect(result).toBe(3);
  });

  it("non-demoted sekiwake with 10 wins → tier 3 (no reclaim, normal rules)", () => {
    const result = bestTierAllowed(entry("sekiwake"), perf(10, 5), undefined, NONE, NONE);
    expect(result).toBe(3);
  });

  it("demoted ozeki at komusubi with 10 wins → tier 3 (reclaim only from sekiwake)", () => {
    const reclaimable = new Set(["r1"]);
    const result = bestTierAllowed(entry("komusubi"), perf(10, 5), undefined, NONE, reclaimable);
    expect(result).toBe(3);
  });

  it("demoted ozeki at sekiwake with 10 wins and no reclaimableOzeki set → tier 3", () => {
    // When reclaimableOzeki is not passed (backwards compat), no reclaim
    const result = bestTierAllowed(entry("sekiwake"), perf(10, 5), undefined, NONE);
    expect(result).toBe(3);
  });

  it("demoted ozeki at sekiwake with 11 wins → tier 2 (reclaim or normal 11+ rule, both give tier 2)", () => {
    const reclaimable = new Set(["r1"]);
    const result = bestTierAllowed(entry("sekiwake"), perf(11, 4), undefined, NONE, reclaimable);
    expect(result).toBe(2);
  });
});

// ── updateBanzuke: Ozeki reclaim end-to-end ────────────────────────────────

describe("Ozeki reclaim — updateBanzuke integration", () => {
  it("demoted ozeki at sekiwake with 10 wins is placed in an ozeki slot", () => {
    const entries: BanzukeEntry[] = [
      {
        rikishiId: "y1",
        position: { rank: "yokozuna", side: "east" } as RankPosition,
        division: "makuuchi",
      },
      {
        rikishiId: "o1",
        position: { rank: "ozeki", side: "east" } as RankPosition,
        division: "makuuchi",
      },
      {
        rikishiId: "reclaim",
        position: { rank: "sekiwake", side: "east" } as RankPosition,
        division: "makuuchi",
      },
      {
        rikishiId: "s2",
        position: { rank: "sekiwake", side: "west" } as RankPosition,
        division: "makuuchi",
      },
      {
        rikishiId: "k1",
        position: { rank: "komusubi", side: "east" } as RankPosition,
        division: "makuuchi",
      },
      {
        rikishiId: "k2",
        position: { rank: "komusubi", side: "west" } as RankPosition,
        division: "makuuchi",
      },
      ...Array.from({ length: 36 }, (_, i) => ({
        rikishiId: `m${i + 1}`,
        position: {
          rank: "maegashira" as const,
          rankNumber: i + 1,
          side: (i % 2 ? "west" : "east") as "east" | "west",
        },
        division: "makuuchi" as const,
      })),
    ];

    const perfById = new Map<string, BashoPerformance>([
      ["y1", { rikishiId: "y1", wins: 13, losses: 2 } as BashoPerformance],
      ["o1", { rikishiId: "o1", wins: 10, losses: 5 } as BashoPerformance],
      ["reclaim", { rikishiId: "reclaim", wins: 10, losses: 5 } as BashoPerformance],
      ["s2", { rikishiId: "s2", wins: 8, losses: 7 } as BashoPerformance],
      ["k1", { rikishiId: "k1", wins: 8, losses: 7 } as BashoPerformance],
      ["k2", { rikishiId: "k2", wins: 8, losses: 7 } as BashoPerformance],
    ]);

    const world = makeMockWorld();

    // Set up rikishi with wasDemotedFromOzeki flag
    world.rikishi.set(
      "reclaim",
      mockRikishi("reclaim", {
        rank: "sekiwake",
        division: "makuuchi",
        wasDemotedFromOzeki: true,
        heyaId: "heya-1",
      })
    );
    for (const e of entries) {
      if (e.rikishiId === "reclaim") continue;
      world.rikishi.set(
        e.rikishiId,
        mockRikishi(e.rikishiId, {
          rank: e.position.rank as any,
          division: e.division as any,
          heyaId: "heya-1",
        })
      );
    }

    const result = updateBanzuke(entries, perfById, world, {});

    const reclaimEntry = result.newBanzuke.find((e) => e.rikishiId === "reclaim");
    expect(reclaimEntry).toBeDefined();
    expect(reclaimEntry!.position.rank).toBe("ozeki");
  });
});
