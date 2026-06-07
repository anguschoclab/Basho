import type {
  Staff,
  StaffRole,
  StaffCareerPhase,
  CompetenceBand,
  ReputationBand,
  LoyaltyBand,
} from "./types/staff";
import { type SeededRNG, rngFromSeed } from "./rng";
import type { Id } from "./types/common";
import type { WorldState } from "./types/world";
import { createImpactBuilder } from "./core/ImpactBuilder";
import type { StateImpact } from "./core/StateImpact";
import { getHeya } from "./queries";
import {
  STAFF_BASE_AGE,
  STAFF_AGE_RANGE,
  STAFF_APPRENTICE_AGE_THRESHOLD,
  STAFF_SENIOR_AGE_THRESHOLD,
  STAFF_DECLINING_AGE_THRESHOLD,
  STAFF_RETIREMENT_AGE_THRESHOLD,
  STAFF_SECONDARY_COMPETENCE_CHANCE,
  STAFF_FATIGUE_RANGE,
  STAFF_BASE_MORALE,
  STAFF_MORALE_RANGE,
  STAFF_SCANDAL_EXPOSURE_RANGE,
  STAFF_SUCCESSOR_AGE_THRESHOLD,
  STAFF_SUCCESSOR_CHANCE,
  STAFF_CAPACITY_PER_STAFF,
  STAFF_FATIGUE_GAIN_MULTIPLIER,
  STAFF_OVERLOAD_THRESHOLD,
  STAFF_OVERLOAD_MORALE_PENALTY,
  STAFF_NORMAL_MORALE_PENALTY,
  STAFF_FATIGUE_RECOVERY,
  STAFF_LOW_FATIGUE_THRESHOLD,
  STAFF_MORALE_RECOVERY,
  STAFF_HIGH_MORALE_THRESHOLD,
  STAFF_MORALE_DECAY,
  STAFF_HIGH_FATIGUE_THRESHOLD,
  STAFF_MEDIUM_FATIGUE_THRESHOLD,
  STAFF_HIGH_MORALE_BONUS_THRESHOLD,
  STAFF_LOW_MORALE_PENALTY_THRESHOLD,
  STAFF_HIGH_FATIGUE_FACTOR,
  STAFF_MEDIUM_FATIGUE_FACTOR,
  STAFF_SECONDARY_COMPETENCE_MULTIPLIER,
  STAFF_ADMINISTRATOR_DISCOUNT_MULTIPLIER,
  STAFF_ASSISTANT_OYAKATA_BONUS_MULTIPLIER,
  STAFF_MIN_ADMINISTRATION_DISCOUNT,
  STAFF_HIRE_COST,
  STAFF_MORALE_HIGH_MULTIPLIER,
  STAFF_MORALE_LOW_MULTIPLIER,
} from "../constants/engine/economy";

/**
 * Helper to roll a random band from a list of bands.
 *
 * @param rng - The seeded RNG to use
 * @param bands - The list of possible bands
 * @returns A randomly selected band
 */
function rollBand(rng: SeededRNG, bands: readonly any[]): any {
  return bands[Math.floor(rng.next() * bands.length)];
}

/**
 * Generates a new staff member with randomized attributes based on a seed.
 *
 * @param seed - The base seed for world generation
 * @param role - The role of the staff member
 * @param heyaId - The ID of the heya they belong to
 * @param sequence - A sequence number for uniqueness in the RNG key
 * @returns A new Staff object
 */
export function generateStaff(seed: string, role: StaffRole, heyaId: Id, sequence: number): Staff {
  const rng = rngFromSeed(seed, "staff", `${heyaId}-${role}-${sequence}`);

  const id = rng.uuid("ST");

  const age = STAFF_BASE_AGE + Math.floor(rng.next() * STAFF_AGE_RANGE);

  let phase: StaffCareerPhase = "established";
  if (age < STAFF_APPRENTICE_AGE_THRESHOLD) phase = "apprentice";
  else if (age > STAFF_DECLINING_AGE_THRESHOLD) phase = "declining";
  else if (age > STAFF_SENIOR_AGE_THRESHOLD) phase = "senior";

  const REPUTATION_BANDS: ReputationBand[] = [
    "unknown",
    "questionable",
    "respected",
    "renowned",
    "legendary",
  ];
  const LOYALTY_BANDS: LoyaltyBand[] = ["mercenary", "wavering", "stable", "devoted", "unshakable"];
  const COMPETENCE_BANDS: CompetenceBand[] = [
    "feeble",
    "limited",
    "serviceable",
    "strong",
    "great",
    "dominant",
    "monstrous",
  ];

  return {
    id,
    heyaId,
    name: `Staff Member ${Math.floor(rng.next() * 1000)}`,
    role,
    age,
    careerPhase: phase,
    reputationBand: rollBand(rng, REPUTATION_BANDS) as ReputationBand,
    loyaltyBand: rollBand(rng, LOYALTY_BANDS) as LoyaltyBand,
    competenceBands: {
      primary: rollBand(rng, COMPETENCE_BANDS) as CompetenceBand,
      secondary: rng.next() > STAFF_SECONDARY_COMPETENCE_CHANCE ? (rollBand(rng, COMPETENCE_BANDS) as CompetenceBand) : undefined,
    },
    fatigue: Math.floor(rng.next() * STAFF_FATIGUE_RANGE),
    morale: STAFF_BASE_MORALE + Math.floor(rng.next() * STAFF_MORALE_RANGE), // Start with good morale
    scandalExposure: Math.floor(rng.next() * STAFF_SCANDAL_EXPOSURE_RANGE),
    yearsAtBeya: Math.max(0, Math.floor(rng.next() * (age - 20))),
    priorAffiliations: [],
    successorEligible: role === "assistant_oyakata" && age > STAFF_SUCCESSOR_AGE_THRESHOLD && rng.next() > STAFF_SUCCESSOR_CHANCE,
  };
}

