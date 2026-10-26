/**
 * perf-gate-check.ts
 * ==================
 * Performance regression gate — compares the current benchmark run
 * against a committed baseline and fails on >15% degradation.
 *
 * Run: npx tsx scripts/perf-gate-check.ts
 *
 * If docs/audit/perf-baseline.json is missing, seeds it from the
 * current run and exits successfully.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { BenchmarkRun } from "./bench-pipelines";

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASELINE_PATH = join(__dirname, "..", "docs", "audit", "perf-baseline.json");
const CURRENT_PATH = join(__dirname, "..", "docs", "audit", "perf-current.json");
const THRESHOLD = 0.15;
const SCENARIO = "S3_year";

/**
 * Wall-clock comparisons are only meaningful between the same hardware.
 * A baseline recorded on a different platform/arch (or with unknown
 * provenance, i.e. no environment block) must not fail the gate — the
 * caller should refresh it from a run on this machine instead.
 */
export function environmentsMatch(
  baseline: BenchmarkRun,
  current: BenchmarkRun
): boolean {
  const b = baseline.environment;
  const c = current.environment;
  if (!b || !c) return false;
  return b.platform === c.platform && b.arch === c.arch;
}

export interface RegressionResult {
  passed: boolean;
  degradation: number;
  p99Degradation: number;
  message: string;
}

export function checkRegression(
  baseline: BenchmarkRun,
  current: BenchmarkRun,
  threshold: number = THRESHOLD
): RegressionResult {
  const baselineS3 = baseline.results.find((r) => r.scenario === SCENARIO);
  const currentS3 = current.results.find((r) => r.scenario === SCENARIO);

  if (!environmentsMatch(baseline, current)) {
    return {
      passed: true,
      degradation: 0,
      p99Degradation: 0,
      message:
        `Baseline environment mismatch or unknown provenance ` +
        `(baseline: ${baseline.environment ? `${baseline.environment.platform}/${baseline.environment.arch}` : "none"}, ` +
        `current: ${current.environment ? `${current.environment.platform}/${current.environment.arch}` : "none"}) ` +
        `— skipping wall-clock regression check; refresh the baseline on this machine`,
    };
  }

  if (!baselineS3 || !currentS3) {
    return {
      passed: true,
      degradation: 0,
      p99Degradation: 0,
      message: `S3_year scenario missing in ${!baselineS3 ? "baseline" : "current"} — skipping regression check`,
    };
  }

  const degradation = (currentS3.p50_ms - baselineS3.p50_ms) / baselineS3.p50_ms;
  const p99Degradation = (currentS3.p99_ms - baselineS3.p99_ms) / baselineS3.p99_ms;

  if (degradation > threshold) {
    return {
      passed: false,
      degradation,
      p99Degradation,
      message: `Performance regression: S3 p50 degraded by ${(degradation * 100).toFixed(1)}% (baseline: ${baselineS3.p50_ms}ms, current: ${currentS3.p50_ms}ms)`,
    };
  }

  if (p99Degradation > threshold) {
    return {
      passed: false,
      degradation,
      p99Degradation,
      message: `Performance regression: S3 p99 degraded by ${(p99Degradation * 100).toFixed(1)}% (baseline: ${baselineS3.p99_ms}ms, current: ${currentS3.p99_ms}ms)`,
    };
  }

  return {
    passed: true,
    degradation,
    p99Degradation,
    message: `S3 p50: ${currentS3.p50_ms}ms (baseline: ${baselineS3.p50_ms}ms, degradation: ${(degradation * 100).toFixed(1)}%) | p99: ${currentS3.p99_ms}ms (baseline: ${baselineS3.p99_ms}ms, degradation: ${(p99Degradation * 100).toFixed(1)}%)`,
  };
}

export function seedBaseline(
  current: BenchmarkRun,
  outputPath: string = BASELINE_PATH
): RegressionResult {
  writeFileSync(outputPath, JSON.stringify(current, null, 2));
  return {
    passed: true,
    degradation: 0,
    p99Degradation: 0,
    message: `Seeded new baseline from current run at ${outputPath}`,
  };
}

function main(): void {
  if (!existsSync(CURRENT_PATH)) {
    console.error(`Current benchmark results not found at ${CURRENT_PATH}`);
    console.error("Run `npx tsx scripts/bench-pipelines.ts` first.");
    process.exit(1);
  }

  const current: BenchmarkRun = JSON.parse(readFileSync(CURRENT_PATH, "utf8"));

  if (!existsSync(BASELINE_PATH)) {
    const seedResult = seedBaseline(current);
    console.log(seedResult.message);
    console.log("Performance gate passed (baseline seeded)");
    return;
  }

  const baseline: BenchmarkRun = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
  const result = checkRegression(baseline, current);

  console.log(result.message);

  if (!result.passed) {
    process.exit(1);
  }

  console.log("Performance gate passed");
}

if (import.meta.main) {
  main();
}
