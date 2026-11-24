/**
 * probe-foreign-pipeline.ts — fast foreign-intake audit.
 * Ticks ~30 weeks from genesis, then reports:
 *   - foreign pool occupancy (hidden/visible/signed)
 *   - open-slot heyas + their oyakata foreign-bid eligibility
 *     (blocking quirks, age taper, aggression multiplier)
 *   - whether foreign candidates ever enter npcBidPolicies consideration
 * Run: bun scripts/sim/probe-foreign-pipeline.ts [--weeks N]
 */
import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { runAutoSim } from "@/engine/simulation/AutoSimService";
import { foreignSlotOccupied, foreignSlotBidAggression } from "@/engine/npc/ForeignSlotPolicy";
import { candidateConsumesForeignSlot } from "@/engine/generation/talentPoolReads";
import { FOREIGN_BID_BLOCKING_QUIRKS } from "@/constants/engine/recruitment";

const weeksFlag = process.argv.indexOf("--weeks");
const WEEKS = weeksFlag !== -1 ? parseInt(process.argv[weeksFlag + 1]) : 30;

const world = generateInitialWorld("sim-25yr-diagnostic-v1");
const res = runAutoSim(world, {
  duration: { type: "weeks", count: WEEKS },
  stopConditions: [],
  verbosity: "minimal",
  delegationPolicy: "balanced",
  observerMode: true,
});
const w = res.finalWorld;

const tp = w.talentPool;
const fp = tp?.pools?.foreign;
console.log(`foreign pool: hidden=${fp?.candidatesHidden?.length ?? 0} visible=${fp?.candidatesVisible?.length ?? 0}`);
const fCands = (fp ? [...fp.candidatesHidden, ...fp.candidatesVisible] : [])
  .map((id) => tp?.candidates[id])
  .filter((c): c is NonNullable<typeof c> => Boolean(c));
const states = new Map<string, number>();
for (const c of fCands) states.set(c.availabilityState ?? "?", (states.get(c.availabilityState ?? "?") ?? 0) + 1);
console.log(`foreign candidate states: ${[...states.entries()].map(([s, n]) => `${s}:${n}`).join(" ")}`);
const fTalent = fCands.map((c) => Math.round((c.talentSeed ?? 0))).sort((a, b) => b - a);
console.log(`foreign talentSeeds top10: ${fTalent.slice(0, 10).join(",")} | median=${fTalent[Math.floor(fTalent.length / 2)] ?? "-"}`);
const consumes = fCands.filter((c) => candidateConsumesForeignSlot(c)).length;
console.log(`slot-consuming foreign candidates: ${consumes}/${fCands.length}`);

// open-slot heyas + bid eligibility
let open = 0, blocked = 0, tapered = 0, ok = 0;
const aggr: number[] = [];
for (const h of w.heyas.values()) {
  if (foreignSlotOccupied(w, h.id)) continue;
  open++;
  const o = w.oyakata.get(h.oyakataId);
  if (!o) continue;
  const quirks = o.quirks ?? [];
  if (FOREIGN_BID_BLOCKING_QUIRKS.some((q) => quirks.includes(q))) { blocked++; continue; }
  const a = foreignSlotBidAggression(o);
  aggr.push(a);
  if (a <= 0) { if ((o.age ?? 0) >= 63) tapered++; else blocked++; continue; }
  ok++;
}
console.log(`open-slot heyas=${open} | eligible bidders=${ok} quirkBlocked=${blocked} ageTapered=${tapered}`);
console.log(`aggression multipliers: ${aggr.map((x) => x.toFixed(2)).sort().join(" ") || "none"}`);

// domestic competition: top talentSeeds in other pools
for (const pt of ["high_school", "university"] as const) {
  const p = tp?.pools?.[pt];
  const cands = (p ? [...p.candidatesHidden, ...p.candidatesVisible] : [])
    .map((id) => tp?.candidates[id]).filter((c): c is NonNullable<typeof c> => Boolean(c));
  const seeds = cands.map((c) => Math.round(c.talentSeed ?? 0)).sort((a, b) => b - a);
  console.log(`${pt}: n=${cands.length} top10 talent=[${seeds.slice(0, 10).join(",")}]`);
}

// foreign rookies on roster vs genesis
const fActive = [...w.rikishi.values()].filter((r) => !r.isRetired && r.nationality && r.nationality !== "Japan");
console.log(`active foreigners now=${fActive.length}`);
console.log("done");
