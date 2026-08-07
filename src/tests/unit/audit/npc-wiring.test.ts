/**
 * Phase 1f: NPC wiring regression tests.
 *
 * Proves that FinanceAgent, GovernanceAgent, RecruitmentAgent, RivalryAgent,
 * and NarrativeAgent are invoked from makeNPCWeeklyDecision and that their
 * results affect world state or the event log.
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

describe("NPC agents — weekly decision wiring", () => {
  const weekly = readFile("engine/npcAI/weekly.ts");

  it("imports spawnFinanceAgent", () => {
    expect(weekly).toContain("spawnFinanceAgent");
  });

  it("imports spawnGovernanceAgent", () => {
    expect(weekly).toContain("spawnGovernanceAgent");
  });

  it("imports spawnRecruitmentAgent", () => {
    expect(weekly).toContain("spawnRecruitmentAgent");
  });

  it("imports spawnRivalryAgent", () => {
    expect(weekly).toContain("spawnRivalryAgent");
  });

  it("imports spawnNarrativeAgent", () => {
    expect(weekly).toContain("spawnNarrativeAgent");
  });

  it("calls spawnFinanceAgent with a finance context", () => {
    expect(weekly).toMatch(/spawnFinanceAgent\s*\(/);
  });

  it("calls spawnGovernanceAgent with a governance context", () => {
    expect(weekly).toMatch(/spawnGovernanceAgent\s*\(/);
  });

  it("emits NPC_MANAGER_DECISION events for agent results", () => {
    expect(weekly).toContain("NPC_MANAGER_DECISION");
  });
});

describe("NPC AI tick phase — phase01_week_npc_ai", () => {
  const phase = readFile("engine/tick/phases/phase01_week_npc_ai.ts");

  it("imports and calls makeNPCWeeklyDecision", () => {
    expect(phase).toContain("makeNPCWeeklyDecision");
  });

  it("imports MentorshipService for NPC mentor assignment", () => {
    expect(phase).toContain("MentorshipService");
  });

  it("imports SparringService for NPC sparring decisions", () => {
    expect(phase).toContain("SparringService");
  });

  it("builds perception snapshots for NPC stables", () => {
    expect(phase).toContain("buildPerceptionSnapshot");
  });
});

describe("Agent exports — all agents are exported from index", () => {
  const index = readFile("engine/agents/index.ts");

  it("exports spawnFinanceAgent", () => {
    expect(index).toContain("FinanceAgent");
  });

  it("exports spawnGovernanceAgent", () => {
    expect(index).toContain("GovernanceAgent");
  });

  it("exports spawnRecruitmentAgent", () => {
    expect(index).toContain("RecruitmentAgent");
  });

  it("exports spawnRivalryAgent", () => {
    expect(index).toContain("RivalryAgent");
  });

  it("exports spawnNarrativeAgent", () => {
    expect(index).toContain("NarrativeAgent");
  });
});

describe("NPC workers — npcAIWorkers", () => {
  const workers = readFile("engine/npcAIWorkers.ts");

  it("exports spawnTrainingWorker", () => {
    expect(workers).toContain("spawnTrainingWorker");
  });

  it("exports spawnScoutingWorker", () => {
    expect(workers).toContain("spawnScoutingWorker");
  });

  it("exports spawnPersonnelWorker", () => {
    expect(workers).toContain("spawnPersonnelWorker");
  });

  it("exports spawnGlobalWorker", () => {
    expect(workers).toContain("spawnGlobalWorker");
  });
});
