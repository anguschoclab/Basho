/**
 * v18TournamentSim.test.ts
 * ========================
 * V18 regression pins for TournamentSimulator world isolation.
 *
 * BUG V18-T1 — lower-division rikishi objects are shared with the caller's
 *   world and mutated in place. simulateEntireBasho shallow-clones the
 *   rikishi map (TournamentSimulator.ts:315) and replaces only sekitori
 *   entries during standings init (:325-333). In simulateDay, resolved
 *   bouts write `winner.currentBashoWins`/`loser.currentBashoLosses`
 *   (:181-182) directly onto whatever object the map holds — for
 *   makushita-and-below wrestlers that is the caller's object.
 *   (Fusensho path :100-101 has the same leak.) Prior art:
 *   tests/unit/engine/consolidation/v16Regressions.test.ts (V16-B49)
 *   pinned nested-field isolation; this pins the top-level field leak.
 *
 * BUG V18-T2 — DISPROVED / unreproducible by construction:
 *   "in-bout injuries propagate into BashoSimResult.injuries".
 *   Evidence gathered from ~8,000 probed bouts across five stat profiles
 *   (former scratch probe, deleted): st.inBoutInjury was produced 0 times.
 *   Two compounding structural reasons:
 *     a) The producer is effectively unreachable — edgeCrisis.ts:154-158
 *        requires `(toe/TOE_POSITION_MAX) * (pressureX+|pressureZ|) *
 *        EDGE_INJURY_RISK_MULT > EDGE_INJURY_RISK_THRESHOLD` (0.15), while
 *        opponentPressure is the push-battle momentum, which is seeded from
 *        stat-scale force at tachiai and only ever decays
 *        (EDGE_ESCAPE_MOMENTUM_RETENTION) — it can never grow past ~150.
 *     b) The collection site is dead code — simulateDay reads
 *        `east.injured`/`west.injured` at :198-199, but the `eitherAbsent`
 *        guard at :162-172 already `continue`d for any injured rikishi, so
 *        those flags are provably false at the read site. And nothing reads
 *        `match.result.inBoutInjury` at all.
 *   Therefore BashoSimResult.injuries is always [] — the reported leak
 *   cannot be demonstrated through the real path, and the fix must wire a
 *   new channel (e.g. result.inBoutInjury → injuries) rather than repair
 *   an existing one.
 */
import { describe, it, expect } from "vitest";
import { simulateEntireBasho } from "@/engine/simulation/TournamentSimulator";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { Rikishi } from "@/engine/types/rikishi";

function lowerDivisionWorld() {
  const world = MockFactory.createWorld();
  const lowers: Rikishi[] = [];
  for (let i = 1; i <= 8; i++) {
    const r = MockFactory.createRikishi(`mk-${i}`, {
      division: "makushita",
      rank: "makushita",
      rankNumber: i,
      side: i % 2 === 1 ? "east" : "west",
      heyaId: `heya-${i}`,
    });
    lowers.push(r);
    world.rikishi.set(r.id, r);
  }
  const sekitori: Rikishi[] = [];
  for (let i = 1; i <= 4; i++) {
    const r = MockFactory.createRikishi(`m-${i}`, {
      division: "makuuchi",
      rank: "maegashira",
      rankNumber: i,
      side: i % 2 === 1 ? "east" : "west",
      heyaId: `heya-m${i}`,
    });
    sekitori.push(r);
    world.rikishi.set(r.id, r);
  }
  return { world, lowers, sekitori };
}

describe("V18-T1 — simulateEntireBasho must not mutate caller's rikishi", () => {
  it("lower-division input objects keep their pre-sim win/loss fields", () => {
    const { world, lowers } = lowerDivisionWorld();

    simulateEntireBasho(world, "hatsu", "v18-t1");

    // simulateDay writes currentBashoWins/currentBashoLosses on the shared
    // objects. FAILS today for every lower-division winner/loser.
    for (const r of lowers) {
      const original = world.rikishi.get(r.id)!;
      expect(original.currentBashoWins ?? 0, `${r.id} wins mutated`).toBe(0);
      expect(original.currentBashoLosses ?? 0, `${r.id} losses mutated`).toBe(0);
    }
  });

  it("sekitori input objects are already isolated (control)", () => {
    const { world, sekitori } = lowerDivisionWorld();

    simulateEntireBasho(world, "hatsu", "v18-t1");

    // Sekitori are replaced with fresh copies during standings init — the
    // originals stay untouched both today and after the fix. Passing here
    // proves the lower-division assertion above is not vacuous.
    for (const r of sekitori) {
      const original = world.rikishi.get(r.id)!;
      expect(original.currentBashoWins ?? 0).toBe(0);
      expect(original.currentBashoLosses ?? 0).toBe(0);
    }
  });
});

describe("V18-T2 — DISPROVED: in-bout injury → BashoSimResult.injuries", () => {
  it("documents that the injuries channel is dead code (always empty)", () => {
    const { world } = lowerDivisionWorld();

    const sim = simulateEntireBasho(world, "hatsu", "v18-t2");

    // Pinned as evidence, not as desired behavior: the collection site can
    // never execute (see file header). If a future fix wires a real injury
    // channel (e.g. match.result.inBoutInjury → injuries), this assertion
    // SHOULD then break — that breakage is the intended tripwire, not a
    // contract to preserve.
    expect(sim.injuries).toEqual([]);
    expect(sim.standings.size).toBeGreaterThan(0);
  });
});
