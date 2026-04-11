/**
 * phase01_week_governance.ts
 * ==========================
 * Pipeline Phase: Weekly Governance Review.
 * 
 * Responsibilities:
 * 1. Decay scandal scores for all heyas.
 * 2. Update governance status based on scandal thresholds.
 * 3. Handle bi-annual JSA Board Elections.
 */

import type { WorldState } from "../../types/world";
import type { GovernanceStatus } from "../../types/economy";
import { EventBus } from "../../events";
import { generateGovernanceHeadline } from "../../systems/media/MediaService";

export function phase01_week_governance(world: WorldState): WorldState {
  const nextHeyas = new Map(world.heyas);
  const isElectionWeek = world.week === 52 && world.year % 2 === 0;

  for (const [id, heya] of world.heyas) {
    const nextHeya = { ...heya };
    let changed = false;

    // 1. Natural scandal score decay — 1 point per week
    if (nextHeya.scandalScore && nextHeya.scandalScore > 0) {
      nextHeya.scandalScore = Math.max(0, nextHeya.scandalScore - 1);
      changed = true;
    }

    // 2. Alert if crossing critical threshold (player only)
    if (nextHeya.scandalScore != null && nextHeya.scandalScore >= 30 && nextHeya.id === world.playerHeyaId) {
      EventBus.governanceRuling(world, nextHeya.id, {
        score: nextHeya.scandalScore,
        incident: "governance_warning",
        reason: "Scandal threshold exceeded"
      }, "major");
    }

    // 3. Status Transition Logic
    const score = nextHeya.scandalScore ?? 0;
    const newStatus: GovernanceStatus =
      score >= 60 ? "sanctioned" :
      score >= 30 ? "probation" :
      score >= 15 ? "warning" :
      "good_standing";

    if (nextHeya.governanceStatus !== newStatus) {
      const prevStatus = nextHeya.governanceStatus;
      nextHeya.governanceStatus = newStatus;
      changed = true;

      EventBus.governanceRuling(world, nextHeya.id, {
        incident: "status_changed",
        status: newStatus,
        reason: prevStatus,
        score: Math.floor(score)
      }, newStatus === "sanctioned" ? "headline" : newStatus === "probation" ? "major" : "notable");

      if (newStatus === "sanctioned" || newStatus === "probation") {
        generateGovernanceHeadline({
          world,
          heyaId: nextHeya.id,
          templatePath: newStatus === "sanctioned" ? 'institutional.governance.sanction' : 'institutional.governance.probation',
          severity: newStatus === "sanctioned" ? "main_event" : "national"
        });
      }
    }

    // 4. Bi-annual JSA Elections
    if (isElectionWeek && nextHeya.ichimon) {
      if (nextHeya.politicalCapital !== undefined) {
        nextHeya.politicalCapital = Math.min(100, (nextHeya.politicalCapital ?? 50) + 5);
        changed = true;
      }
      // Note: Transition log happens once per ichimon in old service, but we'll do it per stable
      // or just emit one event elsewhere. Since it's a loop, we'll keep it per stable for simplicity
      // or use a flag to only log once.
    }

    if (changed) {
      nextHeyas.set(id, nextHeya);
    }
  }

  // Handle global election logs if needed
  if (isElectionWeek) {
    // Collect ichimons
    const ichimons = new Set(Array.from(world.heyas.values()).map(h => h.ichimon).filter(Boolean));
    ichimons.forEach(ichimon => {
      EventBus.bashoStatus(world, {
        status: "phase_transition",
        incident: `The ${ichimon} faction participated in the bi-annual JSA board elections.`,
        shikona: ichimon as string
      });
    });
  }

  return {
    ...world,
    heyas: nextHeyas
  };
}
