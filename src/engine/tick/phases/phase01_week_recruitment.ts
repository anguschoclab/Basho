/**
 * phase01_week_recruitment.ts — Pipeline Phase: Recruitment & Talent Pool.
 * Close/Open recruitment windows, automate NPC recruitment, maintain talent pool.
 */

import type { WorldState } from "../../types/world";
import type { Rikishi } from "../../types/rikishi";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import * as talentpool from "../../systems/generation/TalentPoolService";
import { assignMentor } from "../../lineage";
import { rngFromSeed } from "../../rng";

export function phase01_week_recruitment(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_week_recruitment");

  // 1. Talent Pool Weekly Tick (Intel Decay, Suitor resolution)
  builder.merge(talentpool.tickWeekTalentPool(world));

  // 2. Window Closing
  const rw = world._recruitmentWindow;
  if (rw?.isOpen && world.week >= rw.closesAtWeek) {
    builder.updateWorldField("_recruitmentWindow", { ...rw, isOpen: false });
    if (world.playerHeyaId) {
      builder.logEvent(
        "RECRUIT_DISCOVERED",
        "narrative",
        {
          rikishiId: world.playerHeyaId,
          heyaId: world.playerHeyaId,
          status: "window_closed",
          day: world.week,
        },
        { heyaId: world.playerHeyaId }
      );
    }
  }

  // 3. Mid-Interim Openings
  if (world.cyclePhase === "interim") {
    const elapsedWeeks = Math.floor((42 - (world._interimDaysRemaining ?? 0)) / 7);
    if (elapsedWeeks === 3 && !world._recruitmentWindow?.isOpen) {
      const playerHeya = world.playerHeyaId ? world.heyas.get(world.playerHeyaId) : null;

      if (playerHeya && playerHeya.welfareState?.complianceState !== "sanctioned") {
        builder.updateWorldField("_recruitmentWindow", {
          openedAtWeek: world.week,
          closesAtWeek: world.week + 2,
          vacancies: 0,
          isOpen: true,
          phase: "mid_interim",
        });
        builder.logEvent(
          "RECRUIT_DISCOVERED",
          "narrative",
          {
            rikishiId: playerHeya.id,
            heyaId: playerHeya.id,
            status: "window_opened",
            day: world.week,
            incident: "mid_interim",
          },
          { heyaId: playerHeya.id }
        );
      }
    }
  }

  // 4. NPC Opportunistic Recruitment
  const TARGET_ROSTER_SIZE = 30; // JSA average ~13, real max ~40; 30 gives each heya a healthy pipeline buffer that sustains the roster through demographic waves
  const CRITICAL_ROSTER_THRESHOLD = 12;
  const interimElapsedWeeks = world.cyclePhase === "interim"
    ? Math.floor((42 - (world._interimDaysRemaining ?? 0)) / 7)
    : -1;

  // Primary recruitment window: mid-interim (week 3)
  if (interimElapsedWeeks === 3) {
    const smallStables: Record<string, number> = {};
    let hasItems = false;
    for (const h of world.heyas.values()) {
      const currentCount = (h.rikishiIds ?? []).length;
      if (h.id !== world.playerHeyaId && currentCount < TARGET_ROSTER_SIZE) {
        smallStables[h.id] = Math.max(1, TARGET_ROSTER_SIZE - currentCount);
        hasItems = true;
      }
    }
    if (hasItems) {
      builder.merge(talentpool.fillVacanciesForNPCWithBidding(world, smallStables));
    }
  }

  // Secondary recruitment window: start of interim (week 0), for critically depleted stables only
  if (interimElapsedWeeks === 0) {
    const criticalStables: Record<string, number> = {};
    let hasCritical = false;
    for (const h of world.heyas.values()) {
      const currentCount = (h.rikishiIds ?? []).length;
      if (h.id !== world.playerHeyaId && currentCount < CRITICAL_ROSTER_THRESHOLD) {
        // Emergency fill: target up to TARGET_ROSTER_SIZE
        criticalStables[h.id] = Math.max(1, TARGET_ROSTER_SIZE - currentCount);
        hasCritical = true;
      }
    }
    if (hasCritical) {
      builder.merge(talentpool.fillVacanciesForNPCWithBidding(world, criticalStables));
    }
  }

  // 4b. Emergency recruitment: if population is critically low, recruit every week
  const totalActive = Array.from(world.rikishi.values()).filter(r => !r.isRetired).length;
  if (totalActive < 700) {
    const urgentVacancies: Record<string, number> = {};
    let hasUrgentVacancies = false;
    for (const h of world.heyas.values()) {
      const currentCount = (h.rikishiIds ?? []).length;
      if (h.id !== world.playerHeyaId && currentCount < TARGET_ROSTER_SIZE) {
        urgentVacancies[h.id] = Math.max(1, TARGET_ROSTER_SIZE - currentCount);
        hasUrgentVacancies = true;
      }
    }
    if (hasUrgentVacancies) {
      builder.merge(talentpool.fillVacanciesForNPCWithBidding(world, urgentVacancies));
    }
  }

  // 5. Finalize signed candidates into full Rikishi
  builder.merge(talentpool.finalizeSignedCandidates(world));

  // 6. Auto-assign mentors to newly recruited rikishi
  // Note: we look at CURRENT world state, but changes will be captured in impacts
  for (const heya of world.heyas.values()) {
    // ⚡ Bolt Optimization: Use a single loop instead of chained .map().filter().map()
    // This avoids intermediate array allocations and redundant iteration
    const potentialMentors: string[] = [];
    const juniorsWithoutMentors: Rikishi[] = [];

    for (const id of heya.rikishiIds ?? []) {
      const r = world.rikishi.get(id);
      if (r) {
        if (r.division === "makuuchi" || r.division === "juryo" || r.experience > 50) {
          potentialMentors.push(r.id);
        }
        if (!r.mentorId && r.experience < 30) {
          juniorsWithoutMentors.push(r);
        }
      }
    }

    for (const junior of juniorsWithoutMentors) {
      if (!junior) continue;
      if (potentialMentors.length > 0) {
        const rng = rngFromSeed(world.seed, "lineage", `mentor-${junior.id}`);
        const mentorId = potentialMentors[Math.floor(rng.next() * potentialMentors.length)];
        if (mentorId !== junior.id) {
          const mentorResult = assignMentor(world, junior.id, mentorId);
          if (mentorResult.ok && mentorResult.impact) {
            builder.merge(mentorResult.impact);
            builder.logEvent(
              "LIFECYCLE_EVENT",
              "narrative",
              {
                rikishiId: junior.id,
                heyaId: heya.id,
                status: "mentor_assigned",
                mentorId: mentorId,
              },
              { rikishiId: junior.id, heyaId: heya.id }
            );
          }
        }
      }
    }
  }

  return builder.build();
}
