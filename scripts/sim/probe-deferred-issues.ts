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
} from "@/constants/engine/economic";
import { FOREIGN_STALL_DIVISIONS, FOREIGN_STALL_BASHO } from "@/constants/engine/recruitment";
import type { Rikishi } from "@/engine/types/rikishi";

const SEED = "sim-25yr-diagnostic-v1";
const yearsFlag = process.argv.indexOf("--years");
const YEARS = yearsFlag !== -1 ? parseInt(process.argv[yearsFlag + 1]) : 14;

const SANYAKU = new Set(["yokozuna", "ozeki", "sekiwake", "komusubi"]);

function foundingGateBreakdown(
  world: Parameters<typeof evaluateFoundingEligibility>[0],
  r: Rikishi
): { gate: string } | { gate: "PASS"; effectiveChance: number } {
  const parent = getHeya(world, r.heyaId);
  if (!parent) return { gate: "no_parent" };
  if (parent.welfareState?.complianceState === "sanctioned" || (parent.funds ?? 0) <= MERGER_THRESHOLD)
    return { gate: "parent_unviable" };
  const solvent = (r.economics?.retirementFund ?? 0) >= FOUNDING_SEED_FUNDS;
  const sponsor = (parent.funds ?? 0) >= FOUNDING_SEED_FUNDS * 2;
  if (!solvent && !sponsor) return { gate: "insolvent" };
  const hist = r.careerHistory ?? [];
  const sanyaku = hist.filter((h) => SANYAKU.has(h.rank)).length;
  const makuuchi = hist.filter((h) => h.division === "makuuchi").length;
  const peak = r.rank === "yokozuna" || r.rank === "ozeki" || hist.some((h) => h.rank === "yokozuna" || h.rank === "ozeki");
  if (!peak && sanyaku < BRANCH_FOUNDING_SANYAKU_BASHO && makuuchi < BRANCH_FOUNDING_MAKUUCHI_BASHO)
    return { gate: "career_bar" };
  const elig = evaluateFoundingEligibility(world, r);
  if (!elig.canFound) return { gate: "headroom_or_misc" };
  return { gate: "PASS", effectiveChance: elig.effectiveChance };
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
    const foreignRetirees = all.filter((r) => r.isRetired && r.retirementYear === Y && countsAsForeign(r, Y));
    const stallCulled = foreignRetirees.filter((r) => {
      const h = r.careerHistory ?? [];
      return h.length > 0 && h.length <= FOREIGN_STALL_BASHO + 1 && h.every((e) => FOREIGN_STALL_DIVISIONS.has(e.division));
    });
    const foreignActive = all.filter((r) => !r.isRetired && countsAsForeign(r, Y));
    const foreignByDiv = new Map<string, number>();
    for (const r of foreignActive) foreignByDiv.set(r.division, (foreignByDiv.get(r.division) ?? 0) + 1);

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
    const ozekiYusho = yushoWinners.filter((r) => r.rank === "ozeki" || (r.careerHistory ?? []).at(-1)?.rank === "ozeki");

    // ── C) Founding eligibility ──────────────────────────────────────────
    const retirees = all.filter((r) => r.isRetired && r.retirementYear === Y);
    const gateCounts = new Map<string, number>();
    const eligible: string[] = [];
    let maxRetirementFund = 0;
    for (const r of retirees) {
      maxRetirementFund = Math.max(maxRetirementFund, r.economics?.retirementFund ?? 0);
      const b = foundingGateBreakdown(cur, r);
      gateCounts.set(b.gate, (gateCounts.get(b.gate) ?? 0) + 1);
      if (b.gate === "PASS" && "effectiveChance" in b)
        eligible.push(`${r.shikona ?? r.id}@${b.effectiveChance.toFixed(2)}`);
    }
    const richParents = Array.from(cur.heyas.values()).filter((h) => (h.funds ?? 0) >= FOUNDING_SEED_FUNDS * 2).length;

    console.log(
      `Y${Y} | F: +${foreignDebuts.length} -${foreignRetirees.length}(stall=${stallCulled.length}) act=${foreignActive.length} ` +
        `[${[...foreignByDiv.entries()].map(([d, n]) => `${d.slice(0, 2)}:${n}`).join(" ")}]`
    );
    console.log(
      `      | O=${ozeki.length} vacStreak=${cur.yokozunaVacancyStreak ?? 0} ozekiForm: ${ozekiForm.join(" ") || "—"}`
    );
    console.log(
      `      | yushoW=${yushoWinners.length} ozekiYusho=${ozekiYusho.length} | ` +
        `retirees=${retirees.length} maxRetFund=¥${(maxRetirementFund / 1e6).toFixed(0)}M ` +
        `gates: ${[...gateCounts.entries()].map(([g, n]) => `${g}:${n}`).join(" ")} ` +
        `richParents(≥400M)=${richParents} ELIGIBLE=[${eligible.join(", ") || "none"}]`
    );
  }
  console.log("probe done");
}

main();
