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
}

export const SimTuningService = {
  /**
   * Aggregate tuning metrics from the current world state.
   */
  calculateMetrics(world: WorldState): TuningMetrics {
    const activeRikishi = Array.from(world.rikishi.values()).filter(r => !r.isRetired);
    const retiredRikishi = Array.from(world.rikishi.values()).filter(r => r.isRetired);

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

    // 3. Retirement Ages
    const retirementAges = retiredRikishi
      .filter(r => r.retirementYear)
      .map(r => r.retirementYear! - r.birthYear);
    
    const averageRetirementAge = retirementAges.length > 0
      ? retirementAges.reduce((a, b) => a + b, 0) / retirementAges.length
      : 0;

    // 4. Stable Wealth
    const heyas = Array.from(world.heyas.values());
    const funds = heyas.map(h => h.funds || 0);
    const bankruptCount = heyas.filter(h => (h.funds || 0) <= 0).length;

    const stableWealth = {
      mean: funds.length > 0 ? funds.reduce((a, b) => a + b, 0) / funds.length : 0,
      min: funds.length > 0 ? Math.min(...funds) : 0,
      max: funds.length > 0 ? Math.max(...funds) : 0,
      bankruptCount,
    };

    // 5. Rank Distribution
    const rankDistribution: Record<string, number> = {};
    activeRikishi.forEach(r => {
      rankDistribution[r.rank] = (rankDistribution[r.rank] || 0) + 1;
    });

    return {
      statAverages,
      ageDistribution,
      retirementAges,
      averageRetirementAge,
      stableWealth,
      rankDistribution,
    };
  }
};
