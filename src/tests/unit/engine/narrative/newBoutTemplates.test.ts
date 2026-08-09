import { describe, it, expect, beforeAll } from "vitest";
import { BardEngine } from "@/engine/bard/BardEngine";
import { rngFromSeed } from "@/engine/rng";

describe("New Bout Narrative Templates", () => {
  let rng: ReturnType<typeof rngFromSeed>;

  beforeAll(async () => {
    await BardEngine.loadDomains();
    rng = rngFromSeed("test-bout-templates", "narrative", "test");
  });

  describe("pre_bout.storylines", () => {
    it("seven_seven resolves with non-empty text", () => {
      const result = BardEngine.resolve(rng, "pre_bout.storylines.seven_seven");
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });

    it("oversleeping_reference resolves with SHIKONA interpolation", () => {
      const result = BardEngine.resolve(rng, "pre_bout.storylines.oversleeping_reference", {
        SHIKONA: "Sleepy",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).toContain("Sleepy");
      expect(result.text).not.toContain("[MISSING:");
    });

    it("fighting_name_early resolves with SHIKONA interpolation", () => {
      const result = BardEngine.resolve(rng, "pre_bout.storylines.fighting_name_early", {
        SHIKONA: "Named",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).toContain("Named");
      expect(result.text).not.toContain("[MISSING:");
    });

    it("freeze_up resolves with SHIKONA interpolation", () => {
      const result = BardEngine.resolve(rng, "pre_bout.storylines.freeze_up", {
        SHIKONA: "Frozen",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).toContain("Frozen");
      expect(result.text).not.toContain("[MISSING:");
    });
  });

  describe("pre_bout.rank_debut_sekitori", () => {
    it("sekitori_debut resolves with SHIKONA interpolation", () => {
      const result = BardEngine.resolve(rng, "pre_bout.rank_debut_sekitori.sekitori_debut", {
        SHIKONA: "Debutant",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).toContain("Debutant");
      expect(result.text).not.toContain("[MISSING:");
    });
  });

  describe("h2h new sections", () => {
    it("junior_high_rivals resolves with P1 and P2 interpolation", () => {
      const result = BardEngine.resolve(rng, "h2h.junior_high_rivals", {
        P1: "Rival1",
        P2: "Rival2",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).toContain("Rival1");
      expect(result.text).toContain("Rival2");
      expect(result.text).not.toContain("[MISSING:");
    });

    it("cohort_reunion resolves with P1 and P2 interpolation", () => {
      const result = BardEngine.resolve(rng, "h2h.cohort_reunion", {
        P1: "Cohort1",
        P2: "Cohort2",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).toContain("Cohort1");
      expect(result.text).toContain("Cohort2");
      expect(result.text).not.toContain("[MISSING:");
    });
  });

  describe("post_bout.storylines", () => {
    it("seven_seven_win resolves with WINNER interpolation", () => {
      const result = BardEngine.resolve(rng, "post_bout.storylines.seven_seven_win", {
        WINNER: "Clutch",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).toContain("Clutch");
      expect(result.text).not.toContain("[MISSING:");
    });

    it("seven_seven_loss resolves with LOSER interpolation", () => {
      const result = BardEngine.resolve(rng, "post_bout.storylines.seven_seven_loss", {
        LOSER: "Heartbroken",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).toContain("Heartbroken");
      expect(result.text).not.toContain("[MISSING:");
    });

    it("crowd_gasps_horror resolves with WINNER interpolation", () => {
      const result = BardEngine.resolve(rng, "post_bout.storylines.crowd_gasps_horror", {
        WINNER: "Underdog",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).toContain("Underdog");
      expect(result.text).not.toContain("[MISSING:");
    });

    it("freeze_up_recovery resolves with WINNER interpolation", () => {
      const result = BardEngine.resolve(rng, "post_bout.storylines.freeze_up_recovery", {
        WINNER: "Unfrozen",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).toContain("Unfrozen");
      expect(result.text).not.toContain("[MISSING:");
    });
  });

  describe("post_bout.master_intervention", () => {
    it("master_intervention resolves with WINNER interpolation", () => {
      const result = BardEngine.resolve(rng, "post_bout.master_intervention", {
        WINNER: "Saved",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).toContain("Saved");
      expect(result.text).not.toContain("[MISSING:");
    });
  });

  describe("kyujo new sections", () => {
    it("oversleeping resolves with SHIKONA interpolation", () => {
      const result = BardEngine.resolve(rng, "kyujo.oversleeping", {
        SHIKONA: "NoShow",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).toContain("NoShow");
      expect(result.text).not.toContain("[MISSING:");
    });

    it("multi_surgery resolves with SHIKONA and COUNT interpolation", () => {
      const result = BardEngine.resolve(rng, "kyujo.multi_surgery", {
        SHIKONA: "Battered",
        COUNT: "3",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).toContain("Battered");
      expect(result.text).toContain("3");
      expect(result.text).not.toContain("[MISSING:");
    });
  });
});
