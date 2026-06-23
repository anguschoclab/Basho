import type { WorldState } from "../types/world";
import type { Rikishi } from "../types/rikishi";
import type { Oyakata } from "../types/oyakata";
import { EntityCollection } from "../core/EntityCollection";
import { getRikishi } from "../queries";

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

export const SimTuningService = {
  /**
   * Aggregate tuning metrics from the current world state.
   */
  calculateMetrics(
    world: WorldState,
    historyStats?: {
      yokozunaVacancy: number;
      uniqueWinners: number;
      successions: number;
      cumulativeKimarite?: Record<string, number>;
    }
  ): TuningMetrics {
    // ⚡ Bolt Optimization: Use direct iteration instead of Array.from().map().filter()
    const activeRikishi: Rikishi[] = [];
    for (const id of world.activeRikishiIds) {
      const r = getRikishi(world, id);
      if (r) activeRikishi.push(r);
    }

    // 1. Stat Averages
    const statAverages = {
      power: 0,
      speed: 0,
      technique: 0,
      stamina: 0,
    };

    if (activeRikishi.length > 0) {
      activeRikishi.forEach((r) => {
        statAverages.power += r.stats.power ?? 50;
        statAverages.speed += r.stats.speed ?? 50;
        statAverages.technique += r.stats.technique ?? 50;
        statAverages.stamina += r.stats.stamina ?? 50;
      });

      statAverages.power /= activeRikishi.length;
      statAverages.speed /= activeRikishi.length;
      statAverages.technique /= activeRikishi.length;
      statAverages.stamina /= activeRikishi.length;
    }

    // 2. Age Distribution
    const ageDistribution: Record<number, number> = {};
    const calYear = world.calendar?.year ?? world.year;
    activeRikishi.forEach((r) => {
      const age = calYear - r.birthYear;
      ageDistribution[age] = (ageDistribution[age] || 0) + 1;
    });

    // 3. Retirement Ages (Check Historical Collection)
    // ⚡ Bolt Optimization: Use direct iteration instead of Array.from() allocations
    const allRikishi: Rikishi[] = [];
    for (const r of world.rikishi.values()) allRikishi.push(r);
    if (world.historicalRikishi) {
      for (const r of world.historicalRikishi.values()) allRikishi.push(r);
    }
    const retiredRikishi: Rikishi[] = [];
    for (const r of allRikishi) {
      if (r.isRetired) retiredRikishi.push(r);
    }

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

    // 4. Stable Wealth & Dominance
    // ⚡ Bolt Optimization: Use EntityCollection instead of Array.from()
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

    // 5. Rank Distribution
    const rankDistribution: Record<string, number> = {};
    activeRikishi.forEach((r) => {
      rankDistribution[r.rank] = (rankDistribution[r.rank] || 0) + 1;
    });

    // 6. Archetype Distribution
    const archetypeDistribution: Record<string, number> = {};
    activeRikishi.forEach((r) => {
      const arch = r.combatProfile?.archetype || "unknown";
      archetypeDistribution[arch] = (archetypeDistribution[arch] || 0) + 1;
    });

    // 7. Top Kimarite
    const kimariteStats = historyStats?.cumulativeKimarite ?? world.globalKimariteStats ?? {};
    const topKimarite = Object.entries(kimariteStats)
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 8. Oyakata Metrics
    // ⚡ Bolt Optimization: Use direct iteration instead of Array.from()
    const oyakata: Oyakata[] = [];
    for (const o of world.oyakata.values()) oyakata.push(o);
    let newOyakataFromRikishi = 0;
    for (const o of oyakata) {
      if (o.formerRikishiId) newOyakataFromRikishi++;
    }

    const myoseki = world.myosekiMarket ? Object.values(world.myosekiMarket.stocks) : [];
    const heldMyoseki = myoseki.filter((m) => m.status === "held" || m.status === "leased").length;
    const myosekiSaturation = myoseki.length > 0 ? (heldMyoseki / myoseki.length) * 100 : 0;

    const promotionRate =
      retiredRikishi.length > 0 ? (newOyakataFromRikishi / retiredRikishi.length) * 100 : 0;

    return {
      statAverages,
      ageDistribution,
      retirementAges,
      averageRetirementAge,
      stableWealth,
      rankDistribution,
      archetypeDistribution,
      topKimarite,
      oyakataMetrics: {
        totalOyakata: oyakata.length,
        newOyakataFromRikishi,
        myosekiSaturation,
        promotionRate,
      },
      yokozunaVacantBashoCount: historyStats?.yokozunaVacancy ?? 0,
      uniqueWinnerCount: historyStats?.uniqueWinners ?? 0,
      beyaDominance,
      entropyAudit: {
        // ⚡ Bolt Optimization: Use a direct for...of loop instead of Math.max(...Array.from().map()) to avoid O(N) allocations and spread operator
        maxStat: (() => {
          let max = 0;
          for (const r of activeRikishi) {
            if ((r.stats.power || 0) > max) max = r.stats.power || 0;
            if ((r.stats.speed || 0) > max) max = r.stats.speed || 0;
            if ((r.stats.technique || 0) > max) max = r.stats.technique || 0;
            if ((r.stats.stamina || 0) > max) max = r.stats.stamina || 0;
          }
          return max;
        })(),
        avgAge:
          activeRikishi.length > 0
            ? (() => {
                let sum = 0;
                const year = world.calendar?.year ?? world.year;
                for (const r of activeRikishi) sum += year - r.birthYear;
                return sum / activeRikishi.length;
              })()
            : 0,
        oyakataAvgAge: (() => {
          if (!world.oyakata || world.oyakata.size === 0) return 0;
          let sum = 0;
          for (const o of world.oyakata.values()) sum += o.age || 45;
          return sum / world.oyakata.size;
        })(),
        injuryRate: (() => {
          if (activeRikishi.length === 0) return 0;
          let injured = 0;
          for (const r of activeRikishi) {
            if (r.injured) injured++;
          }
          return (injured / activeRikishi.length) * 100;
        })(),
        archetypeWinRates: (() => {
          const archetypeTotals: Record<string, { wins: number; total: number }> = {};
          for (const r of activeRikishi) {
            const arch = r.combatProfile?.archetype || "unknown";
            if (!archetypeTotals[arch]) archetypeTotals[arch] = { wins: 0, total: 0 };
            archetypeTotals[arch].wins += r.careerWins || 0;
            archetypeTotals[arch].total += (r.careerWins || 0) + (r.careerLosses || 0);
          }
          const rates: Record<string, { wins: number; total: number; rate: number }> = {};
          for (const [arch, totals] of Object.entries(archetypeTotals)) {
            rates[arch] = {
              wins: totals.wins,
              total: totals.total,
              rate: totals.total > 0 ? totals.wins / totals.total : 0,
            };
          }
          return rates;
        })(),
        wealthGini: (() => {
          // ⚡ Bolt Optimization: Replace O(N^2) Math.abs reduce with O(N) sort property, and remove Array.from().map() allocations.
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
        })(),
        successionRate: (() => {
          const totalOyakata = world.oyakata.size;
          if (totalOyakata === 0) return 0;
          let fromRikishi = 0;
          for (const o of world.oyakata.values()) {
            if (o.formerRikishiId) fromRikishi++;
          }
          return (fromRikishi / totalOyakata) * 100;
        })(),
      },
    };
  },
};
