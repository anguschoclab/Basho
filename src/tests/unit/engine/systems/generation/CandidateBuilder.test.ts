import { describe, it, expect } from "vitest";
import { generateFullRikishi, convertCandidateToRikishi } from "@/engine/systems/generation/CandidateBuilder";
import { rngFromSeed } from "@/engine/rng";
import { buildCombatProfile } from "@/engine/archetype";
import type { TalentCandidate } from "@/engine/types/talent";

describe("CandidateBuilder — avatar field migration", () => {
  describe("generateFullRikishi", () => {
    it("does not set faceAvatarUrl (deprecated field removed)", () => {
      const rng = rngFromSeed("test", "candidate", "full");
      const rikishi = generateFullRikishi({
        id: "rikishi-full-001",
        rng,
        currentYear: 2025,
        rank: "maegashira",
        division: "makuuchi",
        side: "east",
        rankNumber: 10,
      });

      expect("faceAvatarUrl" in rikishi).toBe(false);
    });

    it("sets avatarConfig with the rikishi id as seed", () => {
      const rng = rngFromSeed("test", "candidate", "full-avatar");
      const rikishi = generateFullRikishi({
        id: "rikishi-full-002",
        rng,
        currentYear: 2025,
        rank: "maegashira",
        division: "makuuchi",
        side: "east",
        rankNumber: 10,
      });

      expect(rikishi.avatarConfig).toBeDefined();
      expect(rikishi.avatarConfig?.seed).toBe("rikishi-full-002");
    });

    it("produces a valid AvatarConfig shape (hairstyle, ageStage, skinToneKey)", () => {
      const rng = rngFromSeed("test", "candidate", "full-shape");
      const rikishi = generateFullRikishi({
        id: "rikishi-full-003",
        rng,
        currentYear: 2025,
        rank: "maegashira",
        division: "makuuchi",
        side: "east",
        rankNumber: 10,
      });

      expect(rikishi.avatarConfig?.hairstyle).toBeDefined();
      expect(rikishi.avatarConfig?.ageStage).toBeDefined();
      expect(rikishi.avatarConfig?.skinToneKey).toBeDefined();
    });
  });

  describe("convertCandidateToRikishi", () => {
    function makeCandidate(personId: string = "candidate-001"): TalentCandidate {
      return {
        candidateId: `${personId}-cand`,
        personId,
        name: "Test Shikona",
        birthYear: 2005,
        originRegion: "Tokyo",
        nationality: "Japan",
        visibilityBand: "partial",
        reputationSeed: 90,
        tags: [],
        combatProfile: buildCombatProfile("oshi"),
        availabilityState: "available",
        competingSuitors: [],
        archetype: "oshi",
        style: "oshi",
        heightPotentialCm: 180,
        weightPotentialKg: 130,
        talentSeed: 12345,
        temperament: { discipline: 70, volatility: 30 },
        potentialStats: {
          power: 70,
          speed: 65,
          technique: 60,
          balance: 55,
          stamina: 80,
          mental: 60,
          adaptability: 55,
        },
        developmentProfile: "standard",
        developmentSpeed: 1.0,
        peakAgeOffset: 0,
        ceilingFraction: 1.0,
      } as unknown as TalentCandidate;
    }

    it("does not set faceAvatarUrl (deprecated field removed)", () => {
      const rng = rngFromSeed("test", "candidate", "convert");
      const candidate = makeCandidate();
      const rikishi = convertCandidateToRikishi({
        candidate,
        rng,
        currentYear: 2025,
        heyaId: "heya-001",
      });

      expect("faceAvatarUrl" in rikishi).toBe(false);
    });

    it("sets avatarConfig with the candidate personId as seed", () => {
      const rng = rngFromSeed("test", "candidate", "convert-avatar");
      const candidate = makeCandidate("candidate-002");
      const rikishi = convertCandidateToRikishi({
        candidate,
        rng,
        currentYear: 2025,
        heyaId: "heya-001",
      });

      expect(rikishi.avatarConfig).toBeDefined();
      expect(rikishi.avatarConfig?.seed).toBe("candidate-002");
    });
  });

  describe("createBaseInfo (via public functions)", () => {
    it("generateFullRikishi output has no faceAvatarUrl own property", () => {
      const rng = rngFromSeed("test", "candidate", "baseinfo-full");
      const rikishi = generateFullRikishi({
        id: "rikishi-base-001",
        rng,
        currentYear: 2025,
        rank: "jonokuchi",
        division: "jonokuchi",
        side: "east",
        rankNumber: 50,
      });

      expect(Object.prototype.hasOwnProperty.call(rikishi, "faceAvatarUrl")).toBe(false);
    });

    it("convertCandidateToRikishi output has no faceAvatarUrl own property", () => {
      const rng = rngFromSeed("test", "candidate", "baseinfo-convert");
      const candidate: TalentCandidate = {
        candidateId: "candidate-base-001-cand",
        personId: "candidate-base-001",
        name: "Base Info Test",
        birthYear: 2005,
        originRegion: "Tokyo",
        nationality: "Japan",
        visibilityBand: "partial",
        reputationSeed: 90,
        tags: [],
        combatProfile: buildCombatProfile("oshi"),
        availabilityState: "available",
        competingSuitors: [],
        archetype: "oshi",
        style: "oshi",
        heightPotentialCm: 180,
        weightPotentialKg: 130,
        talentSeed: 12345,
        temperament: { discipline: 70, volatility: 30 },
      } as unknown as TalentCandidate;

      const rikishi = convertCandidateToRikishi({
        candidate,
        rng,
        currentYear: 2025,
        heyaId: "heya-001",
      });

      expect(Object.prototype.hasOwnProperty.call(rikishi, "faceAvatarUrl")).toBe(false);
    });
  });
});
