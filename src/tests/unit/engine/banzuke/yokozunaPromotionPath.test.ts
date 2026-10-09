/**
 * yokozunaPromotionPath.test.ts
 *
 * Regression tests for the Yokozuna promotion dead-path (audit WS2 /
 * perf-suite failure `yokozunaPromotionAutoSim`).
 *
 * Two coupled defects keep active Yokozuna at zero after the first
 * retirement:
 *
 * Y1 — `concludeBashoCompetition` calls `calculateStandings(basho)` which
 *      merges ALL divisions' standings entries. Autosim (and any world whose
 *      basho standings include juryo) can crown a lower-division rikishi as
 *      the basho yusho winner. The headline yusho must be makuuchi-only —
 *      lower divisions already get their own per-division winners via
 *      `divisionYushoMap`.
 *
 * Y2 — `publishBanzukeUpdate` computes `promoteToYokozuna` on the banzuke
 *      performance record, but the existing tests never asserted the
 *      rikishi's `rank` actually becomes "yokozuna". This pins the
 *      end-to-end rank write for the canonical Case-1 promotion
 *      (consecutive yusho as ozeki).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { concludeBashoCompetition } from "@/engine/lifecycle/CompetitionService";
import { publishBanzukeUpdate } from "@/engine/banzuke/BanzukePublisher";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockBasho, mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";

describe("Yokozuna promotion path", () => {
  let world: WorldState;

  beforeEach(() => {
    world = makeMockWorld({ cyclePhase: "post_basho", history: [] });
  });

  it("crowns only a makuuchi rikishi as basho yusho — a 15-0 juryo wrestler must not outrank a 14-1 makuuchi winner", () => {
    const j1 = mockRikishi("j1", { division: "juryo" });
    const m1 = mockRikishi("m1", { division: "makuuchi", rank: "maegashira" });
    world.rikishi.set("j1", j1);
    world.rikishi.set("m1", m1);
    world.currentBasho = makeMockBasho({
      standings: new Map([
        ["j1", { wins: 15, losses: 0, absences: 0 }],
        ["m1", { wins: 14, losses: 1, absences: 0 }],
      ]),
    });

    const newWorld = resolveImpacts(world, [concludeBashoCompetition(world)]);
    const record = newWorld.history[newWorld.history.length - 1];
    expect(record).toBeDefined();
    expect(record.yusho).toBe("m1");
  });

  it("promotes an ozeki with two consecutive yusho to rank 'yokozuna'", () => {
    const basho = makeMockBasho({
      bashoName: "hatsu",
      standings: new Map([["r1", { wins: 14, losses: 1, absences: 0 }]]),
    });
    world.currentBasho = basho;
    world.history.push({
      year: 2025,
      bashoNumber: 1,
      bashoName: "hatsu",
      yusho: "r1",
      junYusho: [],
      ginoSho: "none",
      shukunsho: "none",
      kantosho: "none",
      id: "1",
    } as any);

    const r1 = mockRikishi("r1", {
      rank: "ozeki",
      careerHistory: [
        {
          isYusho: true,
          wins: 14,
          losses: 1,
          year: 2024,
          month: 11,
          bashoName: "kyushu",
        },
      ] as any,
    });
    world.rikishi.set("r1", r1);

    const newWorld = resolveImpacts(world, [publishBanzukeUpdate(world)]);
    expect(newWorld.rikishi.get("r1")!.rank).toBe("yokozuna");
  });
});
