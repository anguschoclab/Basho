/**
 * Spec — clan-quota JSA board elections (理事選).
 *
 * Real board seats are apportioned inside clan (ichimon) caucuses: each
 * clan's kabu count is its vote weight, seats split by largest remainder,
 * and each caucus's slate is its stablemasters ranked by standing. The
 * board elects a chairman internally — cross-clan consensus, not the top
 * single score. Results persist to `world.jsaBoard`.
 */
import { describe, it, expect } from "vitest";
import { runElections } from "@/engine/governance/services/ScandalService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockHeya } from "@tests/unit/engine/utils";
import { BOARD_COMMITTEE } from "@/constants/engine/committee";
import type { WorldState } from "@/engine/types/world";
import type { IchimonName } from "@/engine/types/economy";
import type { MyosekiStock } from "@/engine/types/myoseki";
import type { Oyakata } from "@/engine/types/oyakata";

const CLANS: IchimonName[] = ["Dewanoumi", "Nishonoseki", "Tokitsukaze", "Isegahama", "Takasago"];

/**
 * `heyasPerClan` candidates per clan; `kabuPerClan` held stocks tagged to the
 * clan (holder = the clan's first oyakata). Per-heya score varies so intra-
 * clan ordering is deterministic.
 */
function clanWorld(
  kabuPerClan: Partial<Record<IchimonName, number>>,
  heyasPerClan = 3,
  opts: { oyakataYears?: Record<string, number>; polCap?: Record<string, number> } = {}
): WorldState {
  const world = makeMockWorld({ year: 2026 });
  const stocks: Record<string, MyosekiStock> = {};
  for (const clan of CLANS) {
    for (let i = 0; i < heyasPerClan; i++) {
      const id = `${clan}-${i}`;
      const heya = makeMockHeya(id, {
        ichimon: clan,
        oyakataId: `oya-${id}`,
        politicalCapital: opts.polCap?.[id] ?? 50 + i,
        reputation: 50 + i,
      });
      world.heyas.set(id, heya);
      world.oyakata.set(`oya-${id}`, {
        id: `oya-${id}`,
        name: `Oya ${id}`,
        shikona: `Oya${id}`,
        heyaId: id,
        yearsInCharge: opts.oyakataYears?.[id] ?? i,
      } as unknown as Oyakata);
    }
    const kabu = kabuPerClan[clan] ?? 0;
    for (let k = 0; k < kabu; k++) {
      const sid = `stk-${clan}-${k}`;
      stocks[sid] = {
        id: sid,
        name: `${clan} Share ${k}`,
        prestigeTier: "modest",
        ownerId: `oya-${clan}-0`,
        holderId: `oya-${clan}-0`,
        status: "held",
        ichimon: clan,
      } as MyosekiStock;
    }
  }
  world.myosekiMarket = { stocks, history: [] };
  return world;
}

function electedHeyaIds(world: WorldState): string[] {
  const impact = runElections(world);
  return (impact.events ?? [])
    .filter((e) => (e.data as Record<string, unknown>)?.incident === "election_victory")
    .map((e) => String(e.heyaId));
}

describe("clan-quota apportionment", () => {
  it("35/29/16/11/11 kabu → seats apportion ≈ 3/3/2/1/1 by largest remainder", () => {
    const world = clanWorld({
      Dewanoumi: 35,
      Nishonoseki: 29,
      Tokitsukaze: 16,
      Isegahama: 11,
      Takasago: 11,
    });
    const winners = electedHeyaIds(world);
    expect(winners.length).toBe(BOARD_COMMITTEE.size);
    const byClan = (clan: IchimonName) => winners.filter((id) => id.startsWith(clan)).length;
    expect(byClan("Dewanoumi")).toBe(3);
    expect(byClan("Nishonoseki")).toBe(3);
    expect(byClan("Tokitsukaze")).toBe(2);
    expect(byClan("Isegahama")).toBe(1);
    expect(byClan("Takasago")).toBe(1);
  });

  it("a clan's slate is its own stablemasters ranked by standing — never another clan's", () => {
    const world = clanWorld({ Dewanoumi: 40, Nishonoseki: 10 }, 4);
    const winners = electedHeyaIds(world);
    // Dewanoumi dominates the electorate but only fields 4 candidates — its
    // caucus caps there; unfilled seats redistribute to the other clans.
    expect(winners.filter((id) => id.startsWith("Dewanoumi")).length).toBeLessThanOrEqual(4);
    expect(winners.length).toBe(BOARD_COMMITTEE.size);
    // Within each clan, winners are that clan's top standing — never a
    // lower-ranked member skipped for an outsider.
    const dWinners = winners.filter((id) => id.startsWith("Dewanoumi"));
    expect(dWinners).toContain("Dewanoumi-3"); // highest scorer in the caucus
  });

  it("stockless elders add +1 vote to their clan's caucus", () => {
    // 2 clans: Dewanoumi has 1 kabu; Nishonoseki none but one extra stockless elder.
    const world = clanWorld({ Dewanoumi: 1 }, 2);
    world.oyakata.set("oya-extra", {
      id: "oya-extra",
      name: "Extra",
      shikona: "Extra",
      heyaId: "Nishonoseki-0",
      elderStatus: "jun_toshiyori",
      yearsInCharge: 0,
    } as unknown as Oyakata);
    const next = resolveImpacts(world, [runElections(world)]);
    expect(next.jsaBoard?.clanSeats?.["Nishonoseki"]).toBeGreaterThanOrEqual(1);
  });
});

describe("persisted jsaBoard", () => {
  it("writes directors, clanSeats, externalSeats and electedYear to the world", () => {
    const world = clanWorld({ Dewanoumi: 30, Nishonoseki: 25, Tokitsukaze: 15 });
    const next = resolveImpacts(world, [runElections(world)]);
    const board = next.jsaBoard;
    expect(board).toBeDefined();
    expect(board!.directors.length).toBe(BOARD_COMMITTEE.size);
    expect(board!.externalSeats).toBe(3);
    expect(board!.electedYear).toBe(2026);
    expect(board!.directors.filter((d) => d.isChairman).length).toBe(1);
    for (const d of board!.directors) {
      expect(d.heyaId).toBeTruthy();
      expect(d.ichimon).toBeTruthy();
    }
  });

  it("chairman is an internal board pick, not the top influence score", () => {
    // Dewanoumi-0 outscores everyone, but Nishonoseki-0's 30-year elder is the
    // consensus chairman (rep + polCap + 2×yearsInCharge).
    const world = clanWorld(
      { Dewanoumi: 30, Nishonoseki: 30 },
      3,
      {
        polCap: { "Dewanoumi-0": 100, "Nishonoseki-0": 80 },
        oyakataYears: { "Nishonoseki-0": 30 },
      }
    );
    world.heyas.get("Dewanoumi-0")!.reputation = 100;
    world.heyas.get("Nishonoseki-0")!.reputation = 80;
    const next = resolveImpacts(world, [runElections(world)]);
    const chair = next.jsaBoard!.directors.find((d) => d.isChairman)!;
    expect(chair.heyaId).toBe("Nishonoseki-0");
  });

  it("is deterministic — same world elects the same board", () => {
    const world = clanWorld({ Dewanoumi: 30, Nishonoseki: 20, Tokitsukaze: 10 });
    const a = resolveImpacts(world, [runElections(world)]);
    const b = resolveImpacts(world, [runElections(world)]);
    expect(b.jsaBoard).toEqual(a.jsaBoard);
  });
});
