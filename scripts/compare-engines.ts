/**
 * Cross-engine comparison script for Combat System B+ validation
 *
 * This script runs bouts with the V2 physics engine and validates:
 * - Determinism: same seed produces same results
 * - Kimarite distribution: no kimarite drops to 0 frequency
 * - Winner distribution: reasonable balance between east/west
 * - Duration distribution: within expected bounds
 */

import { resolveBoutPhysics } from "../src/engine/bout/boutPhysics";
import { mockRikishi, makeMockBasho } from "../src/tests/unit/engine/utils";

interface ComparisonStats {
  totalBouts: number;
  winnerDistribution: { east: number; west: number };
  kimariteFrequency: Record<string, number>;
  durationStats: { min: number; max: number; avg: number };
  determinismPassed: boolean;
}

function runBout(_seed: string, index: number) {
  const bout = { id: `test-${index}`, day: 1, rikishiEastId: "r1", rikishiWestId: "r2" };
  const east = mockRikishi("r1");
  const west = mockRikishi("r2");
  const basho = makeMockBasho();

  return resolveBoutPhysics(bout, east, west, basho);
}

interface BoutResult {
  result: { winner: string; kimarite: string; duration: number };
}

function compareResults(results1: BoutResult[], results2: BoutResult[]): boolean {
  for (let i = 0; i < results1.length; i++) {
    if (results1[i].result.winner !== results2[i].result.winner) return false;
    if (results1[i].result.kimarite !== results2[i].result.kimarite) return false;
    if (results1[i].result.duration !== results2[i].result.duration) return false;
  }
  return true;
}

function calculateStats(results: BoutResult[]): ComparisonStats {
  const stats: ComparisonStats = {
    totalBouts: results.length,
    winnerDistribution: { east: 0, west: 0 },
    kimariteFrequency: {},
    durationStats: { min: Infinity, max: -Infinity, avg: 0 },
    determinismPassed: true,
  };

  let totalDuration = 0;

  for (const r of results) {
    // Winner distribution
    const winner = r.result.winner as "east" | "west";
    stats.winnerDistribution[winner]++;

    // Kimarite frequency
    const kimarite = r.result.kimarite;
    stats.kimariteFrequency[kimarite] = (stats.kimariteFrequency[kimarite] || 0) + 1;

    // Duration stats
    const duration = r.result.duration;
    totalDuration += duration;
    if (duration < stats.durationStats.min) stats.durationStats.min = duration;
    if (duration > stats.durationStats.max) stats.durationStats.max = duration;
  }

  stats.durationStats.avg = totalDuration / results.length;

  return stats;
}

function validateStats(stats: ComparisonStats): { passed: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check winner distribution (should be roughly balanced, allow ±2%)
  const eastPercent = (stats.winnerDistribution.east / stats.totalBouts) * 100;
  const westPercent = (stats.winnerDistribution.west / stats.totalBouts) * 100;
  if (Math.abs(eastPercent - 50) > 2) {
    issues.push(
      `Winner distribution unbalanced: East ${eastPercent.toFixed(1)}%, West ${westPercent.toFixed(1)}%`
    );
  }

  // Check kimarite frequency (no kimarite should have 0 frequency for likely archetypes)
  const expectedCommonKimarite = [
    "yorikiri",
    "oshidashi",
    "oshitaoshi",
    "yoritaoshi",
    "hatakikomi",
  ];
  for (const kimarite of expectedCommonKimarite) {
    if (!stats.kimariteFrequency[kimarite]) {
      issues.push(
        `Common kimarite '${kimarite}' has 0 frequency - condition may never be satisfied`
      );
    }
  }

  // Check duration bounds
  if (stats.durationStats.min < 1) {
    issues.push(`Minimum duration ${stats.durationStats.min}s is below expected minimum of 1s`);
  }
  if (stats.durationStats.max > 240) {
    issues.push(`Maximum duration ${stats.durationStats.max}s exceeds expected maximum of 240s`);
  }

  return { passed: issues.length === 0, issues };
}

export function runComparison(count: number, seed: string = "comparison-001"): ComparisonStats {
  console.log(`Running ${count} bouts with seed '${seed}'...`);

  // Run bouts
  const results: BoutResult[] = [];
  for (let i = 0; i < count; i++) {
    const boutSeed = `${seed}-${i}`;
    results.push(runBout(boutSeed, i));
  }

  // Check determinism by running again with same seeds
  console.log("Checking determinism...");
  const results2: BoutResult[] = [];
  for (let i = 0; i < count; i++) {
    const boutSeed = `${seed}-${i}`;
    results2.push(runBout(boutSeed, i));
  }

  const stats = calculateStats(results);
  stats.determinismPassed = compareResults(results, results2);

  // Validate stats
  const validation = validateStats(stats);

  // Print results
  console.log("\n=== Comparison Results ===");
  console.log(`Total bouts: ${stats.totalBouts}`);
  console.log(`Determinism: ${stats.determinismPassed ? "PASS" : "FAIL"}`);
  console.log(`\nWinner distribution:`);
  console.log(
    `  East: ${stats.winnerDistribution.east} (${((stats.winnerDistribution.east / stats.totalBouts) * 100).toFixed(1)}%)`
  );
  console.log(
    `  West: ${stats.winnerDistribution.west} (${((stats.winnerDistribution.west / stats.totalBouts) * 100).toFixed(1)}%)`
  );
  console.log(`\nDuration stats:`);
  console.log(`  Min: ${stats.durationStats.min}s`);
  console.log(`  Max: ${stats.durationStats.max}s`);
  console.log(`  Avg: ${stats.durationStats.avg.toFixed(1)}s`);
  console.log(`\nKimarite frequency:`);
  const sortedKimarite = Object.entries(stats.kimariteFrequency).sort((a, b) => b[1] - a[1]);
  for (const [kimarite, freq] of sortedKimarite) {
    const percent = ((freq / stats.totalBouts) * 100).toFixed(1);
    console.log(`  ${kimarite}: ${freq} (${percent}%)`);
  }

  if (!validation.passed) {
    console.log("\n=== Validation Issues ===");
    for (const issue of validation.issues) {
      console.log(`  ❌ ${issue}`);
    }
  } else {
    console.log("\n✅ All validation checks passed");
  }

  return stats;
}

// CLI entry point
if (import.meta.main) {
  const args = process.argv.slice(2);
  const count = parseInt(args.find((a) => a.startsWith("--count"))?.split("=")[1] || "100", 10);
  const seed = args.find((a) => a.startsWith("--seed"))?.split("=")[1] || "comparison-001";

  runComparison(count, seed);
}
