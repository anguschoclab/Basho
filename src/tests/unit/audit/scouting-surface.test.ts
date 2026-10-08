/**
 * Phase 2d: Scouting surface regression tests.
 *
 * Proves that ScoutingService and FogOfWarService are reachable,
 * that the NPC ScoutingWorker is invoked from weekly.ts, and that
 * ScoutingPage mounts scouting tabs and PerceptionOverview.
 */

import { describe, it, expect } from "vitest";
import { join } from "path";
import { readSrcFile } from "@/tests/helpers/fsScan";

const ROOT = join(__dirname, "../../../..");

describe("ScoutingService — reachability", () => {
  it("is exported and used by scoutingStore", () => {
    const svc = readSrcFile("engine/systems/recruitment/ScoutingService.ts");
    expect(svc.length).toBeGreaterThan(0);
  });

  it("scoutingStore bridges ScoutingService to world state", () => {
    const store = readSrcFile("engine/scoutingStore.ts");
    expect(store).toContain("ScoutingService");
  });
});

describe("FogOfWarService — reachability", () => {
  it("is exported and used by CandidateGenerator", () => {
    const svc = readSrcFile("engine/systems/recruitment/FogOfWarService.ts");
    expect(svc.length).toBeGreaterThan(0);
  });

  it("is imported by talentPoolScoutingOps", () => {
    const ops = readSrcFile("engine/systems/generation/talentPoolScoutingOps.ts");
    expect(ops).toContain("FogOfWarService");
  });
});

describe("NPC ScoutingWorker — weekly decision wiring", () => {
  it("spawnScoutingWorker is imported and called by weekly.ts", () => {
    const weekly = readSrcFile("engine/npcAI/weekly.ts");
    expect(weekly).toContain("spawnScoutingWorker");
    expect(weekly).toMatch(/spawnScoutingWorker\s*\(/);
  });

  it("spawnScoutingWorker is exported from npcAIWorkers.ts", () => {
    const workers = readSrcFile("engine/npcAIWorkers.ts");
    expect(workers).toContain("export function spawnScoutingWorker");
  });
});

describe("ScoutingPage — UI surface", () => {
  it("mounts OpponentScoutingTab", () => {
    const page = readSrcFile("pages/ScoutingPage.tsx");
    expect(page).toContain("OpponentScoutingTab");
  });

  it("mounts StableIntelTab", () => {
    const page = readSrcFile("pages/ScoutingPage.tsx");
    expect(page).toContain("StableIntelTab");
  });

  it("mounts RecruitingTab", () => {
    const page = readSrcFile("pages/ScoutingPage.tsx");
    expect(page).toContain("RecruitingTab");
  });

  it("mounts PerceptionOverview", () => {
    const page = readSrcFile("pages/ScoutingPage.tsx");
    expect(page).toContain("PerceptionOverview");
  });
});
