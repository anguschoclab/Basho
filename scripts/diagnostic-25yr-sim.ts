/**
 * diagnostic-25yr-sim.ts
 * ======================
 * Canonical 25-year headless simulation diagnostic.
 * Combines anomaly detection (per-year snapshots), error capture,
 * and tuning metrics with JSON report output.
 *
 * Run: bun scripts/diagnostic-25yr-sim.ts [--duration N]
 *
 * Replaces: headless-sim-25yr.ts, run-25year-sim.ts
 */

import { generateInitialWorld } from "../src/engine/systems/generation/WorldFactory";
import { runAutoSim } from "../src/engine/simulation/AutoSimService";
import type { WorldState } from "../src/engine/types/world";
import { writeFileSync } from "fs";
import { join } from "path";

const SEED = "sim-25yr-diagnostic-v1";
const DEFAULT_YEARS = 25;

const durationFlagIdx = process.argv.indexOf("--duration");
const YEARS = durationFlagIdx !== -1 ? parseInt(process.argv[durationFlagIdx + 1]) : DEFAULT_YEARS;

// ── Snapshot ────────────────────────────────────────────────────────────────

interface YearSnapshot {
  year: number;
  rikishiTotal: number;
  rikishiActive: number;
  heyaCount: number;
  yokozunaCount: number;
  ozekiCount: number;
  makuuchiCount: number;
  insolventHeyas: string[];
  negativeHeyas: number;
  hofInductees: number;
  globalCupComplete: boolean;
  globalCupChampion: string | null;
  avgFunds: number;
  minFunds: number;
  maxFunds: number;
  avgAge: number;
  injuredCount: number;
  retiredTotal: number;
  historicalTotal: number;
  errors: string[];
}

function snapshot(world: WorldState, errors: string[]): YearSnapshot {
  const allRikishi = Array.from(world.rikishi.values());
  const active = allRikishi.filter((r) => !r.isRetired);
  const heyas = Array.from(world.heyas.values());

  const yokozuna = active.filter((r) => r.rank === "yokozuna");
  const ozeki = active.filter((r) => r.rank === "ozeki");
  const makuuchi = active.filter((r) => r.division === "makuuchi");

  let totalFunds = 0;
  for (const h of heyas) totalFunds += h.funds ?? 0;
  const insolvent = heyas.filter((h) => (h.funds ?? 0) < 0).map((h) => h.name);

  let ageSum = 0;
  let ageCount = 0;
  for (const r of active) {
    if (r.birthYear) {
      ageSum += world.year - r.birthYear;
      ageCount++;
    }
  }
  const avgAge = ageCount ? ageSum / ageCount : 0;

  let minFunds = 0;
  let maxFunds = 0;
  for (let i = 0; i < heyas.length; i++) {
    const f = heyas[i].funds ?? 0;
    if (i === 0) {
      minFunds = f;
      maxFunds = f;
    } else {
      if (f < minFunds) minFunds = f;
      if (f > maxFunds) maxFunds = f;
    }
  }

  const chronicle = world.chronicle;
  const globalCups = chronicle?.globalCups ?? [];
  const latestCup = globalCups.at(-1);

  return {
    year: world.year,
    rikishiTotal: allRikishi.length,
    rikishiActive: active.length,
    heyaCount: heyas.length,
    yokozunaCount: yokozuna.length,
    ozekiCount: ozeki.length,
    makuuchiCount: makuuchi.length,
    insolventHeyas: insolvent,
    negativeHeyas: insolvent.length,
    hofInductees: world.hallOfFame?.inductees?.length ?? 0,
    globalCupComplete: globalCups.length > 0,
    globalCupChampion: latestCup?.championName ?? null,
    avgFunds: heyas.length ? Math.round(totalFunds / heyas.length) : 0,
    minFunds,
    maxFunds,
    avgAge: Math.round(avgAge * 10) / 10,
    injuredCount: active.filter((r) => r.injured).length,
    retiredTotal:
      (world.historicalRikishi
        ? Array.from(world.historicalRikishi.values()).filter((r) => r.isRetired).length
        : 0) + allRikishi.filter((r) => r.isRetired).length,
    historicalTotal: world.historicalRikishi?.size ?? 0,
    errors: [...errors],
  };
}

