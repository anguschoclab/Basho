/**
 * diagnostic-25yr-sim.ts
 * ======================
 * Canonical 25-year headless simulation diagnostic.
 * Combines anomaly detection (per-year snapshots), error capture,
 * and tuning metrics with JSON report output.
 *
 * Run: bun scripts/diagnostic-25yr-sim.ts [--duration N]
 *
 * Replaces: headless-sim-25yr.ts, run-25year-sim.ts
 */

import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { runAutoSim } from "@/engine/simulation/AutoSimService";
import type { WorldState } from "@/engine/types/world";
import type { RetiredRikishiSummary } from "@/engine/types/history";
import { writeFileSync } from "fs";
import { join } from "path";
import { countsAsForeign } from "@/engine/utils/citizenshipUtils";
import { FOREIGN_RIKISHI_LIMIT_PER_HEYA } from "@/constants/engine/recruitment";
import { getExhibitionBashoSchedule } from "@/engine/basho/ExhibitionBashoService";
import { evaluateFoundingEligibility } from "@/engine/lifecycle/retireeOyakataConversion";
import { isYokozunaOrOzekiRank } from "@/constants/engine/rankDisplay";
import {
  BRANCH_FOUNDING_SANYAKU_BASHO,
  BRANCH_FOUNDING_MAKUUCHI_BASHO,
} from "@/constants/engine/economic";
import { currentAbility, potentialAbility } from "@/engine/development/caPa";
import { reachableFraction } from "@/engine/training/TrainingMath";
import type { Rikishi } from "@/engine/types/rikishi";

const SEED = "sim-25yr-diagnostic-v1";
const DEFAULT_YEARS = 25;

const durationFlagIdx = process.argv.indexOf("--duration");
const YEARS = durationFlagIdx !== -1 ? parseInt(process.argv[durationFlagIdx + 1]) : DEFAULT_YEARS;

const median = (xs: number[]): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

const spread = (xs: number[]): { mean: number; std: number; min: number; max: number } | null => {
  if (!xs.length) return null;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
  return {
    mean: Math.round(mean * 10) / 10,
    std: Math.round(Math.sqrt(variance) * 10) / 10,
    min: Math.min(...xs),
    max: Math.max(...xs),
  };
};

// ── Snapshot ────────────────────────────────────────────────────────────────

interface YearSnapshot {
  year: number;
  rikishiTotal: number;
  rikishiActive: number;
  heyaCount: number;
  yokozunaCount: number;
  ozekiCount: number;
  makuuchiCount: number;
  insolventHeyas: string[];
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
  /** WS6 — heyas holding more than one foreign-slot rikishi (canon §5.1). */
  foreignSlotViolations: string[];
  // ── Realism-calibration metrics (JSA plan WS-1→14) ──────────────────────
  /** WS-1 — share of active heyas holding ≥1 foreign-slot rikishi (~0.69 real). */
  foreignOccupancy: number;
  /** WS-1 — foreign rikishi total / sekitori / lower-division counts. */
  foreignTotal: number;
  foreignSekitori: number;
  foreignLower: number;
  /** WS-1 — Mongolian share of foreign rikishi (~0.74 real). */
  mongolianShare: number;
  /** WS-4c — mandated-absorption grandfathered foreign slots (Isegahama rule). */
  grandfatheredForeignSlots: number;
  /** WS-5 — heyas currently under disciplinary custody (azukari). */
  heyaInCustody: number;
  /** WS-5/6 — closures vs foundings this snapshot (equilibrium watch). */
  closedHeyaCount: number;
  closureReasons: Record<string, number>;
  branchedHeyaCount: number;
  /** Founding pipeline — active rikishi already meeting the JSA career bar
   *  (pipeline depth / future founder bench). */
  founderBarActive: number;
  /** This year's retirees meeting the career bar — the year's founder pool. */
  founderBarRetirees: number;
  /** Retirees passing every gate (canFound) — actual convertible count. */
  founderEligible: number;
  /** Active rikishi who would pass the FULL founding gate today (career bar
   *  + solvency/sponsor + headroom) — the live founder bench. The gate reads
   *  lifetime counters + liquid wealth; nothing in it requires retirement. */
  founderEligibleActives: number;
  /** WS-14 — annual jungyō tour days (~90 pre-2027, ~70s post). */
  jungyoTourDays: number;
  // ── Development-spectrum tracking (busts/derailment/maturation) ──────────
  /** Actives by dev profile — prodigy/standard/late_bloomer/journeyman/early_peaker. */
  profileCounts: Record<string, number>;
  /** Actives carrying injuryDerailment < 0.99 (career-limiting damage). */
  derailedActive: number;
  /** Actives flagged busts (bustFraction set — elite-PA packages that flop). */
  bustsActive: number;
  /** Median CA/reachablePA across prime-age (24-30) actives with potential. */
  medRealizationPrime: number;
  /** Median stats.height / potential.heightCm among actives ≤19 — maturation
   *  telemetry: ~0.88 at intake, should climb toward 1.0 through teens. */
  teenHeightRatio: number;
  // ── Pipeline / governance tracking (week-of commits) ─────────────────────
  /** Actives per division — the promotion funnel. A collapsed lower rung
   *  (jonokuchi/jonidan draining) or a bloated sekitori tier surfaces here. */
  divisionCounts: Record<string, number>;
  /** Off-banzuke actives (kyujo/overflow) — should stay small + transient. */
  banzukeGai: number;
  /** Rikishi whose debutYear is this year — annual intake rate (~real 100). */
  debutsThisYear: number;
  /** Ozeki currently kadoban (demotion-threatened) — pressure-cycle health. */
  kadobanOzeki: number;
  /** Active heyas per ichimon — defections/closures drift clan strength. */
  ichimonCounts: Record<string, number>;
  /** Year the seated JSA board was elected — biennial elections should tick. */
  jsaBoardElectedYear: number;
  /** Unresolved pendingDecisions — the backlog-treadmill fix keeps this ~0. */
  pendingDecisions: number;
  // ── Kimarite & roster trajectory ─────────────────────────────────────────
  /** All-time winning-technique counts (world.allTimeKimariteStats copy —
   *  globalKimariteStats is era-scoped and resets at year boundary).
   *  Year-over-year diff shows style drift as physiques/archetypes shift. */
  kimariteStats: Record<string, number>;
  /** Active roster size per heya — rise/fall trajectories. */
  rosterByHeya: Record<string, number>;
  rosterMedian: number;
  rosterMin: number;
  rosterMax: number;
  /** Physique spread of this year's debut cohort (debutYear === year) —
   *  recruit-pool diversity: a collapsed σ means generation is cloning. */
  intakeHeight: { mean: number; std: number; min: number; max: number } | null;
  intakeWeight: { mean: number; std: number; min: number; max: number } | null;
  errors: string[];
}

