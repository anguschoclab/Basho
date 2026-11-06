/**
 * injury.test.ts
 * ==============
 * calculateInjurySummary — severity labels must reflect the InjurySeverity
 * string union, not a dead numeric branch. ("serious" injuries were rendered
 * "Moderate" because the summary defaulted to a 0-100 numeric score.)
 */
import { describe, it, expect } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { SeededRNG } from "@/engine/core/rng";
import { calculateInjurySummary } from "@/presenters/rikishi/transformers/injury";
import type { InjurySeverity, InjuryType, InjuryBodyArea } from "@/engine/health/BodyDefinitions";

function rikishiWith(severity: InjurySeverity, type: InjuryType, location: InjuryBodyArea) {
  return MockFactory.createRikishi("r1", {
    injured: true,
    injuryWeeksRemaining: 4,
    injuryStatus: { type, severity, location, weeksRemaining: 4 },
  });
}

const rng = () => new SeededRNG("injury-summary-test");

describe("calculateInjurySummary — severity string union", () => {
  it("renders 'Healthy' when not injured", () => {
    const r = MockFactory.createRikishi("r1", { injured: false });
    expect(calculateInjurySummary(rng(), r)).toContain("Healthy");
  });

  it("renders 'Serious' severity as 'Severe'", () => {
    const summary = calculateInjurySummary(rng(), rikishiWith("serious", "tear", "knee"));
    expect(summary).toContain("Severe");
    expect(summary).not.toContain("Moderate");
  });

  it("renders 'Minor' severity", () => {
    const summary = calculateInjurySummary(rng(), rikishiWith("minor", "sprain", "ankle"));
    expect(summary).toContain("Minor");
    expect(summary).not.toContain("Moderate");
  });

  it("renders 'Moderate' severity", () => {
    const summary = calculateInjurySummary(rng(), rikishiWith("moderate", "strain", "back"));
    expect(summary).toContain("Moderate");
  });

  it("includes remaining weeks", () => {
    const summary = calculateInjurySummary(rng(), rikishiWith("minor", "sprain", "wrist"));
    expect(summary).toContain("4w");
  });
});
