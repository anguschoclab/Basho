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
import type { Heya } from "./types/heya";
import type { HistoricalOyakata } from "./history";

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

/**
 * Records the transition of stable leadership from one Oyakata to another.
 */
export function recordOyakataHandover(world: WorldState, heyaId: Id, newOyakataId: Id, newOyakataName: string) {
  const heya = world.heyas.get(heyaId);
  if (!heya) return;

  if (!heya.lineage) heya.lineage = [];

  const currentGen = heya.lineage.length + 1;

  // Close the current tenure if exists
  if (heya.lineage.length > 0) {
    const lastTenure = heya.lineage[heya.lineage.length - 1];
    if (!lastTenure.endYear) {
      lastTenure.endYear = world.year;
      // Capture achievements for the outgoing master
      lastTenure.achievements = calculateTenureAchievements(world, heya);
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
        specialAwards: []
    }
  };

  heya.lineage.push(newTenure);
  heya.oyakataId = newOyakataId;
}

/**
 * Calculates tenure achievements for the currently retiring Oyakata.
 */
function calculateTenureAchievements(world: WorldState, heya: Heya): any {
    const rikishiIds = heya.rikishiIds || [];
    let sekitoriCount = 0;
    let maxRankIdx = 999;
    let winners = 0;

    const rikishiMap = world.rikishi instanceof Map ? world.rikishi : new Map(Object.entries(world.rikishi)) as Map<Id, Rikishi>;

    for (const rid of rikishiIds) {
        const r = rikishiMap.get(rid);
        if (!r) continue;
        
        const rank = r.rank.toLowerCase();
        if (["yokozuna", "ozeki", "sekiwake", "komusubi", "maegashira", "juryo"].includes(rank)) {
            sekitoriCount++;
        }
        
        if (r.careerRecord?.yusho > 0) winners++;
    }

    return {
        titlesWon: winners,
        rekishiProducedCount: rikishiIds.length,
        sekitoriCount: sekitoriCount,
        specialAwards: []
    };
}

/**
 * Recursively traces the mentorship lineage of a rikishi.
 */
export function getLineageTree(world: WorldState, rikishiId: Id, depth: number = 0): any[] {
    const rikishiMap = world.rikishi instanceof Map ? world.rikishi : new Map(Object.entries(world.rikishi)) as Map<Id, Rikishi>;
    const r = rikishiMap.get(rikishiId);
    if (!r || depth > 5) return [];

    const mentorId = r.mentorId;
    if (!mentorId) return [];

    const mentor = rikishiMap.get(mentorId);
    if (!mentor) return [];

    return [
        { 
            id: mentorId, 
            shikona: mentor.shikona, 
            rank: mentor.rank,
            depth: depth 
        },
        ...getLineageTree(world, mentorId, depth + 1)
    ];
}
