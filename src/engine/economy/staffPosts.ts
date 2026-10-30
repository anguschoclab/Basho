/**
 * src/engine/economy/staffPosts.ts
 * ================================
 * Staff posts & contracts (P2): per-role slot caps, wages, contract expiry,
 * severance, and the monthly-refreshed candidate pool.
 */

import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import type { Staff, StaffCandidate, StaffRole, CompetenceBand } from "@/engine/types/staff";
import type { StateImpact } from "@/engine/core/StateImpact";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { RNGRegistry } from "@/engine/core/RNGRegistry";
import { getHeya } from "@/engine/core/queries";
import { generateStaff } from "@/engine/economy/staff";

/** Default slot caps per post (P2). Unlisted roles are uncapped. */
export const STAFF_POST_SLOTS: Partial<Record<StaffRole, number>> = {
  technique_coach: 2,
  conditioning_coach: 2,
  scout: 2,
  nutritionist: 1,
  medical_staff: 1,
  assistant_oyakata: 1,
  administrator: 1,
};

export const SEVERANCE_MONTHS = 3;
export const CANDIDATE_POOL_SIZE = 5;

/** Ensure staffPosts exists on a heya, derived from staffIds when absent. */
export function ensureStaffPosts(heya: Heya): NonNullable<Heya["staffPosts"]> {
  if (heya.staffPosts) return heya.staffPosts;
  const posts: NonNullable<Heya["staffPosts"]> = {};
  return posts;
}

/** Filled count for a role (from staffIds when posts aren't tracked). */
export function filledSlots(world: WorldState, heya: Heya, role: StaffRole): number {
  const posts = heya.staffPosts?.[role];
  if (posts) return posts.filledIds.length;
  return (heya.staffIds ?? []).filter((id) => world.staff.get(id)?.role === role).length;
}

/** Remaining open slots for a role. */
export function openSlots(world: WorldState, heya: Heya, role: StaffRole): number {
  const cap = STAFF_POST_SLOTS[role];
  if (cap === undefined) return Infinity;
  return Math.max(0, cap - filledSlots(world, heya, role));
}

/** Is the post for `role` currently vacant (0 filled)? */
export function postVacant(world: WorldState, heya: Heya, role: StaffRole): boolean {
  return filledSlots(world, heya, role) === 0;
}

export function severanceCost(staff: Staff): number {
  return (staff.wageYen ?? 0) * SEVERANCE_MONTHS;
}

/** Monthly wage bill for a heya (0 for legacy staff without wages). */
export function monthlyWageBill(world: WorldState, heyaId: string): number {
  const heya = getHeya(world, heyaId);
  if (!heya) return 0;
  return (heya.staffIds ?? []).reduce(
    (sum, id) => sum + (world.staff.get(id)?.wageYen ?? 0),
    0
  );
}

/** Skill score (0–10) derived from competence bands. */
export function skillFromBands(bands: { primary: CompetenceBand; secondary?: CompetenceBand }): number {
  const bandVal: Record<CompetenceBand, number> = {
    feeble: 1,
    limited: 3,
    serviceable: 5,
    strong: 6,
    great: 8,
    dominant: 9,
    monstrous: 10,
  };
  const p = bandVal[bands.primary] ?? 5;
  const s = bands.secondary ? (bandVal[bands.secondary] ?? 5) * 0.5 : 0;
  return Math.min(10, Math.round((p + s) * 10) / 10);
}

const BAND_FROM_SKILL: CompetenceBand[] = [
  "feeble",
  "feeble",
  "limited",
  "limited",
  "serviceable",
  "serviceable",
  "strong",
  "great",
  "great",
  "dominant",
  "monstrous",
];

function bandFromSkill(skill: number): CompetenceBand {
  return BAND_FROM_SKILL[Math.max(0, Math.min(10, Math.round(skill)))];
}

const CANDIDATE_ROLES: StaffRole[] = [
  "technique_coach",
  "conditioning_coach",
  "scout",
  "nutritionist",
  "medical_staff",
  "administrator",
];

const SURNAMES = [
  "Yamaguchi", "Takahashi", "Saito", "Kobayashi", "Endo", "Kuroda",
  "Matsuda", "Ishihara", "Ogawa", "Fujimori", "Hasebe", "Nakazono",
];
const GIVEN = [
  "Kenji", "Tetsuo", "Saburo", "Yukio", "Mitsuo", "Goro", "Haruki",
  "Daigo", "Shun", "Kanta", "Masaru", "Osamu",
];

