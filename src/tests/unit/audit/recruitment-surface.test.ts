/**
 * Phase 2e: Recruitment surface regression tests.
 *
 * Proves that RecruitmentAgent is invoked from weekly.ts and TacticalCoordinator,
 * and that TalentPoolPage uses TalentPoolService for candidate listing and bidding.
 */

import { describe, it, expect } from "vitest";
import { join } from "path";
import { readSrcFile } from "@/tests/helpers/fsScan";

const ROOT = join(__dirname, "../../../..");

describe("RecruitmentAgent — NPC wiring", () => {
  it("spawnRecruitmentAgent is imported and called by weekly.ts", () => {
    const weekly = readSrcFile("engine/npcAI/weekly.ts");
    expect(weekly).toContain("spawnRecruitmentAgent");
    expect(weekly).toMatch(/spawnRecruitmentAgent\s*\(/);
  });

  it("is also imported by TacticalCoordinator", () => {
    const tc = readSrcFile("engine/npcAI/TacticalCoordinator.ts");
    expect(tc).toContain("RecruitmentAgent");
  });

  it("exports spawnRecruitmentAgent with reasoning", () => {
    const agent = readSrcFile("engine/agents/RecruitmentAgent.ts");
    expect(agent).toContain("export function spawnRecruitmentAgent");
    expect(agent).toContain("reasoning");
  });
});

describe("TalentPoolPage — UI surface", () => {
  it("imports talent pool functions via presenters/engineAccess", () => {
    const page = readSrcFile("pages/TalentPoolPage.tsx");
    expect(page).toContain("engineAccess");
  });

  it("lists visible candidates via listVisibleCandidates", () => {
    const page = readSrcFile("pages/TalentPoolPage.tsx");
    expect(page).toContain("listVisibleCandidates");
  });

  it("sends SCOUT_POOL command for pool scouting", () => {
    const page = readSrcFile("pages/TalentPoolPage.tsx");
    expect(page).toContain("SCOUT_POOL");
  });

  it("sends SCOUT_CANDIDATE command for individual scouting", () => {
    const page = readSrcFile("pages/TalentPoolPage.tsx");
    expect(page).toContain("SCOUT_CANDIDATE");
  });

  it("sends OFFER_CONTRACT command for recruitment bidding", () => {
    const page = readSrcFile("pages/TalentPoolPage.tsx");
    expect(page).toContain("OFFER_CONTRACT");
  });

  it("tracks foreign recruit count per heya", () => {
    const page = readSrcFile("pages/TalentPoolPage.tsx");
    expect(page).toContain("getForeignCountInHeya");
    expect(page).toContain("FOREIGN_RIKISHI_LIMIT_PER_HEYA");
  });
});

describe("NPC recruitment — phase01_week_recruitment", () => {
  it("phase01_week_recruitment exists in tick phases", () => {
    const phase = readSrcFile("engine/tick/phases/phase01_week_recruitment.ts");
    expect(phase.length).toBeGreaterThan(0);
  });
});
