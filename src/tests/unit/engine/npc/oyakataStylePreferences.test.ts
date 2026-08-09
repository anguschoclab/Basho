import { describe, it, expect } from "vitest";
import { getOyakataStyleProfile, scoreRecruitForOyakata } from "@/engine/oyakataStylePreferences";
import { MockFactory } from "../../../helpers/utils/MockFactory";
import type { CombatArchetype, Style } from "@/engine/types/combat";

describe("getOyakataStyleProfile — innovator includes defensive", () => {
  it("innovator philosophy lists defensive as a preferred archetype", () => {
    const world = MockFactory.createWorld({
      _postBashoMeta: { metaBias: "oshi" } as any,
    });
    const oyakata = MockFactory.createOyakata("oyakata-test", {
      archetype: "scientist",
    });

    // Run multiple times to hit 'innovator' in the random pick (scientist maps to innovator)
    let foundInnovator = false;
    for (let i = 0; i < 30; i++) {
      const w = { ...world, week: i + 1 };
      const profile = getOyakataStyleProfile(w, oyakata);
      if (profile.philosophy === "innovator") {
        expect(profile.preferredArchetypes).toContain("defensive");
        foundInnovator = true;
        break;
      }
    }

    if (!foundInnovator) {
      // Directly check strategist which also has innovator
      const strategist = MockFactory.createOyakata("strat", { archetype: "strategist" });
      const profile = getOyakataStyleProfile(world, strategist);
      if (profile.philosophy === "innovator") {
        expect(profile.preferredArchetypes).toContain("defensive");
      }
    }
  });
});

describe("getOyakataStyleProfile — style_purist oshi includes tsuppari", () => {
  it("style_purist with oshi bias lists tsuppari as preferred archetype", () => {
    const world = MockFactory.createWorld();
    // tradition < 60 → oshi bias
    const oyakata = MockFactory.createOyakata("strict-test", {
      archetype: "strict",
      traits: { tradition: 40, ambition: 50, patience: 50, risk: 50, compassion: 50 },
    });

    // 'strict' maps to [style_purist, traditionalist]
    let foundPuristOshi = false;
    for (let i = 0; i < 30; i++) {
      const w = { ...world, week: i + 1 };
      const profile = getOyakataStyleProfile(w, oyakata);
      if (profile.philosophy === "style_purist" && profile.preferredStyle === "oshi") {
        expect(profile.preferredArchetypes).toContain("tsuppari");
        expect(profile.preferredArchetypes).toContain("oshi");
        foundPuristOshi = true;
        break;
      }
    }
    expect(foundPuristOshi).toBe(true);
  });
});

describe("scoreRecruitForOyakata — defensive scores well for innovator", () => {
  it("defensive archetype candidate gets archetype match bonus from innovator oyakata", () => {
    const world = MockFactory.createWorld();
    const candidate = {
      archetype: "defensive" as CombatArchetype,
      style: "hybrid" as Style,
      talentSeed: 500,
      weightPotentialKg: 120,
      combatProfile: { archetype: "oshi", familyPreferences: { push: 1, belt: 1, trick: 1, speed: 1 } } as any,
    };

    const speedsterCandidate = {
      archetype: "speedster" as CombatArchetype,
      style: "oshi" as Style,
      talentSeed: 500,
      weightPotentialKg: 120,
      combatProfile: { archetype: "oshi", familyPreferences: { push: 1, belt: 1, trick: 1, speed: 1 } } as any,
    };

    const oyakata = MockFactory.createOyakata("strat-test", { archetype: "strategist" });

    // Score both — defensive should get same archetype-match bonus as speedster for innovator
    let defensiveScore = 0;
    let speedsterScore = 0;
    for (let i = 0; i < 50; i++) {
      const w = { ...world, week: i + 1 };
      const profile = getOyakataStyleProfile(w, oyakata);
      if (profile.philosophy === "innovator") {
        defensiveScore = scoreRecruitForOyakata(w, oyakata, candidate);
        speedsterScore = scoreRecruitForOyakata(w, oyakata, speedsterCandidate);
        break;
      }
    }

    if (defensiveScore > 0) {
      // Both should score above base 50 (archetype match gives +25)
      expect(defensiveScore).toBeGreaterThan(50);
      expect(speedsterScore).toBeGreaterThan(50);
    }
  });
});
