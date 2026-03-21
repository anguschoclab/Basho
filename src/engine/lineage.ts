// @ts-nocheck
/**
 * File Name: src/engine/lineage.ts
 * Mentorship and lineage tracking (Oyakata -> Rikishi or Senior Rikishi -> Junior Rikishi).
 * Re-implemented from legacy Sumo repo to fit the new game's strict deterministic state.
 */

import type { WorldState } from "./types/world";
import type { Rikishi } from "./types/rikishi";
import type { Id } from "./types/common";
import { getRivalry, upsertRivalry, makeRivalryKey } from "./rivalries";

export interface LineageEdge {
  mentorId: Id;
  menteeId: Id;
  sinceYear: number;
  sinceWeek: number;
}

export function ensureLineage(world: WorldState): LineageEdge[] {
  if (!world.lineage) world.lineage = [];
  return world.lineage;
}

export function assignMentor(world: WorldState, menteeId: Id, mentorId: Id): string {
  if (menteeId === mentorId) return 'Cannot mentor self.';
  
  const rikishiMap = world.rikishi instanceof Map ? world.rikishi : new Map(Object.entries(world.rikishi)) as Map<Id, Rikishi>;
  const mentee = rikishiMap.get(menteeId);
  const mentor = rikishiMap.get(mentorId);
  if (!mentee || !mentor) return 'Invalid mentor or mentee.';

  ensureLineage(world);

  // remove previous mentor link if any
  if (mentee.mentorId) {
    world.lineage = world.lineage.filter(e => e.menteeId !== menteeId);
    // Remove mentee from previous mentor's list
    const prevMentor = rikishiMap.get(mentee.mentorId);
    if (prevMentor && prevMentor.menteeIds) {
      prevMentor.menteeIds = prevMentor.menteeIds.filter(id => id !== menteeId);
    }
  }

  mentee.mentorId = mentorId;
  mentor.menteeIds = mentor.menteeIds || [];
  if (!mentor.menteeIds.includes(menteeId)) {
    mentor.menteeIds.push(menteeId);
  }

  world.lineage.push({ 
    mentorId: mentorId, 
    menteeId: menteeId, 
    sinceYear: world.year, 
    sinceWeek: world.week 
  });

  // Automatically seed a mentor_student rivalry
  if (world.rivalriesState) {
    let pair = getRivalry(world.rivalriesState, menteeId, mentorId);
    if (!pair) {
      pair = {
        key: makeRivalryKey(menteeId, mentorId),
        aId: menteeId < mentorId ? menteeId : mentorId,
        bId: menteeId < mentorId ? mentorId : menteeId,
        sameHeya: mentee.heyaId === mentor.heyaId,
        meetings: 0,
        lastWeek: world.week,
        heat: 0,
        tone: "respect",
        triggers: {}
      };
    }
    pair.tone = "mentor_student";
    pair.heat = Math.max(pair.heat, 20);
    upsertRivalry(world.rivalriesState, pair);
  }

  return `${mentor.shikona} is now mentoring ${mentee.shikona}.`;
}

export function getMentor(world: WorldState, r: Rikishi): Rikishi | undefined {
  if (!r.mentorId) return undefined;
  const rikishiMap = world.rikishi instanceof Map ? world.rikishi : new Map(Object.entries(world.rikishi)) as Map<Id, Rikishi>;
  return rikishiMap.get(r.mentorId);
}

export function menteesOf(world: WorldState, r: Rikishi): Rikishi[] {
  const ids = r.menteeIds || [];
  const rikishiMap = world.rikishi instanceof Map ? world.rikishi : new Map(Object.entries(world.rikishi)) as Map<Id, Rikishi>;
  return ids.reduce<Rikishi[]>((acc, id) => {
    const r = rikishiMap.get(id);
    if (r) acc.push(r);
    return acc;
  }, []);
}
