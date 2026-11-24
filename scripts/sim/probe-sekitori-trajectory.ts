/**
 * probe-sekitori-trajectory.ts
 * ============================
 * Measurement probes for two open 25-yr findings (no tuning until measured):
 *
 *   A) Sekitori-foreign thinness — end-state foreignSekitori=2 vs real ~14.
 *      For every post-genesis debutant, track debut division → basho-to-first-
 *      sekitori (juryo|makuuchi entry in careerHistory) → outcome, split by
 *      foreign vs domestic cohort. Answers: do organic foreigners climb the
 *      pyramid at a plausible rate, or stall/retire below?
 *
 *   B) Ōzeki supply — SEKIWAKE_33_WIN_THRESHOLD is the canonical real-world bar
 *      (33 wins over last 3 S/K basho + ≥10 current). Reconstructs the engine's
 *      exact window (filtered S/K subsequence, per performance.ts:358-374) and
 *      histograms the sums, plus eligible-vs-actual promotions and ōzeki
 *      demotion rate (drain vs supply).
 *
 * Run: bun scripts/sim/probe-sekitori-trajectory.ts [--years N]
 */

import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { runAutoSim } from "@/engine/simulation/AutoSimService";
import { countsAsForeign } from "@/engine/utils/citizenshipUtils";
import { isLowerSanyakuRank } from "@/constants/engine/rankDisplay";
import { SEKIWAKE_33_WIN_THRESHOLD, SEKIWAKE_OZEKI_RECLAIM_WINS } from "@/constants/engine/banzuke";
import type { Rikishi } from "@/engine/types/rikishi";

const SEED = "sim-25yr-diagnostic-v1";
const yearsFlag = process.argv.indexOf("--years");
const YEARS = yearsFlag !== -1 ? parseInt(process.argv[yearsFlag + 1]) : 16;

const SEKITORI = new Set(["juryo", "makuuchi"]);

interface Debut {
  foreign: boolean;
  debutDivision: string;
  firstSeenYear: number;
}
const debuts = new Map<string, Debut>();

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/** Basho index of first sekitori entry, or -1. */
function bashoToSekitori(r: Rikishi): number {
  const h = r.careerHistory ?? [];
  for (let i = 0; i < h.length; i++) {
    if (SEKITORI.has(h[i].division)) return i + 1; // 1-based basho count
  }
  return -1;
}

function trajectoryReport(world: Map<string, Rikishi> | { rikishi: Map<string, Rikishi> }): string {
  const rikishi = "rikishi" in world ? Array.from(world.rikishi.values()) : Array.from(world.values());
  const stats = { f: { reach: [] as number[], below: 0, belowRet: 0 }, d: { reach: [] as number[], below: 0, belowRet: 0 } };
  for (const [id, deb] of debuts) {
    const r = rikishi.find((x) => x.id === id);
    if (!r || !(r.careerHistory ?? []).length) continue;
    const c = deb.foreign ? stats.f : stats.d;
    const b2s = bashoToSekitori(r);
    if (b2s > 0) c.reach.push(b2s);
    else if (r.isRetired) c.belowRet++;
    else c.below++;
  }
  return (
    `traj F: sek=${stats.f.reach.length}(med ${median(stats.f.reach)}b) below=${stats.f.below} retBelow=${stats.f.belowRet} | ` +
    `D: sek=${stats.d.reach.length}(med ${median(stats.d.reach)}b) below=${stats.d.below} retBelow=${stats.d.belowRet}`
  );
}

