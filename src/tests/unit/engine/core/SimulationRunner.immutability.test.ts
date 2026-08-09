import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeMockWorld } from "../utils";

vi.mock("@/engine/prestige/prestigeSystem", () => ({
  runPrestigeDecay: vi.fn(() => ({ metadata: { source: "prestige" } })),
}));
vi.mock("@/engine/systems/governance/governanceReview", () => ({
  runGovernanceReview: vi.fn(() => ({ metadata: { source: "governance" } })),
  runAIMetaDrift: vi.fn(() => ({ metadata: { source: "aiMeta" } })),
  runRetirements: vi.fn(() => ({
    metadata: { source: "retirements", vacanciesByHeyaId: {} },
  })),
}));
vi.mock("@/engine/records", () => ({
  onBashoEnded: vi.fn(() => ({ metadata: { source: "records" } })),
}));
vi.mock("@/engine/systems/economy/SponsorshipService", () => ({
  processSponsorChurn: vi.fn(() => ({ metadata: { source: "sponsors" } })),
  adjustKoenkaiBandToPrestige: vi.fn(() => ({ metadata: { source: "koenkaiBand" } })),
}));
vi.mock("@/engine/naturalization", () => ({
  checkNaturalizations: vi.fn(() => ({ metadata: { source: "naturalization" } })),
}));
vi.mock("@/engine/archival", () => ({
  runArchivalPruning: vi.fn(() => ({ metadata: { source: "archival" } })),
}));
vi.mock("@/engine/lifecycle/RegistryService", () => ({
  runCareerJournalUpdates: vi.fn(() => ({ metadata: { source: "careerJournal" } })),
  openRecruitmentWindow: vi.fn(() => ({ metadata: { source: "recruitment" } })),
}));
vi.mock("@/engine/history", () => ({
  runHistoryUpdates: vi.fn(() => ({ metadata: { source: "history" } })),
}));
vi.mock("@/engine/systems/governance/ScandalService", () => ({
  runElections: vi.fn(() => ({ metadata: { source: "elections" } })),
}));
vi.mock("@/engine/systems/media/MediaService", () => ({
  processWeeklyMediaBoundary: vi.fn(() => ({ metadata: { source: "media" } })),
  snapshotMediaHeatForBasho: vi.fn((s: unknown) => s),
}));
vi.mock("@/engine/systems/generation/TalentPoolService", () => ({
  fillVacanciesForNPC: vi.fn(),
  finalizeSignedCandidates: vi.fn(),
}));

import { runPostBashoResolution } from "@/engine/core/SimulationRunner";
import * as ImpactResolver from "@/engine/core/ImpactResolver";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(ImpactResolver, "resolveImpacts").mockImplementation((world: any, _impacts: any) => ({
    ...world,
    _resolved: true,
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Bug N: runPostBashoResolution does not mutate input world (no Object.assign)", () => {
  it("returns a new WorldState instead of mutating the input", () => {
    const world = makeMockWorld({ calendar: { currentWeek: 1, month: 1 } as any });
    const originalWeek = world.week;
    const result = runPostBashoResolution(world);
    // The input world should not be mutated
    expect(world.week).toBe(originalWeek);
    expect(world).not.toBe(result);
    // The result should be a WorldState (not void)
    expect(result).toBeTruthy();
    expect(typeof result).toBe("object");
  });
});
