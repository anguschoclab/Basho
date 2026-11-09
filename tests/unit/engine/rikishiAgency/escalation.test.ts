/**
 * WS4 — Rikishi agency: escalation to incidents.
 *
 * Ignored misery can't be free. A rikishi whose requests keep getting denied
 * and whose stress crosses the incident threshold escalates through canonical
 * paths only — `reportScandal` for low-discipline actors, welfare-risk
 * pressure otherwise. All writes flow through ImpactBuilder.
 */

import { describe, it, expect } from "vitest";
import { phase01_week_rikishi_agency } from "@/engine/tick/phases/index";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { rngForWorld } from "@/engine/core/rng";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import {
  INCIDENT_PROBABILITY,
  INCIDENT_WELFARE_RISK_DELTA,
} from "@/constants/engine/rikishiAgency";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";

function worldWith(r: Rikishi): WorldState {
  const world = MockFactory.createWorld({ cyclePhase: "interim", week: 10 });
  world.rikishi = new Map([[r.id, r]]);
  world.heyas.set("h-npc", MockFactory.createHeya("h-npc", { rikishiIds: [r.id] }));
  return world;
}

function volatileRikishi(discipline: number): Rikishi {
  return MockFactory.createRikishi({
    id: "r-volatile",
    heyaId: "h-npc",
    motivation: 15,
    momentum: 5,
    fatigue: 60,
    behavior: { discipline, mediaSavvy: 20, stress: 95 },
    agency: {
      satisfaction: 10,
      restlessness: 95,
      loyaltyBand: "discontent",
      deniedCount: 3,
      grantedCount: 0,
    },
  } as Partial<Rikishi>);
}

describe("incident escalation", () => {
  it("low-discipline unrest can escalate into a scandal via reportScandal", () => {
    // Run several deterministic seeds — at least one must produce a
    // scandal-score bump through the canonical GOVERNANCE_RULING path.
    let scandalSeen = false;
    for (const seed of ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"]) {
      const world = worldWith(volatileRikishi(15));
      world.seed = seed;
      const next = resolveImpacts(world, [phase01_week_rikishi_agency(world)]);
      if ((next.heyas.get("h-npc")!.scandalScore ?? 0) > 0) scandalSeen = true;
    }
    expect(scandalSeen).toBe(true);
  });

  it("unrest without low discipline raises welfare risk instead of scandal", () => {
    let welfareSeen = false;
    for (const seed of ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"]) {
      const world = worldWith(volatileRikishi(80));
      world.seed = seed;
      const next = resolveImpacts(world, [phase01_week_rikishi_agency(world)]);
      const h = next.heyas.get("h-npc")!;
      if ((h.welfareState?.welfareRisk ?? 0) > 0) welfareSeen = true;
    }
    expect(welfareSeen).toBe(true);
  });

  it("a settled rikishi never escalates", () => {
    const world = worldWith(
      MockFactory.createRikishi({
        id: "r-calm",
        heyaId: "h-npc",
        motivation: 80,
        behavior: { discipline: 70, mediaSavvy: 50, stress: 10 },
      } as Partial<Rikishi>)
    );
    const next = resolveImpacts(world, [phase01_week_rikishi_agency(world)]);
    expect(next.heyas.get("h-npc")!.scandalScore ?? 0).toBe(0);
  });

  it("incident decisions are deterministic for a fixed seed", () => {
    const run = () => {
      const world = worldWith(volatileRikishi(15));
      world.seed = "fixed-seed";
      const next = resolveImpacts(world, [phase01_week_rikishi_agency(world)]);
      return next.heyas.get("h-npc")!.scandalScore ?? 0;
    };
    expect(run()).toBe(run());
  });
});

/**
 * V18 batch-integrity pins — same-heya escalations inside ONE weekly phase.
 *
 * The phase merges every escalation into a single ImpactBuilder built from
 * the INPUT world. `reportScandal` computes the new scandalScore and each
 * `generateGovernanceHeadline` rebuilds `mediaState.headlines` off that same
 * input snapshot, so N same-heya escalations currently land as ONE score
 * bump + ONE headline (last write wins) instead of N.
 */
