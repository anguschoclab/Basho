
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

describe("tickWeek", () => {
  // Common world setup
  function getMockWorld(heya: any, override: any = {}) {
    return {
      week: 1,
      heyas: new Map([["h1", heya]]),
      rikishi: new Map(),
      training: new Map([["h1", { focusSlots: [], activeProfile: { intensity: "normal" } }]]),
      oyakata: new Map([["o1", { id: "o1", archetype: "balanced", traits: { compassion: 50, tradition: 50, risk: 50, ambition: 50, patience: 50 } }]]),
      events: { log: [], dedupe: {} },
      ...override
    } as any;
  }

  it("should transition compliant to watch when negligence is high", () => {
    const heya = mockHeya({ welfareRisk: 29, complianceState: "compliant", weeksInState: 0 });
    heya.rikishiIds = ["r1", "r2"];
    const world = getMockWorld(heya, {
      rikishi: new Map([
        ["r1", { id: "r1", injuryStatus: { isInjured: true, severityLabel: "serious", severity: "serious" } }],
        ["r2", { id: "r2", injuryStatus: { isInjured: true, severityLabel: "serious", severity: "serious" } }]
      ]),
      training: new Map([["h1", { focusSlots: [], activeProfile: { intensity: "punishing" } }]])
    });
    tickWeek(world);
    expect(heya.welfareState.complianceState).toBe("watch");
  });

  it("should transition watch to investigation when risk remains high", () => {
    const heya = mockHeya({ welfareRisk: 65, complianceState: "watch", weeksInState: 2 });
    heya.rikishiIds = ["r1"];
    const world = getMockWorld(heya, {
      rikishi: new Map([
        ["r1", { id: "r1", injuryStatus: { isInjured: true, severityLabel: "serious", severity: "serious" } }]
      ]),
      training: new Map([["h1", { focusSlots: [], activeProfile: { intensity: "punishing" } }]])
    });
    tickWeek(world);
    expect(heya.welfareState.complianceState).toBe("investigation");
  });

  it("should return to compliant from watch if risk is low", () => {
    const heya = mockHeya({ welfareRisk: 15, complianceState: "watch", weeksInState: 3 });
    const world = getMockWorld(heya, {
      training: new Map([["h1", { focusSlots: [], activeProfile: { intensity: "light", recovery: "high" } }]])
    });
    tickWeek(world);
    expect(heya.welfareState.complianceState).toBe("compliant");
  });

  it("should transition investigation to sanctioned if conditions worsen", () => {
    const heya = mockHeya({ welfareRisk: 90, complianceState: "investigation", weeksInState: 1 });
    heya.rikishiIds = ["r1", "r2", "r3"];
    const world = getMockWorld(heya, {
      rikishi: new Map([
        ["r1", { id: "r1", injuryStatus: { isInjured: true, severityLabel: "serious", severity: "serious" } }],
        ["r2", { id: "r2", injuryStatus: { isInjured: true, severityLabel: "serious", severity: "serious" } }],
        ["r3", { id: "r3", injuryStatus: { isInjured: true, severityLabel: "serious", severity: "serious" } }]
      ]),
      training: new Map([["h1", { focusSlots: [], activeProfile: { intensity: "punishing" } }]])
    });
    tickWeek(world);
    expect(heya.welfareState.complianceState).toBe("sanctioned");
    expect(heya.welfareState.sanctions).toBeDefined();
  });

  it("should resolve investigation to watch when progress is complete and risk is down", () => {
    const heya = mockHeya({ welfareRisk: 30, complianceState: "investigation", weeksInState: 5 });
    heya.welfareState.investigation = { progress: 95, openedWeek: 1, severity: "low", triggers: [] };
    const world = getMockWorld(heya, {
      training: new Map([["h1", { focusSlots: [], activeProfile: { intensity: "light", recovery: "high" } }]])
    });
    tickWeek(world);
    expect(heya.welfareState.complianceState).toBe("watch");
    expect(heya.welfareState.investigation).toBeUndefined();
  });

  it("should lift sanctions to watch after duration and risk drops", () => {
    const heya = mockHeya({ welfareRisk: 30, complianceState: "sanctioned", weeksInState: 5 });
    heya.welfareState.sanctions = { recruitmentFreezeWeeks: 0 };
    const world = getMockWorld(heya, {
      training: new Map([["h1", { focusSlots: [], activeProfile: { intensity: "light", recovery: "high" } }]])
    });
    tickWeek(world);
    expect(heya.welfareState.complianceState).toBe("watch");
    expect(heya.welfareState.sanctions).toBeUndefined();
  });

  it("should emit WELFARE_RISK_UPDATE event when risk shifts materially", () => {
    const heya = mockHeya({ welfareRisk: 15, complianceState: "compliant", weeksInState: 0 });
    heya.rikishiIds = ["r1", "r2", "r3"];
    const world = getMockWorld(heya, {
      rikishi: new Map([
        ["r1", { id: "r1", injuryStatus: { isInjured: true, severityLabel: "serious", severity: "serious" } }],
        ["r2", { id: "r2", injuryStatus: { isInjured: true, severityLabel: "serious", severity: "serious" } }],
        ["r3", { id: "r3", injuryStatus: { isInjured: true, severityLabel: "serious", severity: "serious" } }]
      ]),
      training: new Map([["h1", { focusSlots: [], activeProfile: { intensity: "punishing" } }]])
    });
    tickWeek(world);
    const event = world.events.log.find((e: any) => e.type === "WELFARE_RISK_UPDATE");
    expect(event).toBeDefined();
    expect(event?.data.delta).toBeGreaterThanOrEqual(8);
  });
});
