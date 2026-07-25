import { createImpactBuilder } from "./core/ImpactBuilder";
import type { StateImpact } from "./core/StateImpact";
import type { WorldState } from "./types/world";
import type { Rikishi } from "./types/rikishi";
import type { Id } from "./types/common";
import { getRivalry, makeRivalryKey } from "./rivalries";
import { getHeya, getRikishi } from "./queries";
import { isSekitoriRank } from "@/constants/engine/rankDisplay";
import type { Heya } from "./types/heya";
import { MentorshipService } from "./systems/training/MentorshipService";
import type { HistoricalOyakata, OyakataAchievements } from "./types/history";

export interface LineageEdge {
  mentorId: Id;
  menteeId: Id;
  sinceYear: number;
  sinceWeek: number;
}

export function ensureLineage(world: WorldState): LineageEdge[] {
  if (!world.lineage) return [];
  return world.lineage;
}

/**
 * Assigns a mentor to a mentee.
 * Returns a StateImpact describing the link and rivalry seeding instead of mutating directly.
 */
export function assignMentor(
  world: WorldState,
  menteeId: Id,
  mentorId: Id
): { ok: boolean; reason?: string; impact?: StateImpact } {
  if (menteeId === mentorId) return { ok: false, reason: "Cannot mentor self." };

  const mentee = getRikishi(world, menteeId);
  const mentor = getRikishi(world, mentorId);
  if (!mentee || !mentor) return { ok: false, reason: "Invalid mentor or mentee." };

  // Eligibility check is delegated to the canonical MentorshipService so UI and
  // engine share the same rules.
  if (!MentorshipService.canMentor(mentor, mentee)) {
    return { ok: false, reason: "Ineligible mentorship pair." };
  }

  const builder = createImpactBuilder("assignMentor");
  let currentLineage = [...ensureLineage(world)];

  // 1. Link logic
  // remove previous mentor link if any
  if (mentee.mentorId) {
    currentLineage = currentLineage.filter((e) => e.menteeId !== menteeId);

    // Remove mentee from previous mentor's list
    const prevMentor = getRikishi(world, mentee.mentorId);
    if (prevMentor && prevMentor.menteeIds) {
      builder.updateRikishi(mentee.mentorId, {
        menteeIds: prevMentor.menteeIds.filter((id) => id !== menteeId),
      });
    }
  }

  // Update mentee
  builder.updateRikishi(menteeId, { mentorId });

  // Update new mentor
  const nextMenteeIds = mentor.menteeIds || [];
  if (!nextMenteeIds.includes(menteeId)) {
    builder.updateRikishi(mentorId, {
      menteeIds: [...nextMenteeIds, menteeId],
    });
  }

  // Update world lineage list
  currentLineage.push({
    mentorId: mentorId,
    menteeId: menteeId,
    sinceYear: world.year,
    sinceWeek: world.week,
  });
  builder.updateWorldField("lineage", currentLineage);

  // 2. Rivalry seeding
  if (world.rivalriesState) {
    let pair = getRivalry(world.rivalriesState, menteeId, mentorId);
    const rivalriesState = {
      ...world.rivalriesState,
      pairs: { ...(world.rivalriesState.pairs || {}) },
    };

    if (!pair) {
      pair = {
        key: makeRivalryKey(menteeId, mentorId),
        aId: menteeId < mentorId ? menteeId : mentorId,
        bId: menteeId < mentorId ? mentorId : menteeId,
        sameHeya: mentee.heyaId === mentor.heyaId,
        meetings: 0,
        lastMetWeek: world.week,
        aWins: 0,
        bWins: 0,
        closeness: 0,
        spite: 0,
        heat: 20,
        tone: "mentor_student",
        triggers: {},
      };
    } else {
      pair = {
        ...pair,
        tone: "mentor_student",
        heat: Math.max(pair.heat, 20),
      };
    }

    rivalriesState.pairs[pair.key] = pair;
    builder.updateWorldField("rivalriesState", rivalriesState);
  }

  return { ok: true, impact: builder.build() };
}

export function getMentor(world: WorldState, r: Rikishi): Rikishi | undefined {
  if (!r.mentorId) return undefined;
  return getRikishi(world, r.mentorId);
}

export function menteesOf(world: WorldState, r: Rikishi): Rikishi[] {
  const ids = r.menteeIds || [];
  const out: Rikishi[] = [];
  for (const id of ids) {
    const mentee = getRikishi(world, id);
    if (mentee) out.push(mentee);
  }
  return out;
}

/**
 * Records the transition of stable leadership from one Oyakata to another.
 * Returns StateImpact describing the leadership change.
 */
export function recordOyakataHandover(
  world: WorldState,
  heyaId: Id,
  newOyakataId: Id,
  newOyakataName: string
): StateImpact {
  const builder = createImpactBuilder("recordOyakataHandover");
  const heya = getHeya(world, heyaId);
  if (!heya) return builder.build();

  const nextLineage = [...(heya.lineage || [])];
  const currentGen = nextLineage.length + 1;

  // Close the current tenure if exists
  if (nextLineage.length > 0) {
    const lastIdx = nextLineage.length - 1;
    const lastTenure = { ...nextLineage[lastIdx] };
    if (!lastTenure.endYear) {
      lastTenure.endYear = world.year;
      // Capture achievements for the outgoing master
      lastTenure.achievements = calculateTenureAchievements(world, heya);
      nextLineage[lastIdx] = lastTenure;
    }
  }

  // Start new tenure
  const newTenure: HistoricalOyakata = {
    oyakataId: newOyakataId,
    name: newOyakataName,
    generation: currentGen,
    startYear: world.year,
    achievements: {
      titlesWon: 0,
      rekishiProducedCount: 0,
      sekitoriCount: 0,
      specialAwards: [],
    },
  };

  nextLineage.push(newTenure);

  builder.updateHeya(heyaId, {
    lineage: nextLineage,
    oyakataId: newOyakataId,
  });

  return builder.build();
}

/**
 * Calculates tenure achievements for the currently retiring Oyakata.
 */
function calculateTenureAchievements(world: WorldState, heya: Heya): OyakataAchievements {
  const rikishiIds = heya.rikishiIds || [];
  let sekitoriCount = 0;
  let winners = 0;

  for (const rid of rikishiIds) {
    const r = getRikishi(world, rid);
    if (!r) continue;

    const rank = r.rank.toLowerCase();
    if (isSekitoriRank(rank)) {
      sekitoriCount++;
    }

    if ((r.careerRecord?.yusho || 0) > 0) winners++;
  }

  return {
    titlesWon: winners,
    rekishiProducedCount: rikishiIds.length,
    sekitoriCount: sekitoriCount,
    specialAwards: [],
  };
}

export interface LineageTreeNode {
  id: Id;
  shikona: string;
  rank: string;
  depth: number;
}

/**
 * Recursively traces the mentorship lineage of a rikishi.
 */
export function getLineageTree(
  world: WorldState,
  rikishiId: Id,
  depth: number = 0
): LineageTreeNode[] {
  const r = getRikishi(world, rikishiId);
  if (!r || depth > 5) return [];

  const mentorId = r.mentorId;
  if (!mentorId) return [];

  const mentor = getRikishi(world, mentorId);
  if (!mentor) return [];

  return [
    {
      id: mentorId,
      shikona: mentor.shikona || mentor.name || "Unknown",
      rank: mentor.rank,
      depth: depth,
    },
    ...getLineageTree(world, mentorId, depth + 1),
  ];
}
