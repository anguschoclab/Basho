/**
 * youthAcademyProjections.ts — projects youth academy state for UI.
 */
import type { WorldState } from "../engine/types/world";
import {
  getYouthAcademy,
  getMaxProspects,
  getMaxStaff,
  getUpgradeCost,
  MAX_ACADEMY_LEVEL,
} from "../engine/systems/recruitment/YouthAcademyService";
import type { AcademyStaff } from "../engine/types/academy";

export interface YouthProspectDTO {
  id: string;
  shikona: string;
  age: number;
  region: string;
  potential: number;
  currentAbility: number;
  developmentPoints: number;
}

export interface YouthAcademyDTO {
  level: number;
  maxLevel: number;
  prospectCount: number;
  maxProspects: number;
  totalGraduated: number;
  budget: number;
  staff: AcademyStaff[];
  maxStaff: number;
  lastIntakeYear: number;
  prospects: YouthProspectDTO[];
}

export interface YouthAcademyProjection {
  academy: YouthAcademyDTO | null;
  hasAcademy: boolean;
  canUpgrade: boolean;
  upgradeCost: number;
}

const UPGRADE_COST: Record<number, number> = {
  1: 50_000,
  2: 150_000,
  3: 400_000,
  4: 1_000_000,
  5: 2_500_000,
};

export function projectYouthAcademy(
  world: WorldState,
  heyaId: string
): YouthAcademyProjection {
  const heya = world.heyas.get(heyaId);
  if (!heya) return { academy: null, hasAcademy: false, canUpgrade: false, upgradeCost: 0 };

  const academy = getYouthAcademy(heya);
  if (!academy) {
    return {
      academy: null,
      hasAcademy: false,
      canUpgrade: false,
      upgradeCost: UPGRADE_COST[1],
    };
  }

  const canUpgrade = academy.level < MAX_ACADEMY_LEVEL;

  return {
    academy: {
      level: academy.level,
      maxLevel: MAX_ACADEMY_LEVEL,
      prospectCount: academy.prospects.length,
      maxProspects: getMaxProspects(academy),
      totalGraduated: academy.totalGraduated,
      budget: academy.budget,
      staff: academy.staff,
      maxStaff: getMaxStaff(academy),
      lastIntakeYear: academy.lastIntakeYear,
      prospects: academy.prospects.map((p) => ({
        id: p.id,
        shikona: p.shikona,
        age: p.age,
        region: p.region,
        potential: p.potential,
        currentAbility: p.currentAbility,
        developmentPoints: p.developmentPoints,
      })),
    },
    hasAcademy: true,
    canUpgrade,
    upgradeCost: getUpgradeCost(academy),
  };
}
