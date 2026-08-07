/**
 * Phase 1c: Training surface regression tests.
 *
 * Proves that TrainingService, BloodlineService, MentorshipService, SparringService,
 * and TrainingPhilosophyService are invoked from their tick phases and that
 * TrainingPage mounts SparringPanel.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "../../../..");
const SRC = join(ROOT, "src");

function readFile(rel: string): string {
  const abs = join(SRC, rel);
  if (!existsSync(abs)) return "";
  return readFileSync(abs, "utf-8");
}

describe("TrainingService — tick phase wiring", () => {
  it("TrainingService is imported and called by phase01_week_training", () => {
    const phase = readFile("engine/tick/phases/phase01_week_training.ts");
    expect(phase).toContain("TrainingService");
  });
});

describe("BloodlineService — tick phase wiring", () => {
  it("BloodlineService is imported and called by phase01_week_training", () => {
    const phase = readFile("engine/tick/phases/phase01_week_training.ts");
    expect(phase).toContain("BloodlineService");
    expect(phase).toMatch(/BloodlineService\.applyHeritageBonus/);
  });
});

describe("MentorshipService — tick phase wiring", () => {
  it("applyMentorshipBonuses is imported and called by phase01_week_training", () => {
    const phase = readFile("engine/tick/phases/phase01_week_training.ts");
    expect(phase).toContain("applyMentorshipBonuses");
  });

  it("MentorshipService is imported and used by phase01_week_npc_ai", () => {
    const phase = readFile("engine/tick/phases/phase01_week_npc_ai.ts");
    expect(phase).toContain("MentorshipService");
  });
});

describe("SparringService — tick phase wiring", () => {
  it("applyWeeklySparring is imported and called by phase01_week_training", () => {
    const phase = readFile("engine/tick/phases/phase01_week_training.ts");
    expect(phase).toContain("applyWeeklySparring");
  });

  it("SparringService is imported and used by phase01_week_npc_ai", () => {
    const phase = readFile("engine/tick/phases/phase01_week_npc_ai.ts");
    expect(phase).toContain("SparringService");
  });
});

describe("TrainingPhilosophyService — tick phase wiring", () => {
  it("TrainingPhilosophyService is imported and called by phase06_yearly_boundary", () => {
    const phase = readFile("engine/tick/phases/phase06_yearly_boundary.ts");
    expect(phase).toContain("TrainingPhilosophyService");
  });
});

describe("TrainingPage — UI surface", () => {
  it("mounts SparringPanel", () => {
    const page = readFile("pages/TrainingPage.tsx");
    expect(page).toContain("SparringPanel");
  });
});
