/**
 * Avatar Generator Tests
 * Comprehensive tests for procedural avatar generation system
 */

import { describe, it, expect } from "vitest";
import {
  generateDefaultAvatarConfig,
  generateAvatarConfig,
  updateAvatarForAging,
  updateHairstyleForPromotion,
} from "../avatarGenerator";
import { NATIONALITY_SKIN_TONES, HAIR_COLORS } from "../types/avatar";

describe("Avatar Generator", () => {
  describe("generateAvatarConfig", () => {
    it("should generate deterministic avatars for the same seed", () => {
      const config1 = generateAvatarConfig({
        seed: "test-rikishi-001",
        nationality: "Japan",
        age: 25,
        isSekitori: true,
      });

      const config2 = generateAvatarConfig({
        seed: "test-rikishi-001",
        nationality: "Japan",
        age: 25,
        isSekitori: true,
      });

      expect(config1).toEqual(config2);
      expect(config1.seed).toBe("test-rikishi-001");
    });

    it("should generate different avatars for different seeds", () => {
      const config1 = generateAvatarConfig({
        seed: "rikishi-a",
        nationality: "Japan",
        age: 25,
        isSekitori: true,
      });

      const config2 = generateAvatarConfig({
        seed: "rikishi-b",
        nationality: "Japan",
        age: 25,
        isSekitori: true,
      });

      // At least one property should differ
      const hasDifference =
        config1.faceShape !== config2.faceShape ||
        config1.eyeType !== config2.eyeType ||
        config1.skinTone !== config2.skinTone ||
        config1.hairColor !== config2.hairColor;

      expect(hasDifference).toBe(true);
    });

    it("should assign appropriate skin tones for Japanese rikishi", () => {
      const config = generateAvatarConfig({
        seed: "japanese-test",
        nationality: "Japan",
        age: 25,
        isSekitori: true,
      });

      expect(config.skinToneKey).toBe("japan");
      expect(config.skinTone).toBe(NATIONALITY_SKIN_TONES.japan.base);
    });

    it("should assign appropriate skin tones for Mongolian rikishi", () => {
      const config = generateAvatarConfig({
        seed: "mongolian-test",
        nationality: "Mongolia",
        age: 25,
        isSekitori: true,
      });

      expect(config.skinToneKey).toBe("mongolia");
      expect(config.skinTone).toBe(NATIONALITY_SKIN_TONES.mongolia.base);
    });

    it("should assign oichomage hairstyle to sekitori", () => {
      const config = generateAvatarConfig({
        seed: "sekitori-test",
        nationality: "Japan",
        age: 25,
        isSekitori: true,
      });

      expect(config.hairstyle).toBe("oichomage");
    });

    it("should assign chonmage hairstyle to non-sekitori", () => {
      const config = generateAvatarConfig({
        seed: "non-sekitori-test",
        nationality: "Japan",
        age: 25,
        isSekitori: false,
      });

      expect(config.hairstyle).toBe("chonmage");
    });

    it("should assign retired hairstyle to retired rikishi", () => {
      const config = generateAvatarConfig({
        seed: "retired-test",
        nationality: "Japan",
        age: 35,
        isSekitori: false,
        isRetired: true,
      });

      expect(config.hairstyle).toBe("retired");
    });

    it("should assign oyakata hairstyle to oyakata", () => {
      const config = generateAvatarConfig({
        seed: "oyakata-test",
        nationality: "Japan",
        age: 45,
        isSekitori: false,
        isOyakata: true,
      });

      expect(config.hairstyle).toBe("oyakata");
    });

    it("should calculate correct age stages", () => {
      const teen = generateAvatarConfig({
        seed: "teen",
        nationality: "Japan",
        age: 18,
        isSekitori: true,
      });
      expect(teen.ageStage).toBe("teen");

      const young = generateAvatarConfig({
        seed: "young",
        nationality: "Japan",
        age: 22,
        isSekitori: true,
      });
      expect(young.ageStage).toBe("young");

      const prime = generateAvatarConfig({
        seed: "prime",
        nationality: "Japan",
        age: 28,
        isSekitori: true,
      });
      expect(prime.ageStage).toBe("prime");

      const veteran = generateAvatarConfig({
        seed: "veteran",
        nationality: "Japan",
        age: 35,
        isSekitori: true,
      });
      expect(veteran.ageStage).toBe("veteran");

      const elder = generateAvatarConfig({
        seed: "elder",
        nationality: "Japan",
        age: 45,
        isSekitori: false,
        isRetired: true,
      });
      expect(elder.ageStage).toBe("elder");
    });

    it("should calculate wrinkles based on age", () => {
      const young = generateAvatarConfig({
        seed: "young-wrinkle",
        nationality: "Japan",
        age: 25,
        isSekitori: true,
      });
      expect(young.wrinkles).toBe(0);

      const middle = generateAvatarConfig({
        seed: "middle-wrinkle",
        nationality: "Japan",
        age: 35,
        isSekitori: true,
      });
      expect(middle.wrinkles).toBeGreaterThanOrEqual(5);
      expect(middle.wrinkles).toBeLessThanOrEqual(20);

      const old = generateAvatarConfig({
        seed: "old-wrinkle",
        nationality: "Japan",
        age: 55,
        isSekitori: false,
        isRetired: true,
      });
      expect(old.wrinkles).toBeGreaterThanOrEqual(50);
      expect(old.wrinkles).toBeLessThanOrEqual(80);
    });

    it("should calculate hair graying based on age", () => {
      const young = generateAvatarConfig({
        seed: "young-hair",
        nationality: "Japan",
        age: 25,
        isSekitori: true,
      });
      expect(young.hairGraying).toBe(0);

      const middle = generateAvatarConfig({
        seed: "middle-hair",
        nationality: "Japan",
        age: 40,
        isSekitori: true,
      });
      expect(middle.hairGraying).toBeGreaterThanOrEqual(0);
      expect(middle.hairGraying).toBeLessThanOrEqual(30);

      const old = generateAvatarConfig({
        seed: "old-hair",
        nationality: "Japan",
        age: 60,
        isSekitori: false,
        isRetired: true,
      });
      expect(old.hairGraying).toBeGreaterThanOrEqual(70);
      expect(old.hairGraying).toBeLessThanOrEqual(100);
    });

    it("should generate valid face shape", () => {
      const config = generateAvatarConfig({
        seed: "test-face",
        nationality: "Japan",
        age: 25,
        isSekitori: true,
      });

      expect(["round", "oval", "square", "broad"]).toContain(config.faceShape);
    });

    it("should generate valid eye angle", () => {
      const config = generateAvatarConfig({
        seed: "test-eye-angle",
        nationality: "Japan",
        age: 25,
        isSekitori: true,
      });

      expect(["level", "slanted-up", "slanted-down"]).toContain(config.eyeAngle);
    });

    it("should generate valid eye spacing", () => {
      const config = generateAvatarConfig({
        seed: "test-eye-spacing",
        nationality: "Japan",
        age: 25,
        isSekitori: true,
      });

      expect(["close", "normal", "wide"]).toContain(config.eyeSpacing);
    });

    it("should use valid eye types", () => {
      const config = generateAvatarConfig({
        seed: "eye-test",
        nationality: "Japan",
        age: 25,
        isSekitori: true,
      });

      expect(["standard", "narrow", "wide"]).toContain(config.eyeType);
    });

    it("should use valid hair colors", () => {
      const config = generateAvatarConfig({
        seed: "hair-test",
        nationality: "Japan",
        age: 25,
        isSekitori: true,
      });

      const validColors = Object.values(HAIR_COLORS);
      expect(validColors).toContain(config.hairColor);
    });
  });

  describe("updateAvatarForAging", () => {
    it("should update age stage when crossing thresholds", () => {
      const youngConfig = generateAvatarConfig({
        seed: "aging-test",
        nationality: "Japan",
        age: 22,
        isSekitori: true,
      });

      expect(youngConfig.ageStage).toBe("young");

      const updated = updateAvatarForAging(youngConfig, 28);
      expect(updated.ageStage).toBe("prime");
    });

    it("should update hair color based on graying", () => {
      const youngConfig = generateAvatarConfig({
        seed: "test-graying",
        nationality: "Japan",
        age: 25,
        isSekitori: true,
      });

      const oldConfig = updateAvatarForAging(youngConfig, 60);

      expect(oldConfig.hairGraying).toBeGreaterThan(youngConfig.hairGraying);
      if (oldConfig.hairGraying > 50) {
        expect(oldConfig.hairColor).toBe(HAIR_COLORS.gray);
      }
    });

    it("should preserve new fields during aging", () => {
      const config = generateAvatarConfig({
        seed: "test-preserve",
        nationality: "Japan",
        age: 25,
        isSekitori: true,
      });

      const agedConfig = updateAvatarForAging(config, 35);

      // New fields should be preserved
      expect(agedConfig.eyeAngle).toBe(config.eyeAngle);
      expect(agedConfig.eyeSpacing).toBe(config.eyeSpacing);
      expect(agedConfig.earSize).toBe(config.earSize);
      expect(agedConfig.facialHair).toBe(config.facialHair);
      expect(agedConfig.distinctiveMark).toBe(config.distinctiveMark);
    });

    it("should increase wrinkles with age", () => {
      const config = generateAvatarConfig({
        seed: "wrinkle-update",
        nationality: "Japan",
        age: 25,
        isSekitori: true,
      });

      const initialWrinkles = config.wrinkles;
      const updated = updateAvatarForAging(config, 45);

      expect(updated.wrinkles).toBeGreaterThan(initialWrinkles);
    });

    it("should increase hair graying with age", () => {
      const config = generateAvatarConfig({
        seed: "gray-update",
        nationality: "Japan",
        age: 30,
        isSekitori: true,
      });

      const initialGraying = config.hairGraying;
      const updated = updateAvatarForAging(config, 50);

      expect(updated.hairGraying).toBeGreaterThan(initialGraying);
    });

    it("should not modify original config (immutable)", () => {
      const config = generateAvatarConfig({
        seed: "immutable-test",
        nationality: "Japan",
        age: 25,
        isSekitori: true,
      });

      const originalAgeStage = config.ageStage;
      updateAvatarForAging(config, 50);

      expect(config.ageStage).toBe(originalAgeStage);
    });
  });

  describe("updateHairstyleForPromotion", () => {
    it("should promote to oichomage when reaching sekitori", () => {
      const config = generateAvatarConfig({
        seed: "promotion-test",
        nationality: "Japan",
        age: 25,
        isSekitori: false,
      });

      expect(config.hairstyle).toBe("chonmage");

      const promoted = updateHairstyleForPromotion(config, true);
      expect(promoted.hairstyle).toBe("oichomage");
    });

    it("should demote to chonmage when falling from sekitori", () => {
      const config = generateAvatarConfig({
        seed: "demotion-test",
        nationality: "Japan",
        age: 25,
        isSekitori: true,
      });

      expect(config.hairstyle).toBe("oichomage");

      const demoted = updateHairstyleForPromotion(config, false);
      expect(demoted.hairstyle).toBe("chonmage");
    });

    it("should not change hairstyle for retired rikishi", () => {
      const config = generateAvatarConfig({
        seed: "retired-hairstyle",
        nationality: "Japan",
        age: 35,
        isSekitori: false,
        isRetired: true,
      });

      expect(config.hairstyle).toBe("retired");

      const updated = updateHairstyleForPromotion(config, true);
      expect(updated.hairstyle).toBe("retired");
    });
  });
  describe("generateDefaultAvatarConfig", () => {
    it("should generate proper avatar for a makuuchi sekitori", () => {
      const config = generateDefaultAvatarConfig({
        id: "makuuchi-test",
        nationality: "Japan",
        birthYear: 2000,
        division: "makuuchi"
      });

      // 2025 - 2000 = 25 years old
      expect(config.ageStage).toBe("prime");
      expect(config.hairstyle).toBe("oichomage");
    });

    it("should generate proper avatar for a juryo sekitori", () => {
      const config = generateDefaultAvatarConfig({
        id: "juryo-test",
        nationality: "Mongolia",
        birthYear: 2003,
        division: "juryo"
      });

      // 2025 - 2003 = 22 years old
      expect(config.ageStage).toBe("young");
      expect(config.hairstyle).toBe("oichomage");
    });

    it("should generate proper avatar for a makushita non-sekitori", () => {
      const config = generateDefaultAvatarConfig({
        id: "makushita-test",
        nationality: "Japan",
        birthYear: 2007,
        division: "makushita"
      });

      // 2025 - 2007 = 18 years old
      expect(config.ageStage).toBe("teen");
      expect(config.hairstyle).toBe("chonmage");
    });

    it("should generate proper avatar for a retired rikishi", () => {
      const config = generateDefaultAvatarConfig({
        id: "retired-test",
        nationality: "Japan",
        birthYear: 1985,
        division: "juryo",
        isRetired: true
      });

      // 2025 - 1985 = 40 years old
      expect(config.ageStage).toBe("veteran");
      expect(config.hairstyle).toBe("retired");
    });
  });

});
