import { describe, it, expect } from "vitest";
import {
  getSeverityWeight,
  computeInjuryPressure,
  calculateWeeklyWelfareDelta,
} from "@/engine/systems/welfare/WelfareCalculations";
import { mockRikishi, makeMockWorld, makeMockHeya } from "../../utils";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import type { WelfareState } from "@/engine/types/economy";
import type { HeyaTrainingState } from "@/engine/types/training";
import {
  INJURY_PRESSURE_SERIOUS,
  INJURY_PRESSURE_MODERATE,
  INJURY_PRESSURE_MINOR,
  WELFARE_PRESSURE_DIVISOR,
  WELFARE_DELTA_MAX,
  WELFARE_SERIOUS_INJURY_BONUS,
  WELFARE_AUSTERITY_DIET_BONUS,
  WELFARE_PREMIUM_DIET_REDUCTION,
  WELFARE_NEGLIGENCE_PENALTY_MULTIPLIER,
  WELFARE_PUNISHING_INTENSITY_BONUS,
  WELFARE_INTENSIVE_INTENSITY_BONUS,
  WELFARE_LOW_RECOVERY_BONUS,
  WELFARE_HIGH_RECOVERY_REDUCTION,
  WELFARE_SCANDAL_SYNERGY_BONUS,
  WELFARE_HEALTHY_DRIFT_REDUCTION,
  FACILITY_RECOVERY_QUALITY_BASE,
  FACILITY_RECOVERY_DIVISOR,
  FACILITY_NUTRITION_QUALITY_BASE,
  FACILITY_NUTRITION_DIVISOR,
  SCANDAL_WELFARE_THRESHOLD,
} from "@/constants/engine/welfare";

function makeWelfareState(overrides: Partial<WelfareState> = {}): WelfareState {
  return {
    welfareRisk: 30,
    activeDiet: "maintenance",
    complianceState: "compliant",
    weeksInState: 0,
    ...overrides,
  } as WelfareState;
}

function makeTrainingState(
  heyaId: string,
  overrides: Partial<HeyaTrainingState> = {}
): HeyaTrainingState {
  return {
    heyaId,
    activeProfile: {
      intensity: "balanced",
      focus: "neutral",
      styleBias: "neutral",
      recovery: "normal",
    },
    focusSlots: [],
    ...overrides,
  } as HeyaTrainingState;
}

function setupHeya(
  heyaId: string,
  rikishiList: ReturnType<typeof mockRikishi>[],
  heyaOverrides: Partial<Heya> = {},
  worldOverrides: Partial<WorldState> = {}
): { world: WorldState; heya: Heya } {
  const heya = makeMockHeya(heyaId, {
    rikishiIds: rikishiList.map((r) => r.id),
    ...heyaOverrides,
  });
  const rikishiMap = new Map(rikishiList.map((r) => [r.id, r]));
  const world = makeMockWorld({
    rikishi: rikishiMap,
    ...worldOverrides,
  });
  world.heyas.set(heyaId, heya);
  return { world: world as WorldState, heya: heya as Heya };
}

describe("getSeverityWeight", () => {
  it("returns INJURY_PRESSURE_SERIOUS for 'serious'", () => {
    expect(getSeverityWeight("serious")).toBe(INJURY_PRESSURE_SERIOUS);
  });

  it("returns INJURY_PRESSURE_SERIOUS for 'high'", () => {
    expect(getSeverityWeight("high")).toBe(INJURY_PRESSURE_SERIOUS);
  });

  it("returns INJURY_PRESSURE_SERIOUS for 3", () => {
    expect(getSeverityWeight(3)).toBe(INJURY_PRESSURE_SERIOUS);
  });

  it("returns INJURY_PRESSURE_MODERATE for 'moderate'", () => {
    expect(getSeverityWeight("moderate")).toBe(INJURY_PRESSURE_MODERATE);
  });

  it("returns INJURY_PRESSURE_MODERATE for 'medium'", () => {
    expect(getSeverityWeight("medium")).toBe(INJURY_PRESSURE_MODERATE);
  });

  it("returns INJURY_PRESSURE_MODERATE for 2", () => {
    expect(getSeverityWeight(2)).toBe(INJURY_PRESSURE_MODERATE);
  });

  it("returns INJURY_PRESSURE_MINOR for 'minor'", () => {
    expect(getSeverityWeight("minor")).toBe(INJURY_PRESSURE_MINOR);
  });

  it("returns INJURY_PRESSURE_MINOR for 'low'", () => {
    expect(getSeverityWeight("low")).toBe(INJURY_PRESSURE_MINOR);
  });

  it("returns INJURY_PRESSURE_MINOR for 1", () => {
    expect(getSeverityWeight(1)).toBe(INJURY_PRESSURE_MINOR);
  });

  it("returns INJURY_PRESSURE_MINOR for undefined", () => {
    expect(getSeverityWeight(undefined)).toBe(INJURY_PRESSURE_MINOR);
  });
});

