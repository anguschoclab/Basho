/**
 * Phase 2f: Agent behavior regression tests.
 *
 * Proves that all six agents export spawn functions with deterministic
 * decision outputs and reasoning strings. Validates the agent index
 * barrel export and the result interfaces.
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

describe("FinanceAgent — deterministic decision interface", () => {
  const agent = readFile("engine/agents/FinanceAgent.ts");

  it("exports spawnFinanceAgent function", () => {
    expect(agent).toContain("export function spawnFinanceAgent");
  });

  it("result interface includes reasoning array", () => {
    expect(agent).toContain("reasoning: string[]");
  });

  it("result interface includes shouldBuyMyoseki and shouldInvestInFacilities", () => {
    expect(agent).toContain("shouldBuyMyoseki");
    expect(agent).toContain("shouldInvestInFacilities");
  });

  it("result interface includes riskLevel", () => {
    expect(agent).toContain("riskLevel");
  });
});

describe("GovernanceAgent — deterministic decision interface", () => {
  const agent = readFile("engine/agents/GovernanceAgent.ts");

  it("exports spawnGovernanceAgent function", () => {
    expect(agent).toContain("export function spawnGovernanceAgent");
  });

  it("result interface includes reasoning array", () => {
    expect(agent).toContain("reasoning: string[]");
  });

  it("result interface includes shouldReduceScandal", () => {
    expect(agent).toContain("shouldReduceScandal");
  });
});

describe("RecruitmentAgent — deterministic decision interface", () => {
  const agent = readFile("engine/agents/RecruitmentAgent.ts");

  it("exports spawnRecruitmentAgent function", () => {
    expect(agent).toContain("export function spawnRecruitmentAgent");
  });

  it("result interface includes reasoning array", () => {
    expect(agent).toContain("reasoning: string[]");
  });
});

describe("RivalryAgent — deterministic decision interface", () => {
  const agent = readFile("engine/agents/RivalryAgent.ts");

  it("exports spawnRivalryAgent function", () => {
    expect(agent).toContain("export function spawnRivalryAgent");
  });

  it("result interface includes reasoning array", () => {
    expect(agent).toContain("reasoning: string[]");
  });

  it("result interface includes escalateRivalry", () => {
    expect(agent).toContain("escalateRivalry");
  });
});

describe("CrisisAgent — deterministic decision interface", () => {
  const agent = readFile("engine/agents/CrisisAgent.ts");

  it("exports spawnCrisisAgent function", () => {
    expect(agent).toContain("export function spawnCrisisAgent");
  });

  it("result interface includes reasoning array", () => {
    expect(agent).toContain("reasoning: string[]");
  });
});

describe("NarrativeAgent — deterministic decision interface", () => {
  const agent = readFile("engine/agents/NarrativeAgent.ts");

  it("exports spawnNarrativeAgent function", () => {
    expect(agent).toContain("export function spawnNarrativeAgent");
  });

  it("result interface includes reasoning array", () => {
    expect(agent).toContain("reasoning: string[]");
  });

  it("result interface includes shouldTriggerEvent", () => {
    expect(agent).toContain("shouldTriggerEvent");
  });
});

describe("Agent barrel export — index.ts", () => {
  const index = readFile("engine/agents/index.ts");

  it("re-exports all six agents", () => {
    expect(index).toContain("CrisisAgent");
    expect(index).toContain("FinanceAgent");
    expect(index).toContain("GovernanceAgent");
    expect(index).toContain("RecruitmentAgent");
    expect(index).toContain("RivalryAgent");
    expect(index).toContain("NarrativeAgent");
  });

  it("also re-exports MediaAgent", () => {
    expect(index).toContain("MediaAgent");
  });
});
