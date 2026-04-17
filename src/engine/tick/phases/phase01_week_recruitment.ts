/**
 * phase01_week_recruitment.ts
 * ===========================
 * Pipeline Phase: Recruitment & Talent Pool.
 *
 * Responsibilities:
 * 1. Close player recruitment windows if expired.
 * 2. Open mid-interim recruitment windows.
 * 3. Automate NPC recruitment for under-strength stables.
 * 4. Maintain talent pool (intel decay, suitor resolution).
 */

import type { WorldState } from "../../types/world";
import type { Rikishi } from "../../types/rikishi";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { mergeImpacts } from "../../core/ImpactResolver";
import * as talentpool from "../../systems/generation/TalentPoolService";
import { assignMentor } from "../../lineage";
import { rngFromSeed } from "../../rng";

export function phase01_week_recruitment(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_week_recruitment");

  // 1. Talent Pool Weekly Tick (Intel Decay, Suitor resolution)
  // Note: tickWeekTalentPool already returns StateImpact and mutates world
  // We'll call it and it will handle its own state updates
  talentpool.tickWeekTalentPool(world);

  // 2. Window Closing
  const rw = world._recruitmentWindow;
  if (rw?.isOpen && world.week >= rw.closesAtWeek) {
    world._recruitmentWindow = { ...rw, isOpen: false };
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
        world._recruitmentWindow = {
          openedAtWeek: world.week,
          closesAtWeek: world.week + 2,
          vacancies: 0,
          isOpen: true,
          phase: "mid_interim",
        };
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
  if (
    world.cyclePhase === "interim" &&
    Math.floor((42 - (world._interimDaysRemaining ?? 0)) / 7) === 3
  ) {
    const smallStables: Record<string, number> = {};
    let hasItems = false;
    for (const h of world.heyas.values()) {
      if (h.id !== world.playerHeyaId && (h.rikishiIds ?? []).length < 6) {
        smallStables[h.id] = Math.max(1, 6 - (h.rikishiIds ?? []).length);
        hasItems = true;
      }
    }
    if (hasItems) {
      // fillVacanciesForNPC mutates world and returns StateImpact
      talentpool.fillVacanciesForNPC(world, smallStables);
    }
  }

  // 5. Finalize signed candidates into full Rikishi
  // This converts "signed" candidates (from resolution or NPC fast-path) into real entities.
  const finalizeImpact = talentpool.finalizeSignedCandidates(world);

  // 6. Auto-assign mentors to newly recruited rikishi
  // Find newly added rikishi without mentors and assign senior rikishi as mentors
  for (const heya of world.heyas.values()) {
    const heyaRikishi = (heya.rikishiIds ?? []).map((id) => world.rikishi.get(id)).filter(Boolean);

    // Find senior rikishi (sekitori or experienced) who can be mentors
    const potentialMentors = heyaRikishi
      .filter(
        (r): r is Rikishi =>
          !!r && (r.division === "makuuchi" || r.division === "juryo" || r.experience > 50)
      )
      .map((r) => r.id);

    // Find junior rikishi without mentors
    const juniorsWithoutMentors = heyaRikishi.filter(
      (r): r is Rikishi => !!r && !r.mentorId && r.experience < 30
    );

    // Assign mentors to juniors
    for (const junior of juniorsWithoutMentors) {
      if (!junior) continue;
      // Pick a random mentor from potential mentors using seeded RNG
      if (potentialMentors.length > 0) {
        const rng = rngFromSeed(world.seed, "lineage", `mentor-${junior.id}`);
        const mentorId = potentialMentors[Math.floor(rng.next() * potentialMentors.length)];
        if (mentorId !== junior.id) {
          assignMentor(world, junior.id, mentorId);
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

  // Merge the finalize impact with the builder's impact
  return mergeImpacts([builder.build(), finalizeImpact]);
}
