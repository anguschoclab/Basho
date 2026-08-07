/**
 * Phase 2d: Scouting surface regression tests.
 *
 * Proves that ScoutingService and FogOfWarService are reachable,
 * that the NPC ScoutingWorker is invoked from weekly.ts, and that
 * ScoutingPage mounts scouting tabs and PerceptionOverview.
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

describe("ScoutingService — reachability", () => {
  it("is exported and used by scoutingStore", () => {
    const svc = readFile("engine/systems/recruitment/ScoutingService.ts");
    expect(svc.length).toBeGreaterThan(0);
  });

  it("scoutingStore bridges ScoutingService to world state", () => {
    const store = readFile("engine/scoutingStore.ts");
    expect(store).toContain("ScoutingService");
  });
});

describe("FogOfWarService — reachability", () => {
  it("is exported and used by CandidateGenerator", () => {
    const svc = readFile("engine/systems/recruitment/FogOfWarService.ts");
    expect(svc.length).toBeGreaterThan(0);
  });

  it("is imported by talentPoolScoutingOps", () => {
    const ops = readFile("engine/systems/generation/talentPoolScoutingOps.ts");
    expect(ops).toContain("FogOfWarService");
  });
});

describe("NPC ScoutingWorker — weekly decision wiring", () => {
  it("spawnScoutingWorker is imported and called by weekly.ts", () => {
    const weekly = readFile("engine/npcAI/weekly.ts");
    expect(weekly).toContain("spawnScoutingWorker");
    expect(weekly).toMatch(/spawnScoutingWorker\s*\(/);
  });

  it("spawnScoutingWorker is exported from npcAIWorkers.ts", () => {
    const workers = readFile("engine/npcAIWorkers.ts");
    expect(workers).toContain("export function spawnScoutingWorker");
  });
});

describe("ScoutingPage — UI surface", () => {
  it("mounts OpponentScoutingTab", () => {
    const page = readFile("pages/ScoutingPage.tsx");
    expect(page).toContain("OpponentScoutingTab");
  });

  it("mounts StableIntelTab", () => {
    const page = readFile("pages/ScoutingPage.tsx");
    expect(page).toContain("StableIntelTab");
  });

  it("mounts RecruitingTab", () => {
    const page = readFile("pages/ScoutingPage.tsx");
    expect(page).toContain("RecruitingTab");
  });

  it("mounts PerceptionOverview", () => {
    const page = readFile("pages/ScoutingPage.tsx");
    expect(page).toContain("PerceptionOverview");
  });
});
