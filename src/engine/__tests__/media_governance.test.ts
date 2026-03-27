import { describe, it, expect } from "vitest";
import { WorldState } from "../types/world";
import { Heya } from "../types/heya";
import { generateGovernanceHeadline } from "../media";

function createMockWorld(): WorldState {
  return {
    seed: "test-seed",
    year: 2026,
    week: 1,
    currentBashoName: "Hatsu",
    heyas: new Map<string, Heya>(),
    mediaState: {
      headlines: [],
      mediaHeat: {},
      heyaPressure: {},
      bashoStreaks: {},
      streakHeadlinesFired: {},
      promoWatchFired: {},
      retirementWatchFired: {},
      titleRaceDayFired: {},
      injuryWithdrawalFired: {},
      mediaHeatHistory: {},
    },
  } as unknown as WorldState;
}

function createMockHeya(id: string, name: string): Heya {
  return {
    id,
    name,
    funds: 100000000,
    reputation: 50,
    scandalScore: 0,
    governanceStatus: "good_standing",
    rikishiIds: [],
    riskIndicators: {
        financial: false,
        governance: false,
        rivalry: false,
        welfare: false
    },
  } as unknown as Heya;
}

describe("Media - Governance Headlines", () => {
  it("should return null if the heya does not exist in the world", () => {
    const world = createMockWorld();

    const headline = generateGovernanceHeadline({
      world,
      heyaId: "missing_heya_id",
      type: "merger_threat",
      severity: "major",
      description: "Test description",
    });

    expect(headline).toBeNull();
  });

  it("should correctly generate a headline for a minor emergency_loan", () => {
    const world = createMockWorld();
    const heya = createMockHeya("heya-1", "Test Heya");
    world.heyas.set(heya.id, heya);

    const description = "The association provides an emergency loan.";

    const headline = generateGovernanceHeadline({
      world,
      heyaId: heya.id,
      type: "emergency_loan",
      severity: "minor",
      description,
    });

    expect(headline).not.toBeNull();
    if (!headline) return; // For TypeScript type guarding

    expect(headline.heyaIds).toContain("heya-1");
    expect(headline.beat).toBe("discipline");
    expect(headline.tags).toContain("emergency_loan");
    expect(headline.tags).toContain("minor");

    // Minor severity mappings
    expect(headline.impact).toBe(30);
    expect(headline.tier).toBe("local");
    expect(headline.tone).toBe("neutral");
    expect(headline.subtitle).toBe(description);

    // Title should match one of the expected variations for emergency_loan
    const expectedTitles = [
      `${heya.name} Bailed Out by Association`,
      `Financial Crisis at ${heya.name}`,
      `JSA Injects Emergency Capital into ${heya.name}`,
      `Debt Forcing ${heya.name} to the Brink`
    ];
    expect(expectedTitles).toContain(headline.title);
  });

  it("should correctly generate a headline for a major forced_merger", () => {
    const world = createMockWorld();
    const heya = createMockHeya("heya-2", "Failing Heya");
    world.heyas.set(heya.id, heya);

    const description = "The stable will be dissolved and absorbed.";

    const headline = generateGovernanceHeadline({
      world,
      heyaId: heya.id,
      type: "forced_merger",
      severity: "major",
      description,
    });

    expect(headline).not.toBeNull();
    if (!headline) return;

    // Major severity mappings
    expect(headline.impact).toBe(55);
    expect(headline.tier).toBe("national");
    expect(headline.tone).toBe("concern");
    expect(headline.subtitle).toBe(description);

    const expectedTitles = [
      `Forced Merger Imminent for ${heya.name}`,
      `${heya.name} to Close Doors`,
      `JSA Mandates Absorption of ${heya.name}`,
      `Tearful Goodbye as ${heya.name} Dissolves`
    ];
    expect(expectedTitles).toContain(headline.title);
  });

  it("should correctly generate a headline for a critical welfare_review", () => {
    const world = createMockWorld();
    const heya = createMockHeya("heya-3", "Scandal Heya");
    world.heyas.set(heya.id, heya);

    const description = "Severe welfare violations discovered.";

    const headline = generateGovernanceHeadline({
      world,
      heyaId: heya.id,
      type: "welfare_review",
      severity: "critical",
      description,
    });

    expect(headline).not.toBeNull();
    if (!headline) return;

    // Critical severity mappings
    expect(headline.impact).toBe(80);
    expect(headline.tier).toBe("main_event");
    expect(headline.tone).toBe("controversy");
    expect(headline.subtitle).toBe(description);

    const expectedTitles = [
      `${heya.name} Fails Welfare Review`,
      `Sanctions Continue for ${heya.name}`,
      `Whistleblowers Detail Brutal Regimen at ${heya.name}`,
      `Dietary and Medical Neglect Investigated at ${heya.name}`,
      `Cruel Keiko Methods Exposed at ${heya.name}`
    ];
    expect(expectedTitles).toContain(headline.title);
  });

  it("should apply headline effects to world state", () => {
    const world = createMockWorld();
    const heya = createMockHeya("heya-1", "Test Heya");
    world.heyas.set(heya.id, heya);

    // Initial pressure should be empty or 0
    expect(world.mediaState?.heyaPressure["heya-1"]).toBeUndefined();

    // Critical severity -> tone: "controversy" -> adds to pressure
    const headline = generateGovernanceHeadline({
      world,
      heyaId: heya.id,
      type: "council_review",
      severity: "critical",
      description: "A major review.",
    });

    expect(headline).not.toBeNull();

    // The previous run showed us it's 8. Let's make sure it increased correctly
    expect(world.mediaState?.heyaPressure["heya-1"]).toBe(8);
  });
});