// ── Checks ───────────────────────────────────────────────────────────────────

function checkAnomalies(snap: YearSnapshot, prev: YearSnapshot | null): string[] {
  const issues: string[] = [];

  if (snap.yokozunaCount === 0) issues.push("WARN: No yokozuna in division");
  if (snap.yokozunaCount > 4) issues.push(`WARN: ${snap.yokozunaCount} yokozuna (high)`);
  if (snap.ozekiCount === 0) issues.push("WARN: No ozeki in division");
  if (snap.makuuchiCount < 30)
    issues.push(`WARN: Makuuchi has only ${snap.makuuchiCount} rikishi (should be ~42)`);
  if (snap.makuuchiCount > 60)
    issues.push(`WARN: Makuuchi overflow: ${snap.makuuchiCount} rikishi`);
  if (snap.rikishiActive < 100)
    issues.push(`WARN: Active rikishi critically low: ${snap.rikishiActive}`);
  if (snap.negativeHeyas > 0)
    issues.push(`WARN: ${snap.negativeHeyas} heyas insolvent: ${snap.insolventHeyas.join(", ")}`);
  if (snap.heyaCount < 3) issues.push(`ERROR: Heya count collapsed to ${snap.heyaCount}`);
  if (snap.avgAge > 35) issues.push(`WARN: Avg rikishi age ${snap.avgAge} — roster aging out`);
  if (snap.avgAge < 18) issues.push(`WARN: Avg age ${snap.avgAge} — suspiciously young`);

  if (prev) {
    const rikishiDelta = snap.rikishiActive - prev.rikishiActive;
    if (rikishiDelta < -30)
      issues.push(`WARN: Active rikishi dropped ${Math.abs(rikishiDelta)} in one year`);
    if (snap.heyaCount < prev.heyaCount - 2)
      issues.push(`WARN: ${prev.heyaCount - snap.heyaCount} heyas merged/dissolved this year`);
  }

  return issues;
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(70)}`);
console.log(`  Sumo Manager Pro — 25-Year NPC Headless Diagnostic`);
console.log(`  Seed: ${SEED}  |  Target: ${YEARS} years (${YEARS * 6} basho)`);
console.log(`${"═".repeat(70)}\n`);

const startMs = Date.now();
const sessionErrors: string[] = [];
const yearSnapshots: YearSnapshot[] = [];

// Intercept console.error to capture engine errors during sim
const origError = console.error.bind(console);
const capturedErrors: string[] = [];
console.error = (...args: unknown[]) => {
  const msg = args.map(String).join(" ");
  capturedErrors.push(msg);
  origError(...args);
};

let world = generateInitialWorld(SEED);
world = { ...world, playerHeyaId: undefined };

// Roster integrity clean-up: sync heya.rikishiIds with reality
const nextHeyas = new Map(world.heyas);
for (const [heyaId, heya] of nextHeyas) {
  const actualRikishiIds = Array.from(world.rikishi.values())
    .filter((r) => r.heyaId === heyaId && !r.isRetired)
    .map((r) => r.id);
  nextHeyas.set(heyaId, { ...heya, rikishiIds: actualRikishiIds });
}
world = { ...world, heyas: nextHeyas };

console.log(
  `World initialised: ${world.rikishi.size} rikishi, ${world.heyas.size} heyas, year ${world.year}\n`
);

let currentWorld = world;
let totalErrors = 0;
let weeklyTickVerified = false;

for (let yr = 0; yr < YEARS; yr++) {
  const yearErrors: string[] = [];
  capturedErrors.length = 0;

  let result: ReturnType<typeof runAutoSim>;
  try {
    result = runAutoSim(currentWorld, {
      duration: { type: "years", count: 1 },
      stopConditions: [],
      verbosity: "minimal",
      delegationPolicy: "balanced",
      observerMode: true,
    });
    currentWorld = result.finalWorld;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    yearErrors.push(`CRASH: ${msg}`);
    totalErrors++;
    console.error(`[Year ${currentWorld.year}] Sim crashed:`, msg);
    break;
  }

  yearErrors.push(...capturedErrors.map((e) => e.slice(0, 120)));
  totalErrors += yearErrors.length;

  const snap = snapshot(currentWorld, yearErrors);
  const prev = yearSnapshots.at(-1) ?? null;
  const anomalies = checkAnomalies(snap, prev);
  yearSnapshots.push(snap);

  const maxFunds = Math.max(...Array.from(currentWorld.heyas.values()).map((h) => h.funds ?? 0));
  if (!weeklyTickVerified && maxFunds > 15_000_000) {
    weeklyTickVerified = true;
    console.log(`  ✓ Weekly income confirmed (max heya funds: ¥${(maxFunds / 1e6).toFixed(1)}M)`);
  }

  const flagged = anomalies.length > 0 || yearErrors.length > 0;
  const marker = flagged ? "⚠" : "✓";

  console.log(
    `${marker} Year ${snap.year} | rikishi=${snap.rikishiActive}(+${snap.historicalTotal} hist) ` +
      `heyas=${snap.heyaCount} Y=${snap.yokozunaCount} O=${snap.ozekiCount} ` +
      `mak=${snap.makuuchiCount} injured=${snap.injuredCount} ` +
      `funds=¥${(snap.avgFunds / 1_000_000).toFixed(1)}M avg [min=${(snap.minFunds / 1_000_000).toFixed(1)}M] ` +
      `HoF=${snap.hofInductees} cup=${snap.globalCupChampion ?? "—"}`
  );

  for (const a of anomalies) console.log(`    ${a}`);
  for (const e of yearErrors.slice(0, 5)) console.log(`    ERR: ${e}`);
  if (yearErrors.length > 5) console.log(`    ... +${yearErrors.length - 5} more errors`);
}

const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);

// ── Final Report ─────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(70)}`);
console.log(`  FINAL REPORT — ${elapsed}s elapsed`);
console.log(`${"═".repeat(70)}`);

