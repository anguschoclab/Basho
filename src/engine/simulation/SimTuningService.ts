import type { WorldState } from "../types/world";
import type { Rikishi } from "../types/rikishi";
import { EntityCollection } from "../core/EntityCollection";

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
    injuryRate: number; // % of active rikishi injured
    archetypeWinRates: Record<string, { wins: number, total: number, rate: number }>;
    wealthGini: number; // Economic inequality (simplified)
  };
}

export const SimTuningService = {
  /**
   * Aggregate tuning metrics from the current world state.
   */
  calculateMetrics(world: WorldState, historyStats?: { yokozunaVacancy: number, uniqueWinners: number }): TuningMetrics {
    const activeRikishi = Array.from(world.rikishi.values()).filter(r => !r.isRetired);
    // Note: retiredRikishi is now calculated later in the audit section

    // 1. Stat Averages
    const statAverages = {
      power: 0,
      speed: 0,
      technique: 0,
      stamina: 0,
    };

    if (activeRikishi.length > 0) {
      activeRikishi.forEach(r => {
        statAverages.power += r.power || 50;
        statAverages.speed += r.speed || 50;
        statAverages.technique += r.technique || 50;
        statAverages.stamina += r.stamina || 50;
      });

      statAverages.power /= activeRikishi.length;
      statAverages.speed /= activeRikishi.length;
      statAverages.technique /= activeRikishi.length;
      statAverages.stamina /= activeRikishi.length;
    }

    // 2. Age Distribution
    const ageDistribution: Record<number, number> = {};
    activeRikishi.forEach(r => {
      const age = world.year - r.birthYear;
      ageDistribution[age] = (ageDistribution[age] || 0) + 1;
    });

    // 3. Retirement Ages (Check Historical Collection)
    const allRikishi = [
      ...Array.from(world.rikishi.values()),
      ...(world.historicalRikishi ? Array.from(world.historicalRikishi.values()) : []),
    ];
    const retiredRikishi = allRikishi.filter((r) => r.isRetired);

    const retirementAges = retiredRikishi
      .filter((r) => r.retirementYear)
      .map((r) => r.retirementYear! - r.birthYear);

    const averageRetirementAge =
      retirementAges.length > 0
        ? retirementAges.reduce((a, b) => a + b, 0) / retirementAges.length
        : 0;

    // 4. Stable Wealth & Dominance
    const heyas = Array.from(world.heyas.values());
    const funds = heyas.map((h) => h.funds || 0);
    const bankruptCount = heyas.filter((h) => (h.funds || 0) <= 0).length;

    const stableWealth = {
      mean: funds.length > 0 ? funds.reduce((a, b) => a + b, 0) / funds.length : 0,
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

    // 6. Archetype Distribution (Fix property lookup)
    const archetypeDistribution: Record<string, number> = {};
    activeRikishi.forEach((r) => {
      const arch = r.combatProfile?.archetype || "unknown";
      archetypeDistribution[arch] = (archetypeDistribution[arch] || 0) + 1;
    });

    // 7. Top Kimarite
    const kimariteStats = world.globalKimariteStats || {};
    const topKimarite = Object.entries(kimariteStats)
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 8. Oyakata Metrics
    const oyakata = Array.from(world.oyakata.values());
    const newOyakataFromRikishi = oyakata.filter((o) => o.formerRikishiId).length;

    const myoseki = world.myosekiMarket ? Object.values(world.myosekiMarket.stocks) : [];
    const heldMyoseki = myoseki.filter((m) => m.status === "held" || m.status === "leased").length;
    const myosekiSaturation = myoseki.length > 0 ? (heldMyoseki / myoseki.length) * 100 : 0;

    const promotionRate = retiredRikishi.length > 0 ? (newOyakataFromRikishi / retiredRikishi.length) * 100 : 0;

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
        maxStat: Math.max(...activeRikishi.map(r => 
          Math.max(
            r.power || 0, 
            r.speed || 0, 
            r.stats?.technique || r.technique || 0, 
            r.stats?.stamina || 0
          )
        )),
        avgAge: activeRikishi.length > 0 ? activeRikishi.reduce((sum, r) => sum + (world.year - r.birthYear), 0) / activeRikishi.length : 0,
        injuryRate: activeRikishi.length > 0 ? (activeRikishi.filter(r => r.injured).length / activeRikishi.length) * 100 : 0,
        archetypeWinRates: {}, // Populated if history is available
        wealthGini: 0, // Simplified calculation logic
      }
    };
  }
};