describe("V18 — same-heya escalations in one weekly batch", () => {
  const WEEK = 10;

  /**
   * Fixture selection only: scan candidate ids for ones the phase's own
   * seeded escalation gate will fire. Assertions below read the resolved
   * world — never this stream — so a gate change degrades to the `>= 2`
   * sanity check failing, never a false pass.
   */
  function escalatingIds(world: WorldState, wanted: number): string[] {
    const week = world.week ?? 0;
    const ids: string[] = [];
    for (let i = 0; ids.length < wanted && i < 400; i++) {
      const rid = `r-esc-${i}`;
      if (
        rngForWorld(world, "rikishiAgency", `${rid}:${week}`).next() < INCIDENT_PROBABILITY
      ) {
        ids.push(rid);
      }
    }
    return ids;
  }

  function worldWithEscalating(discipline: number, ids: string[]): WorldState {
    const world = MockFactory.createWorld({ cyclePhase: "interim", week: WEEK });
    world.heyas.set("h-npc", MockFactory.createHeya("h-npc", { rikishiIds: ids }));
    for (const id of ids) {
      world.rikishi.set(
        id,
        MockFactory.createRikishi({
          id,
          heyaId: "h-npc",
          motivation: 15,
          momentum: 5,
          fatigue: 60,
          behavior: { discipline, mediaSavvy: 20, stress: 95 },
          agency: {
            satisfaction: 10,
            restlessness: 95,
            loyaltyBand: "discontent",
            deniedCount: 3,
            grantedCount: 0,
          },
        } as Partial<Rikishi>)
      );
    }
    return world;
  }

  function scandalBatch() {
    // discipline < INCIDENT_DISCIPLINE_SCANDAL_MAX → reportScandal path
    const probe = MockFactory.createWorld({ cyclePhase: "interim", week: WEEK });
    const world = worldWithEscalating(15, escalatingIds(probe, 4));
    const impact = phase01_week_rikishi_agency(world);
    const fired = (impact.events ?? []).filter(
      (e) => e.type === "GOVERNANCE_RULING" && e.data?.incident === "scandal_reported"
    ).length;
    return { impact, fired, resolved: resolveImpacts(world, [impact]) };
  }

  it("two same-heya scandals in one phase each accrue scandal score", () => {
    const { fired, resolved } = scandalBatch();
    expect(fired).toBeGreaterThanOrEqual(2); // ≥2 escalations provably fired

    // The rulings append correctly — proving all N reportScandal calls ran —
    // but each +5 bump is computed off the INPUT world's score, so the
    // merged builder keeps only the last +5 write.
    expect((resolved.governanceLog ?? []).length).toBe(fired);
    expect(resolved.heyas.get("h-npc")!.scandalScore).toBe(5 * fired);
  });

  it("each same-heya scandal in one phase emits its own headline", () => {
    const { fired, resolved } = scandalBatch();
    expect(fired).toBeGreaterThanOrEqual(2);

    // Every reportScandal merges a headline impact that rebuilds
    // mediaState.headlines off the INPUT state — last write wins, so N
    // fired scandals land exactly one headline today.
    expect(resolved.mediaState!.headlines.length).toBe(fired);
  });

  it("two same-heya welfare escalations in one phase each add welfare risk", () => {
    // discipline >= INCIDENT_DISCIPLINE_SCANDAL_MAX → welfare-risk path
    const probe = MockFactory.createWorld({ cyclePhase: "interim", week: WEEK });
    const ids = escalatingIds(probe, 4);
    const world = worldWithEscalating(80, ids);

    const impact = phase01_week_rikishi_agency(world);
    const fired = (impact.events ?? []).filter(
      (e) => e.type === "WELFARE_COMPLIANCE" && e.data?.status === "stable_unrest"
    ).length;
    expect(fired).toBeGreaterThanOrEqual(2);

    const resolved = resolveImpacts(world, [impact]);
    // Input heya has no welfareState → base risk 0; every escalation writes
    // `ws.welfareRisk + INCIDENT_WELFARE_RISK_DELTA` off the same input
    // snapshot, so today only one +delta survives the merge.
    expect(resolved.heyas.get("h-npc")!.welfareState!.welfareRisk).toBe(
      INCIDENT_WELFARE_RISK_DELTA * fired
    );
  });
});
