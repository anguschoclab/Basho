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
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { mergeImpacts } from "../../core/ImpactResolver";
import type { StateImpact } from "../../core/StateImpact";
import { generateGovernanceHeadline, evaluateScandals } from "../../systems/media/MediaService";
import { YokozunaService } from "../../systems/governance/YokozunaService";
import { CareerService } from "../../lifecycle/CareerService";
import {
  MAX_POLITICAL_CAPITAL,
  DEFAULT_POLITICAL_CAPITAL,
  ELECTION_POLITICAL_CAPITAL_GAIN,
} from "../../../constants/engine/governance";
import {
  ELECTION_WEEK,
  ELECTION_YEAR_INTERVAL,
  SCANDAL_SCORE_ALERT_THRESHOLD,
  SCANDAL_SCORE_HIGH_THRESHOLD,
  SCANDAL_SCORE_MEDIUM_THRESHOLD,
  SCANDAL_SCORE_LOW_THRESHOLD,
} from "../../../constants/engine/governanceExtended";

export function phase01_week_governance(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_week_governance");
  const isElectionWeek = world.week === ELECTION_WEEK && world.year % ELECTION_YEAR_INTERVAL === 0;

  // 0. Council & Career Transitions (Q1 / Q3)
  // Only evaluate these in the post-basho wrap-up phase or yearly boundary
  if (world.cyclePhase === "post_basho") {
    const ydcImpact = YokozunaService.processYDCCouncil(world);
    builder.merge(ydcImpact);

    const careerImpact = CareerService.processRetirements(world);
    builder.merge(careerImpact);
  }

  for (const [id, heya] of world.heyas) {
    const updates: Partial<typeof heya> = {};
    let changed = false;

    // 1. Natural scandal score decay — 1 point per week
    if (heya.scandalScore && heya.scandalScore > 0) {
      updates.scandalScore = Math.max(0, heya.scandalScore - 1);
      changed = true;
    }

    // 2. Alert if crossing critical threshold (player only)
    if (
      heya.scandalScore != null &&
      heya.scandalScore >= SCANDAL_SCORE_ALERT_THRESHOLD &&
      heya.id === world.playerHeyaId
    ) {
      builder.logEvent(
        "GOVERNANCE_RULING",
        "discipline",
        {
          score: heya.scandalScore,
          incident: "governance_warning",
          reason: "Scandal threshold exceeded",
        },
        { heyaId: heya.id, importance: "major" }
      );
    }

    // 3. Status Transition Logic
    const score = heya.scandalScore ?? 0;
    const newStatus: GovernanceStatus =
      score >= SCANDAL_SCORE_HIGH_THRESHOLD
        ? "sanctioned"
        : score >= SCANDAL_SCORE_MEDIUM_THRESHOLD
          ? "probation"
          : score >= SCANDAL_SCORE_LOW_THRESHOLD
            ? "warning"
            : "good_standing";

    if (heya.governanceStatus !== newStatus) {
      const prevStatus = heya.governanceStatus;
      updates.governanceStatus = newStatus;
      changed = true;

      builder.logEvent(
        "GOVERNANCE_RULING",
        "discipline",
        {
          incident: "status_changed",
          status: newStatus,
          reason: prevStatus,
          score: Math.floor(score),
        },
        {
          heyaId: heya.id,
          importance:
            newStatus === "sanctioned"
              ? "headline"
              : newStatus === "probation"
                ? "major"
                : "notable",
        }
      );

      if (newStatus === "sanctioned" || newStatus === "probation") {
        builder.merge(
          generateGovernanceHeadline({
            world,
            heyaId: heya.id,
            templatePath:
              newStatus === "sanctioned"
                ? "institutional.governance.sanction"
                : "institutional.governance.probation",
            severity: newStatus === "sanctioned" ? "main_event" : "national",
          })
        );
      }
    }

    // 4. Bi-annual JSA Elections
    if (isElectionWeek && heya.ichimon) {
      if (heya.politicalCapital !== undefined) {
        updates.politicalCapital = Math.min(
          MAX_POLITICAL_CAPITAL,
          (heya.politicalCapital ?? DEFAULT_POLITICAL_CAPITAL) + ELECTION_POLITICAL_CAPITAL_GAIN
        );
        changed = true;
      }
    }

    if (changed) {
      builder.updateHeya(id, updates);
    }
  }

  // Handle global election logs if needed
  if (isElectionWeek) {
    const ichimons = new Set<string>();
    for (const heya of world.heyas.values()) {
      if (heya.ichimon) {
        ichimons.add(heya.ichimon);
      }
    }

    ichimons.forEach((ichimon) => {
      builder.logEvent("BASHO_STATUS", "narrative", {
        status: "phase_transition",
        incident: `The ${ichimon} faction participated in the bi-annual JSA board elections.`,
      });
    });
  }

  // Apply ongoing scandal pressure to media state (scandalScore → heyaPressure bump)
  return mergeImpacts([builder.build(), evaluateScandals(world)]);
}
