/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { projectGovernancePage } from "../../../presenters/projections/governanceProjections";
import { createMockWorldState, createMockHeya } from "../../utils/testHelpers";

function makeWorld(playerHeya: any, extraHeyas: any[] = [], overrides: any = {}) {
  const heyaMap = new Map<string, any>([[playerHeya.id, playerHeya]]);
  for (const h of extraHeyas) heyaMap.set(h.id, h);
  return createMockWorldState({
    playerHeyaId: playerHeya.id,
    heyas: heyaMap,
    governanceLog: [],
    ...overrides,
  });
}

describe("projectGovernancePage", () => {
  it("returns null when heya not in map", () => {
    const world = createMockWorldState({ heyas: new Map() });
    expect(projectGovernancePage(world as any, "missing")).toBeNull();
  });

  it("defaults scandalScore to 0 when not set → scandalBand: clean", () => {
    const heya = createMockHeya({ id: "h1", scandalScore: undefined });
    const world = makeWorld(heya);
    const result = projectGovernancePage(world as any, "h1");
    expect(result?.scandalScore).toBe(0);
    expect(result?.scandalBand).toBe("clean");
  });

  describe("scandalBand boundaries", () => {
    const cases: [number, string][] = [
      [0, "clean"],
      [9, "clean"],
      [10, "whispers"],
      [29, "whispers"],
      [30, "scrutiny"],
      [54, "scrutiny"],
      [55, "scandal"],
      [79, "scandal"],
      [80, "crisis"],
      [100, "crisis"],
    ];
    for (const [score, expected] of cases) {
      it(`scandalScore=${score} → "${expected}"`, () => {
        const heya = createMockHeya({ id: "h1", scandalScore: score });
        const world = makeWorld(heya);
        const result = projectGovernancePage(world as any, "h1");
        expect(result?.scandalBand).toBe(expected);
      });
    }
  });

  it("isSanctioned is true when governanceStatus is sanctioned", () => {
    const heya = createMockHeya({ id: "h1", governanceStatus: "sanctioned" });
    const world = makeWorld(heya);
    const result = projectGovernancePage(world as any, "h1");
    expect(result?.isSanctioned).toBe(true);
  });

  it("isSanctioned is false when governanceStatus is good_standing", () => {
    const heya = createMockHeya({ id: "h1", governanceStatus: "good_standing" });
    const world = makeWorld(heya);
    const result = projectGovernancePage(world as any, "h1");
    expect(result?.isSanctioned).toBe(false);
  });

  it("forwards politicalCapital and politicalCapitalMax is always 100", () => {
    const heya = createMockHeya({ id: "h1", politicalCapital: 42 });
    const world = makeWorld(heya);
    const result = projectGovernancePage(world as any, "h1");
    expect(result?.politicalCapital).toBe(42);
    expect(result?.politicalCapitalMax).toBe(100);
  });

  it("includes welfareWarning for heya with welfareRisk >= 55", () => {
    const playerHeya = createMockHeya({ id: "player" });
    const riskyHeya = createMockHeya({
      id: "risky",
      rikishiIds: ["r1"],
      welfareState: { welfareRisk: 55, complianceState: "compliant", weeksInState: 1 },
    });
    const world = makeWorld(playerHeya, [riskyHeya]);
    const result = projectGovernancePage(world as any, "player");
    expect(result?.welfareWarnings.some((w: any) => w.heyaId === "risky")).toBe(true);
  });

  it("excludes heya with welfareRisk < 55 and compliant state from welfareWarnings", () => {
    const playerHeya = createMockHeya({ id: "player" });
    const safeHeya = createMockHeya({
      id: "safe",
      rikishiIds: ["r1"],
      welfareState: { welfareRisk: 20, complianceState: "compliant", weeksInState: 0 },
    });
    const world = makeWorld(playerHeya, [safeHeya]);
    const result = projectGovernancePage(world as any, "player");
    expect(result?.welfareWarnings.some((w: any) => w.heyaId === "safe")).toBe(false);
  });

  it("includes welfareWarning for heya with complianceState sanctioned (even low risk)", () => {
    const playerHeya = createMockHeya({ id: "player" });
    const sanctionedHeya = createMockHeya({
      id: "sanctioned",
      rikishiIds: ["r1"],
      welfareState: { welfareRisk: 10, complianceState: "sanctioned", weeksInState: 3 },
    });
    const world = makeWorld(playerHeya, [sanctionedHeya]);
    const result = projectGovernancePage(world as any, "player");
    expect(result?.welfareWarnings.some((w: any) => w.heyaId === "sanctioned")).toBe(true);
  });

  it("includes welfareWarning for heya with complianceState investigation", () => {
    const playerHeya = createMockHeya({ id: "player" });
    const investigatedHeya = createMockHeya({
      id: "investigated",
      rikishiIds: ["r1"],
      welfareState: { welfareRisk: 5, complianceState: "investigation", weeksInState: 2 },
    });
    const world = makeWorld(playerHeya, [investigatedHeya]);
    const result = projectGovernancePage(world as any, "player");
    expect(result?.welfareWarnings.some((w: any) => w.heyaId === "investigated")).toBe(true);
  });

  it("includes mergerCandidate for NPC heya with funds < 0 and roster <= 3", () => {
    const playerHeya = createMockHeya({ id: "player" });
    const mergeable = createMockHeya({
      id: "broke",
      funds: -1,
      rikishiIds: ["r1", "r2"],
    });
    const world = makeWorld(playerHeya, [mergeable]);
    const result = projectGovernancePage(world as any, "player");
    expect(result?.mergerCandidates.some((m: any) => m.heyaId === "broke")).toBe(true);
  });

  it("excludes NPC heya with funds > 0 from mergerCandidates", () => {
    const playerHeya = createMockHeya({ id: "player" });
    const rich = createMockHeya({ id: "rich", funds: 5_000_000, rikishiIds: ["r1"] });
    const world = makeWorld(playerHeya, [rich]);
    const result = projectGovernancePage(world as any, "player");
    expect(result?.mergerCandidates.some((m: any) => m.heyaId === "rich")).toBe(false);
  });

  it("excludes player heya from mergerCandidates even if broke", () => {
    const playerHeya = createMockHeya({ id: "player", funds: -999, rikishiIds: ["r1"] });
    const world = makeWorld(playerHeya);
    const result = projectGovernancePage(world as any, "player");
    expect(result?.mergerCandidates.some((m: any) => m.heyaId === "player")).toBe(false);
  });

  it("forwards governanceLog from world; defaults to [] when absent", () => {
    const heya = createMockHeya({ id: "h1" });
    const log = [{ week: 1, event: "warning" }];
    const worldWithLog = makeWorld(heya, [], { governanceLog: log });
    expect(projectGovernancePage(worldWithLog as any, "h1")?.governanceLog).toBe(log);

    const worldWithout = makeWorld(heya, [], { governanceLog: undefined });
    expect(projectGovernancePage(worldWithout as any, "h1")?.governanceLog).toEqual([]);
  });

  it("returns correct status from governanceStatus field", () => {
    const heya = createMockHeya({ id: "h1", governanceStatus: "probation" });
    const world = makeWorld(heya);
    const result = projectGovernancePage(world as any, "h1");
    expect(result?.status).toBe("probation");
  });
});
