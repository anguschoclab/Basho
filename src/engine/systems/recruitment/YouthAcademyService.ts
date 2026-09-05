/**
 * YouthAcademyService — player-owned youth academy for developing young prospects.
 *
 * The youth academy lets the player invest resources to recruit and develop
 * underage prospects before they enter the formal banzuke. This is a net-new
 * system that adds a long-term development pipeline.
 */

import type { WorldState } from "../../types/world";
import type { Heya } from "../../types/heya";
import type { StateImpact } from "../../core/StateImpact";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { getHeya } from "../../queries";

/** Academy levels — higher levels produce better prospects. */
export type AcademyLevel = 1 | 2 | 3;

/** Academy upgrade cost per level. */
const UPGRADE_COST: Record<number, number> = {
  1: 50_000,
  2: 150_000,
  3: 400_000,
};

/** Maximum academy level. */
export const MAX_ACADEMY_LEVEL: AcademyLevel = 3;

/** Prospect quality bonus per academy level. */
const QUALITY_BONUS_PER_LEVEL = 5;

/** Maximum number of prospects an academy can hold. */
const MAX_PROSPECTS_PER_LEVEL: Record<number, number> = {
  1: 3,
  2: 5,
  3: 8,
};

/** Youth academy prospect — a young recruit being developed. */
export interface YouthProspect {
  id: string;
  shikona: string;
  age: number;
  region: string;
  potential: number; // 0-100
  developmentPoints: number; // accumulated training
  enrolledAtYear: number;
  enrolledAtWeek: number;
}

/** Youth academy state stored on the heya. */
export interface YouthAcademyState {
  level: AcademyLevel;
  prospects: YouthProspect[];
  totalGraduated: number;
}

/**
 * Get the youth academy state for a heya, or null if not built.
 */
export function getYouthAcademy(heya: Heya): YouthAcademyState | null {
  return (heya as unknown as { youthAcademy?: YouthAcademyState }).youthAcademy ?? null;
}

/**
 * Build a youth academy at level 1.
 * Costs the base upgrade cost.
 */
export function buildYouthAcademy(
  world: WorldState,
  heyaId: string
): StateImpact {
  const builder = createImpactBuilder("buildYouthAcademy");
  const heya = getHeya(world, heyaId);
  if (!heya) return builder.build();

  // Check if already built
  if (getYouthAcademy(heya)) return builder.build();

  const cost = UPGRADE_COST[1];
  const cash = heya.economics?.cash ?? 0;
  if (cash < cost) return builder.build();

  const academy: YouthAcademyState = {
    level: 1,
    prospects: [],
    totalGraduated: 0,
  };

  builder.updateHeya(heyaId, {
    ...(heya as unknown as { youthAcademy?: YouthAcademyState }),
    youthAcademy: academy,
    economics: {
      ...(heya.economics ?? {}),
      cash: cash - cost,
    },
  } as Partial<Heya>);

  builder.logEvent(
    "NARRATIVE_CRISIS_TRIGGERED",
    "narrative",
    {
      eventId: "youth_academy_built",
      title: "Youth Academy Established",
      description: `${heya.name} has established a Youth Academy for developing young prospects.`,
      incident: `The academy can hold up to ${MAX_PROSPECTS_PER_LEVEL[1]} prospects at a time.`,
    },
    { heyaId, importance: "headline" }
  );

  return builder.build();
}

/**
 * Upgrade the youth academy to the next level.
 */
export function upgradeYouthAcademy(
  world: WorldState,
  heyaId: string
): StateImpact {
  const builder = createImpactBuilder("upgradeYouthAcademy");
  const heya = getHeya(world, heyaId);
  if (!heya) return builder.build();

  const academy = getYouthAcademy(heya);
  if (!academy) return builder.build();

  if (academy.level >= MAX_ACADEMY_LEVEL) return builder.build();

  const nextLevel = (academy.level + 1) as AcademyLevel;
  const cost = UPGRADE_COST[nextLevel];
  const cash = heya.economics?.cash ?? 0;
  if (cash < cost) return builder.build();

  builder.updateHeya(heyaId, {
    ...(heya as unknown as Record<string, unknown>),
    youthAcademy: {
      ...academy,
      level: nextLevel,
    },
    economics: {
      ...(heya.economics ?? {}),
      cash: cash - cost,
    },
  } as Partial<Heya>);

  builder.logEvent(
    "NARRATIVE_CRISIS_TRIGGERED",
    "narrative",
    {
      eventId: "youth_academy_upgraded",
      title: `Youth Academy Upgraded to Level ${nextLevel}`,
      description: `${heya.name}'s Youth Academy can now hold up to ${MAX_PROSPECTS_PER_LEVEL[nextLevel]} prospects.`,
    },
    { heyaId, importance: "notable" }
  );

  return builder.build();
}

/**
 * Get the maximum number of prospects the academy can hold.
 */
export function getMaxProspects(academy: YouthAcademyState): number {
  return MAX_PROSPECTS_PER_LEVEL[academy.level] ?? 3;
}

/**
 * Get the quality bonus for the academy based on its level.
 */
export function getQualityBonus(academy: YouthAcademyState): number {
  return academy.level * QUALITY_BONUS_PER_LEVEL;
}
