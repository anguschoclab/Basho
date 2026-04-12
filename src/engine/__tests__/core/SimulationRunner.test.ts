/**
 * src/engine/__tests__/core/SimulationRunner.test.ts
 * ====================================================
 * Integration tests for runPostBashoResolution:
 *   - All key subsystems are called exactly once per invocation.
 *   - onBashoEnded fires through the pipeline (not double-fired from CompetitionService).
 *   - resolveImpacts is called to apply collected impacts atomically.
 *   - Archival pruning only runs in November (month 11).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockWorld } from "../utils";

// ── Module mocks (vi.mock is hoisted before all imports) ──────────────────

vi.mock("../../prestige/prestigeSystem", () => ({
  runPrestigeDecay: vi.fn(() => ({ metadata: { source: "prestige", timestamp: 0 } })),
}));

vi.mock("../../governance/governanceReview", () => ({
  runGovernanceReview: vi.fn(() => ({ metadata: { source: "governance", timestamp: 0 } })),
  runAIMetaDrift: vi.fn(() => ({ metadata: { source: "aiMeta", timestamp: 0 } })),
  runRetirements: vi.fn(() => ({
    metadata: { source: "retirements", timestamp: 0, vacanciesByHeyaId: {} },
  })),
}));

vi.mock("../../records", () => ({
  onBashoEnded: vi.fn(() => ({ metadata: { source: "records", timestamp: 0 } })),
}));

vi.mock("../../systems/economics/SponsorshipService", () => ({
  processSponsorChurn: vi.fn(() => ({ metadata: { source: "sponsors", timestamp: 0 } })),
}));

vi.mock("../../naturalization", () => ({
  checkNaturalizations: vi.fn(() => ({ metadata: { source: "naturalization", timestamp: 0 } })),
}));

vi.mock("../../archival", () => ({
  runArchivalPruning: vi.fn(() => ({ metadata: { source: "archival", timestamp: 0 } })),
}));

vi.mock("../../lifecycle/RegistryService", () => ({
  runCareerJournalUpdates: vi.fn(() => ({ metadata: { source: "careerJournal", timestamp: 0 } })),
  runRecruitmentWindow: vi.fn(() => ({ metadata: { source: "recruitment", timestamp: 0 } })),
}));

vi.mock("../../history", () => ({
  runHistoryUpdates: vi.fn(() => ({ metadata: { source: "history", timestamp: 0 } })),
}));

vi.mock("../../governance/GovernanceService", () => ({
  runElections: vi.fn(() => ({ metadata: { source: "elections", timestamp: 0 } })),
}));

vi.mock("../../systems/media/MediaService", () => ({
  processWeeklyMediaBoundary: vi.fn(() => ({ metadata: { source: "media", timestamp: 0 } })),
  snapshotMediaHeatForBasho: vi.fn((s: unknown) => s),
}));

vi.mock("../../core/ImpactResolver", () => ({
  resolveImpacts: vi.fn((world: unknown) => ({ ...(world as object) })),
}));

vi.mock("../../systems/generation/TalentPoolService", () => ({
  fillVacanciesForNPC: vi.fn(),
  finalizeSignedCandidates: vi.fn(),
}));

vi.mock("../../core/SimulationConfig", () => ({
  SIMULATION_CONFIG: {},
}));

// ── Import module under test AFTER mocks ──────────────────────────────────

import { runPostBashoResolution } from "../../core/SimulationRunner";
import { runPrestigeDecay } from "../../prestige/prestigeSystem";
import { runGovernanceReview, runRetirements, runAIMetaDrift } from "../../governance/governanceReview";
import { onBashoEnded } from "../../records";
import { resolveImpacts } from "../../core/ImpactResolver";
import { runRecruitmentWindow } from "../../lifecycle/RegistryService";
import { runArchivalPruning } from "../../archival";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeWorld(month = 1) {
  return makeMockWorld({
    calendar: { year: 2025, month, currentWeek: 1, currentDay: 1 },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("runPostBashoResolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls runPrestigeDecay exactly once", () => {
    runPostBashoResolution(makeWorld());
    expect(vi.mocked(runPrestigeDecay)).toHaveBeenCalledTimes(1);
  });

  it("calls runGovernanceReview exactly once", () => {
    runPostBashoResolution(makeWorld());
    expect(vi.mocked(runGovernanceReview)).toHaveBeenCalledTimes(1);
  });

  it("calls runRetirements exactly once", () => {
    runPostBashoResolution(makeWorld());
    expect(vi.mocked(runRetirements)).toHaveBeenCalledTimes(1);
  });

  it("calls onBashoEnded exactly once — no double-fire from CompetitionService", () => {
    runPostBashoResolution(makeWorld());
    expect(vi.mocked(onBashoEnded)).toHaveBeenCalledTimes(1);
  });

  it("calls runAIMetaDrift exactly once", () => {
    runPostBashoResolution(makeWorld());
    expect(vi.mocked(runAIMetaDrift)).toHaveBeenCalledTimes(1);
  });

  it("calls resolveImpacts twice: once for main batch, once for recruitment", () => {
    runPostBashoResolution(makeWorld());
    expect(vi.mocked(resolveImpacts)).toHaveBeenCalledTimes(2);
  });

  it("calls runRecruitmentWindow after main resolveImpacts", () => {
    runPostBashoResolution(makeWorld());
    const firstResolveOrder = vi.mocked(resolveImpacts).mock.invocationCallOrder[0];
    const recruitOrder = vi.mocked(runRecruitmentWindow).mock.invocationCallOrder[0];
    expect(recruitOrder).toBeGreaterThan(firstResolveOrder);
  });

  it("skips archival pruning when month is not November", () => {
    runPostBashoResolution(makeWorld(1)); // January
    expect(vi.mocked(runArchivalPruning)).not.toHaveBeenCalled();
  });

  it("runs archival pruning in November (month 11)", () => {
    runPostBashoResolution(makeWorld(11));
    expect(vi.mocked(runArchivalPruning)).toHaveBeenCalledTimes(1);
  });
});
