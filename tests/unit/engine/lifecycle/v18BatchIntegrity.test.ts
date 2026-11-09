/**
 * V18 regression pins — ImpactBuilder.merge stale-base worldFields snapshots.
 *
 * Root cause under test:
 *   ImpactBuilder.updateWorldField stores ABSOLUTE snapshots, and each producer
 *   (onRikishiRetired, LegacyService.registerLegacyTrait, the merit-stock
 *   transfer inside processRetireeOyakataConversion, transferElderStock inside
 *   DynastyService.triggerSuccession) computes its snapshot from the SAME stale
 *   pre-batch world. ImpactBuilder.merge then does
 *   `Object.assign(impact.worldFields, other.worldFields)` — last write wins,
 *   so when one batch produces two writes to the same worldField, the earlier
 *   write is silently dropped.
 *
 * These tests drive the REAL batch paths — processAllRetirements →
 * retireRikishiFully (the function every retirement path delegates to), and
 * DynastyService.triggerSuccession (the function phase06_yearly_boundary
 * merges) — and resolve via resolveImpacts, the same entry point the tick
 * pipeline uses. Every assertion describes the correct post-fix behavior.
 * Each test is currently RED because the earlier batched write is lost.
 */

import { describe, it, expect } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { processAllRetirements } from "@/engine/lifecycle/processRetirements";
import { DynastyService } from "@/engine/legacy/DynastyService";
import type { MyosekiStock, MyosekiMarket } from "@/engine/types/myoseki";
import type { WorldRecords } from "@/engine/types/records";
import type { Heya } from "@/engine/types/heya";

const YEAR = 2050; // retirees are 50 → checkRetirement → deterministic "Mandatory Age Retirement"

function recordEntry(rikishiId: string, value: number) {
  return { rikishiId, shikona: `Rikishi ${rikishiId}`, value, achievedDate: { year: 2040, month: 1 } };
}

function emptyRecords(): WorldRecords {
  return {
    allTime: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
    active: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
  };
}

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

/** A sanctioned heya cannot approve a stable founding — keeps the conversion RNG path deterministic. */
function sanctionedHeya(id: string): Heya {
  return MockFactory.createHeya(id, {
    welfareState: {
      welfareRisk: 0,
      complianceState: "sanctioned",
      weeksInState: 0,
      morale: 50,
    } as never,
  });
}

describe("processAllRetirements — stale-base worldFields merges", () => {
  it("removes EVERY retiree from the active records leaderboards (records.ts)", () => {
    // Two maegashira retirees — not accomplished, so the ONLY worldFields writes
    // in the batch are the two onRikishiRetired `records` snapshots.
    const r1 = MockFactory.createRikishi("r1", {
      heyaId: "h1",
      rank: "maegashira",
      division: "makuuchi",
      birthYear: 2000,
      careerWins: 50,
    });
    const r2 = MockFactory.createRikishi("r2", {
      heyaId: "h2",
      rank: "maegashira",
      division: "makuuchi",
      birthYear: 2000,
      careerWins: 60,
    });

    const records = emptyRecords();
    records.active.careerWins = [recordEntry("r1", 50), recordEntry("r2", 60)];
    records.active.makuuchiWins = [recordEntry("r1", 50), recordEntry("r2", 60)];

    const world = MockFactory.createWorld({
      year: YEAR,
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
      ]),
      heyas: new Map([
        ["h1", sanctionedHeya("h1")],
        ["h2", sanctionedHeya("h2")],
      ]),
      records,
      myosekiMarket: { stocks: {}, history: [] } as MyosekiMarket,
    });

    const { impact } = processAllRetirements(world);
    const next = resolveImpacts(world, [impact]);

    // Control: both rikishi really did retire through the batch.
    expect(next.historicalRikishi.size).toBe(2);

    // Both active-record removals must survive — the second onRikishiRetired
    // snapshot is computed from the same stale world and overwrites the first.
    expect(next.records.active.careerWins.map((e) => e.rikishiId)).toEqual([]);
    expect(next.records.active.makuuchiWins.map((e) => e.rikishiId)).toEqual([]);
  });

  it("registers a bloodline trait for EVERY accomplished retiree (LegacyService)", () => {
    const r1 = MockFactory.createRikishi("r1", {
      heyaId: "h1",
      rank: "ozeki",
      division: "makuuchi",
      birthYear: 2000,
      careerWins: 320,
    });
    const r2 = MockFactory.createRikishi("r2", {
      heyaId: "h2",
      rank: "ozeki",
      division: "makuuchi",
      birthYear: 2000,
      careerWins: 310,
    });

    const world = MockFactory.createWorld({
      year: YEAR,
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
      ]),
      heyas: new Map([
        ["h1", sanctionedHeya("h1")],
        ["h2", sanctionedHeya("h2")],
      ]),
      myosekiMarket: { stocks: {}, history: [] } as MyosekiMarket,
    });

    const { impact } = processAllRetirements(world);
    const next = resolveImpacts(world, [impact]);

    // Each ozeki retiree earns `bl_<id>` — registerLegacyTrait builds the
    // registry from stale world.bloodlineRegistry, so the second registration
    // drops the first trait.
    expect(Object.keys(next.bloodlineRegistry?.traits ?? {}).sort()).toEqual([
      "bl_r1",
      "bl_r2",
    ]);
  });

  it("keeps EVERY merit-stock transfer and its transaction (retireeOyakataConversion)", () => {
    const r1 = MockFactory.createRikishi("r1", {
      heyaId: "h1",
      rank: "ozeki",
      division: "makuuchi",
      birthYear: 2000,
      careerWins: 320,
    });
    const r2 = MockFactory.createRikishi("r2", {
      heyaId: "h2",
      rank: "ozeki",
      division: "makuuchi",
      birthYear: 2000,
      careerWins: 310,
    });

    const world = MockFactory.createWorld({
      year: YEAR,
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
      ]),
      heyas: new Map([
        ["h1", sanctionedHeya("h1")],
        ["h2", sanctionedHeya("h2")],
      ]),
      myosekiMarket: { stocks: {}, history: [] } as MyosekiMarket,
    });

    const { impact } = processAllRetirements(world);
    const next = resolveImpacts(world, [impact]);

    // Control: both retirees really did convert (oyakataToAdd collections merge
    // correctly — it is only the myosekiMarket worldField that is lost).
    const newOyaIds = [...next.oyakata.keys()].filter((id) => id.startsWith("OY-")).sort();
    expect(newOyaIds).toHaveLength(2);

    // Each conversion mints a distinct merit stock held by its own oyakata, and
    // prepends one sale transaction. The second updateWorldField("myosekiMarket")
    // snapshot is rebuilt from the stale market and erases the first transfer.
    const stocks = next.myosekiMarket!.stocks;
    expect(Object.keys(stocks)).toHaveLength(2);
    expect(next.myosekiMarket!.history).toHaveLength(2);
    expect(
      Object.values(stocks)
        .map((s) => s.ownerId)
        .sort()
    ).toEqual(newOyaIds);
  });
});

