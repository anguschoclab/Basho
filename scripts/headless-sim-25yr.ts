/**
 * headless-sim-25yr.ts
 * ====================
 * 25-year NPC-only headless simulation diagnostic.
 * Run: bun scripts/headless-sim-25yr.ts
 *
 * Reports per-year metrics, anomalies, and any thrown errors.
 * All heyas are NPC-controlled (no playerHeyaId set).
 */

import { generateInitialWorld } from "../src/engine/systems/generation/WorldFactory";
import { runAutoSim } from "../src/engine/simulation/AutoSimService";
import type { WorldState } from "../src/engine/types/world";

const SEED = "sim-25yr-diagnostic-v1";
const YEARS = 25;

// ── Snapshot ────────────────────────────────────────────────────────────────

interface YearSnapshot {
  year: number;
  rikishiTotal: number;
  rikishiActive: number;
  heyaCount: number;
  yokozunaCount: number;
  ozekiCount: number;
  makuuchiCount: number;
  insolvantHeyas: string[];
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

  const fundsArr = heyas.map((h) => h.funds ?? 0);
  const totalFunds = fundsArr.reduce((a, b) => a + b, 0);
  const insolvant = heyas.filter((h) => (h.funds ?? 0) < 0).map((h) => h.name);

  const ages = active.filter((r) => r.birthYear).map((r) => world.year - r.birthYear);
  const avgAge = ages.length ? ages.reduce((a, b) => a + b, 0) / ages.length : 0;

  const chronicle = (world as any).chronicle;
  const globalCups: any[] = chronicle?.globalCups ?? [];
  const latestCup = globalCups.at(-1);

  return {
    year: world.year,
    rikishiTotal: allRikishi.length,
    rikishiActive: active.length,
    heyaCount: heyas.length,
    yokozunaCount: yokozuna.length,
    ozekiCount: ozeki.length,
    makuuchiCount: makuuchi.length,
    insolvantHeyas: insolvant,
    negativeHeyas: insolvant.length,
    hofInductees: world.hallOfFame?.inductees?.length ?? 0,
    globalCupComplete: globalCups.length > 0,
    globalCupChampion: latestCup?.championName ?? null,
    avgFunds: heyas.length ? Math.round(totalFunds / heyas.length) : 0,
    minFunds: fundsArr.length ? Math.min(...fundsArr) : 0,
    maxFunds: fundsArr.length ? Math.max(...fundsArr) : 0,
    avgAge: Math.round(avgAge * 10) / 10,
    injuredCount: active.filter((r) => r.injured).length,
    retiredTotal: allRikishi.filter((r) => r.isRetired).length,
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
  if (snap.makuuchiCount < 30) issues.push(`WARN: Makuuchi has only ${snap.makuuchiCount} rikishi (should be ~42)`);
  if (snap.makuuchiCount > 60) issues.push(`WARN: Makuuchi overflow: ${snap.makuuchiCount} rikishi`);
  if (snap.rikishiActive < 100) issues.push(`WARN: Active rikishi critically low: ${snap.rikishiActive}`);
  if (snap.negativeHeyas > 0) issues.push(`WARN: ${snap.negativeHeyas} heyas insolvent: ${snap.insolvantHeyas.join(", ")}`);
  if (snap.heyaCount < 3) issues.push(`ERROR: Heya count collapsed to ${snap.heyaCount}`);
  if (snap.avgAge > 35) issues.push(`WARN: Avg rikishi age ${snap.avgAge} — roster aging out`);
  if (snap.avgAge < 18) issues.push(`WARN: Avg age ${snap.avgAge} — suspiciously young`);

  if (prev) {
    const rikishiDelta = snap.rikishiActive - prev.rikishiActive;
    if (rikishiDelta < -30) issues.push(`WARN: Active rikishi dropped ${Math.abs(rikishiDelta)} in one year`);
    if (snap.heyaCount < prev.heyaCount - 2) issues.push(`WARN: ${prev.heyaCount - snap.heyaCount} heyas merged/dissolved this year`);
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
console.error = (...args: any[]) => {
  const msg = args.map(String).join(" ");
  capturedErrors.push(msg);
  origError(...args);
};

let world = generateInitialWorld(SEED);
// Ensure no player heya — pure NPC sim
world = { ...world, playerHeyaId: undefined } as any;

console.log(`World initialised: ${world.rikishi.size} rikishi, ${world.heyas.size} heyas, year ${world.year}\n`);

// Simulate year by year for visibility
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
  } catch (err: any) {
    yearErrors.push(`CRASH: ${err?.message ?? String(err)}`);
    totalErrors++;
    console.error(`[Year ${currentWorld.year}] Sim crashed:`, err?.message);
    break;
  }

  yearErrors.push(...capturedErrors.map((e) => e.slice(0, 120)));
  totalErrors += yearErrors.length;

  const snap = snapshot(currentWorld, yearErrors);
  const prev = yearSnapshots.at(-1) ?? null;
  const anomalies = checkAnomalies(snap, prev);
  yearSnapshots.push(snap);

  const maxFunds = Math.max(...Array.from(currentWorld.heyas.values()).map(h => h.funds));
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
  console.log(`  Active rikishi: ${last.rikishiActive} (${last.historicalTotal} historical/retired)`);
  console.log(`  Heyas: ${last.heyaCount}`);
  console.log(`  Yokozuna: ${last.yokozunaCount} | Ozeki: ${last.ozekiCount} | Makuuchi: ${last.makuuchiCount}`);
  console.log(`  HoF inductees: ${last.hofInductees}`);
  console.log(`  Avg age: ${last.avgAge}`);
  console.log(`  Funds: avg=¥${(last.avgFunds / 1_000_000).toFixed(1)}M min=¥${(last.minFunds / 1_000_000).toFixed(1)}M max=¥${(last.maxFunds / 1_000_000).toFixed(1)}M`);
  console.log(`  Global Cups held: ${currentWorld.chronicle?.globalCups?.length ?? 0}`);
}

console.log(`\nGlobal Cup history:`);
const cups: any[] = (currentWorld as any).chronicle?.globalCups ?? [];
if (cups.length === 0) {
  console.log("  ⚠ NO GLOBAL CUPS RECORDED — tournament not firing");
} else {
  cups.forEach((c: any) => console.log(`  Year ${c.year}: ${c.championName} (${c.championId})`));
}

// Identify recurring issues
const allAnomalyYears = yearSnapshots
  .filter((s) => checkAnomalies(s, null).length > 0 || s.errors.length > 0)
  .map((s) => s.year);

console.log(`\nTotal engine errors captured: ${totalErrors}`);
console.log(`Years with anomalies: ${allAnomalyYears.length > 0 ? allAnomalyYears.join(", ") : "none"}`);

// Rikishi drift analysis
if (yearSnapshots.length > 1) {
  const first = yearSnapshots[0];
  const final = yearSnapshots.at(-1)!;
  console.log(`\nRikishi drift: ${first.rikishiActive} → ${final.rikishiActive} active over ${YEARS} years`);
  console.log(`Heya drift: ${first.heyaCount} → ${final.heyaCount}`);
}

console.log(`\nWeekly tick verified: ${weeklyTickVerified ? "✓ YES" : "✗ NO — income never ran"}`);

console.log(`\n${"═".repeat(70)}\n`);