function snapshot(world: WorldState, errors: string[]): YearSnapshot {
  const allRikishi = Array.from(world.rikishi.values());
  const active = allRikishi.filter((r) => !r.isRetired);
  const heyas = Array.from(world.heyas.values());

  const yokozuna = active.filter((r) => r.rank === "yokozuna");
  const ozeki = active.filter((r) => r.rank === "ozeki");
  const makuuchi = active.filter((r) => r.division === "makuuchi");

  let totalFunds = 0;
  for (const h of heyas) totalFunds += h.funds ?? 0;
  const insolvent = heyas.filter((h) => (h.funds ?? 0) < 0).map((h) => h.name);

  let ageSum = 0;
  let ageCount = 0;
  for (const r of active) {
    if (r.birthYear) {
      ageSum += world.year - r.birthYear;
      ageCount++;
    }
  }
  const avgAge = ageCount ? ageSum / ageCount : 0;

  let minFunds = 0;
  let maxFunds = 0;
  for (let i = 0; i < heyas.length; i++) {
    const f = heyas[i].funds ?? 0;
    if (i === 0) {
      minFunds = f;
      maxFunds = f;
    } else {
      if (f < minFunds) minFunds = f;
      if (f > maxFunds) maxFunds = f;
    }
  }

  const chronicle = world.chronicle;
  const globalCups = chronicle?.globalCups ?? [];
  const latestCup = globalCups.at(-1);

  // WS6 — foreign-slot invariant (§5.1): at most ONE slot-consuming rikishi
  // per heya. Citizenship-aware: naturalized/dual-citizen rikishi don't count.
  const foreignByHeya = new Map<string, number>();
  for (const r of active) {
    if (!r.heyaId) continue;
    if (countsAsForeign(r, world.year)) {
      foreignByHeya.set(r.heyaId, (foreignByHeya.get(r.heyaId) ?? 0) + 1);
    }
  }
  const foreignSlotViolations: string[] = [];
  const heyaById = new Map(heyas.map((h) => [h.id, h]));
  for (const [heyaId, n] of foreignByHeya) {
    const grandfathered =
      (heyaById.get(heyaId) as { grandfatheredForeignCount?: number } | undefined)
        ?.grandfatheredForeignCount ?? 0;
    if (n > FOREIGN_RIKISHI_LIMIT_PER_HEYA + grandfathered) {
      foreignSlotViolations.push(`${heyaId}:${n}(+${grandfathered})`);
    }
  }

  // ── Realism-calibration metrics ──────────────────────────────────────────
  const foreignHeyas = new Set(foreignByHeya.keys());
  let foreignTotal = 0;
  let foreignSekitori = 0;
  let foreignLower = 0;
  let mongolian = 0;
  for (const r of active) {
    if (!countsAsForeign(r, world.year)) continue;
    foreignTotal++;
    if (r.nationality === "Mongolia") mongolian++;
    if (r.division === "makuuchi" || r.division === "juryo") foreignSekitori++;
    else foreignLower++;
  }
  const grandfatheredForeignSlots = heyas.reduce(
    (a, h) => a + ((h as { grandfatheredForeignCount?: number }).grandfatheredForeignCount ?? 0),
    0
  );
  const heyaInCustody = heyas.filter(
    (h) => (h as { custodyStatus?: unknown }).custodyStatus != null
  ).length;
  const closedHeyaCount = world.closedHeyas?.size ?? 0;
  const closureReasons: Record<string, number> = {};
  for (const rec of world.closedHeyas?.values() ?? []) {
    const r = (rec as { closureReason?: string }).closureReason ?? "unknown";
    closureReasons[r] = (closureReasons[r] ?? 0) + 1;
  }
  const branchedHeyaCount = heyas.filter((h) => h.branchedFromHeyaId != null).length;

  // ── Founder pipeline tracking ─────────────────────────────────────────
  // JSA career bar: peak Y/Ō (current or historical), 12+ san'yaku basho,
  // or 25+ makuuchi basho. fcandActive = bench depth, fcandRetirees = this
  // year's founder pool, felig = retirees clearing every gate.
  // Retirees migrate to historicalRikishi at year-end pruning — must union
  // both maps. Summaries lack careerHistory + economics, so their bar check
  // approximates basho counts at year granularity (12 basho → 2 yr, 25 → 5)
  // and felig only counts un-pruned full Rikishi.
  const SANYAKU = new Set(["yokozuna", "ozeki", "sekiwake", "komusubi"]);
  type AnyRetiree = (typeof allRikishi)[number] | RetiredRikishiSummary;
  const meetsCareerBar = (r: AnyRetiree): boolean => {
    if ("yearlyAggregates" in r) {
      const agg = r.yearlyAggregates;
      return (
        isYokozunaOrOzekiRank(r.peakRank) ||
        Math.max(
          r.sanyakuBashoCount ?? 0,
          agg.filter((y) => SANYAKU.has(y.rank)).length * 6
        ) >= BRANCH_FOUNDING_SANYAKU_BASHO ||
        Math.max(
          r.makuuchiBashoCount ?? 0,
          agg.filter((y) => y.division === "makuuchi").length * 6
        ) >= BRANCH_FOUNDING_MAKUUCHI_BASHO
      );
    }
    const hist = r.careerHistory ?? [];
    // Lifetime counters are authoritative — careerHistory is the last 6
    // basho only, so window counts can never reach the 12/25 basho bars.
    const sanyaku = Math.max(
      r.sanyakuBashoCount ?? 0,
      hist.filter((h) => SANYAKU.has(h.rank)).length
    );
    const makuuchi = Math.max(
      r.makuuchiBashoCount ?? 0,
      hist.filter((h) => h.division === "makuuchi").length
    );
    return (
      isYokozunaOrOzekiRank(r.rank) ||
      (r.careerPeakRank != null && isYokozunaOrOzekiRank(r.careerPeakRank)) ||
      hist.some((h) => isYokozunaOrOzekiRank(h.rank)) ||
      sanyaku >= BRANCH_FOUNDING_SANYAKU_BASHO ||
      makuuchi >= BRANCH_FOUNDING_MAKUUCHI_BASHO
    );
  };
  const founderBarActive = active.filter(meetsCareerBar).length;
  const thisYearRetirees: AnyRetiree[] = [
    ...allRikishi.filter((r) => r.isRetired && r.retirementYear === world.year),
    ...(world.historicalRikishi
      ? Array.from(world.historicalRikishi.values()).filter(
          (r) => r.isRetired && r.retirementYear === world.year
        )
      : []),
  ];
  const founderBarRetirees = thisYearRetirees.filter(meetsCareerBar).length;
  const founderEligible = thisYearRetirees.filter(
    (r) => !("yearlyAggregates" in r) && evaluateFoundingEligibility(world, r).canFound
  ).length;
  // The founder bench — actives who clear every gate right now. evaluate*
  // only reads career counters + economics, so it evaluates actives fine.
  const founderEligibleActives = active.filter(
    (r) => evaluateFoundingEligibility(world, r).canFound
  ).length;
  // WS-14 — tourDays lands on schedule entries post-reform; absent ⇒ 0.
  const jungyoTourDays = getExhibitionBashoSchedule(world.year).reduce(
    (a, t) => a + ((t as { tourDays?: number }).tourDays ?? 0),
    0
  );

  // ── Development-spectrum tracking ─────────────────────────────────────
  // bustFraction/injuryDerailment live on potential (hidden). Realization is
  // CA ÷ PA×reachableFraction — the ceiling development actually chases.
  const profileCounts: Record<string, number> = {};
  let derailedActive = 0;
  let bustsActive = 0;
  const primeRealizations: number[] = [];
  const teenHeightRatios: number[] = [];
  for (const r of active) {
    const pot = r.potential;
    if (!pot) continue;
    profileCounts[pot.profile] = (profileCounts[pot.profile] ?? 0) + 1;
    if ((pot.injuryDerailment ?? 1) < 0.99) derailedActive++;
    if (pot.bustFraction != null) bustsActive++;
    const age = r.birthYear ? world.year - r.birthYear : (r.age ?? 0);
    const reach = reachableFraction(pot);
    if (age >= 24 && age <= 30 && reach > 0) {
      const reachPA = potentialAbility(r) * reach;
      if (reachPA > 0) primeRealizations.push(Math.min(1, currentAbility(r) / reachPA));
    }
    const cHeight = r.stats?.height;
    if (age <= 19 && pot.heightCm > 0 && cHeight != null && cHeight > 0) {
      teenHeightRatios.push(cHeight / pot.heightCm);
    }
  }

  // ── Pipeline / governance tracking ──────────────────────────────────────
  const divisionCounts: Record<string, number> = {};
  let banzukeGai = 0;
  let debutsThisYear = 0;
  const intakeHeights: number[] = [];
  const intakeWeights: number[] = [];
  for (const r of active) {
    divisionCounts[r.division] = (divisionCounts[r.division] ?? 0) + 1;
    if (r.isBanzukeGai) banzukeGai++;
    if (r.debutYear === world.year) {
      debutsThisYear++;
      if (r.stats?.height != null) intakeHeights.push(r.stats.height);
      if (r.stats?.weight != null) intakeWeights.push(r.stats.weight);
    }
  }
  const kadobanOzeki = Object.values(world.ozekiKadoban ?? {}).filter(
    (e) => e?.isKadoban === true
  ).length;
  const ichimonCounts: Record<string, number> = {};
  for (const h of heyas) {
    const clan = h.ichimon ?? "unaffiliated";
    ichimonCounts[clan] = (ichimonCounts[clan] ?? 0) + 1;
  }
  const jsaBoardElectedYear = world.jsaBoard?.electedYear ?? 0;

  // ── Kimarite & roster trajectory ────────────────────────────────────────
  const kimariteStats = { ...(world.allTimeKimariteStats ?? {}) };
  // Recount actives per heya — heya.rikishiIds can drift from reality (the
  // main loop's integrity pass exists because they do).
  const rosterByHeya: Record<string, number> = {};
  for (const h of heyas) rosterByHeya[h.id] = 0;
  for (const r of active) {
    if (r.heyaId && r.heyaId in rosterByHeya) rosterByHeya[r.heyaId]++;
  }
  const rosterSizes = Object.values(rosterByHeya).filter((n) => n > 0);

  return {
    year: world.year,
    rikishiTotal: allRikishi.length,
    rikishiActive: active.length,
    heyaCount: heyas.length,
    yokozunaCount: yokozuna.length,
    ozekiCount: ozeki.length,
    makuuchiCount: makuuchi.length,
    insolventHeyas: insolvent,
    negativeHeyas: insolvent.length,
    hofInductees: world.hallOfFame?.inductees?.length ?? 0,
    globalCupComplete: globalCups.length > 0,
    globalCupChampion: latestCup?.championName ?? null,
    avgFunds: heyas.length ? Math.round(totalFunds / heyas.length) : 0,
    minFunds,
    maxFunds,
    avgAge: Math.round(avgAge * 10) / 10,
    injuredCount: active.filter((r) => r.injured).length,
    retiredTotal:
      (world.historicalRikishi
        ? Array.from(world.historicalRikishi.values()).filter((r) => r.isRetired).length
        : 0) + allRikishi.filter((r) => r.isRetired).length,
    historicalTotal: world.historicalRikishi?.size ?? 0,
    foreignSlotViolations,
    foreignOccupancy: heyas.length ? foreignHeyas.size / heyas.length : 0,
    foreignTotal,
    foreignSekitori,
    foreignLower,
    mongolianShare: foreignTotal ? mongolian / foreignTotal : 0,
    grandfatheredForeignSlots,
    heyaInCustody,
    closedHeyaCount,
    closureReasons,
    branchedHeyaCount,
    founderBarActive,
    founderBarRetirees,
    founderEligible,
    founderEligibleActives,
    jungyoTourDays,
    profileCounts,
    derailedActive,
    bustsActive,
    medRealizationPrime: median(primeRealizations),
    teenHeightRatio: median(teenHeightRatios),
    divisionCounts,
    banzukeGai,
    debutsThisYear,
    kadobanOzeki,
    ichimonCounts,
    jsaBoardElectedYear,
    pendingDecisions: world.pendingDecisions?.length ?? 0,
    kimariteStats,
    rosterByHeya,
    rosterMedian: median(rosterSizes),
    intakeHeight: spread(intakeHeights),
    intakeWeight: spread(intakeWeights),
    rosterMin: rosterSizes.length ? Math.min(...rosterSizes) : 0,
    rosterMax: rosterSizes.length ? Math.max(...rosterSizes) : 0,
    errors: [...errors],
  };
}

