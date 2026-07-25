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
import { isSekitoriDivision } from "@/constants/engine/rankDisplay";
import {
  INTERIM_DURATION_DAYS,
  RECRUITMENT_WINDOW_CLOSES_WEEKS,
} from "../../../constants/engine/recruitmentExtended";
import { DAYS_PER_WEEK } from "../../../constants/engine/time";
import { getHeya, getRikishi } from "../../queries";
import {
  computeReplacementGap,
  allocateVacancies,
} from "../../systems/generation/RecruitmentController";

export function phase01_week_recruitment(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_week_recruitment");

  // 1. Window Closing
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
    const elapsedWeeks = Math.floor(
      (INTERIM_DURATION_DAYS - (world._interimDaysRemaining ?? 0)) / DAYS_PER_WEEK
    );
    if (elapsedWeeks === 3 && !world._recruitmentWindow?.isOpen) {
      const playerHeya = world.playerHeyaId ? getHeya(world, world.playerHeyaId) : null;

      if (playerHeya && playerHeya.welfareState?.complianceState !== "sanctioned") {
        builder.updateWorldField("_recruitmentWindow", {
          openedAtWeek: world.week,
          closesAtWeek: world.week + RECRUITMENT_WINDOW_CLOSES_WEEKS,
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

  // 4. NPC Replacement Recruitment — runs EVERY weekly tick via gap controller.
  // The controller computes a global replacement target from active population vs
  // the equilibrium target captured at worldgen (_populationTarget), then allocates
  // vacancies across eligible NPC stables by depletion. This runs outside interim
  // and above the old 800 emergency floor, closing the erosion band (1084→763).
  const gap = computeReplacementGap(world);
  if (gap > 0) {
    const vacancies = allocateVacancies(world, gap);
    if (Object.keys(vacancies).length > 0) {
      builder.merge(talentpool.fillVacanciesForNPCWithBidding(world, vacancies));
    }
  }

  // 5. Finalize signed candidates into full Rikishi
  builder.merge(talentpool.finalizeSignedCandidates(world));

  // 6. Auto-assign mentors to newly recruited rikishi
  // Note: we look at CURRENT world state, but changes will be captured in impacts
  for (const heya of world.heyas.values()) {
    const potentialMentors: string[] = [];
    const juniorsWithoutMentors: Rikishi[] = [];

    for (const id of heya.rikishiIds ?? []) {
      const r = getRikishi(world, id);
      if (r) {
        if (isSekitoriDivision(r.division) || r.stats.experience > 50) {
          potentialMentors.push(r.id);
        }
        if (!r.mentorId && r.stats.experience < 30) {
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