describe("DynastyService.triggerSuccession — conversion vs elder-stock reseat", () => {
  it("does not let the elder-stock reseat erase the retiree's merit stock (no ghost oyakata)", () => {
    // Accomplished successor (ozeki, age 30) → retireRikishiFully queues a
    // merit-stock transfer to a NEW conversion oyakata; transferElderStock then
    // rewrites myosekiMarket from the stale base and erases it.
    const s1 = MockFactory.createRikishi("s1", {
      heyaId: "h1",
      rank: "ozeki",
      division: "makuuchi",
      birthYear: 1997, // age 30 → accomplished + conversion-eligible
      careerWins: 320,
    });
    const oya1 = MockFactory.createOyakata("oya1", {
      heyaId: "h1",
      age: 66,
      name: "Master One",
      yearsInCharge: 12,
    });
    const h1 = MockFactory.createHeya("h1", {
      oyakataId: "oya1",
      rikishiIds: ["s1"],
      welfareState: {
        welfareRisk: 0,
        complianceState: "sanctioned",
        weeksInState: 0,
        morale: 50,
      } as never,
    });

    const world = MockFactory.createWorld({
      year: 2027,
      rikishi: new Map([["s1", s1]]),
      heyas: new Map([["h1", h1]]),
      oyakata: new Map([["oya1", oya1]]),
      myosekiMarket: { stocks: { sChair: chairStock("sChair", "oya1") }, history: [] },
    });

    const impact = DynastyService.triggerSuccession(world, "h1", "s1");
    const next = resolveImpacts(world, [impact]);

    // Controls: the promotion and the conversion both happened.
    expect(next.heyas.get("h1")!.oyakataId).toBe("oyakata_promoted_s1");
    const convOya = [...next.oyakata.values()].find((o) => o.id.startsWith("OY-"));
    expect(convOya).toBeDefined();

    // The chair's stock reseats on the promoted oyakata (the winning write).
    expect(next.myosekiMarket!.stocks["sChair"].holderId).toBe("oyakata_promoted_s1");

    // The retiree's merit-issued elder stock must exist and be held by the
    // conversion oyakata — otherwise he remains a ghost oyakata with no stock,
    // and the sale transaction is gone from market history.
    expect(
      Object.values(next.myosekiMarket!.stocks).some(
        (s) => s.ownerId === convOya!.id || s.holderId === convOya!.id
      )
    ).toBe(true);
    expect(next.myosekiMarket!.history).toHaveLength(1);
  });
});