// ── Checks ───────────────────────────────────────────────────────────────────

function checkAnomalies(snap: YearSnapshot, prev: YearSnapshot | null): string[] {
  const issues: string[] = [];

  if (snap.yokozunaCount === 0) issues.push("WARN: No yokozuna in division");
  if (snap.yokozunaCount > 4) issues.push(`WARN: ${snap.yokozunaCount} yokozuna (high)`);
  if (snap.ozekiCount === 0) issues.push("WARN: No ozeki in division");
  if (snap.makuuchiCount < 30)
    issues.push(`WARN: Makuuchi has only ${snap.makuuchiCount} rikishi (should be ~42)`);
  if (snap.makuuchiCount > 60)
    issues.push(`WARN: Makuuchi overflow: ${snap.makuuchiCount} rikishi`);
  if (snap.rikishiActive < 100)
    issues.push(`WARN: Active rikishi critically low: ${snap.rikishiActive}`);
  if (snap.negativeHeyas > 0)
    issues.push(`WARN: ${snap.negativeHeyas} heyas insolvent: ${snap.insolventHeyas.join(", ")}`);
  if (snap.foreignSlotViolations.length > 0)
    issues.push(`ERROR: foreign-slot limit violated: ${snap.foreignSlotViolations.join(", ")}`);
  // WS-1 — real occupancy ~69%; wide band flags both dead and saturated pipelines.
  if (snap.foreignOccupancy < 0.4)
    issues.push(
      `WARN: foreign occupancy ${(snap.foreignOccupancy * 100).toFixed(0)}% (target ~69%)`
    );
  if (snap.foreignOccupancy > 0.9)
    issues.push(
      `WARN: foreign occupancy ${(snap.foreignOccupancy * 100).toFixed(0)}% — pipeline saturated`
    );
  if (snap.heyaCount < 3) issues.push(`ERROR: Heya count collapsed to ${snap.heyaCount}`);
  if (snap.avgAge > 35) issues.push(`WARN: Avg rikishi age ${snap.avgAge} — roster aging out`);
  if (snap.avgAge < 18) issues.push(`WARN: Avg age ${snap.avgAge} — suspiciously young`);
  // Pipeline funnel — the intake divisions should never drain to zero.
  if ((snap.divisionCounts.jonokuchi ?? 0) < 40)
    issues.push(`WARN: jonokuchi thin (${snap.divisionCounts.jonokuchi ?? 0}) — intake stalling`);
  if ((snap.divisionCounts.juryo ?? 0) > 40)
    issues.push(`WARN: juryo bloated (${snap.divisionCounts.juryo}) — division quota broken`);
  if (snap.banzukeGai > 6)
    issues.push(`WARN: ${snap.banzukeGai} rikishi off-banzuke — banzuke-gai accumulating`);
  if (snap.pendingDecisions > 5)
    issues.push(`WARN: ${snap.pendingDecisions} unresolved decisions — backlog treadmill`);
  // A clan dying out means defections/closures erased an ichimon line.
  for (const [clan, n] of Object.entries(snap.ichimonCounts))
    if (n === 0) issues.push(`WARN: ichimon ${clan} has no active heyas`);
  // A stable with zero actives is one retirement from folding.
  if (snap.rosterMin === 0 && snap.heyaCount > 0)
    issues.push("WARN: a heya has 0 active rikishi — collapse imminent");

  if (prev) {
    const rikishiDelta = snap.rikishiActive - prev.rikishiActive;
    if (rikishiDelta < -30)
      issues.push(`WARN: Active rikishi dropped ${Math.abs(rikishiDelta)} in one year`);
    if (snap.heyaCount < prev.heyaCount - 2)
      issues.push(`WARN: ${prev.heyaCount - snap.heyaCount} heyas merged/dissolved this year`);
  }

  return issues;
}