async function main() {
  const world = generateInitialWorld(SEED);
  let cur = world;
  const seen = new Set<string>(Array.from(cur.rikishi.keys()));

  // Cumulative win-sum histogram + promotion/demotion tallies.
  const sumBuckets = new Map<string, number>(); // "<24","24-26","27-29","30-32","33+"
  let eligibleWindows = 0; // sum>=33 && current wins>=10 && current rank S/K
  let ozekiPromotions = 0;
  let ozekiDemotions = 0; // ozeki entry followed (next basho) by non-ozeki — kadoban drop
  const countedPromo = new Set<string>(); // promote once per rikishi
  const countedDemo = new Set<string>();

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
    const all = Array.from(cur.rikishi.values());
    const byId = new Map(all.map((r) => [r.id, r]));

    // ── A) register new debuts ──────────────────────────────────────────
    let newF = 0;
    for (const r of all) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      const debutEntry = (r.careerHistory ?? [])[0];
      const foreign = countsAsForeign(r, Y);
      debuts.set(r.id, {
        foreign,
        debutDivision: debutEntry?.division ?? r.division,
        firstSeenYear: Y,
      });
      if (foreign) newF++;
    }

    // ── B) S/K win-sum windows + ozeki transitions (this year's entries) ─
    let windowsThisYear = 0;
    let nearMiss = 0; // 30-32
    for (const r of all) {
      const h = r.careerHistory ?? [];
      // ozeki promotion: last entry ozeki, previous top-division entry not ozeki
      const last = h.at(-1);
      if (last?.year === Y && last.rank === "ozeki" && !countedPromo.has(r.id)) {
        const prev = h.slice(0, -1).reverse().find((e) => e.division === "makuuchi");
        if (prev && prev.rank !== "ozeki") {
          ozekiPromotions++;
          countedPromo.add(r.id);
        }
      }
      // kadoban demotion: an ozeki entry immediately followed by non-ozeki
      if (!countedDemo.has(r.id)) {
        for (let i = 1; i < h.length; i++) {
          if (h[i].year !== Y) break;
          if (h[i - 1].rank === "ozeki" && h[i].rank !== "ozeki" && h[i].division === "makuuchi") {
            ozekiDemotions++;
            countedDemo.add(r.id);
            break;
          }
        }
      }
      // 3-S/K-basho window ending on a this-year entry — engine window exactly:
      // filtered S/K subsequence; current wins>=10 gate at sekiwake/komusubi.
      const sanyaku = h.filter((e) => isLowerSanyakuRank(e.rank));
      const cur3 = sanyaku.at(-1);
      const prev1 = sanyaku.at(-2);
      const prev2 = sanyaku.at(-3);
      if (cur3 && prev1 && prev2 && cur3.year === Y) {
        const sum = cur3.wins + prev1.wins + prev2.wins;
        windowsThisYear++;
        const bucket =
          sum >= 33 ? "33+" : sum >= 30 ? "30-32" : sum >= 27 ? "27-29" : sum >= 24 ? "24-26" : "<24";
        sumBuckets.set(bucket, (sumBuckets.get(bucket) ?? 0) + 1);
        if (sum >= 30 && sum < 33) nearMiss++;
        if (sum >= SEKIWAKE_33_WIN_THRESHOLD && cur3.wins >= SEKIWAKE_OZEKI_RECLAIM_WINS)
          eligibleWindows++;
      }
    }

    const fActive = all.filter((r) => !r.isRetired && countsAsForeign(r, Y));
    const fSek = fActive.filter((r) => SEKITORI.has(r.division)).length;
    const ozeki = all.filter((r) => !r.isRetired && r.rank === "ozeki").length;
    const yoko = all.filter((r) => !r.isRetired && r.rank === "yokozuna").length;

    console.log(
      `Y${Y} | +Fdebuts=${newF} Fsek=${fSek} | Y=${yoko} O=${ozeki} ` +
        `windows=${windowsThisYear} nearMiss(30-32)=${nearMiss} eligible=${eligibleWindows} ` +
        `O-promo=${ozekiPromotions} O-demo=${ozekiDemotions}`
    );
    if (yr % 4 === 3 || yr === YEARS - 1) console.log(`      | ${trajectoryReport(byId)}`);
  }

  console.log(
    `\n=== FINAL ===\n${trajectoryReport(cur)}\n` +
      `win-sum histogram: ${[...sumBuckets.entries()].sort().map(([b, n]) => `${b}:${n}`).join(" ")}\n` +
      `eligible 33+/10+ windows=${eligibleWindows} | ozeki promotions=${ozekiPromotions} demotions=${ozekiDemotions}`
  );
}

main();
