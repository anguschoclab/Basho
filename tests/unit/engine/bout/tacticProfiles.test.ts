import { describe, it, expect } from "vitest";
import { TACTIC_PROFILES, getTacticProfile } from "@/engine/bout/tacticProfiles";
import type { BoutTactic } from "@/engine/types/combat";

describe("Tactic Profiles", () => {
  it("contains all expected tactics", () => {
    const keys = Object.keys(TACTIC_PROFILES) as BoutTactic[];
    expect(keys).toContain("STANDARD");
    expect(keys).toContain("YOTSU_BELT");
    expect(keys).toContain("OSHI_THRUST");
    expect(keys).toContain("HENKA");
    expect(keys).toContain("DEFENSIVE_PULL");
    expect(keys).toContain("ALL_OUT");
  });

  it("getTacticProfile defaults to STANDARD for undefined", () => {
    expect(getTacticProfile(undefined)).toBe(TACTIC_PROFILES.STANDARD);
  });

  it("getTacticProfile defaults to STANDARD for unknown tactic", () => {
    expect(getTacticProfile("UNKNOWN" as BoutTactic)).toBe(TACTIC_PROFILES.STANDARD);
  });

  it("ALL_OUT has highest win chance (tachiaiPowerModifier)", () => {
    const allOut = TACTIC_PROFILES.ALL_OUT;
    const standard = TACTIC_PROFILES.STANDARD;
    const defensive = TACTIC_PROFILES.DEFENSIVE_PULL;
    expect(allOut.tachiaiPowerModifier).toBeGreaterThan(standard.tachiaiPowerModifier);
    expect(allOut.tachiaiPowerModifier).toBeGreaterThan(defensive.tachiaiPowerModifier);
  });

  it("DEFENSIVE_PULL has lowest win chance", () => {
    const defensive = TACTIC_PROFILES.DEFENSIVE_PULL;
    const standard = TACTIC_PROFILES.STANDARD;
    expect(defensive.tachiaiPowerModifier).toBeLessThan(standard.tachiaiPowerModifier);
  });

  it("ALL_OUT has highest fatigue cost", () => {
    const allOut = TACTIC_PROFILES.ALL_OUT;
    const standard = TACTIC_PROFILES.STANDARD;
    expect(allOut.fatigueCost).toBeGreaterThan(standard.fatigueCost);
  });

  it("ALL_OUT has highest injury risk multiplier", () => {
    const allOut = TACTIC_PROFILES.ALL_OUT;
    const standard = TACTIC_PROFILES.STANDARD;
    const defensive = TACTIC_PROFILES.DEFENSIVE_PULL;
    expect(allOut.injuryRiskMultiplier).toBeGreaterThan(standard.injuryRiskMultiplier);
    expect(allOut.injuryRiskMultiplier).toBeGreaterThan(defensive.injuryRiskMultiplier);
  });

  it("DEFENSIVE_PULL has lowest injury risk", () => {
    const defensive = TACTIC_PROFILES.DEFENSIVE_PULL;
    const standard = TACTIC_PROFILES.STANDARD;
    expect(defensive.injuryRiskMultiplier).toBeLessThan(standard.injuryRiskMultiplier);
  });

  it("HENKA has negative momentum on win (prestige penalty)", () => {
    expect(TACTIC_PROFILES.HENKA.momentumOnWin).toBeLessThan(0);
  });

  it("each profile has positive label and description", () => {
    for (const [id, profile] of Object.entries(TACTIC_PROFILES)) {
      expect(profile.label.length).toBeGreaterThan(0);
      expect(profile.desc.length).toBeGreaterThan(0);
      expect(profile.id).toBe(id);
    }
  });
});
