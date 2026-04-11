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
import { EventBus } from "../../events";
import { stableSort } from "../../utils/sort";
import * as talentpool from "../../systems/generation/TalentPoolService";

export function phase01_week_recruitment(world: WorldState): WorldState {
  let nextWorld = { ...world };

  // 1. Talent Pool Weekly Tick (Intel Decay, Suitor resolution)
  nextWorld = talentpool.tickWeekTalentPool(nextWorld);


  // 2. Window Closing
  const rw = nextWorld._recruitmentWindow;
  if (rw?.isOpen && nextWorld.week >= rw.closesAtWeek) {
    nextWorld._recruitmentWindow = { ...rw, isOpen: false };
    if (nextWorld.playerHeyaId) {
      EventBus.recruitDiscovered(nextWorld, {
        rikishiId: nextWorld.playerHeyaId,
        heyaId: nextWorld.playerHeyaId,
        status: "window_closed",
        day: nextWorld.week,
      });
    }
  }

  // 3. Mid-Interim Openings
  if (nextWorld.cyclePhase === "interim") {
    const elapsedWeeks = Math.floor(
      (42 - (nextWorld._interimDaysRemaining ?? 0)) / 7,
    );
    if (elapsedWeeks === 3 && !nextWorld._recruitmentWindow?.isOpen) {
      const playerHeya = nextWorld.playerHeyaId
        ? nextWorld.heyas.get(nextWorld.playerHeyaId)
        : null;

      if (
        playerHeya &&
        playerHeya.welfareState?.complianceState !== "sanctioned"
      ) {
        nextWorld._recruitmentWindow = {
          openedAtWeek: nextWorld.week,
          closesAtWeek: nextWorld.week + 2,
          vacancies: 0,
          isOpen: true,
          phase: "mid_interim",
        };
        EventBus.recruitDiscovered(nextWorld, {
          rikishiId: playerHeya.id,
          heyaId: playerHeya.id,
          status: "window_open",
          day: nextWorld.week + 2,
          incident: "mid_interim",
        });
      }
    }
  }

  // 4. NPC Opportunistic Recruitment
  if (
    nextWorld.cyclePhase === "interim" &&
    Math.floor((42 - (nextWorld._interimDaysRemaining ?? 0)) / 7) === 3
  ) {
    const smallStables: Record<string, number> = {};
    let hasItems = false;
    for (const h of nextWorld.heyas.values()) {
      if (h.id !== nextWorld.playerHeyaId && (h.rikishiIds ?? []).length < 6) {
        smallStables[h.id] = Math.max(1, 6 - (h.rikishiIds ?? []).length);
        hasItems = true;
      }
    }
    if (hasItems) {
      // fillVacanciesForNPC mutates world, so we need to accept that and return the mutated world
      // This is a known mutative service that would require a larger refactor to make pure
      talentpool.fillVacanciesForNPC(nextWorld, smallStables);
    }
  }

  // 5. Finalize signed candidates into full Rikishi
  // This converts "signed" candidates (from resolution or NPC fast-path) into real entities.
  nextWorld = talentpool.finalizeSignedCandidates(nextWorld);

  return nextWorld;
}
