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
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { processYearEndInduction, createEmptyHallOfFame } from "../../hallOfFame";
import * as npcAI from "../../npcAI";
import { updateAvatarForAging, updateHairstyleForPromotion } from "../../avatarGenerator";
import { processYearlyEraDrift } from "../../systems/meta/EraDriftService";
import { InfrastructureService } from "../../systems/economy/InfrastructureService";
import { GlobalCupService } from "../../systems/basho/GlobalCupService";
import { HistoryService } from "../../systems/meta/HistoryService";
import { runElections } from "../../governance/GovernanceService";
import { DynastyService } from "../../systems/legacy/DynastyService";
import { WorldCircuitService } from "../../systems/global/WorldCircuitService";
import { TrainingPhilosophyService } from "../../systems/legacy/TrainingPhilosophyService";
import { TalentPoolService } from "../../systems/generation/TalentPoolService";
import { getRikishi } from "../../queries";

export function phase06_yearly_boundary(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase06_yearly_boundary");
  const boundaries = world.transientContext?.boundaries;
  // 0.2 Global Cup — initialize on Jan 1 year boundary.
  // Advancement runs via phase_global_cup_advance in the off-season pipeline.
  if (boundaries?.yearBoundary && !world.globalCup?.isActive) {
    const cupImpact = GlobalCupService.initializeTournament(world);
    builder.merge(cupImpact);
  }

  // Only proceed with heavy yearly tasks on the actual Jan 1st boundary
  if (!boundaries?.yearBoundary) return builder.build();

  // 0. Era Drift & Meta Evolution (E6)
  const eraImpact = processYearlyEraDrift(world);
  builder.merge(eraImpact);

  // 0.1 Infrastructure Construction Tick (P2)
  const infraImpact = InfrastructureService.processCompletionTick(world);
  builder.merge(infraImpact);

  // 0.3 Phase 5: Legacy & World Circuit
  // Succession checks for all stables
  builder.merge(DynastyService.tickSuccessionCheck(world));

  // World Circuit invitations
  for (const heyaId of world.heyas.keys()) {
    builder.merge(WorldCircuitService.generateYearlyInvitations(world, heyaId));
  }

  // 0.4 All-Time Records & Legacy (Phase 3)
  // Update records for all active rikishi at year end
  for (const rikishiId of world.activeRikishiIds) {
    const rikishi = getRikishi(world, rikishiId);
    if (!rikishi) continue;
    if (rikishi.careerWins > 100 || rikishi.rank === "yokozuna") {
      builder.merge(HistoryService.updateAllTimeRecords(world, rikishi));
    }
  }

  // 0.4 JSA Board Elections (Phase 4: Bi-Annual)
  if (world.year % 2 === 0) {
    const electionImpact = runElections(world);
    builder.merge(electionImpact);
  }

  // 1. Hall of Fame Inductions
  const currentHoF = world.hallOfFame || createEmptyHallOfFame();
  const clonedHoF = {
    ...currentHoF,
    inductees: [...currentHoF.inductees],
    inducted: { ...currentHoF.inducted },
  };

  // We temporarily mock world.hallOfFame for the mutative function call
  // This is a "controlled mutation" within a local clone
  const mockWorld = { ...world, hallOfFame: clonedHoF };
  const inductees = processYearEndInduction(mockWorld);

  builder.updateWorldField("hallOfFame", mockWorld.hallOfFame);

  for (const inductee of inductees) {
    builder.logEvent(
      "LIFECYCLE_EVENT",
      "career",
      {
        rikishiId: inductee.rikishiId,
        shikona: inductee.shikona,
        status: "hof_induction",
        reason: inductee.category,
        score: inductee.stats.yushoCount ?? 0,
      },
      { rikishiId: inductee.rikishiId }
    );
  }

  // 2. Talent Pool Refresh
  if (world.talentPool) {
    builder.merge(TalentPoolService.tickYear(world));
  }

  // 3. NPC Yearly Logic
  builder.merge(npcAI.tickYear(world));

  // 4. Staff Aging
  if (world.staff) {
    const nextStaff = new Map(world.staff);
    for (const [id, staff] of world.staff) {
      const s = { ...staff };
      s.age += 1;
      s.yearsAtBeya += 1;

      if (s.careerPhase === "apprentice" && s.age >= 30) s.careerPhase = "established";
      else if (s.careerPhase === "established" && s.age >= 45) s.careerPhase = "senior";
      else if (s.careerPhase === "senior" && s.age >= 55) s.careerPhase = "declining";
      else if (s.careerPhase === "declining" && s.age >= 65) s.careerPhase = "retired";

      nextStaff.set(id, s);
    }
    builder.updateWorldField("staff", nextStaff);
  }

  // 5. Rikishi Avatar Aging & Physical Aging
  if (world.rikishi) {
    for (const id of world.activeRikishiIds) {
      const r = getRikishi(world, id);
      if (!r) continue; // Skip retired rikishi - they don't need age/avatar updates
      const age = world.year - r.birthYear;
      const isSekitori = r.division === "makuuchi" || r.division === "juryo";

      // Explicitly update rikishi age property for metrics and checks
      builder.updateRikishi(id, { age });

      if (r.avatarConfig) {
        const updated = updateAvatarForAging(r.avatarConfig, age);
        const withHairstyle = updateHairstyleForPromotion(updated, isSekitori);
        builder.updateRikishi(id, { avatarConfig: withHairstyle });
      }
    }
  }

  // 6. Oyakata Avatar Aging & Tenure
  if (world.oyakata) {
    const nextOyakata = new Map(world.oyakata);
    for (const [id, o] of world.oyakata) {
      const updated = { ...o };
      updated.age += 1;
      updated.yearsInCharge = (updated.yearsInCharge || 0) + 1;

      if (o.avatarConfig) {
        updated.avatarConfig = updateAvatarForAging(o.avatarConfig, updated.age);
      }
      nextOyakata.set(id, updated);
    }
    builder.updateWorldField("oyakata", nextOyakata);
  }

  // Phase 5 Depth: Training Philosophy Drift
  if (world.heyas) {
    for (const heya of world.heyas.values()) {
      if (heya.trainingPhilosophy) {
        const drifted = TrainingPhilosophyService.tickPhilosophyDrift(heya.trainingPhilosophy);
        if (drifted !== heya.trainingPhilosophy) {
          builder.updateHeya(heya.id, { trainingPhilosophy: drifted });
        }
      }
    }
  }

  // 7. Logging & Era Check
  const newYear = world.year;
  const isDecadeBoundary = newYear % 10 === 0;
  const hofNames = inductees.map((i) => i.shikona);
  builder.logEvent("BASHO_STATUS", "narrative", {
    status: "meta_shift",
    incident: isDecadeBoundary ? "decade_boundary" : "year_boundary",
    day: newYear,
    score: hofNames.length,
    reason: hofNames.length > 0 ? hofNames.join("|") : "None",
  });

  // 8. Sync & Increment Authoritative Year (E4/C5)
  const nextYear = (world.calendar?.year || world.year) + 1;
  builder.updateWorldField("year", nextYear);
  builder.updateWorldField("calendar", {
    ...world.calendar,
    currentWeek: world.calendar?.currentWeek ?? 1,
    year: nextYear,
  });

  return builder.build();
}
