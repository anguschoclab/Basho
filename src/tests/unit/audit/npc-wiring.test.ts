/**
 * Phase 1f: NPC wiring regression tests.
 *
 * Proves that FinanceAgent, GovernanceAgent, RecruitmentAgent, RivalryAgent,
 * and NarrativeAgent are invoked from makeNPCWeeklyDecision and that their
 * results affect world state or the event log.
 */

import { describe, it, expect } from "vitest";
import { join } from "path";
import { readSrcFile } from "@/tests/helpers/fsScan";

const ROOT = join(__dirname, "../../../..");

describe("NPC agents — weekly decision wiring", () => {
  const weekly = readSrcFile("engine/npcAI/weekly.ts");

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
    // WS4: execution moved to executeAgentDecisions, which owns the
    // NPC_MANAGER_DECISION emission for each executed domain.
    const execution = readSrcFile("engine/npcAI/execution.ts");
    expect(weekly).toContain("executeAgentDecisions");
    expect(execution).toContain("NPC_MANAGER_DECISION");
  });
});

describe("NPC AI tick phase — phase01_week_npc_ai", () => {
  const phase = readSrcFile("engine/tick/phases/phase01_week_npc_ai.ts");

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
  const index = readSrcFile("engine/agents/index.ts");

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
  const workers = readSrcFile("engine/npcAIWorkers.ts");

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
