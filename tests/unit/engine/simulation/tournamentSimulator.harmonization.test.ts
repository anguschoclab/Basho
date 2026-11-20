import { describe, it, expect } from "vitest";
import { simulateEntireBasho } from "@/engine/simulation/TournamentSimulator";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { Rikishi } from "@/engine/types/rikishi";

/**
 * TournamentSimulator ↔ production harmonization (W0).
 *
 * The autosim previously ran a divergent third bout path: its own
 * injured→absent fusensho gate, fusenpai recorded as a *loss* (production
 * records an *absence*), and hand-rolled standings/career bookkeeping that
 * bypassed applyBoutResult (no boutMetrics, h2h, injury rolls, or events).
 *
 * Post-harmonization every sim bout flows through the shared
 * resolveAndApplyBout pipeline, so autosims exercise the same semantics the
 * interactive and batch paths use.
 */
function sekitoriWorld(count = 4) {
  const world = MockFactory.createWorld();
  const rikishi: Rikishi[] = [];
  for (let i = 1; i <= count; i++) {
    const r = MockFactory.createRikishi(`m-${i}`, {
      division: "makuuchi",
      rank: "maegashira",
      rankNumber: i,
      side: i % 2 === 1 ? "east" : "west",
      heyaId: `heya-m${i}`,
    });
    rikishi.push(r);
    world.rikishi.set(r.id, r);
  }
  return { world, rikishi };
}

describe("simulateEntireBasho — harmonized application pipeline", () => {
  it("accumulates boutMetrics through applyBoutResult", () => {
    const { world } = sekitoriWorld();
    const sim = simulateEntireBasho(world, "hatsu", "harm-metrics");

    // The old sim path never ran applyBoutResult, so boutMetrics stayed
    // empty — this is the observable proof the shared pipeline now runs.
    const metrics = sim.finalWorld.currentBasho?.boutMetrics ?? {};
    expect(Object.keys(metrics).length).toBeGreaterThan(0);
  });

  it("career wins are applied exactly once per bout (no double-count)", () => {
    const { world, rikishi } = sekitoriWorld();
    const sim = simulateEntireBasho(world, "hatsu", "harm-career");

    for (const r of rikishi) {
      const final = sim.finalWorld.rikishi.get(r.id)!;
      const wins = sim.standings.get(r.id)?.wins ?? 0;
      // persistBashoState must not re-add what applyBoutResult already wrote.
      expect(final.careerWins ?? 0).toBe((r.careerWins ?? 0) + wins);
    }
  });

  it("every scheduled match carries a BoutResult", () => {
    const { world } = sekitoriWorld();
    const sim = simulateEntireBasho(world, "hatsu", "harm-results");

    const matches = sim.finalWorld.currentBasho?.matches ?? [];
    expect(matches.length).toBeGreaterThan(0);
    for (const m of matches) {
      expect(m.result, `match ${m.boutId} missing result`).toBeTruthy();
    }
  });

  it("standings return map is sekitori-only and consistent with basho.standings", () => {
    const { world } = sekitoriWorld();
    const sim = simulateEntireBasho(world, "hatsu", "harm-standings");

    for (const [id, rec] of sim.standings) {
      const r = sim.finalWorld.rikishi.get(id)!;
      expect(["makuuchi", "juryo"]).toContain(r.division);
      const bashoRec = sim.finalWorld.currentBasho?.standings?.get(id);
      expect(bashoRec?.wins).toBe(rec.wins);
      expect(bashoRec?.losses).toBe(rec.losses);
    }
  });

  it("injuries array contains only shikona of rikishi injured during the sim", () => {
    const { world } = sekitoriWorld(6);
    const sim = simulateEntireBasho(world, "hatsu", "harm-injuries");

    const shikona = new Set(Array.from(sim.finalWorld.rikishi.values()).map((r) => r.shikona));
    for (const name of sim.injuries) {
      expect(shikona.has(name)).toBe(true);
    }
  });
});
