import { describe, it, expect } from "vitest";
import { ensureHeyaWelfareState, setHeyaDiet, tickWeek } from "../welfare";
import type { Heya } from "../types/heya";
import type { WelfareState } from "../types/economy";

function mockHeya(welfareState?: Partial<WelfareState> | any): Heya {
  return {
    id: "h1",
    name: "Test Heya",
    oyakataId: "o1",
    rikishiIds: [],
    statureBand: "established",
    prestigeBand: "respected",
    facilitiesBand: "adequate",
    koenkaiBand: "moderate",
    runwayBand: "comfortable",
    reputation: 50,
    funds: 1000,
    scandalScore: 0,
    governanceStatus: "good_standing",
    welfareState: welfareState,
    facilities: {
      training: 50,
      recovery: 50,
      nutrition: 50
    },
    riskIndicators: {
      financial: false,
      governance: false,
      rivalry: false
    }
  } as Heya;
}

describe("ensureHeyaWelfareState", () => {
  it("should initialize default welfare state when none exists", () => {
    const heya = mockHeya(undefined);
    const result = ensureHeyaWelfareState(heya);

    expect(result).toBeDefined();
    expect(result.welfareRisk).toBe(10);
    expect(result.complianceState).toBe("compliant");
    expect(result.weeksInState).toBe(0);
    expect(result.lastReviewedWeek).toBe(0);

    // Ensure the heya object was mutated
    expect(heya.welfareState).toBe(result);
  });

  it("should initialize default state if existing state is missing welfareRisk", () => {
    const heya = mockHeya({ complianceState: "compliant", weeksInState: 5 });
    const result = ensureHeyaWelfareState(heya);

    expect(result.welfareRisk).toBe(10);
    expect(result.complianceState).toBe("compliant");
    expect(result.weeksInState).toBe(0);
  });

  it("should initialize default state if existing state is missing complianceState", () => {
    const heya = mockHeya({ welfareRisk: 50, weeksInState: 5 });
    const result = ensureHeyaWelfareState(heya);

    expect(result.welfareRisk).toBe(10);
    expect(result.complianceState).toBe("compliant");
    expect(result.weeksInState).toBe(0);
  });

  it("should return the existing state without mutating if it is valid", () => {
    const existingState: WelfareState = {
      welfareRisk: 42,
      complianceState: "watch",
      weeksInState: 3,
      lastReviewedWeek: 15
    };
    const heya = mockHeya(existingState);
    const result = ensureHeyaWelfareState(heya);

    expect(result).toBe(existingState);
    expect(result.welfareRisk).toBe(42);
    expect(result.complianceState).toBe("watch");
    expect(heya.welfareState).toBe(existingState);
  });
});

describe("setHeyaDiet", () => {
  it("should update heya diet regimen", () => {
    const world = {
      heyas: new Map([
        ["heya1", {
          id: "heya1",
          name: "Test Heya",
          welfareState: {
            welfareRisk: 0,
            complianceState: "compliant",
            weeksInState: 0,
            activeDiet: "maintenance"
          }
        }]
      ]),
      events: { log: [], dedupe: {} }
    } as any;

    setHeyaDiet(world, "heya1", "premium");
    expect(world.heyas.get("heya1").welfareState.activeDiet).toBe("premium");
  });
});
