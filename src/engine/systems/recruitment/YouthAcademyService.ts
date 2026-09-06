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
import type { AcademyLevel, AcademyStaff, AcademyStaffRole, YouthProspect } from "../../types/academy";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { getHeya } from "../../queries";
import { rngFromSeed } from "../../rng";

/** Re-export types for convenience. */
export type { AcademyLevel, AcademyStaff, AcademyStaffRole, YouthProspect };

/** Academy upgrade cost per level. */
const UPGRADE_COST: Record<number, number> = {
  1: 50_000,
  2: 150_000,
  3: 400_000,
  4: 1_000_000,
  5: 2_500_000,
};

/** Maximum academy level. */
export const MAX_ACADEMY_LEVEL: AcademyLevel = 5;

/** Prospect quality bonus per academy level. */
const QUALITY_BONUS_PER_LEVEL = 5;

/** Maximum number of prospects an academy can hold. */
const MAX_PROSPECTS_PER_LEVEL: Record<number, number> = {
  1: 3,
  2: 5,
  3: 8,
  4: 12,
  5: 16,
};

/** Base cost to invest in academy development. */
const INVEST_COST_PER_POINT = 5_000;

/** Staff hire cost. */
const STAFF_HIRE_COST = 100_000;

/** Staff name pools. */
const STAFF_FIRST_NAMES = ["Takeshi", "Hiroshi", "Kenji", "Akira", "Daisuke", "Ryo", "Yuki", "Noboru"];
const STAFF_LAST_NAMES = ["Tanaka", "Yamamoto", "Suzuki", "Watanabe", "Sato", "Kobayashi", "Ito", "Nakamura"];

/** Prospect name pools. */
const PROSPECT_FIRST_NAMES = ["Haruto", "Sota", "Yuto", "Kaito", "Riku", "Ren", "Hinata", "Minato"];
const PROSPECT_LAST_NAMES = ["Aoki", "Endo", "Fujita", "Goto", "Hara", "Ishida", "Kato", "Mori"];

/** Regions for prospect generation. */
const PROSPECT_REGIONS = ["Hokkaido", "Tohoku", "Kanto", "Chubu", "Kansai", "Chugoku", "Shikoku", "Kyushu"];

/** Youth academy state stored on the heya. */
export interface YouthAcademyState {
  level: AcademyLevel;
  prospects: YouthProspect[];
  totalGraduated: number;
  budget: number;
  staff: AcademyStaff[];
  lastIntakeYear: number;
}

/**
 * Get the youth academy state for a heya, or null if not built.
 */
