/**
 * probe-deferred-issues.ts
 * ========================
 * Root-cause probe for three 25-yr diagnostic findings:
 *
 *   A) Foreign occupancy collapse (F-occ 87%→25%) — measures foreign
 *      intake (debuts) vs attrition (retirements incl. stall-culls) per year.
 *   B) Yokozuna drought (Y=0 from 2033) — measures ozeki yusho/jun-yusho/
 *      12+ rates, consecutiveStrongOzeki distribution, vacancyStreak.
 *   C) founded=0 — decomposes evaluateFoundingEligibility per retiree:
 *      which gate fails (parent viability / solvency / career bar / headroom).
 *
 * Run: bun scripts/sim/probe-deferred-issues.ts [--years N]
 */

import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { runAutoSim } from "@/engine/simulation/AutoSimService";
import { evaluateFoundingEligibility } from "@/engine/lifecycle/retireeOyakataConversion";
import { countsAsForeign } from "@/engine/utils/citizenshipUtils";
import { getHeya } from "@/engine/core/queries";
import {
  FOUNDING_SEED_FUNDS,
  BRANCH_FOUNDING_SANYAKU_BASHO,
  BRANCH_FOUNDING_MAKUUCHI_BASHO,
  MERGER_THRESHOLD,
  HEYA_COUNT_FLOOR,
} from "@/constants/engine/economic";
import { FOREIGN_STALL_DIVISIONS, FOREIGN_STALL_BASHO } from "@/constants/engine/recruitment";
import type { Rikishi } from "@/engine/types/rikishi";
import { isYokozunaOrOzekiRank } from "@/constants/engine/rankDisplay";

const SEED = "sim-25yr-diagnostic-v1";
const yearsFlag = process.argv.indexOf("--years");
const YEARS = yearsFlag !== -1 ? parseInt(process.argv[yearsFlag + 1]) : 14;

const SANYAKU = new Set(["yokozuna", "ozeki", "sekiwake", "komusubi"]);

function foundingGateBreakdown(
  world: Parameters<typeof evaluateFoundingEligibility>[0],
  r: Rikishi
): { gate: string; careerEligible: boolean; effectiveChance?: number } {
  const parent = getHeya(world, r.heyaId);
  const careerEligible = (() => {
    const hist = r.careerHistory ?? [];
    const sanyaku = hist.filter((h) => SANYAKU.has(h.rank)).length;
    const makuuchi = hist.filter((h) => h.division === "makuuchi").length;
    const peak =
      r.rank === "yokozuna" ||
      r.rank === "ozeki" ||
      hist.some((h) => h.rank === "yokozuna" || h.rank === "ozeki");
    return (
      peak || sanyaku >= BRANCH_FOUNDING_SANYAKU_BASHO || makuuchi >= BRANCH_FOUNDING_MAKUUCHI_BASHO
    );
  })();
  if (!parent) return { gate: "no_parent", careerEligible };
  if (
    parent.welfareState?.complianceState === "sanctioned" ||
    (parent.funds ?? 0) <= MERGER_THRESHOLD
  )
    return { gate: "parent_unviable", careerEligible };
  // Current solvency model: liquid wealth (cash + retirementFund), parent
  // sponsor, or JSA underwriting below HEYA_COUNT_FLOOR.
  const liquid = (r.economics?.retirementFund ?? 0) + (r.economics?.cash ?? 0);
  const solvent = liquid >= FOUNDING_SEED_FUNDS;
  const sponsor = (parent.funds ?? 0) >= FOUNDING_SEED_FUNDS * 2;
  const jsaBacked = world.heyas.size < HEYA_COUNT_FLOOR;
  if (!solvent && !sponsor && !jsaBacked) return { gate: "insolvent", careerEligible };
  if (!careerEligible) return { gate: "career_bar", careerEligible };
  const elig = evaluateFoundingEligibility(world, r);
  if (!elig.canFound) return { gate: "headroom_or_misc", careerEligible };
  return { gate: "PASS", effectiveChance: elig.effectiveChance, careerEligible };
}