/**
 * Weekly tick for all staff members.
 * Updates fatigue and morale based on rikishi load in each heya.
 *
 * @param world - The current world state
 * @returns A StateImpact object with staff updates
 */
export function tickStaffWeek(world: WorldState): StateImpact {
  const builder = createImpactBuilder("tickStaffWeek");
  if (!world.staff || !world.heyas) return builder.build();

  for (const heya of world.heyas.values()) {
    const rikishiCount = (heya.rikishiIds || []).length;
    const staffIds = heya.staffIds || [];
    const staffCount = staffIds.length;

    const capacity = Math.max(1, staffCount * STAFF_CAPACITY_PER_STAFF);
    const overload = rikishiCount > capacity;
    const loadFactor = rikishiCount / capacity;

    for (const sId of staffIds) {
      const staff = world.staff.get(sId);
      if (!staff || staff.careerPhase === "retired") continue;

      let newFatigue, newMorale;

      if (overload) {
        const fatigueGain = Math.ceil(loadFactor * STAFF_FATIGUE_GAIN_MULTIPLIER);
        newFatigue = Math.min(100, staff.fatigue + fatigueGain);
        newMorale = Math.max(0, staff.morale - (loadFactor > STAFF_OVERLOAD_THRESHOLD ? STAFF_OVERLOAD_MORALE_PENALTY : STAFF_NORMAL_MORALE_PENALTY));
      } else {
        newFatigue = Math.max(0, staff.fatigue - STAFF_FATIGUE_RECOVERY);
        if (staff.fatigue < STAFF_LOW_FATIGUE_THRESHOLD) {
          newMorale = Math.min(100, staff.morale + STAFF_MORALE_RECOVERY);
        } else {
          newMorale = staff.morale;
        }
      }

      if (newMorale > STAFF_HIGH_MORALE_THRESHOLD && !overload) newMorale -= STAFF_MORALE_DECAY;

      builder.updateStaff(sId, { fatigue: newFatigue, morale: newMorale });
    }
  }

  return builder.build();
}

/**
 * Yearly tick for all staff members.
 * Increments age and updates career phases (apprentice -> established -> senior -> declining -> retired).
 *
 * @param world - The current world state
 * @returns A StateImpact object with staff updates
 */
export function tickStaffYear(world: WorldState): StateImpact {
  const builder = createImpactBuilder("tickStaffYear");
  if (!world.staff) return builder.build();

  for (const staff of world.staff.values()) {
    const newAge = staff.age + 1;
    const newYearsAtBeya = staff.yearsAtBeya + 1;

    let newCareerPhase = staff.careerPhase;
    if (staff.careerPhase === "apprentice" && newAge >= STAFF_APPRENTICE_AGE_THRESHOLD) newCareerPhase = "established";
    else if (staff.careerPhase === "established" && newAge >= STAFF_SENIOR_AGE_THRESHOLD) newCareerPhase = "senior";
    else if (staff.careerPhase === "senior" && newAge >= STAFF_DECLINING_AGE_THRESHOLD) newCareerPhase = "declining";
    else if (staff.careerPhase === "declining" && newAge >= STAFF_RETIREMENT_AGE_THRESHOLD) newCareerPhase = "retired";

    builder.updateStaff(staff.id, {
      age: newAge,
      yearsAtBeya: newYearsAtBeya,
      careerPhase: newCareerPhase,
    });
  }

  return builder.build();
}

/**
 * Hires a new staff member for a heya.
 * Checks for sufficient funds (¥500,000 baseline).
 *
 * @param world - The current world state
 * @param heyaId - The ID of the heya hiring the staff
 * @param role - The role of the new staff member
 * @returns A StateImpact object describing the hire
 */
