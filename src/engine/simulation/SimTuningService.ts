import type { WorldState } from "../types/world";
import { DEFAULT_START_YEAR } from "../../constants/engine/calendar";
import type { Rikishi } from "../types/rikishi";
import type { RetiredRikishiSummary } from "../types/history";
import type { Oyakata } from "../types/oyakata";
import { EntityCollection } from "../core/EntityCollection";
import { getRikishi } from "../queries";
import { finiteOr } from "../utils/math";

export interface TuningMetrics {
  statAverages: {
    power: number;
    speed: number;
    technique: number;
    stamina: number;
  };
  ageDistribution: Record<number, number>;
  retirementAges: number[];
  averageRetirementAge: number;
  stableWealth: {
    mean: number;
    min: number;
    max: number;
    bankruptCount: number;
  };
  rankDistribution: Record<string, number>;
  archetypeDistribution: Record<string, number>;
  topKimarite: Array<{ id: string; count: number }>;
  oyakataMetrics: {
    totalOyakata: number;
    newOyakataFromRikishi: number;
    myosekiSaturation: number;
    promotionRate: number; // % of retired sekitori who become Oyakata
  };
  yokozunaVacantBashoCount: number;
  uniqueWinnerCount: number;
  beyaDominance: Array<{ name: string; yusho: number }>;
  entropyAudit: {
    maxStat: number; // Detecting power creep
    avgAge: number;
    oyakataAvgAge: number;
    injuryRate: number; // % of active rikishi injured
    archetypeWinRates: Record<string, { wins: number; total: number; rate: number }>;
    wealthGini: number; // Economic inequality (simplified)
    successionRate: number;
  };
}

interface HistoryStats {
  yokozunaVacancy: number;
  uniqueWinners: number;
  successions: number;
  cumulativeKimarite?: Record<string, number>;
}

function collectActiveRikishi(world: WorldState): Rikishi[] {
  const activeRikishi: Rikishi[] = [];
  for (const id of world.activeRikishiIds) {
    const r = getRikishi(world, id);
    if (r) activeRikishi.push(r);
  }
  return activeRikishi;
}

// 1. Stat Averages
function computeStatAverages(activeRikishi: Rikishi[]): TuningMetrics["statAverages"] {
  const statAverages = {
    power: 0,
    speed: 0,
    technique: 0,
    stamina: 0,
  };

  if (activeRikishi.length > 0) {
    activeRikishi.forEach((r) => {
      // finiteOr: `?? 50` misses NaN — a single corrupt stat would poison the average.
      statAverages.power += finiteOr(r.stats.power, 50);
      statAverages.speed += finiteOr(r.stats.speed, 50);
      statAverages.technique += finiteOr(r.stats.technique, 50);
      statAverages.stamina += finiteOr(r.stats.stamina, 50);
    });

    statAverages.power /= activeRikishi.length;
    statAverages.speed /= activeRikishi.length;
    statAverages.technique /= activeRikishi.length;
    statAverages.stamina /= activeRikishi.length;
  }

  return statAverages;
}

// 2. Age Distribution
function computeAgeDistribution(
  world: WorldState,
  activeRikishi: Rikishi[]
): Record<number, number> {
  const ageDistribution: Record<number, number> = {};
  const calYear = world.year ?? DEFAULT_START_YEAR;
  activeRikishi.forEach((r) => {
    const age = calYear - r.birthYear;
    ageDistribution[age] = (ageDistribution[age] || 0) + 1;
  });
  return ageDistribution;
}

// 3. Retirement Ages (Check Historical Collection)
// historicalRikishi may contain full Rikishi (pre-summarization) or
// RetiredRikishiSummary objects (post-summarization). Both carry
// isRetired, retirementYear, and birthYear, so the metrics work on either.
function collectRetiredRikishi(world: WorldState): Array<Rikishi | RetiredRikishiSummary> {
  const allRikishi: Array<Rikishi | RetiredRikishiSummary> = [
    ...Array.from(world.rikishi.values()),
    ...(world.historicalRikishi ? Array.from(world.historicalRikishi.values()) : []),
  ];
  const retiredRikishi: Array<Rikishi | RetiredRikishiSummary> = [];
  for (const r of allRikishi) {
    if (r.isRetired) retiredRikishi.push(r);
  }
  return retiredRikishi;
}

