/**
 * W F — origin-first milestones at banzuke publish.
 *
 * When a rikishi reaches makuuchi (or san'yaku) and no active or
 * historical rikishi from the same origin has ever been there before,
 * applyNewRanks flags them firstFromOriginThisBasho and appends an
 * origin_first milestone.
 */
import { describe, it, expect } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { applyNewRanks } from "@/engine/banzuke/publish/newRanks";
import type { BanzukeEntry } from "@/engine/types/banzuke";
import type { RetiredRikishiSummary } from "@/engine/types/history";

function promoteToMakuuchi(rikishiId: string): BanzukeEntry {
  return {
    rikishiId,
    division: "makuuchi",
    position: { rank: "maegashira", rankNumber: 16, side: "west" },
  } as BanzukeEntry;
}

function publish(world: Parameters<typeof applyNewRanks>[0], entries: BanzukeEntry[]) {
  const lastBasho = MockFactory.createBasho({ bashoName: "hatsu" });
  const builder = createImpactBuilder("test");
  applyNewRanks(world, lastBasho, { newBanzuke: entries } as never, new Map(), builder);
  return resolveImpacts(world, [builder.build()]);
}

describe("origin-first detection at banzuke publish", () => {
  it("flags the first makuuchi rikishi from an origin", () => {
    const pioneer = MockFactory.createRikishi("r_pio", {
      division: "juryo",
      rank: "juryo",
      origin: "Tottori",
    });
    const world = MockFactory.createWorld({ rikishi: new Map([["r_pio", pioneer]]) });

    const next = publish(world, [promoteToMakuuchi("r_pio")]);
    const r = next.rikishi.get("r_pio")!;
    expect(r.firstFromOriginThisBasho).toBe(true);
    expect(r.milestones?.some((m) => m.type === "origin_first")).toBe(true);
  });

  it("does not flag when an active same-origin rikishi already reached makuuchi", () => {
    const established = MockFactory.createRikishi("r_est", {
      division: "makuuchi",
      rank: "maegashira",
      origin: "Tottori",
      divisionRecords: {
        makuuchi: { wins: 30, losses: 40 },
        juryo: { wins: 0, losses: 0 },
        makushita: { wins: 0, losses: 0 },
        sandanme: { wins: 0, losses: 0 },
        jonidan: { wins: 0, losses: 0 },
        jonokuchi: { wins: 0, losses: 0 },
      },
    });
    const newcomer = MockFactory.createRikishi("r_new", {
      division: "juryo",
      rank: "juryo",
      origin: "Tottori",
    });
    const world = MockFactory.createWorld({
      rikishi: new Map([
        ["r_est", established],
        ["r_new", newcomer],
      ]),
    });

    const next = publish(world, [promoteToMakuuchi("r_new")]);
    expect(next.rikishi.get("r_new")!.firstFromOriginThisBasho).toBeFalsy();
  });

  it("does not flag when a historical same-origin rikishi peaked at makuuchi", () => {
    const newcomer = MockFactory.createRikishi("r_new", {
      division: "juryo",
      rank: "juryo",
      origin: "Shimane",
    });
    const retired = {
      id: "r_old",
      shikona: "OldShimane",
      birthYear: 1950,
      heyaId: "h1",
      origin: "Shimane",
      peakDivision: "makuuchi",
      isRetired: true,
      isSummary: true,
    } as RetiredRikishiSummary;
    const world = MockFactory.createWorld({
      rikishi: new Map([["r_new", newcomer]]),
      historicalRikishi: new Map([["r_old", retired]]),
    });

    const next = publish(world, [promoteToMakuuchi("r_new")]);
    expect(next.rikishi.get("r_new")!.firstFromOriginThisBasho).toBeFalsy();
  });

  it("does not flag a return to makuuchi (prior makuuchi bouts on record)", () => {
    const returnee = MockFactory.createRikishi("r_ret", {
      division: "juryo",
      rank: "juryo",
      origin: "Saga",
      divisionRecords: {
        makuuchi: { wins: 3, losses: 12 },
        juryo: { wins: 0, losses: 0 },
        makushita: { wins: 0, losses: 0 },
        sandanme: { wins: 0, losses: 0 },
        jonidan: { wins: 0, losses: 0 },
        jonokuchi: { wins: 0, losses: 0 },
      },
    });
    const world = MockFactory.createWorld({ rikishi: new Map([["r_ret", returnee]]) });

    const next = publish(world, [promoteToMakuuchi("r_ret")]);
    expect(next.rikishi.get("r_ret")!.firstFromOriginThisBasho).toBeFalsy();
  });

  it("flags the first san'yaku promotion from an origin", () => {
    const pioneer = MockFactory.createRikishi("r_san", {
      division: "makuuchi",
      rank: "maegashira",
      origin: "Wakayama",
      divisionRecords: {
        makuuchi: { wins: 20, losses: 20 },
        juryo: { wins: 0, losses: 0 },
        makushita: { wins: 0, losses: 0 },
        sandanme: { wins: 0, losses: 0 },
        jonidan: { wins: 0, losses: 0 },
        jonokuchi: { wins: 0, losses: 0 },
      },
    });
    const world = MockFactory.createWorld({ rikishi: new Map([["r_san", pioneer]]) });

    const entry = {
      rikishiId: "r_san",
      division: "makuuchi",
      position: { rank: "komusubi", side: "east" },
    } as BanzukeEntry;
    const next = publish(world, [entry]);
    const r = next.rikishi.get("r_san")!;
    expect(r.firstFromOriginThisBasho).toBe(true);
    expect(r.milestones?.some((m) => m.type === "origin_first")).toBe(true);
  });
});
