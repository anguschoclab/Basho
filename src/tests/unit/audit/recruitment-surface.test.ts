/**
 * Phase 2e: Recruitment surface regression tests.
 *
 * Proves that RecruitmentAgent is invoked from weekly.ts and TacticalCoordinator,
 * and that TalentPoolPage uses TalentPoolService for candidate listing and bidding.
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

describe("RecruitmentAgent — NPC wiring", () => {
  it("spawnRecruitmentAgent is imported and called by weekly.ts", () => {
    const weekly = readFile("engine/npcAI/weekly.ts");
    expect(weekly).toContain("spawnRecruitmentAgent");
    expect(weekly).toMatch(/spawnRecruitmentAgent\s*\(/);
  });

  it("is also imported by TacticalCoordinator", () => {
    const tc = readFile("engine/npcAI/TacticalCoordinator.ts");
    expect(tc).toContain("RecruitmentAgent");
  });

  it("exports spawnRecruitmentAgent with reasoning", () => {
    const agent = readFile("engine/agents/RecruitmentAgent.ts");
    expect(agent).toContain("export function spawnRecruitmentAgent");
    expect(agent).toContain("reasoning");
  });
});

describe("TalentPoolPage — UI surface", () => {
  it("imports talent pool functions via presenters/engineAccess", () => {
    const page = readFile("pages/TalentPoolPage.tsx");
    expect(page).toContain("engineAccess");
  });

  it("lists visible candidates via listVisibleCandidates", () => {
    const page = readFile("pages/TalentPoolPage.tsx");
    expect(page).toContain("listVisibleCandidates");
  });

  it("sends SCOUT_POOL command for pool scouting", () => {
    const page = readFile("pages/TalentPoolPage.tsx");
    expect(page).toContain("SCOUT_POOL");
  });

  it("sends SCOUT_CANDIDATE command for individual scouting", () => {
    const page = readFile("pages/TalentPoolPage.tsx");
    expect(page).toContain("SCOUT_CANDIDATE");
  });

  it("sends OFFER_CONTRACT command for recruitment bidding", () => {
    const page = readFile("pages/TalentPoolPage.tsx");
    expect(page).toContain("OFFER_CONTRACT");
  });

  it("tracks foreign recruit count per heya", () => {
    const page = readFile("pages/TalentPoolPage.tsx");
    expect(page).toContain("getForeignCountInHeya");
    expect(page).toContain("FOREIGN_RIKISHI_LIMIT_PER_HEYA");
  });
});

describe("NPC recruitment — phase01_week_recruitment", () => {
  it("phase01_week_recruitment exists in tick phases", () => {
    const phase = readFile("engine/tick/phases/phase01_week_recruitment.ts");
    expect(phase.length).toBeGreaterThan(0);
  });
});