export function getYouthAcademy(heya: Heya): YouthAcademyState | null {
  return heya.youthAcademy ?? null;
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

  if (getYouthAcademy(heya)) return builder.build();

  const cost = UPGRADE_COST[1];
  const cash = heya.funds;
  if (cash < cost) return builder.build();

  const academy: YouthAcademyState = {
    level: 1,
    prospects: [],
    totalGraduated: 0,
    budget: 10_000,
    staff: [],
    lastIntakeYear: 0,
  };

  builder.updateHeya(heyaId, {
    youthAcademy: academy,
    funds: cash - cost,
  });

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
  const cash = heya.funds;
  if (cash < cost) return builder.build();

  builder.updateHeya(heyaId, {
    youthAcademy: {
      ...academy,
      level: nextLevel,
    },
    funds: cash - cost,
  });

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
 * Generate yearly intake of 2-3 prospects influenced by academy level + staff quality.
 * Called by phase06_yearly_boundary on the Jan 1 year boundary.
 */
export function generateYearlyIntake(
  world: WorldState,
  heyaId: string
): StateImpact {
  const builder = createImpactBuilder("generateYearlyIntake");
  const heya = getHeya(world, heyaId);
  if (!heya) return builder.build();

  const academy = getYouthAcademy(heya);
  if (!academy) return builder.build();

  // Only generate once per year
  if (academy.lastIntakeYear === world.year) return builder.build();

  const maxProspects = getMaxProspects(academy);
  const availableSlots = maxProspects - academy.prospects.length;
  if (availableSlots <= 0) return builder.build();

  // Generate 2-3 prospects (capped by available slots)
  const rng = rngFromSeed(world.seed, "academy", `${heyaId}-${world.year}`);
  const baseCount = 2 + (rng.bool(0.4) ? 1 : 0);
  const intakeCount = Math.min(baseCount, availableSlots);

  const qualityBonus = getQualityBonus(academy);
  const staffBonus = academy.staff.reduce((sum, s) => sum + s.quality, 0) * 0.1;

  const newProspects: YouthProspect[] = [];
  for (let i = 0; i < intakeCount; i++) {
    const firstIdx = rng.int(0, PROSPECT_FIRST_NAMES.length - 1);
    const lastIdx = rng.int(0, PROSPECT_LAST_NAMES.length - 1);
    const regionIdx = rng.int(0, PROSPECT_REGIONS.length - 1);
    const basePotential = 30 + rng.int(0, 39);
    const potential = Math.min(95, basePotential + qualityBonus + Math.floor(staffBonus));

    newProspects.push({
      id: `${heyaId}-prospect-${world.year}-${i}`,
      shikona: `${PROSPECT_LAST_NAMES[lastIdx]} ${PROSPECT_FIRST_NAMES[firstIdx]}`,
      age: rng.int(15, 17),
      region: PROSPECT_REGIONS[regionIdx],
      potential,
      currentAbility: 10 + rng.int(0, 14),
      developmentPoints: 0,
      enrolledAtYear: world.year,
      enrolledAtWeek: world.week ?? 1,
      developmentHistory: [],
    });
  }

  builder.updateHeya(heyaId, {
    ...heya,
    youthAcademy: {
      ...academy,
      prospects: [...academy.prospects, ...newProspects],
      lastIntakeYear: world.year,
    },
  } as Partial<Heya>);

  if (newProspects.length > 0) {
    builder.logEvent(
      "NARRATIVE_CRISIS_TRIGGERED",
      "narrative",
      {
        eventId: "youth_academy_intake",
        title: `Youth Academy Intake — ${world.year}`,
        description: `${heya.name}'s Youth Academy welcomed ${newProspects.length} new prospect${newProspects.length > 1 ? "s" : ""}.`,
        incident: newProspects.map((p) => `${p.shikona} (potential ${p.potential})`).join(", "),
      },
      { heyaId, importance: "notable" }
    );
  }

  return builder.build();
}

/**
 * Apply weekly development to all academy prospects.
 * Called by phase01_week_academy during the weekly tick.
 * Prospects gain development points and ability based on budget, staff, and level.
 */
export function applyWeeklyDevelopment(
  world: WorldState,
  heyaId: string
): StateImpact {
  const builder = createImpactBuilder("applyWeeklyDevelopment");
  const heya = getHeya(world, heyaId);
  if (!heya) return builder.build();

  const academy = getYouthAcademy(heya);
  if (!academy || academy.prospects.length === 0) return builder.build();

  const staffQuality = academy.staff.reduce((sum, s) => sum + s.quality, 0);
  const staffMultiplier = 1 + staffQuality / 200;
  const levelMultiplier = 1 + academy.level * 0.2;
  const budgetFactor = academy.budget > 0 ? Math.min(2, academy.budget / 10_000) : 0.5;

  const updatedProspects = academy.prospects.map((p) => {
    if (p.currentAbility >= p.potential) return p;

    const growthRate = (rngFromSeed(world.seed, "academy-dev", `${p.id}-${world.week ?? 0}`).next() * 0.5 + 0.5);
    const pointsGained = Math.floor(growthRate * staffMultiplier * levelMultiplier * budgetFactor);
    const newDevPoints = p.developmentPoints + pointsGained;
    const abilityGain = Math.floor(pointsGained / 10);
    const newAbility = Math.min(p.potential, p.currentAbility + abilityGain);

    return {
      ...p,
      developmentPoints: newDevPoints,
      currentAbility: newAbility,
      developmentHistory: [
        ...p.developmentHistory,
        { week: world.week ?? 0, ability: newAbility },
      ].slice(-52), // keep last 52 weeks
    };
  });

  builder.updateHeya(heyaId, {
    ...heya,
    youthAcademy: {
      ...academy,
      prospects: updatedProspects,
    },
  } as Partial<Heya>);

  return builder.build();
}

/**
 * Promote a prospect from the academy to the heya roster.
 * This creates a new rikishi from the prospect and adds them to the heya.
 */
export function promoteIntake(
  world: WorldState,
  heyaId: string,
  prospectId: string
): StateImpact {
  const builder = createImpactBuilder("promoteIntake");
  const heya = getHeya(world, heyaId);
  if (!heya) return builder.build();

  const academy = getYouthAcademy(heya);
  if (!academy) return builder.build();

  const prospect = academy.prospects.find((p) => p.id === prospectId);
  if (!prospect) return builder.build();

  // Remove prospect from academy
  const remainingProspects = academy.prospects.filter((p) => p.id !== prospectId);

  builder.updateHeya(heyaId, {
    ...heya,
    youthAcademy: {
      ...academy,
      prospects: remainingProspects,
      totalGraduated: academy.totalGraduated + 1,
    },
  } as Partial<Heya>);

  // Create a new rikishi from the prospect and add to roster
  const newRikishiId = prospectId;
  const newRikishi = {
    id: newRikishiId,
    shikona: prospect.shikona,
    heyaId,
    nationality: "Japan",
    birthYear: world.year - prospect.age,
    height: 175,
    weight: 100,
    momentum: 50,
    fatigue: 0,
    injured: false,
    injuryWeeksRemaining: 0,
    rank: "Jonokuchi",
    rankNumber: 50,
    isRetired: false,
    debutYear: world.year,
    recruitmentCohortId: `academy-${world.year}`,
    // Inherit development as starting ability
    strength: Math.floor(prospect.currentAbility * 0.4),
    technique: Math.floor(prospect.currentAbility * 0.4),
    speed: Math.floor(prospect.currentAbility * 0.2),
    potential: prospect.potential,
  } as unknown as import("../../types/rikishi").Rikishi;

  builder.addRikishi(newRikishi);

  // Add to heya roster
  const currentRoster = heya.rikishiIds ?? [];
  builder.updateHeya(heyaId, {
    rikishiIds: [...currentRoster, newRikishiId],
  } as Partial<Heya>);

  builder.logEvent(
    "NARRATIVE_CRISIS_TRIGGERED",
    "narrative",
    {
      eventId: "youth_academy_promotion",
      title: "Academy Prospect Promoted",
      description: `${prospect.shikona} has been promoted from the Youth Academy to the active roster.`,
      incident: `Starting ability: ${prospect.currentAbility}, potential: ${prospect.potential}`,
    },
    { heyaId, rikishiId: newRikishiId, importance: "notable" }
  );

  return builder.build();
}

/**
 * Invest in the academy to increase the weekly development budget.
 */
export function investInAcademy(
  world: WorldState,
  heyaId: string,
  amount: number
): StateImpact {
  const builder = createImpactBuilder("investInAcademy");
  const heya = getHeya(world, heyaId);
  if (!heya) return builder.build();

  const academy = getYouthAcademy(heya);
  if (!academy) return builder.build();

  if (amount <= 0) return builder.build();

  const cash = heya.funds;
  if (cash < amount) return builder.build();

  // Convert investment to weekly budget increase
  const budgetIncrease = Math.floor(amount / INVEST_COST_PER_POINT) * 1_000;

  builder.updateHeya(heyaId, {
    youthAcademy: {
      ...academy,
      budget: academy.budget + budgetIncrease,
    },
    funds: cash - amount,
  });

  builder.logEvent(
    "NARRATIVE_CRISIS_TRIGGERED",
    "narrative",
    {
      eventId: "youth_academy_invest",
      title: "Academy Investment",
      description: `${heya.name} invested ${amount.toLocaleString()} yen in the Youth Academy.`,
      incident: `Weekly development budget increased by ${budgetIncrease.toLocaleString()} yen.`,
    },
    { heyaId, importance: "minor" }
  );

  return builder.build();
}

/**
 * Hire academy staff to improve prospect development.
 */
export function hireAcademyStaff(
  world: WorldState,
  heyaId: string,
  role: AcademyStaffRole
): StateImpact {
  const builder = createImpactBuilder("hireAcademyStaff");
  const heya = getHeya(world, heyaId);
  if (!heya) return builder.build();

  const academy = getYouthAcademy(heya);
  if (!academy) return builder.build();

  // Limit one staff per role
  if (academy.staff.some((s) => s.role === role)) return builder.build();

  // Limit total staff by level
  const maxStaff = Math.min(4, academy.level);
  if (academy.staff.length >= maxStaff) return builder.build();

  const cash = heya.funds;
  if (cash < STAFF_HIRE_COST) return builder.build();

  const rng = rngFromSeed(world.seed, "academy-staff", `${heyaId}-${role}-${world.year}`);
  const firstIdx = rng.int(0, STAFF_FIRST_NAMES.length - 1);
  const lastIdx = rng.int(0, STAFF_LAST_NAMES.length - 1);
  const quality = rng.int(40, 89);

  const newStaff: AcademyStaff = {
    id: `${heyaId}-staff-${role}-${world.year}`,
    role,
    name: `${STAFF_LAST_NAMES[lastIdx]} ${STAFF_FIRST_NAMES[firstIdx]}`,
    quality,
    hiredAtYear: world.year,
  };

  builder.updateHeya(heyaId, {
    youthAcademy: {
      ...academy,
      staff: [...academy.staff, newStaff],
    },
    funds: cash - STAFF_HIRE_COST,
  });

  builder.logEvent(
    "NARRATIVE_CRISIS_TRIGGERED",
    "narrative",
    {
      eventId: "youth_academy_staff_hired",
      title: "Academy Staff Hired",
      description: `${newStaff.name} hired as ${role.replace("_", " ")} for ${heya.name}'s Youth Academy.`,
      incident: `Staff quality: ${quality}/100`,
    },
    { heyaId, importance: "minor" }
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

/**
 * Get the upgrade cost for the next level.
 */
export function getUpgradeCost(academy: YouthAcademyState): number {
  if (academy.level >= MAX_ACADEMY_LEVEL) return 0;
  return UPGRADE_COST[academy.level + 1] ?? 0;
}

/**
 * Get the maximum staff count for the academy level.
 */
export function getMaxStaff(academy: YouthAcademyState): number {
  return Math.min(4, academy.level);
}
