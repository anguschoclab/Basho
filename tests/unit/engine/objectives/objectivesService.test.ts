/**
 * T1.1 — yearly objectives: issued only in career mode, evaluated at
 * deadline with political-capital stakes, sandbox clears them.
 */
import { describe, it, expect } from "vitest";
import { evaluateObjectives, issueYearlyObjectives } from "@/engine/objectives/ObjectivesService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockHeya, mockRikishi } from "@tests/unit/engine/utils";
import type { WorldState } from "@/engine/types/world";
import type { PlayerObjective } from "@/engine/types/objectives";

function careerWorld(settings?: WorldState["settings"]): WorldState {
  const world = makeMockWorld({
    seed: "obj-test",
    year: 2030,
    playerHeyaId: "h-player",
    heyas: new Map([["h-player", makeMockHeya("h-player", { funds: 10_000_000, politicalCapital: 50 })]]),
    rikishi: new Map(),
    settings: settings ?? { careerMode: "career", archiveMode: "standard" },
  });
  return world;
}

function withSekitori(world: WorldState, count: number) {
  for (let i = 0; i < count; i++) {
    const id = `r-sek-${i}`;
    world.rikishi.set(id, mockRikishi(id, { heyaId: "h-player", division: "makuuchi" }));
  }
}

describe("issueYearlyObjectives (T1.1)", () => {
  it("issues a sekitori objective in career mode", () => {
    const world = careerWorld();
    const resolved = resolveImpacts(world, [issueYearlyObjectives(world)]);
    const active = resolved.objectivesState!.active;
    expect(active.length).toBeGreaterThanOrEqual(1);
    expect(active.some((o) => o.kind === "sekitori_count")).toBe(true);
    expect(active.every((o) => o.outcome === "pending")).toBe(true);
  });

  it("issues nothing in sandbox mode", () => {
    const world = careerWorld({ careerMode: "sandbox", archiveMode: "standard" });
    const resolved = resolveImpacts(world, [issueYearlyObjectives(world)]);
    expect(resolved.objectivesState?.active ?? []).toHaveLength(0);
  });

  it("clears active objectives carried into sandbox mode", () => {
    const world = careerWorld({ careerMode: "sandbox", archiveMode: "standard" });
    world.objectivesState = {
      active: [{ id: "o1" } as PlayerObjective],
      history: [],
    };
    const resolved = resolveImpacts(world, [issueYearlyObjectives(world)]);
    expect(resolved.objectivesState!.active).toHaveLength(0);
    expect(resolved.objectivesState!.history).toHaveLength(0);
  });

  it("is idempotent per year", () => {
    const world = careerWorld();
    const once = resolveImpacts(world, [issueYearlyObjectives(world)]);
    const twice = resolveImpacts(once, [issueYearlyObjectives(once)]);
    expect(twice.objectivesState!.active).toHaveLength(once.objectivesState!.active.length);
  });
});

describe("evaluateObjectives (T1.1)", () => {
  const sekitoriObj: PlayerObjective = {
    id: "o-sek",
    kind: "sekitori_count",
    title: "Reach 2 sekitori",
    baseline: 0,
    target: 2,
    issuedYear: 2029,
    deadlineYear: 2030,
    outcome: "pending",
    stakes: 10,
  };

  it("marks met and grants political capital when target reached", () => {
    const world = careerWorld();
    withSekitori(world, 3);
    world.objectivesState = { active: [sekitoriObj], history: [] };
    const resolved = resolveImpacts(world, [evaluateObjectives(world)]);
    expect(resolved.objectivesState!.active).toHaveLength(0);
    expect(resolved.objectivesState!.history[0].outcome).toBe("met");
    expect(resolved.heyas.get("h-player")!.politicalCapital).toBe(60);
  });

  it("marks failed and deducts capital when target missed", () => {
    const world = careerWorld();
    withSekitori(world, 1);
    world.objectivesState = { active: [sekitoriObj], history: [] };
    const resolved = resolveImpacts(world, [evaluateObjectives(world)]);
    expect(resolved.objectivesState!.history[0].outcome).toBe("failed");
    expect(resolved.heyas.get("h-player")!.politicalCapital).toBe(40);
  });

  it("leaves future-dated objectives pending", () => {
    const world = careerWorld();
    world.objectivesState = {
      active: [{ ...sekitoriObj, deadlineYear: 2035 }],
      history: [],
    };
    const resolved = resolveImpacts(world, [evaluateObjectives(world)]);
    expect(resolved.objectivesState!.active).toHaveLength(1);
  });
});
