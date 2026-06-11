/**
 * Tests that rikishi stats (aggression, stamina, mental) are correctly wired
 * into the combat physics engine:
 *   - aggression influences tachiai power and henka vulnerability
 *   - stamina controls per-tick boutFatigue accumulation rate
 *   - mental composure governs edge crisis recovery probability
 */
import { describe, it, expect } from "vitest";
import {
  computeTachiaiPower,
  boutFatigueIncrement,
  edgeCrisisRecoveryChance,
} from "../boutPhysics";
import { mockRikishi } from "../../__tests__/utils";

// ---------------------------------------------------------------------------
// Task 2: aggression in tachiai
// ---------------------------------------------------------------------------

describe("computeTachiaiPower — aggression contributes to tachiai", () => {
  it("high aggression increases tachiai power over low aggression at same power/speed", () => {
    const highAgg = mockRikishi("high-agg", { power: 60, speed: 60, aggression: 90 });
    const lowAgg = mockRikishi("low-agg", { power: 60, speed: 60, aggression: 20 });

    const highScore = computeTachiaiPower(highAgg);
    const lowScore = computeTachiaiPower(lowAgg);

    expect(highScore).toBeGreaterThan(lowScore);
  });

  it("aggression has a meaningful impact (at least 5% spread between 90 and 20 aggression)", () => {
    const highAgg = mockRikishi("r1", { power: 60, speed: 60, aggression: 90 });
    const lowAgg = mockRikishi("r2", { power: 60, speed: 60, aggression: 20 });

    const diff = computeTachiaiPower(highAgg) - computeTachiaiPower(lowAgg);
    const baseline = computeTachiaiPower(lowAgg);

    expect(diff / baseline).toBeGreaterThan(0.05);
  });

  it("power still dominates tachiai (power 90 vs 50 beats aggression 90 vs 50)", () => {
    // Power gap of 40 at 60% weight should beat aggression gap of 40 at 20% weight
    const highPower = mockRikishi("r1", { power: 90, speed: 60, aggression: 50 });
    const highAgg = mockRikishi("r2", { power: 50, speed: 60, aggression: 90 });

    expect(computeTachiaiPower(highPower)).toBeGreaterThan(computeTachiaiPower(highAgg));
  });
});

describe("computeTachiaiPower — henka vulnerability increases with aggression", () => {
  it("high-aggression opponent yields higher henka vulnerability score", () => {
    // The function returns opponent aggression contribution to henka success
    // A high-aggression opponent commits harder → easier to sidestep
    const highAgg = mockRikishi("r1", { aggression: 90, balance: 50, speed: 50 });
    const lowAgg = mockRikishi("r2", { aggression: 20, balance: 50, speed: 50 });

    // henkaVulnerability should be higher for high-aggression opponents
    const highVuln = computeTachiaiPower(highAgg, { henkaVulnerabilityMode: true });
    const lowVuln = computeTachiaiPower(lowAgg, { henkaVulnerabilityMode: true });

    expect(highVuln).toBeGreaterThan(lowVuln);
  });
});

// ---------------------------------------------------------------------------
// Task 3: stamina in boutFatigue accumulation
// ---------------------------------------------------------------------------

describe("boutFatigueIncrement — stamina controls per-tick fatigue rate", () => {
  it("high stamina (100) accumulates half the fatigue per tick vs baseline (50)", () => {
    const highStaminaIncrement = boutFatigueIncrement(100);
    const baselineIncrement = boutFatigueIncrement(50);

    expect(highStaminaIncrement).toBeLessThan(baselineIncrement);
    // At stamina=100: 1 / max(0.5, 100*0.02) = 1/2 = 0.5
    expect(highStaminaIncrement).toBeCloseTo(0.5, 2);
  });

  it("baseline stamina (50) yields increment of exactly 1.0 per tick", () => {
    // At stamina=50: 1 / max(0.5, 50*0.02) = 1/1 = 1.0
    expect(boutFatigueIncrement(50)).toBeCloseTo(1.0, 2);
  });

  it("low stamina (25) accumulates double the fatigue per tick vs baseline", () => {
    // At stamina=25: 1 / max(0.5, 25*0.02) = 1/0.5 = 2.0
    const lowStaminaIncrement = boutFatigueIncrement(25);
    expect(lowStaminaIncrement).toBeCloseTo(2.0, 2);
  });

  it("very low stamina is capped (never accumulates more than 2x baseline)", () => {
    // max(0.5, ...) floor means max increment = 1/0.5 = 2.0
    const veryLowIncrement = boutFatigueIncrement(1);
    expect(veryLowIncrement).toBeCloseTo(2.0, 2);
  });
});

// ---------------------------------------------------------------------------
// Task 4: mental in edge crisis recovery
// ---------------------------------------------------------------------------

describe("edgeCrisisRecoveryChance — mental composure governs edge recovery", () => {
  it("high mental fighter recovers from edge more often than low mental", () => {
    const highMental = mockRikishi("r1", { mental: 90, balance: 50 });
    const lowMental = mockRikishi("r2", { mental: 20, balance: 50 });

    const highChance = edgeCrisisRecoveryChance(highMental, 0.3, 0.1, 1.0);
    const lowChance = edgeCrisisRecoveryChance(lowMental, 0.3, 0.1, 1.0);

    expect(highChance).toBeGreaterThan(lowChance);
  });

  it("mental is the dominant factor over balance in recovery", () => {
    // High mental + low balance should beat low mental + high balance
    const highMentalLowBal = mockRikishi("r1", { mental: 90, balance: 30 });
    const lowMentalHighBal = mockRikishi("r2", { mental: 20, balance: 90 });

    const highMentalChance = edgeCrisisRecoveryChance(highMentalLowBal, 0.3, 0.1, 1.0);
    const lowMentalChance = edgeCrisisRecoveryChance(lowMentalHighBal, 0.3, 0.1, 1.0);

    expect(highMentalChance).toBeGreaterThan(lowMentalChance);
  });

  it("tick decay reduces recovery chance over time", () => {
    const rikishi = mockRikishi("r1", { mental: 60, balance: 60 });

    const earlyChance = edgeCrisisRecoveryChance(rikishi, 0.3, 0.1, 1.0);
    const lateChance = edgeCrisisRecoveryChance(rikishi, 0.3, 0.1, 0.3);

    expect(earlyChance).toBeGreaterThan(lateChance);
  });

  it("balance still contributes (same mental, higher balance = higher chance)", () => {
    const highBal = mockRikishi("r1", { mental: 60, balance: 90 });
    const lowBal = mockRikishi("r2", { mental: 60, balance: 20 });

    const highBalChance = edgeCrisisRecoveryChance(highBal, 0.3, 0.1, 1.0);
    const lowBalChance = edgeCrisisRecoveryChance(lowBal, 0.3, 0.1, 1.0);

    expect(highBalChance).toBeGreaterThan(lowBalChance);
  });
});