function computeRetirementAges(retiredRikishi: Array<Rikishi | RetiredRikishiSummary>): {
  retirementAges: number[];
  averageRetirementAge: number;
} {
  const retirementAges: number[] = [];
  let retirementAgeSum = 0;
  for (const r of retiredRikishi) {
    if (r.retirementYear) {
      const age = r.retirementYear - r.birthYear;
      if (age < 15 || age > 70) continue;
      retirementAges.push(age);
      retirementAgeSum += age;
    }
  }
  const averageRetirementAge =
    retirementAges.length > 0 ? retirementAgeSum / retirementAges.length : 0;
  return { retirementAges, averageRetirementAge };
}

// 4. Stable Wealth & Dominance
function computeStableWealth(world: WorldState): {
  stableWealth: TuningMetrics["stableWealth"];
  beyaDominance: TuningMetrics["beyaDominance"];
} {
  const heyas = EntityCollection.getHeyas(world);
  const funds: number[] = [];
  let fundSum = 0;
  let bankruptCount = 0;
  for (const h of heyas) {
    const f = h.funds || 0;
    funds.push(f);
    fundSum += f;
    if (f <= 0) bankruptCount++;
  }

  const stableWealth = {
    mean: funds.length > 0 ? fundSum / funds.length : 0,
    min: funds.length > 0 ? Math.min(...funds) : 0,
    max: funds.length > 0 ? Math.max(...funds) : 0,
    bankruptCount,
  };

  const beyaDominance = heyas
    .map((h) => ({ name: h.name, yusho: h.historicalYusho || 0 }))
    .sort((a, b) => b.yusho - a.yusho)
    .slice(0, 5);

  return { stableWealth, beyaDominance };
}

// 5/6. Rank & Archetype Distributions
function countBy<K extends string>(
  rikishi: Rikishi[],
  keyFn: (r: Rikishi) => K
): Record<K, number> {
  const dist = {} as Record<K, number>;
  rikishi.forEach((r) => {
    const key = keyFn(r);
    dist[key] = (dist[key] || 0) + 1;
  });
  return dist;
}

// 7. Top Kimarite
function computeTopKimarite(
  world: WorldState,
  historyStats?: HistoryStats
): Array<{ id: string; count: number }> {
  const kimariteStats = historyStats?.cumulativeKimarite ?? world.globalKimariteStats ?? {};
  const kimariteArr = [];
  for (const id in kimariteStats) {
    if (Object.prototype.hasOwnProperty.call(kimariteStats, id)) {
      kimariteArr.push({ id, count: kimariteStats[id] });
    }
  }
  return kimariteArr.sort((a, b) => b.count - a.count).slice(0, 10);
}

// 8. Oyakata Metrics
function computeOyakataMetrics(
  world: WorldState,
  retiredCount: number
): TuningMetrics["oyakataMetrics"] {
  const oyakata: Oyakata[] = Array.from(world.oyakata.values());
  let newOyakataFromRikishi = 0;
  for (const o of oyakata) {
    if (o.formerRikishiId) newOyakataFromRikishi++;
  }

  let myosekiTotal = 0;
  let heldMyoseki = 0;
  if (world.myosekiMarket?.stocks) {
    for (const key in world.myosekiMarket.stocks) {
      if (Object.prototype.hasOwnProperty.call(world.myosekiMarket.stocks, key)) {
        const m = world.myosekiMarket.stocks[key];
        myosekiTotal++;
        if (m.status === "held" || m.status === "leased") {
          heldMyoseki++;
        }
      }
    }
  }
  const myosekiSaturation = myosekiTotal > 0 ? (heldMyoseki / myosekiTotal) * 100 : 0;

  const promotionRate = retiredCount > 0 ? (newOyakataFromRikishi / retiredCount) * 100 : 0;

  return {
    totalOyakata: oyakata.length,
    newOyakataFromRikishi,
    myosekiSaturation,
    promotionRate,
  };
}

function maxObservedStat(activeRikishi: Rikishi[]): number {
  let max = 0;
  for (const r of activeRikishi) {
    if ((r.stats.power ?? 0) > max) max = r.stats.power ?? 0;
    if ((r.stats.speed ?? 0) > max) max = r.stats.speed ?? 0;
    if ((r.stats.technique ?? 0) > max) max = r.stats.technique ?? 0;
    if ((r.stats.stamina ?? 0) > max) max = r.stats.stamina ?? 0;
  }
  return max;
}

function averageAge(world: WorldState, activeRikishi: Rikishi[]): number {
  if (activeRikishi.length === 0) return 0;
  let sum = 0;
  const year = world.year ?? DEFAULT_START_YEAR;
  for (const r of activeRikishi) sum += year - r.birthYear;
  return sum / activeRikishi.length;
}

