/**
 * phase06_yearly_boundary.ts
 * ==========================
 * Pipeline Phase: Yearly Institutional Updates.
 * 
 * Responsibilities:
 * 1. Process Hall of Fame inductions.
 * 2. Refresh talent pool.
 * 3. Age staff members and advance career phases.
 * 4. Record era shifts and decade boundaries.
 */

import type { WorldState } from "../../types/world";
import { 
  processYearEndInduction, 
  HOF_CATEGORY_LABELS 
} from "../../hallOfFame";
import * as talentpool from "../../systems/generation/TalentPoolService";
import * as npcAI from "../../npcAI";
import { EventBus } from "../../events";

export function phase06_yearly_boundary(world: WorldState): WorldState {
  const boundaries = world.transientContext?.boundaries;
  if (!boundaries?.yearBoundary) return world;

  let nextWorld = { ...world, year: world.calendar.year };
  
  // 1. Hall of Fame Inductions
  // Note: hallOfFame.ts is currently mutative on world.hallOfFame.
  // We'll clone the hallOfFame state first.
  if (nextWorld.hallOfFame) {
    nextWorld.hallOfFame = {
      ...nextWorld.hallOfFame,
      inductees: [...nextWorld.hallOfFame.inductees],
      inducted: { ...nextWorld.hallOfFame.inducted }
    };
  }

  const inductees = processYearEndInduction(nextWorld);
  const hofInductees = inductees.map((i) => i.shikona);

  for (const inductee of inductees) {
    EventBus.lifecycleEvent(nextWorld, {
      rikishiId: inductee.rikishiId,
      shikona: inductee.shikona,
      status: "hof_induction",
      reason: inductee.category,
      score: inductee.stats.yushoCount ?? 0
    });
  }

  // 2. Talent Pool Refresh
  // Simplified pure port of talentpool.tickYear
  if (nextWorld.talentPool) {
    nextWorld.talentPool = {
      ...nextWorld.talentPool,
      candidates: { ...nextWorld.talentPool.candidates }
    };
    // (Actual refresh logic would go here)
  }

  // 3. NPC Yearly Logic
  npcAI.tickYear(nextWorld);

  // 4. Staff Aging
  if (nextWorld.staff) {
    const nextStaff = new Map(nextWorld.staff);
    for (const [id, staff] of nextWorld.staff) {
      const s = { ...staff };
      s.age += 1;
      s.yearsAtBeya += 1;
      
      if (s.careerPhase === "apprentice" && s.age >= 30) s.careerPhase = "established";
      else if (s.careerPhase === "established" && s.age >= 45) s.careerPhase = "senior";
      else if (s.careerPhase === "senior" && s.age >= 55) s.careerPhase = "declining";
      else if (s.careerPhase === "declining" && s.age >= 65) s.careerPhase = "retired";
      
      nextStaff.set(id, s);
    }
    nextWorld.staff = nextStaff;
  }

  // 5. Logging & Era Check
  const newYear = nextWorld.year;
  const isDecadeBoundary = newYear % 10 === 0;
  EventBus.bashoStatus(nextWorld, {
    status: "meta_shift",
    incident: isDecadeBoundary ? "decade_boundary" : "year_boundary",
    day: newYear,
    score: hofInductees.length,
    reason: hofInductees.length > 0 ? hofInductees.join("|") : "None"
  });

  return nextWorld;
}
