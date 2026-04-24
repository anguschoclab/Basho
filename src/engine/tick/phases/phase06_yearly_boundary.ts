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
import { RNGRegistry } from "../../core/RNGRegistry";
import type { CombatArchetype, Style } from "../../types/combat";
import type { TalentCandidate } from "../../types/talent";
import { generateRikishiName } from "../../shikona";
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

export function phase06_yearly_boundary(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase06_yearly_boundary");
  const boundaries = world.transientContext?.boundaries;
  // 0.2 Global Cup & Worlds Exhibition (Phase 3)
  // Option B: Multi-day state machine.
  // Day 1: Initialize (triggered by yearBoundary)
  // Day 2-3: Advance (triggered as long as isActive is true)
  if (boundaries?.yearBoundary && !world.globalCup?.isActive) {
    const cupImpact = GlobalCupService.initializeTournament(world);
    builder.merge(cupImpact);
  } else if (world.globalCup?.isActive) {
    const cupImpact = GlobalCupService.advanceTournament(world);
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
  for (const rikishi of world.rikishi.values()) {
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

  // 5. Rikishi Avatar Aging
  if (world.rikishi) {
    for (const [id, r] of world.rikishi) {
      const age = world.year - r.birthYear;
      const isSekitori = r.division === "makuuchi" || r.division === "juryo";

      if (r.avatarConfig) {
        const updated = updateAvatarForAging(r.avatarConfig, age);
        const withHairstyle = updateHairstyleForPromotion(updated, isSekitori);
        builder.updateRikishi(id, { avatarConfig: withHairstyle });
      }
    }
  }

  // 6. Oyakata Avatar Aging
  if (world.oyakata) {
    for (const [id, o] of world.oyakata) {
      if (o.avatarConfig) {
        const updated = updateAvatarForAging(o.avatarConfig, o.age);
        builder.updateOyakata(id, { avatarConfig: updated });
      }
    }
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

  // 8. Global Cup Event - Log if tournament is active
  if (world.globalCup?.isActive) {
    builder.logEvent("GLOBAL_CUP", "narrative", {
      status: world.globalCup.phase,
      year: world.globalCup.year,
      participantCount: world.globalCup.participants.length,
    });
  }

  return builder.build();
}
