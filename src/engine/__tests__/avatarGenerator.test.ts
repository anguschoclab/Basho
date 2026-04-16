/**
 * Avatar Generator Tests
 * Comprehensive tests for procedural avatar generation system
 */

import { describe, it, expect } from "vitest";
import {
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

    it("should use valid face shapes", () => {
      const config = generateAvatarConfig({
        seed: "face-test",
        nationality: "Japan",
        age: 25,
        isSekitori: true,
      });

      expect(["round", "oval", "square", "broad"]).toContain(config.faceShape);
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
});