const last = yearSnapshots.at(-1);
if (last) {
  console.log(`\nFinal state (year ${last.year}):`);
  console.log(
    `  Active rikishi: ${last.rikishiActive} (${last.historicalTotal} historical/retired)`
  );
  console.log(`  Heyas: ${last.heyaCount}`);
  console.log(
    `  Yokozuna: ${last.yokozunaCount} | Ozeki: ${last.ozekiCount} | Makuuchi: ${last.makuuchiCount}`
  );
  console.log(`  HoF inductees: ${last.hofInductees}`);
  console.log(`  Avg age: ${last.avgAge}`);
  console.log(
    `  Funds: avg=¥${(last.avgFunds / 1_000_000).toFixed(1)}M min=¥${(last.minFunds / 1_000_000).toFixed(1)}M max=¥${(last.maxFunds / 1_000_000).toFixed(1)}M`
  );
  console.log(`  Global Cups held: ${currentWorld.chronicle?.globalCups?.length ?? 0}`);
}

console.log(`\nGlobal Cup history:`);
const cups = currentWorld.chronicle?.globalCups ?? [];
if (cups.length === 0) {
  console.log("  ⚠ NO GLOBAL CUPS RECORDED — tournament not firing");
} else {
  cups.forEach((c) => console.log(`  Year ${c.year}: ${c.championName} (${c.championId})`));
}

// Identify recurring issues
const allAnomalyYears = yearSnapshots
  .filter((s) => checkAnomalies(s, null).length > 0 || s.errors.length > 0)
  .map((s) => s.year);

console.log(`\nTotal engine errors captured: ${totalErrors}`);
console.log(
  `Years with anomalies: ${allAnomalyYears.length > 0 ? allAnomalyYears.join(", ") : "none"}`
);

// Rikishi drift analysis
if (yearSnapshots.length > 1) {
  const first = yearSnapshots[0];
  const final = yearSnapshots.at(-1)!;
  console.log(
    `\nRikishi drift: ${first.rikishiActive} → ${final.rikishiActive} active over ${YEARS} years`
  );
  console.log(`Heya drift: ${first.heyaCount} → ${final.heyaCount}`);
}