async function main() {
  const world = generateInitialWorld(SEED);
  let cur = world;
  const seen = new Set<string>(Array.from(cur.rikishi.keys()));

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

    // ── A) Foreign flow ──────────────────────────────────────────────────
    const all = Array.from(cur.rikishi.values());
    const newIds = all.filter((r) => !seen.has(r.id));
    for (const r of newIds) seen.add(r.id);
    const foreignDebuts = newIds.filter((r) => countsAsForeign(r, Y));
    const foreignRetirees = all.filter(
      (r) => r.isRetired && r.retirementYear === Y && countsAsForeign(r, Y)
    );
    const stallCulled = foreignRetirees.filter((r) => {
      const h = r.careerHistory ?? [];
      return (
        h.length > 0 &&
        h.length <= FOREIGN_STALL_BASHO + 1 &&
        h.every((e) => FOREIGN_STALL_DIVISIONS.has(e.division))
      );
    });
    const foreignActive = all.filter((r) => !r.isRetired && countsAsForeign(r, Y));
    const foreignByDiv = new Map<string, number>();
    for (const r of foreignActive)
      foreignByDiv.set(r.division, (foreignByDiv.get(r.division) ?? 0) + 1);

    // ── B) Yokozuna / ozeki form ─────────────────────────────────────────
    const ozeki = all.filter((r) => !r.isRetired && r.rank === "ozeki");
    const ozekiForm = ozeki.map((o) => {
      const h = o.careerHistory ?? [];
      const last = h.slice(-3);
      return `${o.shikona ?? o.id}[${last.map((e) => `${e.wins}-${e.losses}${e.isYusho ? "Y" : e.isJunYusho ? "J" : ""}`).join(",")}]cs=${o.consecutiveStrongOzeki ?? 0}`;
    });
    const yushoWinners = all.filter((r) =>
      (r.careerHistory ?? []).some((e) => e.isYusho && e.year === Y)
    );
    const ozekiYusho = yushoWinners.filter(
      (r) => r.rank === "ozeki" || (r.careerHistory ?? []).at(-1)?.rank === "ozeki"
    );

    // ── C) Founding eligibility ──────────────────────────────────────────
    // Retirees migrate to historicalRikishi at year-end pruning — union both
    // maps. Summaries lack economics → only career-bar tallied (approx at
    // year granularity), gate decomposition runs on full Rikishi only.
    const retirees = [
      ...all.filter((r) => r.isRetired && r.retirementYear === Y),
      ...(cur.historicalRikishi
        ? Array.from(cur.historicalRikishi.values()).filter(
            (r) => r.isRetired && r.retirementYear === Y
          )
        : []),
    ];
    const gateCounts = new Map<string, number>();
    const eligible: string[] = [];
    let careerEligible = 0;
    let maxLiquid = 0;
    for (const r of retirees) {
      if ("yearlyAggregates" in r) {
        const agg = r.yearlyAggregates;
        const careerOk =
          isYokozunaOrOzekiRank(r.peakRank) ||
          agg.filter((y) => SANYAKU.has(y.rank)).length * 6 >= BRANCH_FOUNDING_SANYAKU_BASHO ||
          agg.filter((y) => y.division === "makuuchi").length * 6 >= BRANCH_FOUNDING_MAKUUCHI_BASHO;
        gateCounts.set("summary", (gateCounts.get("summary") ?? 0) + 1);
        if (careerOk) careerEligible++;
        continue;
      }
      maxLiquid = Math.max(
        maxLiquid,
        (r.economics?.retirementFund ?? 0) + (r.economics?.cash ?? 0)
      );
      const b = foundingGateBreakdown(cur, r);
      gateCounts.set(b.gate, (gateCounts.get(b.gate) ?? 0) + 1);
      if (b.careerEligible) careerEligible++;
      if (b.gate === "PASS" && b.effectiveChance !== undefined)
        eligible.push(`${r.shikona ?? r.id}@${b.effectiveChance.toFixed(2)}`);
    }
    const richParents = Array.from(cur.heyas.values()).filter(
      (h) => (h.funds ?? 0) >= FOUNDING_SEED_FUNDS * 2
    ).length;

    console.log(
      `Y${Y} | F: +${foreignDebuts.length} -${foreignRetirees.length}(stall=${stallCulled.length}) act=${foreignActive.length} ` +
        `[${[...foreignByDiv.entries()].map(([d, n]) => `${d.slice(0, 2)}:${n}`).join(" ")}]`
    );
    console.log(
      `      | O=${ozeki.length} vacStreak=${cur.yokozunaVacancyStreak ?? 0} ozekiForm: ${ozekiForm.join(" ") || "—"}`
    );
    console.log(
      `      | yushoW=${yushoWinners.length} ozekiYusho=${ozekiYusho.length} | ` +
        `retirees=${retirees.length} careerEligible=${careerEligible} maxLiquid=¥${(maxLiquid / 1e6).toFixed(0)}M ` +
        `gates: ${[...gateCounts.entries()].map(([g, n]) => `${g}:${n}`).join(" ")} ` +
        `richParents(≥400M)=${richParents} ELIGIBLE=[${eligible.join(", ") || "none"}]`
    );
  }
  console.log("probe done");
}

main();
