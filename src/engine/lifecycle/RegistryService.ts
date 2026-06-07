import { getActiveRikishi, getHeya } from "../queries";
import * as talentpool from "../systems/generation/TalentPoolService";
import type { WorldState } from "../types/world";
import { createImpactBuilder } from "../core/ImpactBuilder";
import type { StateImpact } from "../core/StateImpact";
import {
  RECRUITMENT_WINDOW_WEEKS,
  MOMENTUM_MAX,
  MOMENTUM_MIN,
  WIN_RATE_HIGH_MOMENTUM_THRESHOLD,
  MOMENTUM_HIGH_GAIN,
  WIN_RATE_MEDIUM_MOMENTUM_THRESHOLD,
  MOMENTUM_MEDIUM_GAIN,
  WIN_RATE_HIGH_MOMENTUM_LOSS_THRESHOLD,
  MOMENTUM_HIGH_LOSS,
  WIN_RATE_MEDIUM_MOMENTUM_LOSS_THRESHOLD,
  MOMENTUM_MEDIUM_LOSS,
  HOF_CAREER_WINS_THRESHOLD,
  CAREER_WIN_MILESTONES,
} from "../../constants/engine/generation";

/**
 * Recruitment window — per Constitution, recruitment occurs at:
 *   1) Post-basho review (here)
 *   2) Mid-interim (week 3) — handled in dailyTick weekly gate
 *
 * NPC stables auto-fill from talent pool.
 */
export function openRecruitmentWindow(
  world: WorldState,
  vacanciesByHeyaId: Record<string, number>
): StateImpact {
  const builder = createImpactBuilder("openRecruitmentWindow");

  // NPC stables auto-fill from talent pool
  builder.merge(talentpool.fillVacanciesForNPC(world, vacanciesByHeyaId));

  // Track recruitment window state for player
  const playerHeyaId = world.playerHeyaId;
  const playerHeya = playerHeyaId ? getHeya(world, playerHeyaId) : null;
  const playerVacancies = playerHeyaId ? (vacanciesByHeyaId[playerHeyaId] ?? 0) : 0;

  if (playerHeya) {
    // Queue world field update for _recruitmentWindow
    builder.updateWorldField("_recruitmentWindow", {
      openedAtWeek: world.week,
      closesAtWeek: world.week + RECRUITMENT_WINDOW_WEEKS, // 4-week window per Constitution
      vacancies: playerVacancies,
      isOpen: true,
      phase: "post_basho",
    });

    builder.logEvent(
      "RECRUIT_DISCOVERED",
      "scouting",
      {
        rikishiId: playerHeya.id,
        heyaId: playerHeya.id,
        status: "window_open",
        score: playerVacancies,
        day: world.week + 4, // closesAtWeek
      },
      { heyaId: playerHeya.id, importance: "notable" }
    );
  }

  // Log total NPC recruitment activity
  let totalNPCVacancies = 0;
  for (const id in vacanciesByHeyaId) {
    if (id !== playerHeyaId) {
      totalNPCVacancies += vacanciesByHeyaId[id];
    }
  }

  if (totalNPCVacancies > 0) {
    builder.logEvent("RECRUIT_DISCOVERED", "scouting", {
      status: "npc_summary",
      score: totalNPCVacancies,
    });
  }

  return builder.build();
}

/**
 * Update career records, streaks, and HoF eligibility.
 * Per A3.4: "records/streaks/HoF eligibility recompute (post-lock only)"
 * Returns StateImpact describing career updates instead of mutating state.
 */
export function runCareerJournalUpdates(world: WorldState): StateImpact {
  const lastBasho = world.history[world.history.length - 1];
  if (!lastBasho) {
    return createImpactBuilder("careerJournalUpdates").build();
  }

  const builder = createImpactBuilder("careerJournalUpdates");

  for (const r of getActiveRikishi(world)) {
    // Note: Career wins/losses are now updated per-bout in boutResultApplier.ts
    // This function now only handles momentum updates and yusho counting

    // Update yusho count
    const newYushoCount = (r.careerRecord?.yusho ?? 0) + (lastBasho.yusho === r.id ? 1 : 0);

    // Momentum update based on basho performance
    const bw = r.currentBashoWins ?? 0;
    const bl = r.currentBashoLosses ?? 0;
    let newMomentum = r.momentum ?? 0;
    if (bw + bl > 0) {
      const winRate = bw / (bw + bl);
      if (winRate >= WIN_RATE_HIGH_MOMENTUM_THRESHOLD) newMomentum = Math.min(MOMENTUM_MAX, newMomentum + MOMENTUM_HIGH_GAIN);
      else if (winRate >= WIN_RATE_MEDIUM_MOMENTUM_THRESHOLD) newMomentum = Math.min(MOMENTUM_MAX, newMomentum + MOMENTUM_MEDIUM_GAIN);
      else if (winRate < WIN_RATE_HIGH_MOMENTUM_LOSS_THRESHOLD) newMomentum = Math.max(MOMENTUM_MIN, newMomentum - MOMENTUM_HIGH_LOSS);
      else if (winRate < WIN_RATE_MEDIUM_MOMENTUM_LOSS_THRESHOLD) newMomentum = Math.max(MOMENTUM_MIN, newMomentum - MOMENTUM_MEDIUM_LOSS);
    }

    // Queue rikishi update (only momentum and yusho, not career totals)
    builder.updateRikishi(r.id, {
      careerRecord: {
        wins: r.careerWins ?? 0,
        losses: r.careerLosses ?? 0,
        yusho: newYushoCount,
      },
      momentum: newMomentum,
    });

    // HoF eligibility flag (yokozuna with 500+ wins)
    if (r.rank === "yokozuna" && (r.careerWins ?? 0) >= HOF_CAREER_WINS_THRESHOLD) {
      builder.logEvent(
        "LIFECYCLE_EVENT",
        "career",
        {
          rikishiId: r.id,
          heyaId: r.heyaId,
          shikona: r.shikona ?? r.name,
          status: "hof_eligible",
          score: r.careerWins ?? 0,
        },
        { rikishiId: r.id, heyaId: r.heyaId, importance: "major" }
      );
    }

    // Milestone events
    if (CAREER_WIN_MILESTONES.includes(r.careerWins ?? 0)) {
      builder.logEvent(
        "LIFECYCLE_EVENT",
        "career",
        {
          rikishiId: r.id,
          heyaId: r.heyaId,
          shikona: r.shikona ?? r.name,
          status: "wins_milestone",
          score: r.careerWins ?? 0,
        },
        { rikishiId: r.id, heyaId: r.heyaId, importance: "notable" }
      );
    }
  }

  return builder.build();
}
