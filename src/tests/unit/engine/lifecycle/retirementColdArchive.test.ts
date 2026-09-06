import { describe, it, expect, beforeEach, vi } from "vitest";
import { CareerService } from "@/engine/lifecycle/CareerService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, mockRikishi } from "../utils";
import { opfsArchiveService } from "@/engine/storage/opfsArchive";
import { resetMockFileSystem } from "@/tests/setup";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";

// Mock checkRetirement to force retirement for our test rikishi
vi.mock("@/engine/lifecycle", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/engine/lifecycle")>();
  return {
    ...actual,
    checkRetirement: vi.fn((rikishi: Rikishi, year: number, seed: string) => {
      // Force retirement for rikishi marked with isRetired in test setup
      if ((rikishi as unknown as { __forceRetire?: boolean }).__forceRetire) {
        return "Test Retirement";
      }
      return actual.checkRetirement(rikishi, year, seed);
    }),
  };
});

describe("Retirement cold-storage archival (CareerService.processRetirements)", () => {
  beforeEach(() => {
    resetMockFileSystem();
    opfsArchiveService.clearCache();
    vi.restoreAllMocks();
  });

  it("archives full Rikishi to cold storage at retirement", async () => {
    const rikishi = mockRikishi("r-retire-archive", {
      birthYear: 1980,
      careerWins: 100,
      careerLosses: 50,
    });
    (rikishi as unknown as { __forceRetire?: boolean }).__forceRetire = true;

    const world = makeMockWorld({
      year: 2025,
      seed: "test-retire-archive",
    });
    world.rikishi.set(rikishi.id, rikishi);

    const impact = CareerService.processRetirements(world);
    const resolved = resolveImpacts(world, [impact]);

    // Rikishi should be moved to historicalRikishi
    expect(resolved.rikishi.get("r-retire-archive")).toBeUndefined();
    expect(resolved.historicalRikishi.get("r-retire-archive")).toBeDefined();

    // Full Rikishi should be archived to cold storage
    // Wait a tick for the async archive to complete
    await new Promise((resolve) => setTimeout(resolve, 50));
    const archived = await opfsArchiveService.retrieveFullRikishiRecord("r-retire-archive");
    expect(archived).not.toBeNull();
    expect(archived!.id).toBe("r-retire-archive");
    expect(archived!.careerWins).toBe(100);
  });

  it("archival failure does not block retirement", async () => {
    // Mock archiveFullRikishiRecord to throw
    const archiveSpy = vi
      .spyOn(opfsArchiveService, "archiveFullRikishiRecord")
      .mockRejectedValue(new Error("OPFS quota exceeded"));

    const rikishi = mockRikishi("r-retire-fail", {
      birthYear: 1980,
    });
    (rikishi as unknown as { __forceRetire?: boolean }).__forceRetire = true;

    const world = makeMockWorld({
      year: 2025,
      seed: "test-retire-fail",
    });
    world.rikishi.set(rikishi.id, rikishi);

    // Should not throw
    const impact = CareerService.processRetirements(world);
    const resolved = resolveImpacts(world, [impact]);

    // Retirement still completes despite archival failure
    expect(resolved.rikishi.get("r-retire-fail")).toBeUndefined();
    expect(resolved.historicalRikishi.get("r-retire-fail")).toBeDefined();

    archiveSpy.mockRestore();
  });

  it("full Rikishi remains in historicalRikishi after retirement (not immediately summarized)", async () => {
    const rikishi = mockRikishi("r-not-summarized", {
      birthYear: 1980,
    });
    (rikishi as unknown as { __forceRetire?: boolean }).__forceRetire = true;

    const world = makeMockWorld({
      year: 2025,
      seed: "test-not-summarized",
    });
    world.rikishi.set(rikishi.id, rikishi);

    const impact = CareerService.processRetirements(world);
    const resolved = resolveImpacts(world, [impact]);

    const entry = resolved.historicalRikishi.get("r-not-summarized");
    expect(entry).toBeDefined();
    // Should be a full Rikishi (has stats), NOT a summary
    expect("stats" in entry!).toBe(true);
    expect("isSummary" in entry! && entry!.isSummary).toBe(false);
  });
});