/** Monthly candidate-pool refresh — deterministic by (seed, year, month). */
export function refreshStaffCandidatePool(world: WorldState): StateImpact {
  const builder = createImpactBuilder("refreshStaffCandidatePool");
  const rng = RNGRegistry.getSystemRNG(
    world,
    "npcPersonnel",
    `candidates_${world.year ?? 0}_${world.calendar?.month ?? world.week ?? 0}`
  );
  const pool: StaffCandidate[] = [];
  for (let i = 0; i < CANDIDATE_POOL_SIZE; i++) {
    const role = CANDIDATE_ROLES[rng.int(0, CANDIDATE_ROLES.length - 1)];
    const skill = 2 + rng.int(0, 8);
    const wageYen = 40_000 + skill * 30_000 + rng.int(0, 20) * 1_000;
    pool.push({
      id: `staffcand_${world.year ?? 0}_${world.calendar?.month ?? 0}_${i}`,
      name: `${SURNAMES[rng.int(0, SURNAMES.length - 1)]} ${GIVEN[rng.int(0, GIVEN.length - 1)]}`,
      role,
      age: 30 + rng.int(0, 25),
      skill,
      wageYen,
      contractEndYear: (world.year ?? 0) + 1,
      competenceBands: {
        primary: bandFromSkill(skill),
        secondary: skill > 5 ? bandFromSkill(skill - 3) : undefined,
      },
      reputationBand: skill >= 8 ? "renowned" : skill >= 6 ? "respected" : "unknown",
    });
  }
  builder.updateWorldField("staffCandidatePool", pool);
  return builder.build();
}

/** Hire a candidate from the pool — cost = signing fee + first wage reserved. */
export function hireStaffCandidate(
  world: WorldState,
  heyaId: string,
  candidateId: string
): StateImpact {
  const builder = createImpactBuilder("hireStaffCandidate");
  const heya = getHeya(world, heyaId);
  const candidate = (world.staffCandidatePool ?? []).find((c) => c.id === candidateId);
  if (!heya || !candidate) return builder.build();
  if (openSlots(world, heya, candidate.role) <= 0) return builder.build();

  const signingFee = candidate.wageYen * 2;
  if ((heya.funds ?? 0) < signingFee) return builder.build();

  const staff = generateStaff(world.seed, candidate.role, heyaId, (heya.staffIds ?? []).length + 1);
  staff.name = candidate.name;
  staff.skill = candidate.skill;
  staff.wageYen = candidate.wageYen;
  staff.contractEndYear = candidate.contractEndYear;
  staff.competenceBands = candidate.competenceBands;
  staff.reputationBand = candidate.reputationBand;
  staff.age = candidate.age;

  const posts = { ...(heya.staffPosts ?? {}) };
  posts[candidate.role] = {
    slots: STAFF_POST_SLOTS[candidate.role] ?? 99,
    filledIds: [...(posts[candidate.role]?.filledIds ?? []), staff.id],
  };

  builder.updateHeya(heyaId, {
    funds: heya.funds - signingFee,
    staffIds: [...(heya.staffIds ?? []), staff.id],
    staffPosts: posts,
  });
  builder.addStaff(staff);
  builder.updateWorldField(
    "staffCandidatePool",
    (world.staffCandidatePool ?? []).filter((c) => c.id !== candidateId)
  );
  builder.logEvent(
    "MANAGEMENT_DECISION",
    "economy",
    {
      title: `Hired ${candidate.name} (${candidate.role})`,
      summary: `Signed ${candidate.name} — skill ${candidate.skill}/10, ¥${candidate.wageYen.toLocaleString("en-US")}/mo through ${candidate.contractEndYear}.`,
    },
    { heyaId, importance: "notable" }
  );
  return builder.build();
}

/**
 * Monthly staff contract processing: wages are deducted and contracts that
 * reached contractEndYear expire (released back to the world).
 */
export function tickMonthlyStaffContracts(world: WorldState): StateImpact {
  const builder = createImpactBuilder("tickMonthlyStaffContracts");
  const year = world.year ?? 0;
  for (const [heyaId, heya] of world.heyas) {
    const wages = monthlyWageBill(world, heyaId);
    if (wages > 0) {
      builder.updateHeya(heyaId, { funds: Math.round(heya.funds - wages) });
    }
    for (const sid of heya.staffIds ?? []) {
      const s = world.staff.get(sid);
      if (s && s.contractEndYear !== undefined && year > s.contractEndYear) {
        builder.updateHeya(heyaId, {
          staffIds: (heya.staffIds ?? []).filter((id) => id !== sid),
          staffPosts: releaseFromPosts(heya, s),
        });
        builder.removeStaff(sid);
        builder.logEvent(
          "MANAGEMENT_DECISION",
          "economy",
          {
            title: `${s.name}'s contract expired`,
            summary: `${s.name} (${s.role}) has departed ${heya.name ?? heyaId} at the end of his contract.`,
          },
          { heyaId, importance: "minor" }
        );
      }
    }
  }
  return builder.build();
}

function releaseFromPosts(heya: Heya, staff: Staff): NonNullable<Heya["staffPosts"]> {
  const posts = { ...(heya.staffPosts ?? {}) };
  const post = posts[staff.role];
  if (post) {
    posts[staff.role] = { ...post, filledIds: post.filledIds.filter((id) => id !== staff.id) };
  }
  return posts;
}
