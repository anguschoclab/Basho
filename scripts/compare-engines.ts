/**
 * Cross-engine comparison script for Combat System B+ validation
 *
 * This script runs bouts with the V2 physics engine and validates:
 * - Determinism: same seed produces same results
 * - Kimarite distribution: no kimarite drops to 0 frequency
 * - Winner distribution: reasonable balance between east/west
 * - Duration distribution: within expected bounds
 */

import { resolveBoutPhysics } from "@/engine/bout/boutPhysics";
import { mockRikishi, makeMockBasho } from "@/tests/unit/engine/utils";
import { SeededRNG } from "@/engine/core/rng";
import type {
  CombatArchetype,
  GripPreference,
  GripDepthPreference,
  TacticalFamily,
} from "@/engine/types/combat";

interface ComparisonStats {
  totalBouts: number;
  winnerDistribution: { east: number; west: number };
  kimariteFrequency: Record<string, number>;
  timeoutBouts: number;
  durationStats: { min: number; max: number; avg: number };
  determinismPassed: boolean;
}

const STYLES = ["oshi", "yotsu", "hybrid"] as const;
const ARCHETYPES: CombatArchetype[] = [
  "oshi",
  "yotsu",
  "trickster",
  "speedster",
  "hybrid",
  "giant",
  "tsuppari",
  "defensive",
];
const GRIPS: GripPreference[] = ["none", "migi", "hidari"];
const GRIP_DEPTHS: GripDepthPreference[] = ["standard", "deep", "maemitsu"];
const COUNTER_FAMILIES: TacticalFamily[] = ["push", "belt", "trick", "speed"];

function makeVariedRikishi(rng: SeededRNG, id: string) {
  const archetype = rng.pick(ARCHETYPES);
  const weightKg = rng.int(90, 200);
  const rikishi = mockRikishi(id, {
    style: rng.pick([...STYLES]),
    height: rng.int(165, 195),
    power: rng.int(30, 70),
    speed: rng.int(30, 70),
    balance: rng.int(30, 70),
    technique: rng.int(30, 70),
    aggression: rng.int(30, 70),
    mental: rng.int(30, 70),
    experience: rng.int(30, 70),
    stamina: rng.int(60, 100),
    adaptability: rng.int(30, 70),
    combatProfile: {
      archetype,
      familyPreferences: {
        push: rng.int(10, 45),
        belt: rng.int(10, 45),
        trick: rng.int(10, 45),
        speed: rng.int(10, 45),
      },
      preferredGrip: rng.pick(GRIPS),
      preferredGripDepth: rng.pick(GRIP_DEPTHS),
      statModifiers: {},
      counterFamily: rng.pick(COUNTER_FAMILIES),
      archetypeBehavior: {
        tachiaiSpeedBonus: 0,
        lateralMovementBonus: 0,
        edgeEscapeBonus: 0,
        beltTorqueBonus: 0,
        pushVelocityBonus: 0,
      },
    },
  });
  rikishi.stats.weight = weightKg;
  return rikishi;
}

function runBout(seed: string, index: number) {
  const rng = new SeededRNG(seed);
  const bout = {
    id: `test-${index}`,
    day: 1,
    rikishiEastId: `east-${index}`,
    rikishiWestId: `west-${index}`,
  };
  const east = makeVariedRikishi(rng, `east-${index}`);
  const west = makeVariedRikishi(rng, `west-${index}`);
  const basho = makeMockBasho();

  return resolveBoutPhysics(bout, east, west, basho);
}

interface BoutResult {
  result: { winner: string; kimarite: string; duration: number; isTimeout?: boolean };
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
    timeoutBouts: 0,
    durationStats: { min: Infinity, max: -Infinity, avg: 0 },
    determinismPassed: true,
  };

  let totalDuration = 0;

  for (const r of results) {
    // Winner distribution
    const winner = r.result.winner as "east" | "west";
    stats.winnerDistribution[winner]++;

    // Timeout endings are synthetic (stability tiebreak at the tick cap), not
    // produced techniques — count them separately instead of polluting the
    // kimarite frequency table.
    if (r.result.isTimeout) {
      stats.timeoutBouts++;
    } else {
      const kimarite = r.result.kimarite;
      stats.kimariteFrequency[kimarite] = (stats.kimariteFrequency[kimarite] || 0) + 1;
    }

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

  // Check winner distribution (should be roughly balanced; flag only beyond 2σ
  // of a fair coin — binomial SE at n bouts is sqrt(n*0.25), so noise can reach
  // ±10% at n=100)
  const eastPercent = (stats.winnerDistribution.east / stats.totalBouts) * 100;
  const westPercent = (stats.winnerDistribution.west / stats.totalBouts) * 100;
  const sePercent = (Math.sqrt(stats.totalBouts * 0.25) / stats.totalBouts) * 100;
  if (Math.abs(eastPercent - 50) > 2 * sePercent) {
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

  // Stalemate rate: a small share of matched bouts can hit the tick cap, but
  // >5% signals resolution rates are too low.
  const timeoutRate = (stats.timeoutBouts / stats.totalBouts) * 100;
  if (timeoutRate > 5) {
    issues.push(
      `Stalemate rate too high: ${stats.timeoutBouts}/${stats.totalBouts} bouts (${timeoutRate.toFixed(1)}%) hit the 240s timeout`
    );
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
  console.log(`\nTimeout (stalemate) bouts: ${stats.timeoutBouts}`);
  console.log(`\nKimarite frequency (organic endings, timeouts excluded):`);
  const organicBouts = stats.totalBouts - stats.timeoutBouts;
  const sortedKimarite = Object.entries(stats.kimariteFrequency).sort((a, b) => b[1] - a[1]);
  for (const [kimarite, freq] of sortedKimarite) {
    const percent = ((freq / Math.max(1, organicBouts)) * 100).toFixed(1);
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

  process.exitCode = validation.passed ? 0 : 1;

  return stats;
}

// CLI entry point
if (import.meta.main) {
  const args = process.argv.slice(2);
  const count = parseInt(args.find((a) => a.startsWith("--count"))?.split("=")[1] || "100", 10);
  const seed = args.find((a) => a.startsWith("--seed"))?.split("=")[1] || "comparison-001";

  runComparison(count, seed);
}
