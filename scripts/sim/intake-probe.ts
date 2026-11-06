/**
 * intake-probe.ts — Isolated probe of the weekly replacement-intake pipeline.
 *
 * Builds a deficit world (active << _populationTarget, full visible pools),
 * runs phase01_week_recruitment once, and reports how many rikishi actually
 * materialize. Distinguishes controller/allocation bugs from downstream
 * supply/bidding failures in seconds instead of a multi-year sim.
 */
import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { phase01_week_recruitment } from "@/engine/tick/phases/phase01_week_recruitment";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { refreshAllPools } from "@/engine/generation/TalentPoolStateService";
import { computeReplacementGap, allocateVacancies } from "@/engine/generation/RecruitmentController";
import { TARGET_ROSTER_SIZE } from "@/constants/engine/recruitmentExtended";

let world = generateInitialWorld("intake-probe-seed");

// Fill pools to caps (refreshAllPools tops hidden; simulate discovery by moving
// most hidden -> visible so bidding has supply).
world = resolveImpacts(world, [refreshAllPools(world)]);
const tp = world.talentPool;
if (!tp) throw new Error("intake-probe: world has no talentPool");
const pools = { ...tp.pools };
for (const pt of ["high_school", "university", "foreign"] as const) {
  const p = { ...pools[pt] };
  const moveCount = Math.min(300, p.candidatesHidden.length);
  p.candidatesVisible = [...p.candidatesVisible, ...p.candidatesHidden.splice(0, moveCount)];
  pools[pt] = p;
}
world = { ...world, talentPool: { ...tp, pools } };

// Retire ~220 actives to force a big gap. Strip them from active set + rosters
// the same way the retirement path does.
const toRetire = [...world.activeRikishiIds].slice(0, 220);
const activeAfter = new Set(world.activeRikishiIds);
const heyas = new Map(world.heyas);
const rikishi = new Map(world.rikishi);
for (const id of toRetire) {
  const r = rikishi.get(id);
  if (!r) continue;
  activeAfter.delete(id);
  const heya = heyas.get(r.heyaId);
  if (heya) heyas.set(r.heyaId, { ...heya, rikishiIds: (heya.rikishiIds ?? []).filter((x) => x !== id) });
  rikishi.set(id, { ...r, isRetired: true });
}
world = { ...world, activeRikishiIds: activeAfter, heyas, rikishi };

// Probe the pipeline stages
const gap = computeReplacementGap(world);
const alloc = allocateVacancies(world, gap);
const allocTotal = Object.values(alloc).reduce((a, b) => a + b, 0);

let headroom = 0;
for (const heya of world.heyas.values()) {
  if (heya.id === world.playerHeyaId) continue;
  if (heya.welfareState?.complianceState === "sanctioned") continue;
  headroom += Math.max(0, TARGET_ROSTER_SIZE - (heya.rikishiIds ?? []).length);
}

const tpNow = world.talentPool;
if (!tpNow) throw new Error("intake-probe: world lost talentPool");
let visibleAvail = 0;
for (const pt of ["high_school", "university", "foreign"] as const) {
  for (const cid of tpNow.pools[pt].candidatesVisible) {
    if (tpNow.candidates[cid]?.availabilityState === "available") visibleAvail++;
  }
}

console.log(
  `probe world: active=${world.activeRikishiIds.size} target=${world._populationTarget} ` +
    `gap=${gap} headroom=${headroom} allocTotal=${allocTotal} visibleAvail=${visibleAvail}`
);

const before = world.activeRikishiIds.size;
const impact = phase01_week_recruitment(world);
world = resolveImpacts(world, [impact]);
const after = world.activeRikishiIds.size;

const tpAfter = world.talentPool;
let visibleAvailAfter = 0;
for (const pt of ["high_school", "university", "foreign"] as const) {
  for (const cid of tpAfter?.pools[pt].candidatesVisible ?? []) {
    if (tpAfter?.candidates[cid]?.availabilityState === "available") visibleAvailAfter++;
  }
}

console.log(
  `one weekly tick: active ${before}→${after} (materialized ${after - before}), ` +
    `visibleAvail ${visibleAvail}→${visibleAvailAfter}`
);
