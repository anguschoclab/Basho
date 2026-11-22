/**
 * Spec (RED) — ichimon seat politics.
 *
 * Real JSA board seats track elder-stock (kabu) power: the clan whose
 * members hold the most shares wins the most seats. Current `runElections`
 * scores heyas by politicalCapital + reputation only, with faction "none"
 * — kabu holdings never enter the vote. A clan holding a majority of the
 * 105-share pool must hold a majority of board seats when everything
 * else is equal.
 */
import { describe, it, expect } from "vitest";
import { runElections } from "@/engine/governance/services/ScandalService";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { Heya } from "@/engine/types/heya";
import type { MyosekiStock } from "@/engine/types/myoseki";
import { BOARD_COMMITTEE } from "@/constants/engine/committee";

describe("share-proportional board seats", () => {
  it("the clan holding the most kabu takes the most board seats at equal capital", () => {
    const world = MockFactory.createWorld({ year: 2026 });
    const stocks: Record<string, MyosekiStock> = {};
    // Clan A: 5 heyas each holding stock. Clan B: 5 heyas holding none.
    // Equal politicalCapital — only kabu power should separate them.
    for (let i = 0; i < 5; i++) {
      const h = MockFactory.createHeya(`a${i}`, {
        politicalCapital: 50,
        reputation: 50,
      }) as Heya & { ichimon: string };
      h.ichimon = "dewanoumi";
      world.heyas.set(`a${i}`, h);
      world.oyakata.set(`oya-a${i}`, MockFactory.createOyakata(`oya-a${i}`, { heyaId: `a${i}` }));
      stocks[`stk-a${i}`] = {
        id: `stk-a${i}`,
        name: `A Stock ${i}`,
        prestigeTier: "modest",
        ownerId: `oya-a${i}`,
        holderId: `oya-a${i}`,
        status: "held",
      } as MyosekiStock;
      const g = MockFactory.createHeya(`z${i}`, {
        politicalCapital: 50,
        reputation: 50,
      }) as Heya & { ichimon: string };
      g.ichimon = "tokitsukaze";
      world.heyas.set(`z${i}`, g);
      world.oyakata.set(`oya-z${i}`, MockFactory.createOyakata(`oya-z${i}`, { heyaId: `z${i}` }));
    }
    world.myosekiMarket = { stocks, history: [] };

    const impact = runElections(world);
    const events = (impact.events ?? []) as Array<{ data?: Record<string, unknown> }>;
    const winners = events
      .filter((e) => e.data?.incident === "election_victory")
      .map((e) => String(e.data?.heyaId ?? ""));
    const clanAWins = winners.filter((id) => id.startsWith("a")).length;
    expect(winners.length).toBeGreaterThanOrEqual(Math.min(BOARD_COMMITTEE.size, 10));
    expect(clanAWins).toBeGreaterThanOrEqual(Math.ceil(winners.length / 2));
  });
});
