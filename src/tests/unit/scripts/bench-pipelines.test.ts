import { describe, it, expect } from "vitest";
import {
  computeStats,
  worldChecksum,
  writeResults,
  runBenchmark,
  runScenario,
} from "../../../../scripts/bench-pipelines";
import type { WorldState } from "../../../../src/engine/types/world";
import { readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("computeStats", () => {
  it("returns correct p50, p99, and mean for ordered samples", () => {
    const samples = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const stats = computeStats([...samples]);
    expect(stats.p50).toBe(6);
    expect(stats.p99).toBe(10);
    expect(stats.mean).toBe(5.5);
  });

  it("returns correct p50, p99, and mean for unordered samples", () => {
    const samples = [10, 3, 7, 1, 9, 4, 8, 2, 6, 5];
    const stats = computeStats([...samples]);
    expect(stats.p50).toBe(6);
    expect(stats.p99).toBe(10);
    expect(stats.mean).toBe(5.5);
  });

  it("handles single-element samples", () => {
    const stats = computeStats([42]);
    expect(stats.p50).toBe(42);
    expect(stats.p99).toBe(42);
    expect(stats.mean).toBe(42);
  });
});

describe("worldChecksum", () => {
  it("returns identical hashes for identical partial WorldState objects", () => {
    const w1 = { year: 1, dayIndexGlobal: 10 } as unknown as WorldState;
    const w2 = { year: 1, dayIndexGlobal: 10 } as unknown as WorldState;
    expect(worldChecksum(w1)).toBe(worldChecksum(w2));
  });

  it("returns different hashes for different WorldState objects", () => {
    const w1 = { year: 1, dayIndexGlobal: 10 } as unknown as WorldState;
    const w2 = { year: 2, dayIndexGlobal: 10 } as unknown as WorldState;
    expect(worldChecksum(w1)).not.toBe(worldChecksum(w2));
  });

  it("does not throw on missing fields", () => {
    const w = {} as WorldState;
    expect(() => worldChecksum(w)).not.toThrow();
    expect(typeof worldChecksum(w)).toBe("string");
    expect(worldChecksum(w).length).toBeGreaterThan(0);
  });
});

describe("writeResults", () => {
  it("creates missing directories, writes { timestamp, results }, and round-trips cleanly", () => {
    const tmpDir = join(tmpdir(), `bench-test-${Date.now()}`);
    const filePath = join(tmpDir, "nested", "perf-current.json");
    const run = {
      timestamp: "2026-01-01T00:00:00.000Z",
      results: [
        {
          scenario: "S3_year",
          p50_ms: 100.5,
          p99_ms: 200.0,
          mean_ms: 120.0,
          runs: 50,
          total_days: 365,
        },
      ],
    };
    writeResults(filePath, run);
    expect(existsSync(filePath)).toBe(true);
    const read = JSON.parse(readFileSync(filePath, "utf8"));
    expect(read).toEqual(run);
    rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe("runBenchmark", () => {
  it("with an overridden tiny scenario map returns a BenchmarkRun containing those scenario results", () => {
    const tinyScenarios = {
      S1_single_day: { days: 1, fast: false, runs: 1, warmup: 0 },
    };
    const run = runBenchmark(tinyScenarios);
    expect(run.results).toHaveLength(1);
    expect(run.results[0].scenario).toBe("S1_single_day");
    expect(run.results[0].runs).toBe(1);
    expect(run.results[0].total_days).toBe(1);
    expect(run.results[0].p50_ms).toBeGreaterThan(0);
    expect(run.timestamp).toBeTruthy();
  });
});

describe("runScenario", () => {
  it("with a tiny one-run config returns a BenchmarkResult with all required fields and plausible elapsed time", () => {
    const result = runScenario("S1_single_day", { days: 1, fast: false, runs: 1, warmup: 0 });
    expect(result.scenario).toBe("S1_single_day");
    expect(result.runs).toBe(1);
    expect(result.total_days).toBe(1);
    expect(result.p50_ms).toBeGreaterThan(0);
    expect(result.p99_ms).toBeGreaterThan(0);
    expect(result.mean_ms).toBeGreaterThan(0);
    expect(typeof result.p50_ms).toBe("number");
  });
});
