import { describe, it, expect } from "vitest";
import { checkRegression, seedBaseline } from "../../../../scripts/perf-gate-check";
import type { BenchmarkRun } from "../../../../scripts/bench-pipelines";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { rmSync, existsSync, readFileSync } from "node:fs";

function makeRun(p50: number): BenchmarkRun {
  return {
    timestamp: "2026-01-01T00:00:00.000Z",
    results: [
      { scenario: "S3_year", p50_ms: p50, p99_ms: p50 * 2, mean_ms: p50, runs: 50, total_days: 365 },
    ],
  };
}

describe("checkRegression", () => {
  it("passes when current S3_year p50_ms is equal to baseline", () => {
    const result = checkRegression(makeRun(100), makeRun(100));
    expect(result.passed).toBe(true);
    expect(result.degradation).toBe(0);
  });

  it("passes when current S3_year p50_ms is below baseline", () => {
    const result = checkRegression(makeRun(100), makeRun(80));
    expect(result.passed).toBe(true);
    expect(result.degradation).toBeLessThan(0);
  });

  it("fails when degradation exceeds 15%", () => {
    const result = checkRegression(makeRun(100), makeRun(120));
    expect(result.passed).toBe(false);
    expect(result.degradation).toBeCloseTo(0.2, 5);
    expect(result.message).toContain("20.0%");
  });

  it("passes when degradation is within 15% but non-zero", () => {
    const result = checkRegression(makeRun(100), makeRun(110));
    expect(result.passed).toBe(true);
    expect(result.degradation).toBeCloseTo(0.1, 5);
  });

  it("handles missing S3_year scenario in current gracefully", () => {
    const baseline = makeRun(100);
    const current: BenchmarkRun = {
      timestamp: "2026-01-01T00:00:00.000Z",
      results: [{ scenario: "S1_single_day", p50_ms: 5, p99_ms: 10, mean_ms: 5, runs: 50, total_days: 1 }],
    };
    const result = checkRegression(baseline, current);
    expect(result.passed).toBe(true);
    expect(result.message).toContain("S3_year");
  });

  it("handles missing S3_year scenario in baseline gracefully", () => {
    const baseline: BenchmarkRun = {
      timestamp: "2026-01-01T00:00:00.000Z",
      results: [{ scenario: "S1_single_day", p50_ms: 5, p99_ms: 10, mean_ms: 5, runs: 50, total_days: 1 }],
    };
    const current = makeRun(100);
    const result = checkRegression(baseline, current);
    expect(result.passed).toBe(true);
    expect(result.message).toContain("S3_year");
  });
});

describe("seedBaseline", () => {
  it("returns a pass result and indicates a new baseline was created", () => {
    const current = makeRun(100);
    const tmpPath = join(tmpdir(), `perf-gate-seed-test-${Date.now()}.json`);
    const result = seedBaseline(current, tmpPath);
    expect(result.passed).toBe(true);
    expect(result.message).toContain("Seeded");
    expect(existsSync(tmpPath)).toBe(true);
    const written = JSON.parse(readFileSync(tmpPath, "utf8"));
    expect(written.results[0].p50_ms).toBe(100);
    rmSync(tmpPath, { force: true });
  });
});
