/**
 * measure-kimarite-distribution.ts
 * ================================
 * Simulates N deterministic bouts through `resolveBoutPhysics` with a varied
 * rikishi population and reports the observed kimarite distribution against
 * the real-world targets in `src/constants/engine/kimariteFrequencies.ts`.
 *
 * Usage:
 *   bun run scripts/measure-kimarite-distribution.ts [--bouts N] [--seed S]
 *
 * Reports:
 *   - Per-technique observed share vs real-world target share
 *   - JSA category rollup vs category targets
 *   - Top-10 / top-20 combined shares (doc targets: ≥80% / ≥90%)
 *   - Registry entries never observed
 *   - Determinism check: a prefix re-run must be identical
 */

import { resolveBoutPhysics } from "../src/engine/bout/boutPhysics";
import { mockRikishi, makeMockBasho } from "../src/tests/unit/engine/utils";
import { SeededRNG } from "../src/engine/rng";
import {
  KIMARITE_FREQUENCY_TARGETS,
  KIMARITE_CATEGORY_TARGETS,
} from "../src/constants/engine/kimariteFrequencies";
import { KIMARITE_REGISTRY } from "../src/engine/kimariteRegistry";
import type { Rikishi } from "../src/engine/types/rikishi";
import type { Style, CombatArchetype } from "../src/engine/types/combat";

const STYLES: Style[] = ["oshi", "yotsu", "hybrid"];
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

function arg(flag: string, fallback: string): string {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const BOUTS = parseInt(arg("--bouts", "20000"), 10);
const SEED = arg("--seed", "kimarite-measure-v1");
const CALIBRATE = process.argv.includes("--calibrate");
const POOL_SIZE = 220;

/** Deterministic, varied population — not one canonical pair. */
function buildPool(seed: string): Rikishi[] {
  const rng = new SeededRNG(`${seed}:pool`);
  const pool: Rikishi[] = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    const archetype = rng.pick(ARCHETYPES);
    const weight = rng.int(85, 230);
    // Belt preference correlates with archetype (yotsu/giant grapple,
    // oshi/tsuppari push) — mirrors real rikishi populations.
    const beltPref =
      archetype === "yotsu" || archetype === "giant"
        ? rng.int(40, 70)
        : archetype === "oshi" || archetype === "tsuppari"
          ? rng.int(5, 20)
          : rng.int(15, 45);
    const base = mockRikishi(`m${i}`, {
      style: rng.pick(STYLES),
      power: rng.int(30, 95),
      speed: rng.int(30, 95),
      technique: rng.int(30, 95),
      balance: rng.int(30, 95),
      stamina: rng.int(40, 100),
      aggression: rng.int(20, 90),
      weight,
      experience: rng.int(10, 95),
    });
    // The physics read `stats.weight` first (stat() helper), so set both.
    base.weight = weight;
    base.stats.weight = weight;
    base.combatProfile = {
      ...base.combatProfile,
      archetype,
      familyPreferences: {
        push: Math.max(5, 100 - beltPref - 20),
        belt: beltPref,
        trick: rng.int(5, 25),
        speed: rng.int(5, 25),
      },
    };
    pool.push(base);
  }
  return pool;
}

function runBouts(seed: string, n: number) {
  const pool = buildPool(seed);
  const basho = makeMockBasho();
  const boutRng = new SeededRNG(`${seed}:pairing`);
  const results: { winner: string; kimarite: string }[] = [];

  for (let i = 0; i < n; i++) {
    const a = boutRng.int(0, POOL_SIZE - 1);
    let b = boutRng.int(0, POOL_SIZE - 1);
    if (b === a) b = (b + 1) % POOL_SIZE;
    const east = pool[a];
    const west = pool[b];
    const bout = {
      id: `m-${i}`,
      day: 1,
      rikishiEastId: east.id,
      rikishiWestId: west.id,
    };
    const { result } = resolveBoutPhysics(bout, east, west, basho);
    results.push({ winner: result.winner, kimarite: result.kimarite });
  }
  return results;
}

function pct(n: number, total: number): string {
  return ((n / total) * 100).toFixed(3).padStart(7);
}

