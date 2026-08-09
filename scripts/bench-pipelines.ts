/**
 * bench-pipelines.ts
 * ==================
 * Pipeline benchmark harness — measures wall-clock time for key scenarios.
 *
 * Run: npx tsx scripts/bench-pipelines.ts
 *
 * Scenarios:
 *   S1 — 1 day tick (off-season): baseline single-day cost
 *   S2 — 7-day advance (one weekly gate): weekly pipeline cost
 *   S3 — 365-day advance (fast path, full year): yearly boundary + 52 weekly gates
 *   S4 — 25-year sim: determinism + long-run performance
 */

import { generateInitialWorld } from "../src/engine/systems/generation/WorldFactory";
import { advanceOneDay, advanceDaysFast } from "../src/engine/tick/tickDaily";
import type { WorldState } from "../src/engine/types/world";
import { performance } from "node:perf_hooks";
import { createHash } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ScenarioConfig {
  days: number;
  fast: boolean;
  runs: number;
  warmup: number;
}

export const SCENARIOS: Record<string, ScenarioConfig> = {
  S1_single_day: { days: 1, fast: false, runs: 50, warmup: 5 },
  S2_weekly: { days: 7, fast: false, runs: 50, warmup: 5 },
  S3_year: { days: 365, fast: true, runs: 50, warmup: 5 },
  S4_25yr: { days: 25 * 365, fast: true, runs: 10, warmup: 2 },
};

export interface BenchmarkResult {
  scenario: string;
  p50_ms: number;
  p99_ms: number;
  mean_ms: number;
  runs: number;
  total_days: number;
}

export interface BenchmarkRun {
  timestamp: string;
  results: BenchmarkResult[];
}

export interface Stats {
  p50: number;
  p99: number;
  mean: number;
}

export function computeStats(samples: number[]): Stats {
  samples.sort((a, b) => a - b);
  const p50 = samples[Math.floor(samples.length * 0.5)];
  const p99 = samples[Math.floor(samples.length * 0.99)];
  const mean = samples.reduce((s, v) => s + v, 0) / samples.length;
  return { p50, p99, mean };
}

export function worldChecksum(world: WorldState): string {
  try {
    const json = JSON.stringify({
      year: world.year,
      dayIndexGlobal: world.dayIndexGlobal,
      rikishiCount: world.rikishi?.size ?? 0,
      heyaCount: world.heyas?.size ?? 0,
      activeCount: world.activeRikishiIds?.size ?? 0,
    });
    return createHash("sha256").update(json).digest("hex").slice(0, 16);
  } catch {
    return "error";
  }
}

export function runScenario(name: string, cfg: ScenarioConfig): BenchmarkResult {
  const samples: number[] = [];
  let lastHash = "";

  for (let r = 0; r < cfg.runs + cfg.warmup; r++) {
    const world = generateInitialWorld("bench-seed-0001");
    const t0 = performance.now();
    let w = world;
    for (let i = 0; i < cfg.days; i++) {
      w = cfg.fast ? advanceDaysFast(w, 1, { skipDailyMicroPhases: true }) : advanceOneDay(w);
    }
    const elapsed = performance.now() - t0;

    if (r >= cfg.warmup) {
      samples.push(elapsed);
    }

    if (name === "S4_25yr" && r === cfg.warmup) {
      lastHash = worldChecksum(w);
    }
  }

  const stats = computeStats(samples);
  const result: BenchmarkResult = {
    scenario: name,
    p50_ms: Number(stats.p50.toFixed(1)),
    p99_ms: Number(stats.p99.toFixed(1)),
    mean_ms: Number(stats.mean.toFixed(1)),
    runs: cfg.runs,
    total_days: cfg.days,
  };

  console.log(
    `${name}: p50=${result.p50_ms}ms p99=${result.p99_ms}ms mean=${result.mean_ms}ms (${cfg.runs} runs, ${cfg.days} days)`
  );

  if (name === "S4_25yr" && lastHash) {
    console.log(`  25yr determinism hash: ${lastHash}`);
  }

  return result;
}

export function runBenchmark(scenarios?: Record<string, ScenarioConfig>): BenchmarkRun {
  const map = scenarios ?? SCENARIOS;
  const results: BenchmarkResult[] = [];

  for (const [name, cfg] of Object.entries(map)) {
    results.push(runScenario(name, cfg));
  }

  return {
    timestamp: new Date().toISOString(),
    results,
  };
}

export function writeResults(path: string, run: BenchmarkRun): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(run, null, 2));
}

if (import.meta.main) {
  const outputPath = join(__dirname, "..", "docs", "audit", "perf-current.json");
  const run = runBenchmark();
  writeResults(outputPath, run);
  console.log(`\nCurrent results written to: ${outputPath}`);
}
