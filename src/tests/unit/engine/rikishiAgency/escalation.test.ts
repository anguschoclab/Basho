/**
 * WS4 — Rikishi agency: escalation to incidents.
 *
 * Ignored misery can't be free. A rikishi whose requests keep getting denied
 * and whose stress crosses the incident threshold escalates through canonical
 * paths only — `reportScandal` for low-discipline actors, welfare-risk
 * pressure otherwise. All writes flow through ImpactBuilder.
 */

import { describe, it, expect } from "vitest";
import { phase01_week_rikishi_agency } from "@/engine/tick/phases";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
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
