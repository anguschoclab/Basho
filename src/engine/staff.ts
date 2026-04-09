import type { Staff, StaffRole, StaffCareerPhase, CompetenceBand, ReputationBand, LoyaltyBand } from "./types/staff";
import { type SeededRNG, rngFromSeed } from "./rng";
import type { Id } from "./types/common";
import type { WorldState } from "./types/world";

function rollBand(rng: SeededRNG, bands: readonly any[]): any {
  return bands[Math.floor(rng.next() * bands.length)];
}

export function generateStaff(seed: string, role: StaffRole, heyaId: Id, sequence: number): Staff {
  const rng = rngFromSeed(seed, "staff", `${heyaId}-${role}-${sequence}`);

  const id = rng.uuid('ST');

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
    heyaId,
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
    fatigue: Math.floor(rng.next() * 10),
    morale: 70 + Math.floor(rng.next() * 30), // Start with good morale
    scandalExposure: Math.floor(rng.next() * 10),
    yearsAtBeya: Math.max(0, Math.floor(rng.next() * (age - 20))),
    priorAffiliations: [],
    successorEligible: role === "assistant_oyakata" && age > 40 && rng.next() > 0.5
  };
}

export function tickStaffWeek(world: WorldState): void {
  if (!world.staff || !world.heyas) return;

  for (const heya of world.heyas.values()) {
    const rikishiCount = (heya.rikishiIds || []).length;
    const staffIds = heya.staffIds || [];
    const staffCount = staffIds.length;

    // Roster Load Logic (Constitution Recommendation: 1 staff per 4 rikishi)
    // If ratio is poor, staff get tired. If ratio is good, they recover.
    const capacity = Math.max(1, staffCount * 4);
    const overload = rikishiCount > capacity;
    const loadFactor = rikishiCount / capacity;

    for (const sId of staffIds) {
      const staff = world.staff.get(sId);
      if (!staff || staff.careerPhase === "retired") continue;

      if (overload) {
        // Gain fatigue based on how much they are over-capacity
        const fatigueGain = Math.ceil(loadFactor * 2);
        staff.fatigue = Math.min(100, staff.fatigue + fatigueGain);
        
        // Morale penalty for overwork
        staff.morale = Math.max(0, staff.morale - (loadFactor > 1.5 ? 2 : 1));
      } else {
        // Recover fatigue if under capacity
        staff.fatigue = Math.max(0, staff.fatigue - 5);
        
        // Morale boost for manageable workload
        if (staff.fatigue < 20) {
          staff.morale = Math.min(100, staff.morale + 1);
        }
      }

      // Natural morale decay/recovery towards 70
      if (staff.morale > 70 && !overload) staff.morale -= 0.1;
      if (staff.morale < 30) {
        // Risk of resignation if morale is bottomed out (handled in logic/events)
      }
    }
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


/**
 * Calculate aggregate staff bonuses for a heya.
 * Rules:
 * - Bonuses stack: Total = 1 + sum(bonuses)
 * - Different roles provide different base bonuses.
 */
export interface StaffBonuses {
  technique: number;     // e.g. 1.15
  conditioning: number;  // e.g. 1.10
  medical: number;       // e.g. 1.20
  scouting: number;      // e.g. 1.10
  administration: number;// e.g. 0.90 (cost reduction)
}

export function getHeyaStaffBonuses(world: WorldState, heyaId: Id): StaffBonuses {
  const heya = world.heyas.get(heyaId);
  const bonuses: StaffBonuses = {
    technique: 1.0,
    conditioning: 1.0,
    medical: 1.0,
    scouting: 1.0,
    administration: 1.0
  };

  if (!heya || !heya.staffIds || !world.staff) return bonuses;

  const BAND_VALUES: Record<CompetenceBand, number> = {
    feeble: 0.01,
    limited: 0.05,
    serviceable: 0.10,
    strong: 0.15,
    great: 0.20,
    dominant: 0.30,
    monstrous: 0.50
  };

  for (const staffId of heya.staffIds) {
    const staff = world.staff.get(staffId);
    if (!staff || staff.careerPhase === "retired") continue;

    // Fatigue and Morale Efficiency Mapping
    // High fatigue (>80) drops efficiency significantly.
    // Morale acts as a multiplier to the final bonus.
    
    const fatigueFactor = staff.fatigue > 80 ? 0.4 : staff.fatigue > 50 ? 0.7 : 1.0;
    const moraleFactor = staff.morale > 90 ? 1.15 : staff.morale < 30 ? 0.6 : 1.0;
    
    const efficiency = fatigueFactor * moraleFactor;

    const primaryBonus = BAND_VALUES[staff.competenceBands.primary] * efficiency;
    const secondaryBonus = staff.competenceBands.secondary 
      ? BAND_VALUES[staff.competenceBands.secondary] * 0.4 * efficiency
      : 0;
    
    const totalStaffBonus = primaryBonus + secondaryBonus;

    switch (staff.role) {
      case "technique_coach":
        bonuses.technique += totalStaffBonus;
        break;
      case "conditioning_coach":
        bonuses.conditioning += totalStaffBonus;
        break;
      case "medical_staff":
        bonuses.medical += totalStaffBonus;
        break;
      case "scout":
        bonuses.scouting += totalStaffBonus;
        break;
      case "administrator":
        // Administration reduces costs, so we subtract from the multiplier
        bonuses.administration -= (totalStaffBonus * 0.5); 
        break;
      case "assistant_oyakata":
        // Generalist: provides small boost to everything
        bonuses.technique += totalStaffBonus * 0.2;
        bonuses.conditioning += totalStaffBonus * 0.2;
        bonuses.medical += totalStaffBonus * 0.2;
        break;
    }
  }

  // Clamping
  bonuses.administration = Math.max(0.7, bonuses.administration); // Max 30% discount

  return bonuses;
}