export function hireStaff(world: WorldState, heyaId: Id, role: StaffRole): StateImpact {
  const builder = createImpactBuilder("hireStaff");
  const heya = getHeya(world, heyaId);
  if (!heya) return builder.build();

  const HIRE_COST = STAFF_HIRE_COST;
  if (heya.funds < HIRE_COST) return builder.build();

  const newFunds = heya.funds - HIRE_COST;
  const sequence = (heya.staffIds?.length || 0) + 1;
  const staff = generateStaff(world.seed, role, heyaId, sequence);

  const newStaffIds = [...(heya.staffIds || []), staff.id];

  builder.updateHeya(heyaId, { funds: newFunds, staffIds: newStaffIds });
  builder.addStaff(staff);

  return builder.build();
}

/**
 * Fires an existing staff member from a heya.
 * Removes them from both the heya's roster and the world's staff collection.
 *
 * @param world - The current world state
 * @param heyaId - The ID of the heya firing the staff
 * @param staffId - The ID of the staff member to fire
 * @returns A StateImpact object describing the firing
 */
export function fireStaff(world: WorldState, heyaId: Id, staffId: string): StateImpact {
  const builder = createImpactBuilder("fireStaff");
  const heya = getHeya(world, heyaId);
  if (!heya) return builder.build();

  // Remove from heya list
  const newStaffIds = (heya.staffIds || []).filter((id) => id !== staffId);
  builder.updateHeya(heyaId, { staffIds: newStaffIds });

  // Remove from world
  builder.removeStaff(staffId);

  return builder.build();
}

/**
 * Calculates aggregate staff bonuses for a specific heya.
 * Staff bonuses stack and are influenced by efficiency (fatigue and morale).
 *
 * @param world - The current world state
 * @param heyaId - The ID of the heya
 * @returns The calculated StaffBonuses
 */
export interface StaffBonuses {
  technique: number; // e.g. 1.15
  conditioning: number; // e.g. 1.10
  medical: number; // e.g. 1.20
  scouting: number; // e.g. 1.10
  administration: number; // e.g. 0.90 (cost reduction)
}

const BAND_VALUES: Record<CompetenceBand, number> = {
  feeble: 0.01,
  limited: 0.05,
  serviceable: 0.1,
  strong: 0.15,
  great: 0.2,
  dominant: 0.3,
  monstrous: 0.5,
};

const ROLE_HANDLERS: Record<StaffRole, (b: StaffBonuses, val: number) => void> = {
  technique_coach: (b, val) => (b.technique += val),
  conditioning_coach: (b, val) => (b.conditioning += val),
  medical_staff: (b, val) => (b.medical += val),
  scout: (b, val) => (b.scouting += val),
  administrator: (b, val) => (b.administration -= val * STAFF_ADMINISTRATOR_DISCOUNT_MULTIPLIER),
  assistant_oyakata: (b, val) => {
    b.technique += val * STAFF_ASSISTANT_OYAKATA_BONUS_MULTIPLIER;
    b.conditioning += val * STAFF_ASSISTANT_OYAKATA_BONUS_MULTIPLIER;
    b.medical += val * STAFF_ASSISTANT_OYAKATA_BONUS_MULTIPLIER;
  },
};

export function getHeyaStaffBonuses(world: WorldState, heyaId: Id): StaffBonuses {
  const heya = getHeya(world, heyaId);
  const bonuses: StaffBonuses = {
    technique: 1.0,
    conditioning: 1.0,
    medical: 1.0,
    scouting: 1.0,
    administration: 1.0,
  };

  if (!heya || !heya.staffIds || !world.staff) return bonuses;

  for (const staffId of heya.staffIds) {
    const staff = world.staff.get(staffId);
    if (!staff || staff.careerPhase === "retired") continue;

    const fatigueFactor = staff.fatigue > STAFF_HIGH_FATIGUE_THRESHOLD ? STAFF_HIGH_FATIGUE_FACTOR : staff.fatigue > STAFF_MEDIUM_FATIGUE_THRESHOLD ? STAFF_MEDIUM_FATIGUE_FACTOR : 1.0;
    const moraleFactor = staff.morale > STAFF_HIGH_MORALE_BONUS_THRESHOLD ? STAFF_MORALE_HIGH_MULTIPLIER : staff.morale < STAFF_LOW_MORALE_PENALTY_THRESHOLD ? STAFF_MORALE_LOW_MULTIPLIER : 1.0;
    const efficiency = fatigueFactor * moraleFactor;

    const primaryBonus = BAND_VALUES[staff.competenceBands.primary] * efficiency;
    const secondaryBonus = staff.competenceBands.secondary
      ? BAND_VALUES[staff.competenceBands.secondary] * STAFF_SECONDARY_COMPETENCE_MULTIPLIER * efficiency
      : 0;

    const totalStaffBonus = primaryBonus + secondaryBonus;

    const handler = ROLE_HANDLERS[staff.role];
    if (handler) {
      handler(bonuses, totalStaffBonus);
    }
  }

  // Clamping
  bonuses.administration = Math.max(STAFF_MIN_ADMINISTRATION_DISCOUNT, bonuses.administration); // Max 30% discount

  return bonuses;
}