describe("computeInjuryPressure", () => {
  it("returns zero pressure when no rikishi injured", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1", injured: false });
    const r2 = mockRikishi("r2", { heyaId: "h1", injured: false });
    const { world, heya } = setupHeya("h1", [r1, r2]);
    const result = computeInjuryPressure(world, heya);
    expect(result.pressure).toBe(0);
    expect(result.seriousCount).toBe(0);
    expect(result.negligenceCount).toBe(0);
  });

  it("accumulates pressure for injured rikishi", () => {
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      injured: true,
      injuryStatus: { isInjured: true, severity: "serious", type: "muscle" },
    });
    const r2 = mockRikishi("r2", {
      heyaId: "h1",
      injured: true,
      injuryStatus: { isInjured: true, severity: "minor", type: "bruise" },
    });
    const r3 = mockRikishi("r3", { heyaId: "h1", injured: false });
    const { world, heya } = setupHeya("h1", [r1, r2, r3]);
    const result = computeInjuryPressure(world, heya);
    expect(result.pressure).toBe(INJURY_PRESSURE_SERIOUS + INJURY_PRESSURE_MINOR);
    expect(result.seriousCount).toBe(1);
  });

  it("detects negligence for unprotected injured rikishi during harsh training", () => {
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      injured: true,
      injuryStatus: { isInjured: true, severity: "moderate", type: "muscle" },
    });
    const { world, heya } = setupHeya("h1", [r1]);
    const ts = makeTrainingState("h1", {
      activeProfile: { intensity: "punishing", focus: "neutral", styleBias: "neutral", recovery: "normal" },
    });
    world.trainingState = new Map([["h1", ts]]);
    const result = computeInjuryPressure(world, heya);
    expect(result.negligenceCount).toBe(1);
  });

  it("does not count negligence if rikishi is protected (focusType: protect)", () => {
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      injured: true,
      injuryStatus: { isInjured: true, severity: "moderate", type: "muscle" },
    });
    const { world, heya } = setupHeya("h1", [r1]);
    const ts = makeTrainingState("h1", {
      activeProfile: { intensity: "punishing", focus: "neutral", styleBias: "neutral", recovery: "normal" },
      focusSlots: [{ rikishiId: "r1", focusType: "protect" }],
    });
    world.trainingState = new Map([["h1", ts]]);
    const result = computeInjuryPressure(world, heya);
    expect(result.negligenceCount).toBe(0);
  });

  it("does not count negligence if rikishi is rebuilding (focusType: rebuild)", () => {
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      injured: true,
      injuryStatus: { isInjured: true, severity: "moderate", type: "muscle" },
    });
    const { world, heya } = setupHeya("h1", [r1]);
    const ts = makeTrainingState("h1", {
      activeProfile: { intensity: "intensive", focus: "neutral", styleBias: "neutral", recovery: "normal" },
      focusSlots: [{ rikishiId: "r1", focusType: "rebuild" }],
    });
    world.trainingState = new Map([["h1", ts]]);
    const result = computeInjuryPressure(world, heya);
    expect(result.negligenceCount).toBe(0);
  });

  it("does not count negligence for balanced intensity", () => {
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      injured: true,
      injuryStatus: { isInjured: true, severity: "moderate", type: "muscle" },
    });
    const { world, heya } = setupHeya("h1", [r1]);
    const ts = makeTrainingState("h1", {
      activeProfile: { intensity: "balanced", focus: "neutral", styleBias: "neutral", recovery: "normal" },
    });
    world.trainingState = new Map([["h1", ts]]);
    const result = computeInjuryPressure(world, heya);
    expect(result.negligenceCount).toBe(0);
  });
});

