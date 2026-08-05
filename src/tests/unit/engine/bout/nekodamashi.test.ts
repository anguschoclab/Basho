import { describe, it, expect } from "vitest";
import { TACTIC_PROFILES, getTacticProfile } from "@/engine/bout/tacticProfiles";
import { TACTIC_TO_FAMILY, resolveCounterTacticBonus } from "@/engine/types/combat";
import { resolveTacticalClash, determineCPUTactic } from "@/engine/h2h";
import { mockRikishi } from "../utils";
import { rngFromSeed } from "@/engine/rng";

describe("Nekodamashi tactic — profile", () => {
  it("is present in TACTIC_PROFILES", () => {
    expect(TACTIC_PROFILES.NEKODAMASHI).toBeDefined();
    expect(TACTIC_PROFILES.NEKODAMASHI.id).toBe("NEKODAMASHI");
  });

  it("has trick family mapping", () => {
    expect(TACTIC_TO_FAMILY.NEKODAMASHI).toBe("trick");
  });

  it("has negative tachiai power modifier (risky trick)", () => {
    expect(TACTIC_PROFILES.NEKODAMASHI.tachiaiPowerModifier).toBeLessThan(0);
  });

  it("has negative momentum on win (prestige penalty)", () => {
    expect(TACTIC_PROFILES.NEKODAMASHI.momentumOnWin).toBeLessThan(0);
  });

  it("has lower injury risk than all-out", () => {
    expect(TACTIC_PROFILES.NEKODAMASHI.injuryRiskMultiplier).toBeLessThan(
      TACTIC_PROFILES.ALL_OUT.injuryRiskMultiplier
    );
  });

  it("getTacticProfile returns NEKODAMASHI profile", () => {
    const profile = getTacticProfile("NEKODAMASHI");
    expect(profile.id).toBe("NEKODAMASHI");
    expect(profile.label.length).toBeGreaterThan(0);
    expect(profile.desc.length).toBeGreaterThan(0);
  });
});

describe("Nekodamashi tactic — tactical clash", () => {
  it("counters YOTSU_BELT (player advantage)", () => {
    const result = resolveTacticalClash("NEKODAMASHI", "YOTSU_BELT");
    expect(result.advantage).toBe("PLAYER");
    expect(result.winProbabilityShift).toBeGreaterThan(0);
  });

  it("counters OSHI_THRUST (player advantage)", () => {
    const result = resolveTacticalClash("NEKODAMASHI", "OSHI_THRUST");
    expect(result.advantage).toBe("PLAYER");
    expect(result.winProbabilityShift).toBeGreaterThan(0);
  });

  it("is countered by CPU NEKODAMASHI when player uses YOTSU_BELT", () => {
    const result = resolveTacticalClash("YOTSU_BELT", "NEKODAMASHI");
    expect(result.advantage).toBe("CPU");
    expect(result.winProbabilityShift).toBeLessThan(0);
  });

  it("is neutral when both use NEKODAMASHI", () => {
    const result = resolveTacticalClash("NEKODAMASHI", "NEKODAMASHI");
    expect(result.advantage).toBe("NEUTRAL");
  });

  it("is neutral vs STANDARD", () => {
    const result = resolveTacticalClash("NEKODAMASHI", "STANDARD");
    expect(result.advantage).toBe("NEUTRAL");
  });
});

describe("Nekodamashi tactic — counter bonus", () => {
  it("grants counter bonus vs push-dominant opponent", () => {
    const opponentProfile = mockRikishi("r-opp").combatProfile!;
    // Make opponent push-dominant (trick counters push per TACTICAL_MATRIX)
    opponentProfile.familyPreferences = { push: 70, belt: 10, trick: 10, speed: 10 };

    const bonus = resolveCounterTacticBonus("NEKODAMASHI", opponentProfile);
    expect(bonus).toBeGreaterThan(0);
  });
});

describe("Nekodamashi tactic — NPC selection", () => {
  it("can be selected by high-tech, high-speed NPC (replaces HENKA)", () => {
    const cpu = mockRikishi("r-cpu", {
      technique: 80,
      speed: 75,
      style: "yotsu",
    });

    let found = false;
    for (let i = 0; i < 500; i++) {
      const rng = rngFromSeed("nekodamashi-test", "npc", `tactic-${i}`);
      const tactic = determineCPUTactic(cpu, rng);
      if (tactic === "NEKODAMASHI") {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it("is never selected by low-tech rikishi", () => {
    const cpu = mockRikishi("r-cpu", {
      technique: 40,
      speed: 40,
    });

    for (let i = 0; i < 500; i++) {
      const rng = rngFromSeed("nekodamashi-low-test", "npc", `tactic-${i}`);
      const tactic = determineCPUTactic(cpu, rng);
      expect(tactic).not.toBe("NEKODAMASHI");
    }
  });
});