function averageOyakataAge(world: WorldState): number {
  if (!world.oyakata || world.oyakata.size === 0) return 0;
  let sum = 0;
  for (const o of world.oyakata.values()) sum += o.age || 45;
  return sum / world.oyakata.size;
}

function injuryRatePercent(activeRikishi: Rikishi[]): number {
  if (activeRikishi.length === 0) return 0;
  let injured = 0;
  for (const r of activeRikishi) {
    if (r.injured) injured++;
  }
  return (injured / activeRikishi.length) * 100;
}

function archetypeWinRates(
  activeRikishi: Rikishi[]
): Record<string, { wins: number; total: number; rate: number }> {
  const archetypeTotals: Record<string, { wins: number; total: number }> = {};
  for (const r of activeRikishi) {
    const arch = r.combatProfile?.archetype || "unknown";
    if (!archetypeTotals[arch]) archetypeTotals[arch] = { wins: 0, total: 0 };
    archetypeTotals[arch].wins += r.careerWins || 0;
    archetypeTotals[arch].total += (r.careerWins || 0) + (r.careerLosses || 0);
  }
  const rates: Record<string, { wins: number; total: number; rate: number }> = {};
  for (const arch in archetypeTotals) {
    if (!Object.prototype.hasOwnProperty.call(archetypeTotals, arch)) continue;
    const totals = archetypeTotals[arch];
    rates[arch] = {
      wins: totals.wins,
      total: totals.total,
      rate: totals.total > 0 ? totals.wins / totals.total : 0,
    };
  }
  return rates;
}

function wealthGini(world: WorldState): number {
  const funds: number[] = [];
  let sum = 0;
  for (const h of world.heyas.values()) {
    const val = h.funds ?? 0;
    funds.push(val);
    sum += val;
  }
  const n = funds.length;
  if (n === 0) return 0;
  const mean = sum / n;
  if (mean === 0) return 0;
  funds.sort((a, b) => a - b);

  let absDiffSumHalf = 0;
  for (let i = 0; i < n; i++) {
    absDiffSumHalf += funds[i] * (2 * i - n + 1);
  }
  return (absDiffSumHalf * 2) / (2 * n * n * mean);
}

function successionRatePercent(world: WorldState): number {
  const totalOyakata = world.oyakata.size;
  if (totalOyakata === 0) return 0;
  let fromRikishi = 0;
  for (const o of world.oyakata.values()) {
    if (o.formerRikishiId) fromRikishi++;
  }
  return (fromRikishi / totalOyakata) * 100;
}

function computeEntropyAudit(
  world: WorldState,
  activeRikishi: Rikishi[]
): TuningMetrics["entropyAudit"] {
  return {
    maxStat: maxObservedStat(activeRikishi),
    avgAge: averageAge(world, activeRikishi),
    oyakataAvgAge: averageOyakataAge(world),
    injuryRate: injuryRatePercent(activeRikishi),
    archetypeWinRates: archetypeWinRates(activeRikishi),
    wealthGini: wealthGini(world),
    successionRate: successionRatePercent(world),
  };
}

/**
 * Aggregate tuning metrics from the current world state.
 */
function calculateMetrics(world: WorldState, historyStats?: HistoryStats): TuningMetrics {
  const activeRikishi = collectActiveRikishi(world);
  const retiredRikishi = collectRetiredRikishi(world);
  const { retirementAges, averageRetirementAge } = computeRetirementAges(retiredRikishi);
  const { stableWealth, beyaDominance } = computeStableWealth(world);

  return {
    statAverages: computeStatAverages(activeRikishi),
    ageDistribution: computeAgeDistribution(world, activeRikishi),
    retirementAges,
    averageRetirementAge,
    stableWealth,
    rankDistribution: countBy(activeRikishi, (r) => r.rank),
    archetypeDistribution: countBy(
      activeRikishi,
      (r) => (r.combatProfile?.archetype || "unknown") as string
    ),
    topKimarite: computeTopKimarite(world, historyStats),
    oyakataMetrics: computeOyakataMetrics(world, retiredRikishi.length),
    yokozunaVacantBashoCount: historyStats?.yokozunaVacancy ?? 0,
    uniqueWinnerCount: historyStats?.uniqueWinners ?? 0,
    beyaDominance,
    entropyAudit: computeEntropyAudit(world, activeRikishi),
  };
}

/**
 * Namespace preserving the public SimTuningService.* surface.
 */
export const SimTuningService = {
  calculateMetrics,
};
