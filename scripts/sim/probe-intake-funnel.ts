/**
 * probe-intake-funnel.ts — why can't NPC recruitment backfill churn?
 *
 * Runs N sim years and dumps the intake funnel per year:
 *   gap (population target − actives) → allocated vacancies → debuts,
 * plus the INTAKE_DIAG counters (b_vis/b_skip_slot/b_skip_age/b_void_*) and
 * how many heyas are bid-ineligible (missing oyakata, sanctioned, frozen).
 */
import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { runAutoSim } from "@/engine/simulation/AutoSimService";
import { INTAKE_DIAG } from "@/engine/generation/TalentPoolNPCRecruitment";
import { computeReplacementGap, allocateVacancies, getHeyaRosterTarget } from "@/engine/generation/RecruitmentController";

const YEARS = Number(process.argv[2] ?? 4);
const SEED = "sim-25yr-diagnostic-v1";

const originalWarn = console.warn;
console.warn = () => {};

let world = generateInitialWorld(SEED);
world = { ...world, playerHeyaId: undefined };

// integrity pass mirroring the main harness
const nextHeyas = new Map(world.heyas);
for (const [heyaId, heya] of nextHeyas) {
  const actual = Array.from(world.rikishi.values())
    .filter((r) => r.heyaId === heyaId && !r.isRetired)
    .map((r) => r.id);
  nextHeyas.set(heyaId, { ...heya, rikishiIds: actual });
}
world = { ...world, heyas: nextHeyas };

for (let yr = 0; yr < YEARS; yr++) {
  const diagBefore = { ...INTAKE_DIAG };

  const gap = computeReplacementGap(world);
  const alloc = allocateVacancies(world, gap);
  const allocTotal = Object.values(alloc).reduce((a, n) => a + n, 0);
  const target = Array.from(world.heyas.values()).reduce(
    (a, h) => a + getHeyaRosterTarget(h),
    0
  );

  // bid-eligibility audit
  let noOyakata = 0;
  let sanctioned = 0;
  let frozen = 0;
  const tp = world.talentPool;
  const visAvail = tp
    ? (["high_school", "university", "foreign"] as const).reduce(
        (a, pt) =>
          a +
          tp.pools[pt].candidatesVisible.filter(
            (id) => tp.candidates[id]?.availabilityState === "available"
          ).length,
        0
      )
    : 0;
  const visAges = tp
    ? (["high_school", "university", "foreign"] as const).reduce(
        (a, pt) =>
          a +
          tp.pools[pt].candidatesVisible.filter((id) => {
            const c = tp.candidates[id];
            return c && world.year - c.birthYear >= (c.tsukedashi ? 25 : 23);
          }).length,
        0
      )
    : 0;

  for (const h of world.heyas.values()) {
    if (!world.oyakata.get(h.oyakataId)) noOyakata++;
    if (h.welfareState?.complianceState === "sanctioned") sanctioned++;
    if ((h.welfareState?.sanctions?.recruitmentFreezeWeeks ?? 0) > 0) frozen++;
  }

  const startYear = world.year;
  const result = runAutoSim(world, {
    duration: { type: "years", count: 1 },
    stopConditions: [],
    verbosity: "minimal",
    delegationPolicy: "balanced",
    observerMode: true,
  });
  world = result.finalWorld;

  const newDebuts = Array.from(world.rikishi.values()).filter(
    (r) => !r.isRetired && (r.debutYear ?? 0) >= startYear
  ).length;
  const delta = Object.fromEntries(
    Object.entries(INTAKE_DIAG)
      .map(([k, v]) => [k, v - (diagBefore[k] ?? 0)])
      .filter(([, v]) => (v as number) !== 0)
  );

  console.log(
    `Y${world.year} actives=${world.activeRikishiIds.size} target=${target} ` +
      `gap@yearStart=${gap} alloc=${allocTotal} | debutsThisYear=${newDebuts}`
  );
  console.log(
    `    pool: visAvail=${visAvail} visAgedOut=${visAges} | ` +
      `heyas: n=${world.heyas.size} noOyakata=${noOyakata} sanctioned=${sanctioned} frozen=${frozen}`
  );
  console.log(`    diag delta:`, delta);
}

console.warn = originalWarn;
