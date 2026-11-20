/**
 * youthAcademyProjections.ts — projects youth academy state for UI.
 */
import type { WorldState } from "@/engine/types/world";
import {
  getYouthAcademy,
  getMaxProspects,
  getMaxStaff,
  getUpgradeCost,
  MAX_ACADEMY_LEVEL,
  ACADEMY_UPGRADE_COSTS,
} from "@/engine/recruitment/YouthAcademyService";
import type { AcademyStaff } from "@/engine/types/academy";
import type { AvatarIdentity } from "@/engine/types/avatar";

export interface YouthProspectDTO {
  id: string;
  shikona: string;
  age: number;
  region: string;
  potential: number;
  currentAbility: number;
  developmentPoints: number;
  /** Weekly ability readings recorded by off-season development ticks (rolling 52). */
  developmentHistory: Array<{ week: number; ability: number }>;
  avatarConfig?: AvatarIdentity;
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

/**
 * Projects a heya's youth-academy state for the panel — level, prospects, staff, and upgrade affordability.
 */
export function projectYouthAcademy(world: WorldState, heyaId: string): YouthAcademyProjection {
  const heya = world.heyas.get(heyaId);
  if (!heya) return { academy: null, hasAcademy: false, canUpgrade: false, upgradeCost: 0 };

  const academy = getYouthAcademy(heya);
  if (!academy) {
    return {
      academy: null,
      hasAcademy: false,
      canUpgrade: false,
      upgradeCost: ACADEMY_UPGRADE_COSTS[1],
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
        developmentHistory: p.developmentHistory ?? [],
        avatarConfig: p.avatarConfig,
      })),
    },
    hasAcademy: true,
    canUpgrade,
    upgradeCost: getUpgradeCost(academy),
  };
}
