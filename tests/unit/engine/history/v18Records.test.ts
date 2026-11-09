/**
 * V18 regression pins — phase06_yearly_boundary stale-base worldFields merges.
 *
 * phase06_yearly_boundary (src/engine/tick/phases/phase06_yearly_boundary.ts:40-75)
 * merges many yearly service impacts into ONE ImpactBuilder. Each producer
 * computes an ABSOLUTE worldFields snapshot from the same stale pre-phase
 * world, and ImpactBuilder.merge keeps only the last write per field:
 *
 *   - ageRikishiAndUpdateRecords loops
 *       builder.merge(HistoryService.updateAllTimeRecords(world, r))
 *     → every qualifying rikishi writes worldFields.records; only the last
 *       rikishi's leaderboard entry survives.
 *
 *   - builder.merge(DynastyService.tickSuccessionCheck(world))
 *     → each forced succession calls transferElderStock, which writes
 *       worldFields.myosekiMarket from the stale market; only the last
 *       succession's reseat survives, and the earlier chair's stock reverts
 *       to the JSA pool (via the V17-D02 resolve-time ref sweep) instead of
 *       following its new master.
 *
 * These tests call phase06_yearly_boundary itself — the exact function the
 * tick pipeline runs — and resolve via resolveImpacts. Every assertion
 * describes the correct post-fix behavior. Each test is currently RED.
 */

import { describe, it, expect } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { phase06_yearly_boundary } from "@/engine/tick/phases/phase06_yearly_boundary";
import type { MyosekiStock } from "@/engine/types/myoseki";

function chairStock(id: string, oyakataId: string): MyosekiStock {
  return {
    id,
    name: `${id}-myoseki`,
    prestigeTier: "respected",
    ownerId: oyakataId,
    holderId: oyakataId,
    status: "held",
  };
}

describe("phase06_yearly_boundary — stale-base worldFields merges", () => {
  it("lands EVERY qualifying rikishi on the all-time leaderboard (HistoryService.updateAllTimeRecords)", () => {
    // Two active rikishi above the careerWins > 100 gate. Each
    // updateAllTimeRecords call snapshots world.records + its own rikishi;
    // the second snapshot lacks the first rikishi's entry and overwrites it.
    const r1 = MockFactory.createRikishi("r1", { heyaId: "h1", careerWins: 300 });
    const r2 = MockFactory.createRikishi("r2", { heyaId: "h1", careerWins: 200 });

    const world = MockFactory.createWorld({
      year: 2027,
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
      ]),
      transientContext: { boundaries: { yearBoundary: true } } as never,
    });

    const next = resolveImpacts(world, [phase06_yearly_boundary(world)]);

    // Both entries must land, sorted by value descending (r1: 300, r2: 200).
    expect(next.records.allTime.careerWins.map((e) => e.rikishiId)).toEqual(["r1", "r2"]);
  });

  it("keeps EVERY succession's elder-stock transfer (DynastyService.tickSuccessionCheck)", () => {
    // Two stables whose oyakata are past the age-65 cliff, each holding a
    // distinct elder stock, each with a sekitori successor in the roster.
    const oyaA = MockFactory.createOyakata("oyaA", {
      heyaId: "heyaA",
      age: 66,
      name: "Oya A",
      yearsInCharge: 12,
    });
    const oyaB = MockFactory.createOyakata("oyaB", {
      heyaId: "heyaB",
      age: 66,
      name: "Oya B",
      yearsInCharge: 9,
    });
    // Successors are young maegashira — too young/unaccomplished for the
    // retiree→oyakata conversion, so the only myosekiMarket writers are the
    // two transferElderStock reseats.
    const sA = MockFactory.createRikishi("sA", {
      heyaId: "heyaA",
      division: "makuuchi",
      rank: "maegashira",
      birthYear: 2007, // age 20
      careerWins: 0,
    });
    const sB = MockFactory.createRikishi("sB", {
      heyaId: "heyaB",
      division: "makuuchi",
      rank: "maegashira",
      birthYear: 2007,
      careerWins: 0,
    });
    const heyaA = MockFactory.createHeya("heyaA", {
      oyakataId: "oyaA",
      rikishiIds: ["sA"],
    });
    const heyaB = MockFactory.createHeya("heyaB", {
      oyakataId: "oyaB",
      rikishiIds: ["sB"],
    });

    const world = MockFactory.createWorld({
      year: 2027,
      rikishi: new Map([
        ["sA", sA],
        ["sB", sB],
      ]),
      heyas: new Map([
        ["heyaA", heyaA],
        ["heyaB", heyaB],
      ]),
      oyakata: new Map([
        ["oyaA", oyaA],
        ["oyaB", oyaB],
      ]),
      myosekiMarket: {
        stocks: { stockA: chairStock("stockA", "oyaA"), stockB: chairStock("stockB", "oyaB") },
        history: [],
      },
      transientContext: { boundaries: { yearBoundary: true } } as never,
    });

    const next = resolveImpacts(world, [phase06_yearly_boundary(world)]);

    // Controls: both successions really happened (per-heya updates merge fine).
    expect(next.heyas.get("heyaA")!.oyakataId).toBe("oyakata_promoted_sA");
    expect(next.heyas.get("heyaB")!.oyakataId).toBe("oyakata_promoted_sB");
    expect(next.oyakata.has("oyakata_promoted_sA")).toBe(true);
    expect(next.oyakata.has("oyakata_promoted_sB")).toBe(true);

    // Each chair's elder stock must follow its new master. The second
    // succession's myosekiMarket snapshot is rebuilt from the stale market
    // and overwrites the first reseat; the ref sweep then releases stockA
    // back to the JSA pool — a succession without the chair's stock.
    expect(next.myosekiMarket!.stocks["stockA"].holderId).toBe("oyakata_promoted_sA");
    expect(next.myosekiMarket!.stocks["stockB"].holderId).toBe("oyakata_promoted_sB");
  });
});
