import { describe, it, expect } from "vitest";
import { projectGovernanceDerived } from "@/presenters/projections/governanceProjections";
import type { Heya } from "@/engine/types/heya";
import type { WorldState } from "@/engine/types/world";

function makeHeya(overrides: Record<string, unknown> = {}): Heya {
  return {
    id: "h1",
    name: "Test Stable",
    governanceStatus: "good_standing",
    scandalScore: 0,
    politicalCapital: 50,
    welfareState: { welfareRisk: 10, complianceState: "compliant" },
    governanceHistory: [],
    ...overrides,
  } as unknown as Heya;
}

function makeWorld(heya: Heya = makeHeya()): WorldState {
  const heyas = new Map<string, Heya>();
  heyas.set(heya.id, heya);
  return {
    heyas,
    playerHeyaId: heya.id,
    governanceLog: [],
    factions: {},
    events: { log: [] },
  } as unknown as WorldState;
}

describe("projectGovernanceDerived", () => {
  it("returns scandal tone for clean band", () => {
    const heya = makeHeya({ scandalScore: 5 });
    const result = projectGovernanceDerived(makeWorld(heya), heya);
    expect(result.scandalTone).toBe("success");
  });

  it("returns scandal tone for whispers band", () => {
    const heya = makeHeya({ scandalScore: 20 });
    const result = projectGovernanceDerived(makeWorld(heya), heya);
    expect(result.scandalTone).toBe("default");
  });

  it("returns scandal tone for scrutiny band", () => {
    const heya = makeHeya({ scandalScore: 40 });
    const result = projectGovernanceDerived(makeWorld(heya), heya);
    expect(result.scandalTone).toBe("warning");
  });

  it("returns scandal tone for scandal/crisis band", () => {
    const heya = makeHeya({ scandalScore: 85 });
    const result = projectGovernanceDerived(makeWorld(heya), heya);
    expect(result.scandalTone).toBe("destructive");
  });

  it("returns welfare label Safe for low risk", () => {
    const heya = makeHeya({ welfareState: { welfareRisk: 15, complianceState: "compliant" } });
    const result = projectGovernanceDerived(makeWorld(heya), heya);
    expect(result.welfareLabel).toBe("Safe");
    expect(result.welfareTone).toBe("success");
  });

  it("returns welfare label Cautious for moderate risk", () => {
    const heya = makeHeya({ welfareState: { welfareRisk: 30, complianceState: "compliant" } });
    const result = projectGovernanceDerived(makeWorld(heya), heya);
    expect(result.welfareLabel).toBe("Cautious");
    expect(result.welfareTone).toBe("default");
  });

  it("returns welfare label Elevated for high risk", () => {
    const heya = makeHeya({ welfareState: { welfareRisk: 55, complianceState: "watch" } });
    const result = projectGovernanceDerived(makeWorld(heya), heya);
    expect(result.welfareLabel).toBe("Elevated");
    expect(result.welfareTone).toBe("warning");
  });

  it("returns welfare label Critical for very high risk", () => {
    const heya = makeHeya({ welfareState: { welfareRisk: 80, complianceState: "critical" } });
    const result = projectGovernanceDerived(makeWorld(heya), heya);
    expect(result.welfareLabel).toBe("Critical");
    expect(result.welfareTone).toBe("destructive");
  });

  it("returns compliance tone for compliant state", () => {
    const heya = makeHeya({ welfareState: { welfareRisk: 10, complianceState: "compliant" } });
    const result = projectGovernanceDerived(makeWorld(heya), heya);
    expect(result.compTone).toBe("success");
  });

  it("returns compliance tone for watch state", () => {
    const heya = makeHeya({ welfareState: { welfareRisk: 10, complianceState: "watch" } });
    const result = projectGovernanceDerived(makeWorld(heya), heya);
    expect(result.compTone).toBe("warning");
  });

  it("returns compliance tone for critical state", () => {
    const heya = makeHeya({ welfareState: { welfareRisk: 10, complianceState: "critical" } });
    const result = projectGovernanceDerived(makeWorld(heya), heya);
    expect(result.compTone).toBe("destructive");
  });

  it("returns status tone for good_standing", () => {
    const heya = makeHeya({ governanceStatus: "good_standing" });
    const result = projectGovernanceDerived(makeWorld(heya), heya);
    expect(result.statusTone).toBe("success");
    expect(result.statusSub).toBe("No active concerns");
  });

  it("returns status tone for warning", () => {
    const heya = makeHeya({ governanceStatus: "warning" });
    const result = projectGovernanceDerived(makeWorld(heya), heya);
    expect(result.statusTone).toBe("warning");
    expect(result.statusSub).toBe("Council has noted concerns");
  });

  it("returns status tone for probation", () => {
    const heya = makeHeya({ governanceStatus: "probation" });
    const result = projectGovernanceDerived(makeWorld(heya), heya);
    expect(result.statusTone).toBe("destructive");
    expect(result.statusSub).toBe("Formal probation in effect");
  });

  it("returns status tone for sanctioned", () => {
    const heya = makeHeya({ governanceStatus: "sanctioned" });
    const result = projectGovernanceDerived(makeWorld(heya), heya);
    expect(result.statusTone).toBe("destructive");
    expect(result.statusSub).toBe("Serious sanctions applied");
  });

  it("handles missing welfareState", () => {
    const heya = makeHeya({ welfareState: undefined });
    const result = projectGovernanceDerived(makeWorld(heya), heya);
    expect(result.welfareLabel).toBe("Safe");
    expect(result.welfareRisk).toBe(10);
  });

  it("handles missing governanceStatus", () => {
    const heya = makeHeya({ governanceStatus: undefined });
    const result = projectGovernanceDerived(makeWorld(heya), heya);
    expect(result.status).toBe("good_standing");
    expect(result.statusTone).toBe("success");
  });

  it("clamps welfare risk to 0-100", () => {
    const heya = makeHeya({ welfareState: { welfareRisk: 150, complianceState: "compliant" } });
    const result = projectGovernanceDerived(makeWorld(heya), heya);
    expect(result.welfareRisk).toBe(100);
  });

  it("returns unresolvedRulings for player heya", () => {
    const heya = makeHeya();
    const world = makeWorld(heya);
    (world as any).governanceLog = [
      { id: "r1", heyaId: "h1", type: "scandal", playerChoice: undefined },
      { id: "r2", heyaId: "h1", type: "safety", playerChoice: "resolved" },
      { id: "r3", heyaId: "h2", type: "scandal", playerChoice: undefined },
    ];
    const result = projectGovernanceDerived(world, heya);
    expect(result.unresolvedRulings).toHaveLength(1);
    expect((result.unresolvedRulings[0] as { id: string }).id).toBe("r1");
  });

  it("returns pendingRulings for player heya without playerSeverity", () => {
    const heya = makeHeya();
    const world = makeWorld(heya);
    (world as any).governanceLog = [
      { id: "r1", heyaId: "h1", type: "scandal", playerSeverity: undefined },
      { id: "r2", heyaId: "h1", type: "safety", playerSeverity: "harsh" },
    ];
    const result = projectGovernanceDerived(world, heya);
    expect(result.pendingRulings).toHaveLength(1);
    expect((result.pendingRulings[0] as { id: string }).id).toBe("r1");
  });
});
