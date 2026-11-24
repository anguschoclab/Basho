/**
 * probe-sanyaku-tenure.ts
 * ========================
 * Upstream measurement for the shared ōzeki-supply / founding root cause:
 * sanyaku tenure + win compression.
 *
 *   A) Sanyaku tenure — consecutive S/K-basho run lengths. The 33-win ōzeki
 *      window needs a ≥3-basho run; 25-sanyaku-basho founding careers need
 *      ~4 years in the tier. Histogram run lengths + count ≥3 runs.
 *
 *   B) Win compression — makuuchi win histogram by rank tier (sanyaku,
 *      joi M1-M4, mid M5-M10, low M11+). If the top clusters at 8-11 wins
 *      regardless of rank, the joi is too flat for anyone to dominate.
 *
 *   C) CA spread — potential/current ability proxy: for top-maegashira+
 *      rikishi report the stats ceiling spread (are elite PAs separated
 *      from the field or compressed?).
 *
 * Run: bun scripts/sim/probe-sanyaku-tenure.ts [--years N]
 */

import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { runAutoSim } from "@/engine/simulation/AutoSimService";
import { isLowerSanyakuRank } from "@/constants/engine/rankDisplay";
import type { Rikishi } from "@/engine/types/rikishi";
import type { CareerSnapshot } from "@/engine/types/history";

const SEED = "sim-25yr-diagnostic-v1";
const yearsFlag = process.argv.indexOf("--years");
const YEARS = yearsFlag !== -1 ? parseInt(process.argv[yearsFlag + 1]) : 6;

/** Consecutive run lengths over the S/K-filtered subsequence. */
function sanyakuRunLengths(hist: CareerSnapshot[]): number[] {
  const runs: number[] = [];
  let cur = 0;
  for (const e of hist) {
    if (e.division !== "makuuchi") {
      // A demotion below makuuchi ends the sanyaku tenure window.
      if (cur > 0) runs.push(cur);
      cur = 0;
      continue;
    }
    if (isLowerSanyakuRank(e.rank) || e.rank === "ozeki" || e.rank === "yokozuna") {
      cur++;
    } else {
      if (cur > 0) runs.push(cur);
      cur = 0;
    }
  }
  if (cur > 0) runs.push(cur);
  return runs;
}

/** Consecutive S/K-only runs (komusubi+sekiwake, the 33-win window). */
function skWindowRuns(hist: CareerSnapshot[]): number[] {
  const sk = hist.filter((e) => isLowerSanyakuRank(e.rank));
  // runs in the filtered sequence are contiguous by construction — what
  // matters is whether a rikishi accumulates ≥3 at all.
  return sk.length >= 3 ? [sk.length] : [];
}

async function main() {
  const world = generateInitialWorld({ seed: SEED });
  let cur = world;

  // Win histograms by tier.
  const winHist = {
    sanyaku: new Array(16).fill(0) as number[],
    joi: new Array(16).fill(0) as number[], // M1-M4
    midM: new Array(16).fill(0) as number[], // M5-M10
    lowM: new Array(16).fill(0) as number[],
  };
  const paTop: number[] = [];
  let maxWinSeen = 0;
  let bashoCounted = 0;

  for (let yr = 0; yr < YEARS; yr++) {
    const res = runAutoSim(cur, {
      duration: { type: "years", count: 1 },
      stopConditions: [],
      verbosity: "minimal",
      delegationPolicy: "balanced",
      observerMode: true,
    });
    cur = res.finalWorld;
    const Y = cur.year;

    // Sample this year's makuuchi entries for the win histogram.
    for (const r of cur.rikishi.values()) {
      const h = r.careerHistory ?? [];
      const entry = h.at(-1);
      if (!entry || entry.year !== Y || entry.division !== "makuuchi") continue;
      bashoCounted++;
      maxWinSeen = Math.max(maxWinSeen, entry.wins);
      const tier =
        isLowerSanyakuRank(entry.rank) || entry.rank === "ozeki" || entry.rank === "yokozuna"
          ? "sanyaku"
          : (entry.rankNumber ?? 99) <= 4
            ? "joi"
            : (entry.rankNumber ?? 99) <= 10
              ? "midM"
              : "lowM";
      winHist[tier][Math.min(entry.wins, 15)]++;
    }
  }

  // Tenure runs over final histories (active + historical).
  const tenureRuns: number[] = [];
  const sk3plus: number[] = [];
  let totalMakuuchiMen = 0;
  const scan = (r: Rikishi | { careerHistory?: CareerSnapshot[] }) => {
    const h = r.careerHistory ?? [];
    if (!h.length) return;
    if (h.some((e) => e.division === "makuuchi")) totalMakuuchiMen++;
    tenureRuns.push(...sanyakuRunLengths(h));
    sk3plus.push(...skWindowRuns(h));
  };
  for (const r of cur.rikishi.values()) scan(r);
  for (const r of cur.historicalRikishi.values()) scan(r);

  const runBuckets = new Map<string, number>();
  for (const L of tenureRuns) {
    const b = L >= 8 ? "8+" : `${L}`;
    runBuckets.set(b, (runBuckets.get(b) ?? 0) + 1);
  }
  const sorted = [...runBuckets.entries()].sort(
    (a, b) => (a[0] === "8+" ? 99 : +a[0]) - (b[0] === "8+" ? 99 : +b[0])
  );

  const fmt = (arr: number[]) =>
    arr.map((n, i) => (n > 0 ? `${i}w:${n}` : "")).filter(Boolean).join(" ");

  // CA spread at the top: potentialStats mean for top-M-and-up actives.
  const topMen = Array.from(cur.rikishi.values()).filter(
    (r) => !r.isRetired && r.division === "makuuchi" && (r.rankNumber ?? 99) <= 10
  );
  for (const r of topMen) {
    const ps = r.potential?.stats;
    if (!ps) continue;
    const vals = Object.values(ps).filter((v) => typeof v === "number") as number[];
    if (vals.length) paTop.push(vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  paTop.sort((a, b) => a - b);
  const pct = (p: number) => paTop[Math.floor((paTop.length - 1) * p)]?.toFixed(1) ?? "—";

  console.log(`\n=== SANYAKU TENURE (${YEARS}yr, seed ${SEED}) ===`);
  console.log(`rikishi with makuuchi history: ${totalMakuuchiMen}`);
  console.log(`sanyaku run-length histogram: ${sorted.map(([b, n]) => `${b}:${n}`).join(" ")}`);
  console.log(`rikishi with ≥3 S/K basho ever: ${sk3plus.length}`);
  console.log(`\n=== WIN COMPRESSION (${bashoCounted} makuuchi-basho entries) ===`);
  console.log(`sanyaku : ${fmt(winHist.sanyaku)}`);
  console.log(`joi M1-4: ${fmt(winHist.joi)}`);
  console.log(`mid M5-10: ${fmt(winHist.midM)}`);
  console.log(`low M11+: ${fmt(winHist.lowM)}`);
  console.log(`max single-basho wins observed: ${maxWinSeen}`);
  console.log(`\n=== PA SPREAD (top-10 makuuchi, mean of potentialStats) ===`);
  console.log(`n=${paTop.length} p10=${pct(0.1)} p50=${pct(0.5)} p90=${pct(0.9)} max=${pct(1.0)}`);
}

main();
