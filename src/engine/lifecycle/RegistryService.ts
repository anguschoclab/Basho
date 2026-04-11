import { EventBus } from "../events";
import { BardEngine } from "../narrative/BardEngine";
import { rngFromSeed } from "../rng";
import { getStableRikishi, getActiveRikishi } from "../queries";
import * as talentpool from "../systems/generation/TalentPoolService";
import { safeCall } from "../utils/safe";
import type { WorldState } from "../types/world";
import type { Id } from "../types/common";
import { createImpactBuilder } from "../core/ImpactBuilder";
import type { StateImpact } from "../core/StateImpact";

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

    EventBus.recruitDiscovered(world, {
      rikishiId: playerHeya.id,
      heyaId: playerHeya.id,
      status: "window_open",
      score: playerVacancies,
      day: world.week + 4 // closesAtWeek
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
    EventBus.recruitDiscovered(world, {
      status: "npc_summary",
      score: totalNPCVacancies
    });
  }
}

/**
 * Update career records, streaks, and HoF eligibility.
 * Per A3.4: "records/streaks/HoF eligibility recompute (post-lock only)"
 * Returns StateImpact describing career updates instead of mutating state.
 */
export function runCareerJournalUpdates(world: WorldState): StateImpact {
  const lastBasho = world.history[world.history.length - 1];
  if (!lastBasho) {
    return createImpactBuilder('careerJournalUpdates').build();
  }

  const builder = createImpactBuilder('careerJournalUpdates');

  for (const r of getActiveRikishi(world)) {
    // Update career totals from basho records
    const newCareerWins = (r.careerWins ?? 0) + (r.currentBashoWins ?? 0);
    const newCareerLosses = (r.careerLosses ?? 0) + (r.currentBashoLosses ?? 0);

    // Update career record helper
    const newYushoCount = (r.careerRecord?.yusho ?? 0) + (lastBasho.yusho === r.id ? 1 : 0);

    // Momentum update based on basho performance
    const bw = r.currentBashoWins ?? 0;
    const bl = r.currentBashoLosses ?? 0;
    let newMomentum = r.momentum ?? 0;
    if (bw + bl > 0) {
      const winRate = bw / (bw + bl);
      if (winRate >= 0.7) newMomentum = Math.min(5, newMomentum + 2);
      else if (winRate >= 0.55) newMomentum = Math.min(5, newMomentum + 1);
      else if (winRate < 0.35) newMomentum = Math.max(-5, newMomentum - 2);
      else if (winRate < 0.45) newMomentum = Math.max(-5, newMomentum - 1);
    }

    // Queue rikishi update
    builder.updateRikishi(r.id, {
      careerWins: newCareerWins,
      careerLosses: newCareerLosses,
      careerRecord: {
        wins: newCareerWins,
        losses: newCareerLosses,
        yusho: newYushoCount
      },
      momentum: newMomentum
    });

    // HoF eligibility flag (yokozuna with 500+ wins)
    if (r.rank === "yokozuna" && newCareerWins >= 500) {
      builder.logEvent(
        'LIFECYCLE_EVENT',
        'career',
        {
          rikishiId: r.id,
          heyaId: r.heyaId,
          shikona: r.shikona ?? r.name,
          status: "hof_eligible",
          score: newCareerWins
        },
        { rikishiId: r.id, heyaId: r.heyaId, importance: 'major' }
      );
    }

    // Milestone events
    const milestones = [100, 200, 300, 500];
    if (milestones.includes(newCareerWins)) {
       builder.logEvent(
         'LIFECYCLE_EVENT',
         'career',
         {
          rikishiId: r.id,
          heyaId: r.heyaId,
          shikona: r.shikona ?? r.name,
          status: "wins_milestone",
          score: newCareerWins
         },
         { rikishiId: r.id, heyaId: r.heyaId, importance: 'notable' }
       );
    }
  }

  return builder.build();
}