console.log(`\nWeekly tick verified: ${weeklyTickVerified ? "✓ YES" : "✗ NO — income never ran"}`);

// ── Tuning Summary (from last year's result) ────────────────────────────────

// Re-run final year to get tuning metrics (minimal overhead)
const finalResult = runAutoSim(currentWorld, {
  duration: { type: "years", count: 1 },
  stopConditions: [],
  verbosity: "minimal",
  delegationPolicy: "balanced",
  observerMode: true,
});

const metrics = finalResult.tuningMetrics;
if (metrics) {
  console.log("\n--- Tuning Summary ---");
  console.log("Stat Averages (Active Rikishi):");
  console.log(`  Power:     ${metrics.statAverages.power.toFixed(2)}`);
  console.log(`  Speed:     ${metrics.statAverages.speed.toFixed(2)}`);
  console.log(`  Technique: ${metrics.statAverages.technique.toFixed(2)}`);
  console.log(`  Stamina:   ${metrics.statAverages.stamina.toFixed(2)}`);

  console.log("\nRetirement Stats:");
  console.log(`  Avg Retirement Age: ${metrics.averageRetirementAge.toFixed(1)}`);

  console.log("\nEconomic Health:");
  console.log(`  Avg Stable Funds: ${metrics.stableWealth.mean.toLocaleString()} kesho`);
  console.log(`  Bankrupt Stables: ${metrics.stableWealth.bankruptCount}`);

  console.log("\nRank Distribution:");
  Object.entries(metrics.rankDistribution).forEach(([rank, count]) => {
    console.log(`  ${rank.padEnd(12)}: ${count}`);
  });

  console.log("\nArchetype Distribution (Drift Check):");
  Object.entries(metrics.archetypeDistribution).forEach(([arch, count]) => {
    console.log(`  ${arch.padEnd(12)}: ${count}`);
  });

  console.log("\nTop 10 Kimarite (Combat Variety):");
  metrics.topKimarite.forEach((k, i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. ${k.id.padEnd(15)}: ${k.count}`);
  });

  console.log("\nOyakata Ecosystem:");
  console.log(`  Total Oyakata:          ${metrics.oyakataMetrics.totalOyakata}`);
  console.log(`  Retired Rikishi -> Oya: ${metrics.oyakataMetrics.newOyakataFromRikishi}`);
  console.log(`  Oyakata Promotion Rate: ${metrics.oyakataMetrics.promotionRate.toFixed(1)}%`);
  console.log(`  Myoseki Saturation:     ${metrics.oyakataMetrics.myosekiSaturation.toFixed(1)}%`);

  console.log("\nHistorical Prestige & Parity:");
  console.log(`  Bashos without Yokozuna: ${metrics.yokozunaVacantBashoCount}`);
  console.log(`  Unique Basho Winners:    ${metrics.uniqueWinnerCount}`);

  console.log("\nBeya Dominance (Top 5 Stables):");
  metrics.beyaDominance.forEach((b, i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. ${b.name.padEnd(20)}: ${b.yusho} Yusho`);
  });

  console.log("\nEntropy & Drift Audit:");
  console.log(`  Max World Stat:         ${metrics.entropyAudit.maxStat.toFixed(1)}`);
  console.log(`  Average Rikishi Age:    ${metrics.entropyAudit.avgAge.toFixed(1)}`);
  console.log(`  Average Oyakata Age:    ${metrics.entropyAudit.oyakataAvgAge.toFixed(1)}`);
  console.log(`  Active Injury Rate:     ${metrics.entropyAudit.injuryRate.toFixed(1)}%`);
  console.log(`  Wealth Gini:            ${metrics.entropyAudit.wealthGini.toFixed(3)}`);

  // Save detailed metrics to a file
  const outputPath = join(process.cwd(), "simulation-results.json");
  const report = {
    seed: SEED,
    years: YEARS,
    yearSnapshots,
    chronicle: finalResult.chronicle,
    tuningMetrics: metrics,
  };
  writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\nDetailed report saved to: ${outputPath}`);
}

console.log(`\n${"═".repeat(70)}\n`);
