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

  // 1. Talent Pool Weekly Tick (Intel Decay, Suitor deadliness)
  // Note: we can't easily make the internal talentPool logic pure without a massive refactor,
  // so we'll clone it and apply the logic if it's currently mutative.
  if (nextWorld.talentPool) {
    nextWorld.talentPool = {
      ...nextWorld.talentPool,
      playerScouting: { ...nextWorld.talentPool.playerScouting },
      candidates: { ...nextWorld.talentPool.candidates }
    };
    
    // Intel decay
    for (const [id, record] of Object.entries(nextWorld.talentPool.playerScouting)) {
      if (nextWorld.week - record.lastScoutedWeek > 4) {
        nextWorld.talentPool.playerScouting[id] = {
           ...record,
           scoutingLevel: Math.max(0, record.scoutingLevel - 2)
        };
      }
    }
    
    // Suitor Resolution (Candidates signing)
    // For now we'll call into the service but try to wrap it purely if possible
    // Since tickWeekTalentPool is legacy mutative, we'll implement the logic here purely
    for (const id in nextWorld.talentPool.candidates) {
      const candidate = { ...nextWorld.talentPool.candidates[id] };
      if (candidate.availabilityState === 'in_talks' && candidate.competingSuitors.length > 0) {
        const deadlineExpired = candidate.competingSuitors.some(s => nextWorld.week >= s.deadlineWeek);
        if (deadlineExpired) {
          const bandRank: Record<string, number> = { all_in: 4, high: 3, medium: 2, low: 1 };
          const winner = [...candidate.competingSuitors].sort(
            (a, b) => (bandRank[b.interestBand] ?? 0) - (bandRank[a.interestBand] ?? 0)
          )[0];

          candidate.availabilityState = 'signed';
          candidate.competingSuitors = [winner];
          
          nextWorld.talentPool.candidates[id] = candidate;
          
          // Reputation boost for winner stable
          const heya = nextWorld.heyas.get(winner.heyaId);
          if (heya && candidate.talentSeed >= 80) {
            const nextHeya = { 
              ...heya, 
              reputation: Math.min(100, (heya.reputation ?? 50) + 5) 
            };
            const nextHeyas = new Map(nextWorld.heyas);
            nextHeyas.set(nextHeya.id, nextHeya);
            nextWorld.heyas = nextHeyas;

            EventBus.recruitDiscovered(nextWorld, {
              rikishiId: candidate.candidateId,
              heyaId: winner.heyaId,
              shikona: candidate.name,
              heya: heya.name,
              score: candidate.talentSeed,
              status: "high_talent_signed"
            });
          }
        }
      }
    }
  }

  // 2. Window Closing
  const rw = nextWorld._recruitmentWindow;
  if (rw?.isOpen && nextWorld.week >= rw.closesAtWeek) {
    nextWorld._recruitmentWindow = { ...rw, isOpen: false };
    if (nextWorld.playerHeyaId) {
      EventBus.recruitDiscovered(nextWorld, {
        rikishiId: nextWorld.playerHeyaId, 
        heyaId: nextWorld.playerHeyaId,
        status: "window_closed",
        day: nextWorld.week
      });
    }
  }

  // 3. Mid-Interim Openings
  if (nextWorld.cyclePhase === "interim") {
    const elapsedWeeks = Math.floor((42 - (nextWorld._interimDaysRemaining ?? 0)) / 7);
    if (elapsedWeeks === 3 && !nextWorld._recruitmentWindow?.isOpen) {
      const playerHeya = nextWorld.playerHeyaId ? nextWorld.heyas.get(nextWorld.playerHeyaId) : null;
      
      if (playerHeya && playerHeya.welfareState?.complianceState !== "sanctioned") {
        nextWorld._recruitmentWindow = {
          openedAtWeek: nextWorld.week,
          closesAtWeek: nextWorld.week + 2,
          vacancies: 0,
          isOpen: true,
          phase: "mid_interim"
        };
        EventBus.recruitDiscovered(nextWorld, {
          rikishiId: playerHeya.id,
          heyaId: playerHeya.id,
          status: "window_open",
          day: nextWorld.week + 2,
          incident: "mid_interim"
        });
      }
    }
  }

  // 4. NPC Opportunistic Recruitment
  if (nextWorld.cyclePhase === "interim" && Math.floor((42 - (nextWorld._interimDaysRemaining ?? 0)) / 7) === 3) {
    const smallStables: Record<string, number> = {};
    let hasItems = false;
    for (const h of nextWorld.heyas.values()) {
      if (h.id !== nextWorld.playerHeyaId && (h.rikishiIds ?? []).length < 6) {
        smallStables[h.id] = Math.max(1, 6 - (h.rikishiIds ?? []).length);
        hasItems = true;
      }
    }
    if (hasItems) {
      // NPC recruitment typically mutates, but we'll assume it's safe to call or we wrap it
      talentpool.fillVacanciesForNPC(nextWorld, smallStables);
    }
  }

  return nextWorld;
}
