import { describe, it, expect, beforeAll } from "vitest";
import { BardEngine } from "@/engine/bard/BardEngine";
import { rngFromSeed } from "@/engine/rng";

describe("New Interview Question Templates", () => {
  let rng: ReturnType<typeof rngFromSeed>;

  beforeAll(async () => {
    await BardEngine.loadDomains();
    rng = rngFromSeed("test-interview", "narrative", "test");
  });

  describe("Question resolution", () => {
    it("sekitori_debut question resolves with non-empty text", () => {
      const result = BardEngine.resolve(rng, "interview.questions.sekitori_debut");
      expect(result.text).toBeTruthy();
      expect(result.text.length).toBeGreaterThan(10);
      expect(result.text).not.toContain("[MISSING:");
    });

    it("weight_journey question resolves with non-empty text", () => {
      const result = BardEngine.resolve(rng, "interview.questions.weight_journey");
      expect(result.text).toBeTruthy();
      expect(result.text.length).toBeGreaterThan(10);
      expect(result.text).not.toContain("[MISSING:");
    });

    it("glasses_quirk question resolves with non-empty text", () => {
      const result = BardEngine.resolve(rng, "interview.questions.glasses_quirk");
      expect(result.text).toBeTruthy();
      expect(result.text.length).toBeGreaterThan(10);
      expect(result.text).not.toContain("[MISSING:");
    });

    it("childhood_sport question resolves with non-empty text", () => {
      const result = BardEngine.resolve(rng, "interview.questions.childhood_sport");
      expect(result.text).toBeTruthy();
      expect(result.text.length).toBeGreaterThan(10);
      expect(result.text).not.toContain("[MISSING:");
    });

    it("hometown_supporters question resolves with non-empty text", () => {
      const result = BardEngine.resolve(rng, "interview.questions.hometown_supporters");
      expect(result.text).toBeTruthy();
      expect(result.text.length).toBeGreaterThan(10);
      expect(result.text).not.toContain("[MISSING:");
    });

    it("injured_champion_encouragement question resolves with non-empty text", () => {
      const result = BardEngine.resolve(rng, "interview.questions.injured_champion_encouragement");
      expect(result.text).toBeTruthy();
      expect(result.text.length).toBeGreaterThan(10);
      expect(result.text).not.toContain("[MISSING:");
    });

    it("fighting_name_meaning question resolves with non-empty text", () => {
      const result = BardEngine.resolve(rng, "interview.questions.fighting_name_meaning");
      expect(result.text).toBeTruthy();
      expect(result.text.length).toBeGreaterThan(10);
      expect(result.text).not.toContain("[MISSING:");
    });

    it("seven_seven question resolves with non-empty text", () => {
      const result = BardEngine.resolve(rng, "interview.questions.seven_seven");
      expect(result.text).toBeTruthy();
      expect(result.text.length).toBeGreaterThan(10);
      expect(result.text).not.toContain("[MISSING:");
    });

    it("career_highlight question resolves with non-empty text", () => {
      const result = BardEngine.resolve(rng, "interview.questions.career_highlight");
      expect(result.text).toBeTruthy();
      expect(result.text.length).toBeGreaterThan(10);
      expect(result.text).not.toContain("[MISSING:");
    });
  });

  describe("Persona answers", () => {
    it("reflective persona answers resolve with non-empty text", () => {
      const result = BardEngine.resolve(rng, "interview.reflective");
      expect(result.text).toBeTruthy();
      expect(result.text.length).toBeGreaterThan(10);
      expect(result.text).not.toContain("[MISSING:");
    });

    it("quirky persona answers resolve with non-empty text", () => {
      const result = BardEngine.resolve(rng, "interview.quirky");
      expect(result.text).toBeTruthy();
      expect(result.text.length).toBeGreaterThan(10);
      expect(result.text).not.toContain("[MISSING:");
    });
  });

  describe("Modifiers", () => {
    it("quirky_glasses modifier resolves with non-empty text", () => {
      const result = BardEngine.resolve(rng, "interview.modifiers.quirky_glasses", {
        SHIKONA: "TestRikishi",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });

    it("gymnast_backflip modifier resolves with non-empty text", () => {
      const result = BardEngine.resolve(rng, "interview.modifiers.gymnast_backflip", {
        SHIKONA: "TestRikishi",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });

    it("hometown_pride modifier resolves with non-empty text", () => {
      const result = BardEngine.resolve(rng, "interview.modifiers.hometown_pride", {
        SHIKONA: "TestRikishi",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });
  });
});
