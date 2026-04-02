import { logEngineEvent } from "../events";
import { getStableRikishi, getActiveRikishi } from "../queries";
import * as talentpool from "../systems/generation/TalentPoolService";
import { safeCall } from "../utils/safe";
import type { WorldState } from "../types/world";
import type { Id } from "../types/common";

/**
 * Recruitment window — per Constitution, recruitment occurs at:
 *   1) Post-basho review (here)
 *   2) Mid-interim (week 3) — handled in dailyTick weekly gate
 *
 * NPC stables auto-fill from talent pool.
 * Player gets a recruitment window event with duration tracking.
 * 
 * @param world Current WorldState
 * @param vacanciesByHeyaId Map of heya IDs to vacancy counts
 */
export function runRecruitmentWindow(world: WorldState, vacanciesByHeyaId: Record<string, number>): void {
  // NPC stables auto-fill from talent pool
  safeCall(() => talentpool.fillVacanciesForNPC(world, vacanciesByHeyaId));

  // Track recruitment window state for player
  const playerHeyaId = world.playerHeyaId;
  const playerHeya = playerHeyaId ? world.heyas.get(playerHeyaId) : null;
  const playerVacancies = playerHeyaId ? (vacanciesByHeyaId[playerHeyaId] ?? 0) : 0;

  if (playerHeya) {
    // Set recruitment window state on world (consumed by UI and dailyTick)
    world._recruitmentWindow = {
      openedAtWeek: world.week,
      closesAtWeek: world.week + 4, // 4-week window per Constitution
      vacancies: playerVacancies,
      isOpen: true,
      phase: "post_basho"
    };

    logEngineEvent(world, {
      type: "RECRUITMENT_WINDOW_OPEN",
      category: "career",
      importance: playerVacancies > 0 ? "major" : "notable",
      scope: "heya",
      heyaId: playerHeya.id,
      title: "Recruitment window open",
      summary: playerVacancies > 0
        ? `${playerVacancies} spot(s) opened due to retirements. You have 4 weeks to recruit from the talent pools.`
        : "The post-basho recruitment window is open for 4 weeks. Scout and sign new talent.",
      data: {
        vacancies: playerVacancies,
        rosterSize: getStableRikishi(world, playerHeya.id).length,
        windowDuration: 4,
        closesAtWeek: world.week + 4
      }
    });
  }

  // Log total NPC recruitment activity
  let totalNPCVacancies = 0;
  for (const id in vacanciesByHeyaId) {
    if (id !== playerHeyaId) {
      totalNPCVacancies += vacanciesByHeyaId[id];
    }
  }

  if (totalNPCVacancies > 0) {
    logEngineEvent(world, {
      type: "NPC_RECRUITMENT_SUMMARY",
      category: "career",
      importance: "minor",
      scope: "world",
      title: "NPC stables recruit",
      summary: `${totalNPCVacancies} recruit(s) signed across rival stables during the post-basho window.`,
      data: { totalVacanciesFilled: totalNPCVacancies }
    });
  }
}

/**
 * Update career records, streaks, and HoF eligibility.
 * Per A3.4: "records/streaks/HoF eligibility recompute (post-lock only)"
 */
export function runCareerJournalUpdates(world: WorldState): void {
  const lastBasho = world.history[world.history.length - 1];
  if (!lastBasho) return;

  for (const r of getActiveRikishi(world)) {
    // Update career totals from basho records
    r.careerWins = (r.careerWins ?? 0) + (r.currentBashoWins ?? 0);
    r.careerLosses = (r.careerLosses ?? 0) + (r.currentBashoLosses ?? 0);

    // Update career record helper
    r.careerRecord = {
      wins: r.careerWins,
      losses: r.careerLosses,
      yusho: (r.careerRecord?.yusho ?? 0) + (lastBasho.yusho === r.id ? 1 : 0)
    };

    // Momentum update based on basho performance
    const bw = r.currentBashoWins ?? 0;
    const bl = r.currentBashoLosses ?? 0;
    if (bw + bl > 0) {
      const winRate = bw / (bw + bl);
      if (winRate >= 0.7) r.momentum = Math.min(5, (r.momentum ?? 0) + 2);
      else if (winRate >= 0.55) r.momentum = Math.min(5, (r.momentum ?? 0) + 1);
      else if (winRate < 0.35) r.momentum = Math.max(-5, (r.momentum ?? 0) - 2);
      else if (winRate < 0.45) r.momentum = Math.max(-5, (r.momentum ?? 0) - 1);
    }

    // HoF eligibility flag (yokozuna with 500+ wins)
    if (r.rank === "yokozuna" && r.careerWins >= 500) {
      logEngineEvent(world, {
        type: "HOF_ELIGIBLE",
        category: "milestone",
        importance: "headline",
        scope: "rikishi",
        rikishiId: r.id,
        heyaId: r.heyaId,
        title: `${r.shikona ?? r.name} eligible for Hall of Fame`,
        summary: `With ${r.careerWins} career wins, ${r.shikona ?? r.name} has reached Hall of Fame eligibility.`,
        data: { careerWins: r.careerWins }
      });
    }

    // Milestone events
    const milestones = [100, 200, 300, 500];
    if (milestones.includes(r.careerWins ?? 0)) {
       logEngineEvent(world, {
          type: "CAREER_WINS_MILESTONE",
          category: "milestone",
          importance: (r.careerWins ?? 0) >= 300 ? "major" : "notable",
          scope: "rikishi",
          rikishiId: r.id,
          heyaId: r.heyaId,
          title: `${r.shikona ?? r.name} reaches ${r.careerWins} career wins`,
          summary: `A distinguished milestone for ${r.shikona ?? r.name}.`,
          data: { careerWins: r.careerWins ?? 0 }
       });
    }
  }
}
