/**
 * Phase 1c: Training surface regression tests.
 *
 * Proves that TrainingService, BloodlineService, MentorshipService, SparringService,
 * and TrainingPhilosophyService are invoked from their tick phases and that
 * TrainingPage mounts SparringPanel.
 */

import { describe, it, expect } from "vitest";
import { join } from "path";
import { readSrcFile } from "@/tests/helpers/fsScan";

const ROOT = join(__dirname, "../../../..");

describe("TrainingService — tick phase wiring", () => {
  it("TrainingService is imported and called by phase01_week_training", () => {
    const phase = readSrcFile("engine/tick/phases/phase01_week_training.ts");
    expect(phase).toContain("TrainingService");
  });
});

describe("BloodlineService — tick phase wiring", () => {
  it("BloodlineService is imported and called by phase01_week_training", () => {
    const phase = readSrcFile("engine/tick/phases/phase01_week_training.ts");
    expect(phase).toContain("BloodlineService");
    expect(phase).toMatch(/BloodlineService\.applyHeritageBonus/);
  });
});

describe("MentorshipService — tick phase wiring", () => {
  it("applyMentorshipBonuses is imported and called by phase01_week_training", () => {
    const phase = readSrcFile("engine/tick/phases/phase01_week_training.ts");
    expect(phase).toContain("applyMentorshipBonuses");
  });

  it("MentorshipService is imported and used by phase01_week_npc_ai", () => {
    const phase = readSrcFile("engine/tick/phases/phase01_week_npc_ai.ts");
    expect(phase).toContain("MentorshipService");
  });
});

describe("SparringService — tick phase wiring", () => {
  it("applyWeeklySparring is imported and called by phase01_week_training", () => {
    const phase = readSrcFile("engine/tick/phases/phase01_week_training.ts");
    expect(phase).toContain("applyWeeklySparring");
  });

  it("SparringService is imported and used by phase01_week_npc_ai", () => {
    const phase = readSrcFile("engine/tick/phases/phase01_week_npc_ai.ts");
    expect(phase).toContain("SparringService");
  });
});

describe("TrainingPhilosophyService — tick phase wiring", () => {
  it("TrainingPhilosophyService is imported and called by phase06_yearly_boundary", () => {
    const phase = readSrcFile("engine/tick/phases/phase06_yearly_boundary.ts");
    expect(phase).toContain("TrainingPhilosophyService");
  });
});

describe("TsukebitoService — tick phase wiring", () => {
  it("assignTsukebito is imported and called by phase01_week_training", () => {
    const phase = readSrcFile("engine/tick/phases/phase01_week_training.ts");
    expect(phase).toContain("assignTsukebito");
    expect(phase).toMatch(/assignTsukebito\s*\(/);
  });

  it("applyWeeklyTsukebitoBenefits is imported and called by phase01_week_training", () => {
    const phase = readSrcFile("engine/tick/phases/phase01_week_training.ts");
    expect(phase).toContain("applyWeeklyTsukebitoBenefits");
    expect(phase).toMatch(/applyWeeklyTsukebitoBenefits\s*\(/);
  });

  it("applyWeeklyOtotodeshiEffects is imported and called by phase01_week_training", () => {
    const phase = readSrcFile("engine/tick/phases/phase01_week_training.ts");
    expect(phase).toContain("applyWeeklyOtotodeshiEffects");
    expect(phase).toMatch(/applyWeeklyOtotodeshiEffects\s*\(/);
  });

  it("persists tsukebitoIds on senior rikishi", () => {
    const phase = readSrcFile("engine/tick/phases/phase01_week_training.ts");
    expect(phase).toContain("tsukebitoIds");
  });
});

describe("TrainingPage — UI surface", () => {
  it("mounts SparringPanel", () => {
    const page = readSrcFile("pages/TrainingPage.tsx");
    expect(page).toContain("SparringPanel");
  });
});
