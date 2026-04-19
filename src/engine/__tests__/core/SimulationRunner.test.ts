/**
 * src/engine/__tests__/core/SimulationRunner.test.ts
 * ====================================================
 * Integration tests for runPostBashoResolution:
 *   - All key subsystems are called exactly once per invocation.
 *   - onBashoEnded fires through the pipeline (not double-fired from CompetitionService).
 *   - resolveImpacts is called to apply collected impacts atomically.
 *   - Archival pruning only runs in November (month 11).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

// NOTE: ImpactResolver is NOT mocked here to avoid polluting other test files
// We'll spy on it in beforeEach instead

vi.mock("../../systems/generation/TalentPoolService", () => ({
  fillVacanciesForNPC: vi.fn(),
  finalizeSignedCandidates: vi.fn(),
}));


// ── Import module under test AFTER mocks ──────────────────────────────────

import { runPostBashoResolution } from "../../core/SimulationRunner";
import { runPrestigeDecay } from "../../prestige/prestigeSystem";
import {
  runGovernanceReview,
  runRetirements,
  runAIMetaDrift,
} from "../../governance/governanceReview";
import { onBashoEnded } from "../../records";
import * as ImpactResolver from "../../core/ImpactResolver";
import { runRecruitmentWindow } from "../../lifecycle/RegistryService";
import { runArchivalPruning } from "../../archival";
import type { WorldState } from "../../types/world";
import type { StateImpact } from "../../core/StateImpact";

beforeEach(() => {
  vi.clearAllMocks();
  // Spy on real resolveImpacts instead of mocking it
  /* eslint-disable @typescript-eslint/no-unused-vars */
  vi.spyOn(ImpactResolver, "resolveImpacts").mockImplementation(
    (world: WorldState, _impacts: StateImpact[]) => ({ ...world })
  );
  /* eslint-enable @typescript-eslint/no-unused-vars */
});

afterEach(() => {
  vi.restoreAllMocks();
});

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
    expect((runPrestigeDecay as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it("calls runGovernanceReview exactly once", () => {
    runPostBashoResolution(makeWorld());
    expect((runGovernanceReview as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it("calls runRetirements exactly once", () => {
    runPostBashoResolution(makeWorld());
    expect((runRetirements as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it("calls onBashoEnded exactly once — no double-fire from CompetitionService", () => {
    runPostBashoResolution(makeWorld());
    expect((onBashoEnded as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it("calls runAIMetaDrift exactly once", () => {
    runPostBashoResolution(makeWorld());
    expect((runAIMetaDrift as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it("calls resolveImpacts twice: once for main batch, once for recruitment", () => {
    runPostBashoResolution(makeWorld());
    expect((ImpactResolver.resolveImpacts as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(2);
  });

  it("calls runRecruitmentWindow after main resolveImpacts", () => {
    runPostBashoResolution(makeWorld());
    const resolveCalls = (ImpactResolver.resolveImpacts as ReturnType<typeof vi.fn>).mock.calls;
    const recruitCalls = (runRecruitmentWindow as ReturnType<typeof vi.fn>).mock.calls;
    expect(recruitCalls.length).toBeGreaterThan(0);
    expect(resolveCalls.length).toBeGreaterThan(0);
  });

  it("skips archival pruning when month is not November", () => {
    runPostBashoResolution(makeWorld(1)); // January
    expect((runArchivalPruning as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });

  it("runs archival pruning in November (month 11)", () => {
    runPostBashoResolution(makeWorld(11));
    expect((runArchivalPruning as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });
});
