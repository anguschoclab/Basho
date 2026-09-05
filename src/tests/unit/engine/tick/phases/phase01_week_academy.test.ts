import { describe, it, expect } from "vitest";
import { phase01_week_academy } from "@/engine/tick/phases/phase01_week_academy";
import { buildYouthAcademy, generateYearlyIntake, getYouthAcademy } from "@/engine/systems/recruitment/YouthAcademyService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import type { WorldState } from "@/engine/types/world";

function makeWorld(cash = 10_000_000): WorldState {
  return {
    seed: "academy-phase-test",
    year: 2026,
    week: 5,
    heyas: new Map([
      ["h1", {
        id: "h1",
        name: "Test Heya",
        economics: { cash },
        rikishiIds: [],
      } as any],
    ]),
    rikishi: new Map(),
    playerHeyaId: "h1",
    events: { log: [] },
  } as any;
}

describe("phase01_week_academy", () => {
  it("is a no-op when no heyas have academies", () => {
    const world = makeWorld();
    const impact = phase01_week_academy(world);
    expect(impact.events ?? []).toHaveLength(0);
  });

  it("applies weekly development to academy prospects", () => {
    const world = makeWorld();
    const w1 = resolveImpacts(world, [buildYouthAcademy(world, "h1")]);
    const w2 = resolveImpacts(w1, [generateYearlyIntake(w1, "h1")]);
    const before = getYouthAcademy(w2.heyas.get("h1")!)!.prospects[0];

    const w3 = resolveImpacts(w2, [phase01_week_academy(w2)]);
    const after = getYouthAcademy(w3.heyas.get("h1")!)!.prospects[0];

    expect(after.developmentPoints).toBeGreaterThanOrEqual(before.developmentPoints);
    expect(after.developmentHistory.length).toBeGreaterThan(before.developmentHistory.length);
  });

  it("is a no-op when academy has no prospects", () => {
    const world = makeWorld();
    const w1 = resolveImpacts(world, [buildYouthAcademy(world, "h1")]);
    const w2 = resolveImpacts(w1, [phase01_week_academy(w1)]);
    const academy = getYouthAcademy(w2.heyas.get("h1")!);
    expect(academy!.prospects).toEqual([]);
  });
});
