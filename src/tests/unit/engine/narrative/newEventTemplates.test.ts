/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeAll } from "vitest";
import { BardEngine } from "@/engine/bard/BardEngine";
import { rngFromSeed } from "@/engine/rng";

describe("New Event Narrative Templates", () => {
  let rng: ReturnType<typeof rngFromSeed>;

  beforeAll(async () => {
    await BardEngine.loadDomains();
    rng = rngFromSeed("test-events", "narrative", "test");
  });

  describe("Oversleeping incident", () => {
    it("oversleeping_incident_title resolves", () => {
      const result = BardEngine.resolve(rng, "events.narrative.oversleeping_incident_title", {
        SHIKONA: "Sleepy Riki",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });

    it("oversleeping_incident_summary resolves with day interpolation", () => {
      const result = BardEngine.resolve(rng, "events.narrative.oversleeping_incident_summary", {
        SHIKONA: "Sleepy Riki",
        DAY: "5",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).toContain("Sleepy Riki");
      expect(result.text).not.toContain("[MISSING:");
    });
  });

  describe("Weight milestone", () => {
    it("weight_milestone_title resolves", () => {
      const result = BardEngine.resolve(rng, "events.narrative.weight_milestone_title", {
        SHIKONA: "Bulk Riki",
        WEIGHT: "160",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });

    it("weight_milestone_summary resolves with WEIGHT interpolation", () => {
      const result = BardEngine.resolve(rng, "events.narrative.weight_milestone_summary", {
        SHIKONA: "Bulk Riki",
        WEIGHT: "160",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).toContain("160");
      expect(result.text).not.toContain("[MISSING:");
    });
  });

  describe("Fighting name conferred early", () => {
    it("fighting_name_conferred_early_title resolves", () => {
      const result = BardEngine.resolve(rng, "events.narrative.fighting_name_conferred_early_title", {
        SHIKONA: "Early Name",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });

    it("fighting_name_conferred_early_summary resolves", () => {
      const result = BardEngine.resolve(rng, "events.narrative.fighting_name_conferred_early_summary", {
        SHIKONA: "Early Name",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });
  });

  describe("Cohort all sekitori", () => {
    it("cohort_all_sekitori_title resolves", () => {
      const result = BardEngine.resolve(rng, "events.narrative.cohort_all_sekitori_title", {
        COUNT: "4",
        YEAR: "2018",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });

    it("cohort_all_sekitori_summary resolves", () => {
      const result = BardEngine.resolve(rng, "events.narrative.cohort_all_sekitori_summary", {
        YEAR: "2018",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });
  });

  describe("Injury mount cruel", () => {
    it("injury_mount_cruel_title resolves with OPPONENT", () => {
      const result = BardEngine.resolve(rng, "events.narrative.injury_mount_cruel_title", {
        SHIKONA: "Broken Riki",
        OPPONENT: "Rival Guy",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });

    it("injury_mount_cruel_summary resolves with OPPONENT interpolation", () => {
      const result = BardEngine.resolve(rng, "events.narrative.injury_mount_cruel_summary", {
        SHIKONA: "Broken Riki",
        OPPONENT: "Rival Guy",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).toContain("Rival Guy");
      expect(result.text).not.toContain("[MISSING:");
    });
  });

  describe("Veteran decline acceptance", () => {
    it("veteran_decline_acceptance_title resolves", () => {
      const result = BardEngine.resolve(rng, "events.narrative.veteran_decline_acceptance_title", {
        SHIKONA: "Old Timer",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });

    it("veteran_decline_acceptance_summary resolves", () => {
      const result = BardEngine.resolve(rng, "events.narrative.veteran_decline_acceptance_summary", {
        SHIKONA: "Old Timer",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });
  });

  describe("Retirement favorite memory", () => {
    it("retirement_favorite_memory_title resolves", () => {
      const result = BardEngine.resolve(rng, "events.narrative.retirement_favorite_memory_title", {
        SHIKONA: "Retiring Riki",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });

    it("retirement_favorite_memory_summary resolves with OPPONENT and BASHO", () => {
      const result = BardEngine.resolve(rng, "events.narrative.retirement_favorite_memory_summary", {
        SHIKONA: "Retiring Riki",
        OPPONENT: "Old Rival",
        BASHO: "Hatsu",
      });
      expect(result.text).toBeTruthy();
      expect(result.text).toContain("Old Rival");
      expect(result.text).toContain("Hatsu");
      expect(result.text).not.toContain("[MISSING:");
    });
  });

  describe("Post-retirement paths", () => {
    it("retirement_post_path_oyakata resolves", () => {
      const title = BardEngine.resolve(rng, "events.narrative.retirement_post_path_oyakata_title", { SHIKONA: "Coach" });
      const summary = BardEngine.resolve(rng, "events.narrative.retirement_post_path_oyakata_summary", { SHIKONA: "Coach" });
      expect(title.text).toBeTruthy();
      expect(summary.text).toBeTruthy();
      expect(title.text).not.toContain("[MISSING:");
      expect(summary.text).not.toContain("[MISSING:");
    });

    it("retirement_post_path_media resolves", () => {
      const title = BardEngine.resolve(rng, "events.narrative.retirement_post_path_media_title", { SHIKONA: "Pundit" });
      const summary = BardEngine.resolve(rng, "events.narrative.retirement_post_path_media_summary", { SHIKONA: "Pundit" });
      expect(title.text).toBeTruthy();
      expect(summary.text).toBeTruthy();
      expect(title.text).not.toContain("[MISSING:");
      expect(summary.text).not.toContain("[MISSING:");
    });

    it("retirement_post_path_coach resolves", () => {
      const title = BardEngine.resolve(rng, "events.narrative.retirement_post_path_coach_title", { SHIKONA: "Hometown" });
      const summary = BardEngine.resolve(rng, "events.narrative.retirement_post_path_coach_summary", { SHIKONA: "Hometown" });
      expect(title.text).toBeTruthy();
      expect(summary.text).toBeTruthy();
      expect(title.text).not.toContain("[MISSING:");
      expect(summary.text).not.toContain("[MISSING:");
    });

    it("retirement_post_path_leave resolves", () => {
      const title = BardEngine.resolve(rng, "events.narrative.retirement_post_path_leave_title", { SHIKONA: "Gone" });
      const summary = BardEngine.resolve(rng, "events.narrative.retirement_post_path_leave_summary", { SHIKONA: "Gone" });
      expect(title.text).toBeTruthy();
      expect(summary.text).toBeTruthy();
      expect(title.text).not.toContain("[MISSING:");
      expect(summary.text).not.toContain("[MISSING:");
    });
  });

  describe("Retirement press reflective", () => {
    it("retirement_press_reflective resolves", () => {
      const result = BardEngine.resolve(rng, "events.narrative.retirement_press_reflective");
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });
  });
});