// ── Lifecycle & development audit ────────────────────────────────────────────
// One end-of-run pass over every career the sim produced. Verifies the
// development-spectrum work: prodigy/late-bloomer arcs, busts, injury
// derailment, physical maturation, and the founding-eligibility pipeline.

const SANYAKU_RANKS = new Set(["yokozuna", "ozeki", "sekiwake", "komusubi"]);
const SEKITORI_DIVS = new Set(["makuuchi", "juryo"]);
const PROFILES = ["prodigy", "standard", "late_bloomer", "journeyman", "early_peaker"] as const;

function lifecycleAudit(world: WorldState, snaps: YearSnapshot[]): void {
  const all = Array.from(world.rikishi.values());
  const active = all.filter((r) => !r.isRetired);
  const retiredFull = all.filter((r) => r.isRetired);
  const summaries = world.historicalRikishi
    ? Array.from(world.historicalRikishi.values()).filter((r) => r.isRetired)
    : [];
  const Y = world.year;

  const ageOf = (r: { birthYear?: number; age?: number }, at = Y) =>
    r.birthYear ? at - r.birthYear : (r.age ?? 0);
  const peakDiv = (r: Rikishi) => r.careerPeakDivision ?? r.division;
  const peakCA = (r: Rikishi) => r.careerPeakCA ?? currentAbility(r);
  const reachPA = (r: Rikishi) =>
    r.potential ? potentialAbility(r) * reachableFraction(r.potential) : 0;
  /** Realization vs the ceiling development actually chased (post-bust/derail). */
  const reachRealization = (r: Rikishi) => {
    const pa = reachPA(r);
    return pa > 0 ? Math.min(1, peakCA(r) / pa) : 0;
  };
  /** Realization vs the fantasy PA scouts saw — busts show up here. */
  const rawRealization = (r: Rikishi) => {
    const pa = r.potential ? potentialAbility(r) : 0;
    return pa > 0 ? Math.min(1, peakCA(r) / pa) : 0;
  };

  console.log(`\n${"═".repeat(70)}`);
  console.log("  LIFECYCLE & DEVELOPMENT AUDIT");
  console.log(`${"═".repeat(70)}`);

  // ── 1. Career outcomes — every retirement incl. archived summaries ──────
  // Full Rikishi and RetiredRikishiSummary use different field names for the
  // same concepts (careerPeak* vs peak*); narrow on the isSummary marker.
  const isSummary = (r: Rikishi | RetiredRikishiSummary): r is RetiredRikishiSummary =>
    (r as RetiredRikishiSummary).isSummary === true;
  const retiredYearOf = (r: Rikishi | RetiredRikishiSummary): number =>
    isSummary(r) ? r.retirementYear : (r.retirementYear ?? Y);
  const careerLen = (r: Rikishi | RetiredRikishiSummary): number =>
    r.debutYear ? Math.max(1, retiredYearOf(r) - r.debutYear)
      : isSummary(r) ? r.yearlyAggregates.length : r.careerHistory.length;
  const allRetired: (Rikishi | RetiredRikishiSummary)[] = [...retiredFull, ...summaries];
  const peakDivOf = (r: Rikishi | RetiredRikishiSummary) =>
    isSummary(r) ? r.peakDivision : peakDiv(r);
  const peakRankOf = (r: Rikishi | RetiredRikishiSummary) =>
    isSummary(r) ? r.peakRank : (r.careerPeakRank ?? r.rank);
  const lens = allRetired.map(careerLen).filter((n) => n > 0);
  const retireAges = allRetired
    .map((r) => retiredYearOf(r) - r.birthYear)
    .filter((n) => n > 0 && n < 60);
  const sekitori = allRetired.filter((r) => SEKITORI_DIVS.has(peakDivOf(r)));
  const makuuchi = allRetired.filter((r) => peakDivOf(r) === "makuuchi");
  const sanyaku = allRetired.filter((r) => SANYAKU_RANKS.has(peakRankOf(r)));
  const yokozunaEver = allRetired.filter((r) => peakRankOf(r) === "yokozuna");

  const realizations: number[] = [];
  for (const r of retiredFull) {
    if (!r.potential) continue;
    const pa = potentialAbility(r) * reachableFraction(r.potential);
    if (pa > 0) realizations.push(Math.min(1, peakCA(r) / pa));
  }
  for (const s of summaries) {
    if (!isSummary(s)) continue;
    if (s.peakAbility != null && s.potentialAbility != null && s.potentialAbility > 0) {
      realizations.push(Math.min(1, s.peakAbility / s.potentialAbility));
    }
  }
  const bucket = (lo: number, hi: number) =>
    realizations.filter((x) => x >= lo && x < hi).length;

  console.log(`\nCareer outcomes (${allRetired.length} careers):`);
  console.log(
    `  Median career length: ${median(lens).toFixed(0)}y | median retire age: ${median(retireAges).toFixed(0)}`
  );
  console.log(
    `  Sekitori rate: ${sekitori.length}/${allRetired.length} (${((sekitori.length / (allRetired.length || 1)) * 100).toFixed(1)}% — real ~5-11%) | ` +
      `makuuchi: ${((makuuchi.length / (allRetired.length || 1)) * 100).toFixed(1)}% | ` +
      `sanyaku: ${((sanyaku.length / (allRetired.length || 1)) * 100).toFixed(1)}% | ` +
      `ever-yokozuna: ${yokozunaEver.length}`
  );
  console.log(
    `  Realization at career end (peak CA ÷ reachable PA): med=${median(realizations).toFixed(2)} | ` +
      `<50%:${bucket(0, 0.5)} 50-75%:${bucket(0.5, 0.75)} 75-90%:${bucket(0.75, 0.9)} ≥90%:${bucket(0.9, 2)}`
  );

  // ── 2. Development-profile arcs (full rikishi with potential) ───────────
  const withPot = all.filter(
    (r): r is Rikishi & { potential: NonNullable<Rikishi["potential"]> } => r.potential != null
  );
  console.log(`\nDevelopment profiles (${withPot.length} tracked careers — active + un-pruned):`);
  console.log(
    `  ${"profile".padEnd(13)} ${"n".padStart(4)} ${"sekitori%".padStart(10)} ${"medReal".padStart(8)} ${"peakAge".padStart(8)} ${"debutAge".padStart(9)}`
  );
  for (const p of PROFILES) {
    const cohort = withPot.filter((r) => r.potential.profile === p);
    if (!cohort.length) continue;
    const sek = cohort.filter((r) => SEKITORI_DIVS.has(peakDiv(r)));
    const peakAges = cohort.flatMap((r) =>
      r.careerPeakYear != null ? [r.careerPeakYear - (r.birthYear ?? Y - 25)] : []
    );
    const debutAges = cohort.flatMap((r) =>
      r.debutYear != null && r.birthYear != null ? [r.debutYear - r.birthYear] : []
    );
    console.log(
      `  ${p.padEnd(13)} ${String(cohort.length).padStart(4)} ` +
        `${((sek.length / cohort.length) * 100).toFixed(0).padStart(9)}% ` +
        `${median(cohort.map(reachRealization)).toFixed(2).padStart(8)} ` +
        `${(peakAges.length ? median(peakAges).toFixed(0) : "—").padStart(8)} ` +
        `${(debutAges.length ? median(debutAges).toFixed(0) : "—").padStart(9)}`
    );
  }

  // ── 3. Busts — elite-PA recruits who never developed ────────────────────
  const ELITE_PA = 140;
  const elite = withPot.filter((r) => potentialAbility(r) >= ELITE_PA);
  const busts = withPot.filter((r) => r.potential.bustFraction != null);
  const eliteBusts = elite.filter((r) => r.potential.bustFraction != null);
  console.log(`\nBust audit (elite = PA ≥ ${ELITE_PA}):`);
  console.log(
    `  Elite-PA tracked: ${elite.length} | busts: ${busts.length} total, ${eliteBusts.length} elite ` +
      `(rate ${((eliteBusts.length / (elite.length || 1)) * 100).toFixed(0)}% — design ~12%)`
  );
  if (busts.length) {
    const eliteNonBust = elite.filter((r) => r.potential.bustFraction == null);
    const bustFractions = busts.flatMap((r) =>
      r.potential.bustFraction != null ? [r.potential.bustFraction] : []
    );
    console.log(
      `  Raw-PA realization (fantasy ceiling): busts med=${median(busts.map(rawRealization)).toFixed(2)} ` +
        `vs elite non-busts med=${median(eliteNonBust.map(rawRealization)).toFixed(2)} — ` +
        `busts should cluster ~0.4-0.6`
    );
    console.log(
      `  Bust fractions: med=${median(bustFractions).toFixed(2)} | ` +
        `elite-bust sekitori rate: ${((eliteBusts.filter((r) => SEKITORI_DIVS.has(peakDiv(r))).length / (eliteBusts.length || 1)) * 100).toFixed(0)}%`
    );
  }

  // ── 4. Injury derailment — serious injuries shaving ceilings ────────────
  const derailed = withPot.filter((r) => (r.potential.injuryDerailment ?? 1) < 0.99);
  if (derailed.length) {
    const severe = derailed.filter((r) => (r.potential.injuryDerailment ?? 1) < 0.85);
    const notDerailed = withPot.filter((r) => (r.potential.injuryDerailment ?? 1) >= 0.99);
    const derailFactors = derailed.flatMap((r) =>
      r.potential.injuryDerailment != null ? [r.potential.injuryDerailment] : []
    );
    console.log(`\nDerailment audit:`);
    console.log(
      `  Derailed: ${derailed.length}/${withPot.length} (${((derailed.length / withPot.length) * 100).toFixed(1)}%) | ` +
        `severe (<0.85): ${severe.length} | med factor: ${median(derailFactors).toFixed(2)}`
    );
    console.log(
      `  Raw-PA realization: derailed med=${median(derailed.map(rawRealization)).toFixed(2)} ` +
        `vs healthy med=${median(notDerailed.map(rawRealization)).toFixed(2)}`
    );
  }

  // ── 5. Physical maturation — height/weight fill toward potential ────────
  const bands: [string, number, number][] = [
    ["≤17", 0, 17],
    ["18-19", 18, 19],
    ["20-21", 20, 21],
    ["22-23", 22, 23],
    ["24+", 24, 99],
  ];
  console.log(`\nMaturation (actives — ratio of current ÷ potential):`);
  console.log(`  ${"age".padEnd(6)} ${"n".padStart(4)} ${"height".padStart(8)} ${"weight".padStart(8)}`);
  for (const [label, lo, hi] of bands) {
    const cohort = active.filter((r) => {
      const a = ageOf(r);
      return a >= lo && a <= hi && r.potential;
    });
    const hRatios = cohort.flatMap((r) => {
      const h = r.stats?.height;
      const p = r.potential?.heightCm;
      return p != null && p > 0 && h != null && h > 0 ? [h / p] : [];
    });
    const wRatios = cohort.flatMap((r) => {
      const w = r.stats?.weight;
      const p = r.potential?.weightKg;
      return p != null && p > 0 && w != null && w > 0 ? [w / p] : [];
    });
    console.log(
      `  ${label.padEnd(6)} ${String(cohort.length).padStart(4)} ` +
        `${(hRatios.length ? median(hRatios).toFixed(2) : "—").padStart(8)} ` +
        `${(wRatios.length ? median(wRatios).toFixed(2) : "—").padStart(8)}`
    );
  }
  // Late bloomers should lag prodigies on the height curve into their 20s.
  const matAt = (p: string, lo: number, hi: number) =>
    active.flatMap((r) => {
      const a = ageOf(r);
      const h = r.stats?.height;
      const ph = r.potential?.heightCm;
      return r.potential?.profile === p && a >= lo && a <= hi && ph != null && ph > 0 && h != null && h > 0
        ? [h / ph]
        : [];
    });
  const prod20 = matAt("prodigy", 20, 23);
  const late20 = matAt("late_bloomer", 20, 23);
  if (prod20.length && late20.length) {
    console.log(
      `  Height ratio @20-23: prodigy=${median(prod20).toFixed(2)} vs late_bloomer=${median(late20).toFixed(2)} ` +
        `(late bloomers should trail — they keep growing longer)`
    );
  }
  // The differentiation lives at 17-19 — prodigies are done at ~16-18, late
  // bloomers keep filling toward a ~21 peak (peakAgeOffset +2 on a 4y rise).
  const prodTeen = matAt("prodigy", 17, 19);
  const lateTeen = matAt("late_bloomer", 17, 19);
  if (prodTeen.length && lateTeen.length) {
    console.log(
      `  Height ratio @17-19: prodigy=${median(prodTeen).toFixed(2)} vs late_bloomer=${median(lateTeen).toFixed(2)} ` +
        `(differentiation window — late bloomers should read <1.0)`
    );
  }

  // Intake-physique diversity — pooled across every debut cohort: the recruit
  // pool should hold a healthy σ (not a clone army), roughly real-shaped
  // (real intake: ~178-186cm / ~110-140kg teens).
  const cohorts = snaps.filter((s) => s.intakeHeight && s.intakeWeight);
  if (cohorts.length) {
    const fmt = (f: (s: (typeof cohorts)[number]) => number | null | undefined) => {
      const v = cohorts.map(f).filter((x): x is number => x != null);
      return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : "—";
    };
    console.log(
      `  Intake physiques (${cohorts.length} debut cohorts): ` +
        `h=${fmt((s) => s.intakeHeight?.mean)}±${fmt((s) => s.intakeHeight?.std)}cm ` +
        `[${fmt((s) => s.intakeHeight?.min)}-${fmt((s) => s.intakeHeight?.max)}] | ` +
        `w=${fmt((s) => s.intakeWeight?.mean)}±${fmt((s) => s.intakeWeight?.std)}kg ` +
        `[${fmt((s) => s.intakeWeight?.min)}-${fmt((s) => s.intakeWeight?.max)}]`
    );
  }

  // ── 6. Heya founding & survival + founder-eligibility funnel ────────────
  const heyas = Array.from(world.heyas.values());
  const branches = heyas.filter((h) => h.branchedFromHeyaId != null);
  const closed = world.closedHeyas ? Array.from(world.closedHeyas.values()) : [];
  const closedBranches = closed.filter((h) => h.branchedFromHeyaId != null);
  const earlyDeaths = closedBranches.filter(
    (h) => h.foundedYear != null && h.closedAtYear - h.foundedYear <= 3
  );
  // Founder-eligibility funnel across the whole sim (per-year tallies):
  // career-bar retirees → fully-eligible retirees → actual foundings.
  const sumBar = snaps.reduce((a, s) => a + s.founderBarRetirees, 0);
  const sumElig = snaps.reduce((a, s) => a + s.founderEligible, 0);
  const foundings = branches.length + closedBranches.length;
  // The live bench — actives eligible right now, best odds first.
  const bench = active
    .map((r) => ({ r, e: evaluateFoundingEligibility(world, r) }))
    .filter((x) => x.e.canFound)
    .sort((a, b) => b.e.effectiveChance - a.e.effectiveChance);
  console.log(`\nHeya founding & survival:`);
  console.log(
    `  Active: ${heyas.length} (branches: ${branches.length}) | closed: ${closed.length} ` +
      `(branches: ${closedBranches.length}, died ≤3y after founding: ${earlyDeaths.length})`
  );
  console.log(
    `  Founder funnel (25y): ${sumBar} career-bar retirees → ${sumElig} fully eligible ` +
      `→ ${foundings} foundings | eligible active bench now: ${bench.length}`
  );
  for (const { r, e } of bench.slice(0, 6)) {
    const src = e.jsaBacked ? "JSA" : e.parentSponsors ? "parent" : "self";
    console.log(
      `    ${r.shikona ?? r.id} (${r.rank}) — chance ${e.effectiveChance.toFixed(2)} via ${src}`
    );
  }
  // Deshi-follow: founders seed their branch with juniors — a young branch
  // at roster ~1 means the seeded-deshi path failed.
  const youngBranches = branches.filter(
    (h) => h.foundedYear != null && Y - h.foundedYear <= 5
  );
  if (youngBranches.length) {
    const rosters = youngBranches.map((h) => h.rikishiIds?.length ?? 0);
    console.log(
      `  Branch deshi-follow (founded ≤5y ago): med roster ${median(rosters).toFixed(0)} across ` +
        `${youngBranches.length} branches [${rosters.join(",")}]`
    );
  }
  // JSA board cadence — biennial elections should fire ~12 times in 25y.
  const electionYears = new Set(snaps.map((s) => s.jsaBoardElectedYear).filter((y) => y > 0));
  console.log(
    `  JSA board: ${electionYears.size} distinct elections seated over ${snaps.length}y ` +
      `(biennial ≈ ${Math.floor(snaps.length / 2)} expected) | chair clan seats: ` +
      `${Object.entries(world.jsaBoard?.clanSeats ?? {}).map(([c, n]) => `${c.slice(0, 3)}:${n}`).join(" ") || "—"}`
  );

  // ── 6b. Career economics — do careers pay like real sumo? ───────────────
  const earnings = allRetired.flatMap((r) => {
    const e = "yearlyAggregates" in r ? r.totalEarnings : (r.economics?.totalEarnings ?? 0);
    return e > 0 ? [e / 1e6] : [];
  });
  if (earnings.length) {
    console.log(
      `  Career earnings (¥M): med=${median(earnings).toFixed(0)} ` +
        `p90=${[...earnings].sort((a, b) => a - b)[Math.floor(earnings.length * 0.9)]?.toFixed(0) ?? "—"} ` +
        `max=${Math.max(...earnings).toFixed(0)}`
    );
  }
  if (closedBranches.length) {
    const spans = closedBranches.flatMap((h) =>
      h.foundedYear != null ? [h.closedAtYear - h.foundedYear] : []
    );
    if (spans.length) console.log(`  Branch lifespans (closed): med=${median(spans).toFixed(0)}y`);
  }

  // ── 7. Yokozuna lineage — who ever held the rope ────────────────────────
  // Scan the full archive (summaries included) — pruned careers only exist
  // there, so a retiredFull-only scan undercounts.
  const yokozunaEverAll = [...allRetired, ...active].filter((r) =>
    isSummary(r) ? r.peakRank === "yokozuna" : r.careerPeakRank === "yokozuna" || r.rank === "yokozuna"
  );
  console.log(`\nYokozuna lineage: ${yokozunaEverAll.length} rikishi ever held the rank`);
  for (const r of yokozunaEverAll.slice(0, 8)) {
    if (isSummary(r)) {
      console.log(
        `    ${r.shikona ?? r.id} — peakCA ${r.peakAbility?.toFixed(0) ?? "?"} | retired | peak Y${r.peakRankYear}`
      );
      continue;
    }
    const yrs = r.careerPeakYear != null ? `peak Y${r.careerPeakYear}` : "—";
    console.log(
      `    ${r.shikona ?? r.id} — CA ${currentAbility(r).toFixed(0)} | ${r.isRetired ? "retired" : "active"} | ${yrs}`
    );
  }

  // ── 8. Kimarite drift — style evolution over the sim ────────────────────
  const first = snaps.at(0);
  const lastSnap = snaps.at(-1);
  if (first && lastSnap && lastSnap !== first) {
    const deltas = Object.keys(lastSnap.kimariteStats).flatMap((id) => {
      const total = (lastSnap.kimariteStats[id] ?? 0) - (first.kimariteStats[id] ?? 0);
      return total > 0 ? [{ id, total }] : [];
    });
    const totalWins = deltas.reduce((a, k) => a + k.total, 0);
    const top = [...deltas].sort((a, b) => b.total - a.total).slice(0, 8);
    console.log(`\nKimarite drift (${first.year}→${lastSnap.year}, ${totalWins} wins):`);
    for (const k of top) {
      const share = ((k.total / (totalWins || 1)) * 100).toFixed(1);
      const firstShare =
        (((first.kimariteStats[k.id] ?? 0) /
          (Object.values(first.kimariteStats).reduce((a, n) => a + n, 0) || 1)) *
          100) || 0;
      console.log(
        `    ${k.id.padEnd(14)} ${share}% of wins (was ${firstShare.toFixed(1)}% at start)`
      );
    }
    const variety = deltas.length;
    console.log(`  Techniques used as winning move: ${variety} distinct`);
  }

  // ── 9. Roster rise & fall — stable trajectories ─────────────────────────
  if (first && lastSnap && lastSnap !== first) {
    const heyaById = new Map(heyas.map((h) => [h.id, h]));
    const rows = Object.entries(lastSnap.rosterByHeya).flatMap(([id, n]) => {
      const start = first.rosterByHeya[id];
      return start != null ? [{ id, start, end: n, delta: n - start }] : [];
    });
    const risers = [...rows].sort((a, b) => b.delta - a.delta).slice(0, 4);
    const fallers = [...rows].sort((a, b) => a.delta - b.delta).slice(0, 4);
    console.log(`\nRoster rise & fall (heya present at both ends):`);
    const name = (id: string) => heyaById.get(id)?.name ?? id;
    console.log(
      `    Risers: ${risers.map((r) => `${name(r.id)} ${r.start}→${r.end}`).join(", ") || "—"}`
    );
    console.log(
      `    Fallers: ${fallers.map((r) => `${name(r.id)} ${r.start}→${r.end}`).join(", ") || "—"}`
    );
    const empties = Object.entries(lastSnap.rosterByHeya).filter(([, n]) => n === 0);
    if (empties.length)
      console.log(`    Empty stables at end: ${empties.map(([id]) => name(id)).join(", ")}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(70)}`);
console.log(`  Basho — 25-Year NPC Headless Diagnostic`);
console.log(`  Seed: ${SEED}  |  Target: ${YEARS} years (${YEARS * 6} basho)`);
console.log(`${"═".repeat(70)}\n`);

const startMs = Date.now();
const yearSnapshots: YearSnapshot[] = [];

// Intercept console.error to capture engine errors during sim
const origError = console.error.bind(console);
const capturedErrors: string[] = [];
console.error = (...args: unknown[]) => {
  const msg = args.map(String).join(" ");
  capturedErrors.push(msg);
  origError(...args);
};

// Preload narrative domains — BardEngine.resolve() warns and returns empty
// text when domain JSON hasn't been loaded (headless scripts never bootstrap).
const { BardEngine } = await import("@/engine/bard/BardEngine");
await BardEngine.loadDomains();

let world = generateInitialWorld(SEED);
world = { ...world, playerHeyaId: undefined };

// Roster integrity clean-up: sync heya.rikishiIds with reality
const nextHeyas = new Map(world.heyas);
for (const [heyaId, heya] of nextHeyas) {
  const actualRikishiIds = Array.from(world.rikishi.values())
    .filter((r) => r.heyaId === heyaId && !r.isRetired)
    .map((r) => r.id);
  nextHeyas.set(heyaId, { ...heya, rikishiIds: actualRikishiIds });
}
world = { ...world, heyas: nextHeyas };

console.log(
  `World initialised: ${world.rikishi.size} rikishi, ${world.heyas.size} heyas, year ${world.year}\n`
);

let currentWorld = world;
let totalErrors = 0;
let weeklyTickVerified = false;
// runAutoSim's championCounts/yokozunaVacancy are per-call — accumulate
// across yearly runs or the printed numbers only describe the last year.
const cumChampions = new Map<string, { shikona: string; yusho: number }>();
let cumYokozunaVacantBasho = 0;

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
    for (const c of result.chronicle.topChampions) {
      const prev = cumChampions.get(c.rikishiId);
      cumChampions.set(c.rikishiId, {
        shikona: c.shikona,
        yusho: (prev?.yusho ?? 0) + c.yushoCount,
      });
    }
    cumYokozunaVacantBasho += result.tuningMetrics?.yokozunaVacantBashoCount ?? 0;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    yearErrors.push(`CRASH: ${msg}`);
    totalErrors++;
    console.error(`[Year ${currentWorld.year}] Sim crashed:`, msg);
    break;
  }

  yearErrors.push(...capturedErrors.map((e) => e.slice(0, 120)));
  totalErrors += yearErrors.length;

  const snap = snapshot(currentWorld, yearErrors);
  const prev = yearSnapshots.at(-1) ?? null;
  const anomalies = checkAnomalies(snap, prev);
  yearSnapshots.push(snap);

  const maxFunds = Math.max(...Array.from(currentWorld.heyas.values()).map((h) => h.funds ?? 0));
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
  // Realism-calibration line (JSA plan): foreign occupancy/mix + closures + jungyo.
  console.log(
    `    calib | F-occ=${(snap.foreignOccupancy * 100).toFixed(0)}% ` +
      `F=${snap.foreignTotal}(sek=${snap.foreignSekitori}/low=${snap.foreignLower}) ` +
      `MN=${(snap.mongolianShare * 100).toFixed(0)}% gf+${snap.grandfatheredForeignSlots} ` +
      `custody=${snap.heyaInCustody} closed=${snap.closedHeyaCount} ` +
      `[${
        Object.entries(snap.closureReasons)
          .sort((a, b) => b[1] - a[1])
          .map(([r, n]) => `${r}:${n}`)
          .join("/") || "—"
      }] ` +
      `founded=${snap.branchedHeyaCount} ` +
      `fcand=${snap.founderBarActive}/${snap.founderBarRetirees} felig=${snap.founderEligible}+${snap.founderEligibleActives}act ` +
      `jungyo=${snap.jungyoTourDays}d`
  );
  // Dev-spectrum line: profile mix + derailment/bust counts + maturation.
  const prof = ["prodigy", "standard", "late_bloomer", "journeyman", "early_peaker"]
    .map((p) => `${p.slice(0, 2)}=${snap.profileCounts[p] ?? 0}`)
    .join(" ");
  console.log(
    `    dev | ${prof} | derailed=${snap.derailedActive} busts=${snap.bustsActive} | ` +
      `real@prime=${snap.medRealizationPrime.toFixed(2)} teenHt=${snap.teenHeightRatio.toFixed(2)}`
  );
  // Funnel line — division stack, off-banzuke, intake, governance.
  const div = ["makuuchi", "juryo", "makushita", "sandanme", "jonidan", "jonokuchi"]
    .map((d, i) => `${["mk", "ju", "ms", "sd", "jd", "jk"][i]}=${snap.divisionCounts[d] ?? 0}`)
    .join(" ");
  const clans = Object.entries(snap.ichimonCounts)
    .map(([c, n]) => `${c.slice(0, 3)}:${n}`)
    .join(" ");
  // This year's kimarite leaders — diff the cumulative counters vs last year.
  const kimDelta = Object.entries(snap.kimariteStats)
    .map(([id, n]) => ({ id, n: n - (prev?.kimariteStats[id] ?? 0) }))
    .filter((k) => k.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 3)
    .map((k) => `${k.id.slice(0, 6)}:${k.n}`)
    .join(" ");
  console.log(
    `    fun | ${div} gai=${snap.banzukeGai} | debuts=${snap.debutsThisYear} ` +
      `kadoban=${snap.kadobanOzeki} pend=${snap.pendingDecisions} | ` +
      `board@${snap.jsaBoardElectedYear || "—"} clans ${clans} | ` +
      `kim ${kimDelta || "—"} | ros=${snap.rosterMedian}/${snap.rosterMin}-${snap.rosterMax}`
  );
  const ih = snap.intakeHeight;
  const iw = snap.intakeWeight;
  console.log(
    `    in  | debut physiques h=${ih ? `${ih.mean}±${ih.std}cm [${ih.min}-${ih.max}]` : "—"} ` +
      `w=${iw ? `${iw.mean}±${iw.std}kg [${iw.min}-${iw.max}]` : "—"}`
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
  console.log(
    `  Active rikishi: ${last.rikishiActive} (${last.historicalTotal} historical/retired)`
  );
  console.log(`  Heyas: ${last.heyaCount}`);
  console.log(
    `  Yokozuna: ${last.yokozunaCount} | Ozeki: ${last.ozekiCount} | Makuuchi: ${last.makuuchiCount}`
  );
  console.log(`  HoF inductees: ${last.hofInductees}`);
  console.log(`  Avg age: ${last.avgAge}`);
  console.log(
    `  Funds: avg=¥${(last.avgFunds / 1_000_000).toFixed(1)}M min=¥${(last.minFunds / 1_000_000).toFixed(1)}M max=¥${(last.maxFunds / 1_000_000).toFixed(1)}M`
  );
  console.log(`  Global Cups held: ${currentWorld.chronicle?.globalCups?.length ?? 0}`);
}

console.log(`\nGlobal Cup history:`);
const cups = currentWorld.chronicle?.globalCups ?? [];
if (cups.length === 0) {
  console.log("  ⚠ NO GLOBAL CUPS RECORDED — tournament not firing");
} else {
  cups.forEach((c) => console.log(`  Year ${c.year}: ${c.championName} (${c.championId})`));
}

// Identify recurring issues
const allAnomalyYears = yearSnapshots
  .filter((s) => checkAnomalies(s, null).length > 0 || s.errors.length > 0)
  .map((s) => s.year);

console.log(`\nTotal engine errors captured: ${totalErrors}`);
console.log(
  `Years with anomalies: ${allAnomalyYears.length > 0 ? allAnomalyYears.join(", ") : "none"}`
);

// Rikishi drift analysis
if (yearSnapshots.length > 1) {
  const first = yearSnapshots[0];
  const final = yearSnapshots.at(-1) ?? yearSnapshots[0];
  console.log(
    `\nRikishi drift: ${first.rikishiActive} → ${final.rikishiActive} active over ${YEARS} years`
  );
  console.log(`Heya drift: ${first.heyaCount} → ${final.heyaCount}`);
}

console.log(`\nWeekly tick verified: ${weeklyTickVerified ? "✓ YES" : "✗ NO — income never ran"}`);

// Lifecycle & development audit — one pass over the final world before the
// extra tuning year mutates anything.
lifecycleAudit(currentWorld, yearSnapshots);

// ── Tuning Summary (from last year's result) ────────────────────────────────

// Re-run final year to get tuning metrics (minimal overhead)
const finalResult = runAutoSim(currentWorld, {
  duration: { type: "years", count: 1 },
  stopConditions: [],
  verbosity: "minimal",
  delegationPolicy: "balanced",
  observerMode: true,
});

const metrics = finalResult.tuningMetrics;
if (metrics) {
  console.log("\n--- Tuning Summary ---");
  console.log("Stat Averages (Active Rikishi):");
  console.log(`  Power:     ${metrics.statAverages.power.toFixed(2)}`);
  console.log(`  Speed:     ${metrics.statAverages.speed.toFixed(2)}`);
  console.log(`  Technique: ${metrics.statAverages.technique.toFixed(2)}`);
  console.log(`  Stamina:   ${metrics.statAverages.stamina.toFixed(2)}`);

  console.log("\nRetirement Stats:");
  console.log(`  Avg Retirement Age: ${metrics.averageRetirementAge.toFixed(1)}`);

  console.log("\nEconomic Health:");
  console.log(`  Avg Stable Funds: ${metrics.stableWealth.mean.toLocaleString()} kesho`);
  console.log(`  Bankrupt Stables: ${metrics.stableWealth.bankruptCount}`);

  console.log("\nRank Distribution:");
  Object.entries(metrics.rankDistribution).forEach(([rank, count]) => {
    console.log(`  ${rank.padEnd(12)}: ${count}`);
  });

  console.log("\nArchetype Distribution (Drift Check):");
  Object.entries(metrics.archetypeDistribution).forEach(([arch, count]) => {
    console.log(`  ${arch.padEnd(12)}: ${count}`);
  });

  console.log("\nTop 10 Kimarite (Combat Variety):");
  metrics.topKimarite.forEach((k, i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. ${k.id.padEnd(15)}: ${k.count}`);
  });

  console.log("\nOyakata Ecosystem:");
  console.log(`  Total Oyakata:          ${metrics.oyakataMetrics.totalOyakata}`);
  console.log(`  Retired Rikishi -> Oya: ${metrics.oyakataMetrics.newOyakataFromRikishi}`);
  console.log(`  Oyakata Promotion Rate: ${metrics.oyakataMetrics.promotionRate.toFixed(1)}%`);
  console.log(`  Myoseki Saturation:     ${metrics.oyakataMetrics.myosekiSaturation.toFixed(1)}%`);

  console.log("\nHistorical Prestige & Parity:");
  console.log(
    `  Bashos without Yokozuna: ${cumYokozunaVacantBasho} cumulative (final-year run: ${metrics.yokozunaVacantBashoCount})`
  );
  console.log(
    `  Unique Basho Winners:    ${cumChampions.size} cumulative (final-year run: ${metrics.uniqueWinnerCount})`
  );
  const topCum = [...cumChampions.values()].sort((a, b) => b.yusho - a.yusho).slice(0, 5);
  if (topCum.length) {
    console.log(`  Top champions (25y):     ${topCum.map((c) => `${c.shikona} ${c.yusho}`).join(" | ")}`);
  }

  console.log("\nBeya Dominance (Top 5 Stables):");
  metrics.beyaDominance.forEach((b, i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. ${b.name.padEnd(20)}: ${b.yusho} Yusho`);
  });

  console.log("\nEntropy & Drift Audit:");
  console.log(`  Max World Stat:         ${metrics.entropyAudit.maxStat.toFixed(1)}`);
  console.log(`  Average Rikishi Age:    ${metrics.entropyAudit.avgAge.toFixed(1)}`);
  console.log(`  Average Oyakata Age:    ${metrics.entropyAudit.oyakataAvgAge.toFixed(1)}`);
  console.log(`  Active Injury Rate:     ${metrics.entropyAudit.injuryRate.toFixed(1)}%`);
  console.log(`  Wealth Gini:            ${metrics.entropyAudit.wealthGini.toFixed(3)}`);

  // Save detailed metrics to a file
  const outputPath = join(process.cwd(), "simulation-results.json");
  const report = {
    seed: SEED,
    years: YEARS,
    yearSnapshots,
    chronicle: finalResult.chronicle,
    tuningMetrics: metrics,
    cumulativeMetrics: {
      uniqueBashoWinners: cumChampions.size,
      yokozunaVacantBasho: cumYokozunaVacantBasho,
      champions: Object.fromEntries(cumChampions),
    },
  };
  writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\nDetailed report saved to: ${outputPath}`);
}

console.log(`\n${"═".repeat(70)}\n`);
