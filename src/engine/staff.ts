import type { Staff, StaffRole, StaffCareerPhase, CompetenceBand, ReputationBand, LoyaltyBand } from "./types/staff";
import { type SeededRNG, rngFromSeed } from "./rng";
import type { Id } from "./types/common";
import type { WorldState } from "./types/world";

function rollBand(rng: SeededRNG, bands: readonly any[]): any {
  return bands[Math.floor(rng.next() * bands.length)];
}

export function generateStaff(seed: string, role: StaffRole, heyaId: Id, sequence: number): Staff {
  const rng = rngFromSeed(seed, "staff", `${heyaId}-${role}-${sequence}`);

  const id = `S-${seed}-${heyaId}-${role}-${sequence}`;

  const age = 25 + Math.floor(rng.next() * 40);

  let phase: StaffCareerPhase = "established";
  if (age < 30) phase = "apprentice";
  else if (age > 55) phase = "declining";
  else if (age > 45) phase = "senior";

  const REPUTATION_BANDS: ReputationBand[] = ["unknown", "questionable", "respected", "renowned", "legendary"];
  const LOYALTY_BANDS: LoyaltyBand[] = ["mercenary", "wavering", "stable", "devoted", "unshakable"];
  const COMPETENCE_BANDS: CompetenceBand[] = ["feeble", "limited", "serviceable", "strong", "great", "dominant", "monstrous"];

  return {
    id,
    name: `Staff Member ${Math.floor(rng.next() * 1000)}`,
    role,
    age,
    careerPhase: phase,
    reputationBand: rollBand(rng, REPUTATION_BANDS) as ReputationBand,
    loyaltyBand: rollBand(rng, LOYALTY_BANDS) as LoyaltyBand,
    competenceBands: {
      primary: rollBand(rng, COMPETENCE_BANDS) as CompetenceBand,
      secondary: rng.next() > 0.5 ? rollBand(rng, COMPETENCE_BANDS) as CompetenceBand : undefined,
    },
    fatigue: Math.floor(rng.next() * 20),
    scandalExposure: Math.floor(rng.next() * 10),
    yearsAtBeya: Math.max(0, Math.floor(rng.next() * (age - 20))),
    priorAffiliations: [],
    successorEligible: role === "assistant_oyakata" && age > 40 && rng.next() > 0.5
  };
}

export function tickStaffWeek(world: WorldState): void {
  if (!world.staff) return;

  for (const staff of world.staff.values()) {
    staff.fatigue = Math.max(0, Math.min(100, staff.fatigue + 1));
  }
}

export function tickStaffYear(world: WorldState): void {
  if (!world.staff) return;

  for (const staff of world.staff.values()) {
    staff.age += 1;
    staff.yearsAtBeya += 1;

    // Phase transitions
    if (staff.careerPhase === "apprentice" && staff.age >= 30) staff.careerPhase = "established";
    else if (staff.careerPhase === "established" && staff.age >= 45) staff.careerPhase = "senior";
    else if (staff.careerPhase === "senior" && staff.age >= 55) staff.careerPhase = "declining";
    else if (staff.careerPhase === "declining" && staff.age >= 65) staff.careerPhase = "retired";
  }
}

/**
 * Hire a new staff member for a heya.
 * Cost: ¥500,000 baseline.
 */
export function hireStaff(world: WorldState, heyaId: Id, role: StaffRole): Staff | null {
  const heya = world.heyas.get(heyaId);
  if (!heya) return null;

  const HIRE_COST = 500_000;
  if (heya.funds < HIRE_COST) return null;

  heya.funds -= HIRE_COST;

  const sequence = (heya.staffIds?.length || 0) + 1;
  const staff = generateStaff(world.seed, role, heyaId, sequence);

  // Add to world
  if (!world.staff) world.staff = new Map();
  world.staff.set(staff.id, staff);

  // Add to heya
  if (!heya.staffIds) heya.staffIds = [];
  heya.staffIds.push(staff.id);

  return staff;
}

/**
 * Fire a staff member.
 */
export function fireStaff(world: WorldState, heyaId: Id, staffId: string): boolean {
  const heya = world.heyas.get(heyaId);
  if (!heya) return false;

  // Remove from heya list
  if (heya.staffIds) {
    heya.staffIds = heya.staffIds.filter(id => id !== staffId);
  }

  // Remove from world map
  if (world.staff) {
    world.staff.delete(staffId);
  }

  return true;
}

