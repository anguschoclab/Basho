/**
 * population-flow.ts — Basho-granularity population flow diagnostic.
 *
 * Runs runAutoSim one basho at a time and appends a state line to
 * scripts/sim/population-flow-results.txt each iteration: active count,
 * replacement gap, allocated vacancies, sanctioned heyas, pool supply by
 * availability state, and roster-churn counters. File-append avoids losing
 * lines to console truncation.
 *
 * Usage: bun scripts/sim/population-flow.ts [--years=N]
 */
import { appendFileSync, writeFileSync } from "node:fs";
import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { runAutoSim } from "@/engine/simulation/AutoSimService";
import {
  computeReplacementGap,
  allocateVacancies,
  computePopulationTarget,
} from "@/engine/generation/RecruitmentController";
import { TARGET_ROSTER_SIZE } from "@/constants/engine/recruitmentExtended";
import type { WorldState } from "@/engine/types/world";
import type { TalentPoolType } from "@/engine/types/talent";

const YEARS = Number(process.argv.find((a) => a.startsWith("--years="))?.split("=")[1] ?? 15);
const SEED = "baseline-25yr-a";
const OUT = process.argv.find((a) => a.startsWith("--out="))?.split("=")[1]
  ?? "scripts/sim/population-flow-results.txt";

function stateCounts(world: WorldState) {
  const tp = world.talentPool;
  const counts = { available: 0, in_talks: 0, signed: 0, other: 0, hidden: 0 };
  if (!tp) return counts;
  const visibleIds: string[] = [];
  for (const pt of ["high_school", "university", "foreign"] as TalentPoolType[]) {
    const p = tp.pools[pt];
    visibleIds.push(...(p?.candidatesVisible ?? []));
    counts.hidden += p?.candidatesHidden?.length ?? 0;
  }
  for (const cid of visibleIds) {
    const c = tp.candidates[cid];
    const s = c?.availabilityState ?? "other";
    if (s === "available") counts.available++;
    else if (s === "in_talks") counts.in_talks++;
    else if (s === "signed") counts.signed++;
    else counts.other++;
  }
  return counts;
}

function heyaStats(world: WorldState) {
  let headroom = 0, sanctioned = 0, rostered = 0, npcCount = 0;
  for (const heya of world.heyas.values()) {
    if (heya.id === world.playerHeyaId) continue;
    npcCount++;
    if (heya.welfareState?.complianceState === "sanctioned") sanctioned++;
    const size = new Set(heya.rikishiIds ?? []).size;
    rostered += size;
    headroom += Math.max(0, TARGET_ROSTER_SIZE - size);
  }
  return { headroom, sanctioned, rostered, npcCount };
}

writeFileSync(OUT, `# population-flow ${SEED} start=${new Date().toISOString()}\n`);
let world = generateInitialWorld(SEED);
appendFileSync(
  OUT,
  `worldgen active=${world.activeRikishiIds.size} target=${world._populationTarget}\n`
);

const startHist = () => new Set(world.historicalRikishi?.keys() ?? []);
const startAct = () => new Set(world.activeRikishiIds);

for (let b = 0; b < YEARS * 6; b++) {
  const beforeAct = startAct();
  const beforeHist = startHist();

  const result = runAutoSim(world, {
    duration: { type: "basho", count: 1 },
    stopConditions: [],
    verbosity: "minimal",
    delegationPolicy: "balanced",
    observerMode: true,
  });
  world = result.finalWorld as WorldState;

  const afterAct = new Set(world.activeRikishiIds);
  const afterHist = new Set(world.historicalRikishi?.keys() ?? []);
  const retired = [...afterHist].filter((id) => !beforeHist.has(id)).length;
  const debuted = [...afterAct].filter((id) => !beforeAct.has(id)).length;
  // Roster churn: actives that vanished from the active set WITHOUT going historical
  const vanished = [...beforeAct].filter((id) => !afterAct.has(id) && !afterHist.has(id)).length;

  const pool = stateCounts(world);
  const hs = heyaStats(world);
  const gap = computeReplacementGap(world);
  const npcCap = computePopulationTarget(world);
  const alloc = gap > 0 ? Object.values(allocateVacancies(world, gap)).reduce((a, v) => a + v, 0) : 0;

  appendFileSync(
    OUT,
    `y${world.year}b${b}: act=${afterAct.size} ret=${retired} deb=${debuted} van=${vanished} | ` +
      `heya=${hs.npcCount} cls=${world.closedHeyas?.size ?? 0} cap=${npcCap} gap=${gap} alloc=${alloc} headroom=${hs.headroom} sanc=${hs.sanctioned} rost=${hs.rostered} | ` +
      `pool av=${pool.available} tlk=${pool.in_talks} sgn=${pool.signed} oth=${pool.other} hid=${pool.hidden}\n`
  );
}
appendFileSync(OUT, `done ${new Date().toISOString()}\n`);
console.log("done — results in", OUT);