function main() {
  console.log(`Kimarite distribution — ${BOUTS} bouts, seed "${SEED}"\n`);

  const results = runBouts(SEED, BOUTS);

  // Determinism: re-run a prefix and compare.
  const prefix = runBouts(SEED, Math.min(500, BOUTS));
  const deterministic = results
    .slice(0, prefix.length)
    .every(
      (r, i) => r.winner === prefix[i].winner && r.kimarite === prefix[i].kimarite
    );

  const counts = new Map<string, number>();
  for (const r of results) counts.set(r.kimarite, (counts.get(r.kimarite) ?? 0) + 1);

  const total = results.length;
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  console.log("OBSERVED vs REAL-WORLD TARGET");
  console.log(
    "kimarite".padEnd(22) +
      "count".padStart(7) +
      "obs%".padStart(9) +
      "real%".padStart(9) +
      "  status"
  );
  const flagged: string[] = [];
  for (const [id, count] of rows) {
    const target = KIMARITE_FREQUENCY_TARGETS[id];
    const obs = count / total;
    let status: string;
    if (target === undefined) {
      status = "? not in target table";
    } else {
      // Acceptance: for target ≥1% require within ±50% relative; for smaller
      // shares require within an order of magnitude (log scale).
      status =
        target >= 0.01
          ? obs >= target * 0.5 && obs <= target * 1.5
            ? "ok"
            : "OUT OF RANGE"
          : obs >= target * 0.1 && obs <= target * 10
            ? "ok (low-n)"
            : "OUT OF RANGE (low-n)";
      if (status.startsWith("OUT")) flagged.push(id);
    }
    console.log(
      id.padEnd(22) +
        String(count).padStart(7) +
        pct(count, total) +
        (target !== undefined ? (target * 100).toFixed(3).padStart(9) : "    -".padStart(9)) +
        "  " +
        status
    );
  }

  // Top-N combined share.
  const top10 = rows.slice(0, 10).reduce((s, [, c]) => s + c, 0);
  const top20 = rows.slice(0, 20).reduce((s, [, c]) => s + c, 0);
  console.log(
    `\nTop-10 combined: ${pct(top10, total).trim()}% (target ≥80%)` +
      `   Top-20 combined: ${pct(top20, total).trim()}% (target ≥90%)`
  );

  // Category rollup.
  console.log("\nCATEGORY ROLLUP");
  const catObserved = new Map<string, number>();
  for (const [id, count] of counts) {
    const def = KIMARITE_REGISTRY.find((k) => k.id === id);
    const cat = def?.jsaCategory ?? "unknown";
    catObserved.set(cat, (catObserved.get(cat) ?? 0) + count);
  }
  for (const [cat, count] of [...catObserved.entries()].sort((a, b) => b[1] - a[1])) {
    const target = KIMARITE_CATEGORY_TARGETS[cat];
    console.log(
      cat.padEnd(15) +
        pct(count, total) +
        (target !== undefined ? (target * 100).toFixed(3).padStart(9) : "    -".padStart(9))
    );
  }

  // Zero-frequency registry entries.
  const neverSeen = KIMARITE_REGISTRY.filter((k) => !counts.has(k.id)).map((k) => k.id);
  console.log(
    `\nRegistry entries never observed (${neverSeen.length}): ` +
      (neverSeen.length ? neverSeen.join(", ") : "none")
  );

  console.log(`\nDeterminism (prefix re-run): ${deterministic ? "PASS" : "FAIL"}`);
  if (flagged.length) {
    console.log(`\nFlagged out-of-range: ${flagged.join(", ")}`);
  }

  if (CALIBRATE) {
    // Suggest a per-technique multiplier = target/observed for every entry in
    // the target table. Clamped to [0.2, 5] so a single run's noise cannot
    // propose extreme swings; unreachable entries are reported separately.
    // These are *suggestions* for the candidate/strategy weights — the script
    // never writes files.
    console.log("\nCALIBRATION SUGGESTIONS (suggested weight multiplier)");
    console.log(
      "kimarite".padEnd(22) +
        "obs%".padStart(9) +
        "real%".padStart(9) +
        "  suggested ×"
    );
    const unreachable: string[] = [];
    for (const [id, target] of Object.entries(KIMARITE_FREQUENCY_TARGETS)) {
      if (id === "fusensho" || id === "hansoku") continue; // not physics paths
      const count = counts.get(id) ?? 0;
      if (count === 0) {
        unreachable.push(id);
        continue;
      }
      const obs = count / total;
      const factor = Math.min(5, Math.max(0.2, target / obs));
      console.log(
        id.padEnd(22) +
          pct(count, total) +
          (target * 100).toFixed(3).padStart(9) +
          `  ×${factor.toFixed(2)}`
      );
    }
    if (unreachable.length) {
      console.log(
        `\nUnreachable this run (candidate path missing?): ${unreachable.join(", ")}`
      );
    }
  }
}

main();