describe("calculateWeeklyWelfareDelta", () => {
  it("healthy drift: no injuries, balanced intensity, normal recovery", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1", injured: false });
    const { world, heya } = setupHeya("h1", [r1]);
    const ts = makeTrainingState("h1");
    world.trainingState = new Map([["h1", ts]]);
    const state = makeWelfareState();
    const result = calculateWeeklyWelfareDelta(world, heya, state);
    expect(result.delta).toBe(-WELFARE_HEALTHY_DRIFT_REDUCTION);
    expect(result.reasons).toContain("healthy_drift-2");
  });

  it("serious injury bonus adds to delta", () => {
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      injured: true,
      injuryStatus: { isInjured: true, severity: "serious", type: "muscle" },
    });
    const { world, heya } = setupHeya("h1", [r1]);
    const ts = makeTrainingState("h1");
    world.trainingState = new Map([["h1", ts]]);
    const state = makeWelfareState();
    const result = calculateWeeklyWelfareDelta(world, heya, state);
    expect(result.delta).toBe(
      Math.round(INJURY_PRESSURE_SERIOUS / WELFARE_PRESSURE_DIVISOR) +
        WELFARE_SERIOUS_INJURY_BONUS
    );
    expect(result.reasons).toContain("serious_injuries+2");
  });

  it("negligence penalty: injured rikishi, punishing intensity, no protect", () => {
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      injured: true,
      injuryStatus: { isInjured: true, severity: "moderate", type: "muscle" },
    });
    const { world, heya } = setupHeya("h1", [r1]);
    const ts = makeTrainingState("h1", {
      activeProfile: { intensity: "punishing", focus: "neutral", styleBias: "neutral", recovery: "normal" },
    });
    world.trainingState = new Map([["h1", ts]]);
    const state = makeWelfareState();
    const result = calculateWeeklyWelfareDelta(world, heya, state);
    const expectedPressure = Math.round(INJURY_PRESSURE_MODERATE / WELFARE_PRESSURE_DIVISOR);
    expect(result.delta).toBe(
      expectedPressure +
        WELFARE_NEGLIGENCE_PENALTY_MULTIPLIER +
        WELFARE_PUNISHING_INTENSITY_BONUS
    );
    expect(result.reasons).toContain(`negligence+${WELFARE_NEGLIGENCE_PENALTY_MULTIPLIER}`);
    expect(result.reasons).not.toContain("misfortune");
  });

  it("misfortune: injured rikishi, balanced intensity (non-negligent)", () => {
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      injured: true,
      injuryStatus: { isInjured: true, severity: "minor", type: "bruise" },
    });
    const { world, heya } = setupHeya("h1", [r1]);
    const ts = makeTrainingState("h1");
    world.trainingState = new Map([["h1", ts]]);
    const state = makeWelfareState();
    const result = calculateWeeklyWelfareDelta(world, heya, state);
    expect(result.reasons).toContain("misfortune");
    expect(result.reasons).not.toContain(/negligence/);
  });

  it("austerity diet adds bonus", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1", injured: false });
    const { world, heya } = setupHeya("h1", [r1]);
    const ts = makeTrainingState("h1");
    world.trainingState = new Map([["h1", ts]]);
    const state = makeWelfareState({ activeDiet: "austerity" });
    const result = calculateWeeklyWelfareDelta(world, heya, state);
    expect(result.delta).toBe(WELFARE_AUSTERITY_DIET_BONUS - WELFARE_HEALTHY_DRIFT_REDUCTION);
    expect(result.reasons).toContain("austerity_diet+2");
  });

  it("premium diet reduces delta", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1", injured: false });
    const { world, heya } = setupHeya("h1", [r1]);
    const ts = makeTrainingState("h1");
    world.trainingState = new Map([["h1", ts]]);
    const state = makeWelfareState({ activeDiet: "premium" });
    const result = calculateWeeklyWelfareDelta(world, heya, state);
    expect(result.delta).toBe(-WELFARE_PREMIUM_DIET_REDUCTION - WELFARE_HEALTHY_DRIFT_REDUCTION);
    expect(result.reasons).toContain("premium_diet-1");
  });

  it("punishing intensity adds bonus", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1", injured: false });
    const { world, heya } = setupHeya("h1", [r1]);
    const ts = makeTrainingState("h1", {
      activeProfile: { intensity: "punishing", focus: "neutral", styleBias: "neutral", recovery: "normal" },
    });
    world.trainingState = new Map([["h1", ts]]);
    const state = makeWelfareState();
    const result = calculateWeeklyWelfareDelta(world, heya, state);
    expect(result.delta).toBe(WELFARE_PUNISHING_INTENSITY_BONUS);
    expect(result.reasons).toContain("punishing_intensity+3");
  });

  it("intensive intensity adds bonus", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1", injured: false });
    const { world, heya } = setupHeya("h1", [r1]);
    const ts = makeTrainingState("h1", {
      activeProfile: { intensity: "intensive", focus: "neutral", styleBias: "neutral", recovery: "normal" },
    });
    world.trainingState = new Map([["h1", ts]]);
    const state = makeWelfareState();
    const result = calculateWeeklyWelfareDelta(world, heya, state);
    expect(result.delta).toBe(WELFARE_INTENSIVE_INTENSITY_BONUS);
    expect(result.reasons).toContain("intensive_intensity+1");
  });

  it("low recovery adds bonus", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1", injured: false });
    const { world, heya } = setupHeya("h1", [r1]);
    const ts = makeTrainingState("h1", {
      activeProfile: { intensity: "balanced", focus: "neutral", styleBias: "neutral", recovery: "low" },
    });
    world.trainingState = new Map([["h1", ts]]);
    const state = makeWelfareState();
    const result = calculateWeeklyWelfareDelta(world, heya, state);
    expect(result.delta).toBe(WELFARE_LOW_RECOVERY_BONUS);
    expect(result.reasons).toContain("low_recovery+2");
  });

  it("high recovery reduces delta", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1", injured: false });
    const { world, heya } = setupHeya("h1", [r1]);
    const ts = makeTrainingState("h1", {
      activeProfile: { intensity: "balanced", focus: "neutral", styleBias: "neutral", recovery: "high" },
    });
    world.trainingState = new Map([["h1", ts]]);
    const state = makeWelfareState();
    const result = calculateWeeklyWelfareDelta(world, heya, state);
    expect(result.delta).toBe(-WELFARE_HIGH_RECOVERY_REDUCTION - WELFARE_HEALTHY_DRIFT_REDUCTION);
    expect(result.reasons).toContain("high_recovery-2");
    expect(result.reasons).toContain("healthy_drift-2");
  });

  it("scandal synergy adds bonus when scandalScore >= threshold", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1", injured: false });
    const { world, heya } = setupHeya("h1", [r1], {
      scandalScore: SCANDAL_WELFARE_THRESHOLD,
    });
    const ts = makeTrainingState("h1");
    world.trainingState = new Map([["h1", ts]]);
    const state = makeWelfareState();
    const result = calculateWeeklyWelfareDelta(world, heya, state);
    expect(result.delta).toBe(WELFARE_SCANDAL_SYNERGY_BONUS - WELFARE_HEALTHY_DRIFT_REDUCTION);
    expect(result.reasons).toContain("scandal_synergy+2");
  });

  it("facility delta: low recovery/nutrition facilities add penalty", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1", injured: false });
    const { world, heya } = setupHeya("h1", [r1], {
      facilities: { training: 50, recovery: 30, nutrition: 30 },
    });
    const ts = makeTrainingState("h1");
    world.trainingState = new Map([["h1", ts]]);
    const state = makeWelfareState();
    const result = calculateWeeklyWelfareDelta(world, heya, state);
    const expectedFacDelta =
      Math.round((FACILITY_RECOVERY_QUALITY_BASE - 30) / FACILITY_RECOVERY_DIVISOR) +
      Math.round((FACILITY_NUTRITION_QUALITY_BASE - 30) / FACILITY_NUTRITION_DIVISOR);
    expect(result.delta).toBe(expectedFacDelta - WELFARE_HEALTHY_DRIFT_REDUCTION);
    expect(result.reasons).toContain(`facilities+${expectedFacDelta}`);
  });

  it("delta accumulation: multiple modifiers combine correctly", () => {
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      injured: true,
      injuryStatus: { isInjured: true, severity: "serious", type: "muscle" },
    });
    const { world, heya } = setupHeya("h1", [r1], {
      scandalScore: SCANDAL_WELFARE_THRESHOLD,
      facilities: { training: 50, recovery: 50, nutrition: 50 },
    });
    const ts = makeTrainingState("h1", {
      activeProfile: { intensity: "punishing", focus: "neutral", styleBias: "neutral", recovery: "low" },
    });
    world.trainingState = new Map([["h1", ts]]);
    const state = makeWelfareState({ activeDiet: "austerity" });
    const result = calculateWeeklyWelfareDelta(world, heya, state);

    const expectedPressure = Math.round(INJURY_PRESSURE_SERIOUS / WELFARE_PRESSURE_DIVISOR);
    const expectedDelta =
      expectedPressure +
      WELFARE_SERIOUS_INJURY_BONUS +
      WELFARE_AUSTERITY_DIET_BONUS +
      WELFARE_NEGLIGENCE_PENALTY_MULTIPLIER +
      WELFARE_PUNISHING_INTENSITY_BONUS +
      WELFARE_LOW_RECOVERY_BONUS +
      WELFARE_SCANDAL_SYNERGY_BONUS;
    expect(result.delta).toBe(expectedDelta);
  });

  it("delta clamping: pressure is clamped to WELFARE_DELTA_MAX", () => {
    const injured: ReturnType<typeof mockRikishi>[] = [];
    for (let i = 0; i < 20; i++) {
      injured.push(
        mockRikishi(`r${i}`, {
          heyaId: "h1",
          injured: true,
          injuryStatus: { isInjured: true, severity: "serious", type: "muscle" },
        })
      );
    }
    const { world, heya } = setupHeya("h1", injured);
    const ts = makeTrainingState("h1");
    world.trainingState = new Map([["h1", ts]]);
    const state = makeWelfareState();
    const result = calculateWeeklyWelfareDelta(world, heya, state);
    const pressureComponent = Math.min(
      Math.round((20 * INJURY_PRESSURE_SERIOUS) / WELFARE_PRESSURE_DIVISOR),
      WELFARE_DELTA_MAX
    );
    expect(result.delta).toBe(pressureComponent + WELFARE_SERIOUS_INJURY_BONUS);
  });
});
