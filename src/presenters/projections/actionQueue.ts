/**
 * Action Queue Presenter
 * Builds a severity-sorted list of actionable items for the Dashboard.
 */

import type { WorldState } from "../../engine/types/world";
import type { Heya } from "../../engine/types/heya";
import type { TrainingSummary } from "./trainingProjections";
import type { FinanceSummary } from "./financeProjections";

export type ActionSeverity = "critical" | "warning" | "info";

export type ActionItem =
  | {
      kind: "navigate";
      severity: ActionSeverity;
      title: string;
      link: string;
      icon?: string;
    }
  | {
      kind: "resolve";
      severity: ActionSeverity;
      title: string;
      decisionId: string;
      options: { id: string; label: string; impact: string }[];
      icon?: string;
    };

const SEVERITY_ORDER: Record<ActionSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export function buildActionQueue(
  world: WorldState,
  playerHeya: Heya | null,
  training: TrainingSummary | null,
  finance: FinanceSummary | null
): ActionItem[] {
  const items: ActionItem[] = [];

  // 1. Critical/desperate funds
  if (finance?.runwayBand === "critical" || finance?.runwayBand === "desperate") {
    items.push({
      kind: "navigate",
      severity: "critical",
      title: "Funds critical — insolvency risk",
      link: "/office/finances",
      icon: "coins",
    });
  }

  // 2. High injury risk wrestlers
  if (training && training.injuryRiskHighCount > 2) {
    items.push({
      kind: "navigate",
      severity: "warning",
      title: `${training.injuryRiskHighCount} wrestlers at high injury risk`,
      link: "/stable/medical",
      icon: "heart-pulse",
    });
  }

  // 3. Pending exhibitions (World Circuit)
  if (world.pendingExhibitions && world.pendingExhibitions.length > 0) {
    items.push({
      kind: "navigate",
      severity: "info",
      title: `${world.pendingExhibitions.length} exhibition invitation${world.pendingExhibitions.length > 1 ? "s" : ""} pending`,
      link: "/world-circuit",
      icon: "globe",
    });
  }

  // 4. Promotion deliberation event
  if (world.events?.log) {
    const hasDeliberation = world.events.log.some(
      (e) => (e as { type?: string }).type === "PROMOTION_DELIBERATION"
    );
    if (hasDeliberation) {
      items.push({
        kind: "navigate",
        severity: "info",
        title: "Promotion deliberation available",
        link: "/stable/roster",
        icon: "trophy",
      });
    }
  }

  // 5. Active basho reminder
  if (world.cyclePhase === "active_basho") {
    items.push({
      kind: "navigate",
      severity: "info",
      title: "Tournament is active — manage your bouts",
      link: "/basho",
      icon: "trophy",
    });
  }

  // 6. Pre-basho phase reminder
  if (world.cyclePhase === "pre_basho") {
    items.push({
      kind: "navigate",
      severity: "info",
      title: "Basho starts soon — review your roster",
      link: "/basho",
      icon: "calendar",
    });
  }

  // 7. Welfare state compliance
  if (playerHeya?.welfareState) {
    const ws = playerHeya.welfareState;
    if (ws.complianceState === "sanctioned") {
      items.push({
        kind: "navigate",
        severity: "critical",
        title: "Welfare sanction — stable under investigation",
        link: "/stable/training",
        icon: "shield-alert",
      });
    } else if (ws.complianceState === "investigation" && ws.welfareRisk > 75) {
      items.push({
        kind: "navigate",
        severity: "warning",
        title: `Welfare investigation — risk at ${ws.welfareRisk}%`,
        link: "/stable/training",
        icon: "shield-alert",
      });
    }
  }

  // 8. Pending loop decisions
  if (world.pendingDecisions && world.pendingDecisions.length > 0) {
    for (const decision of world.pendingDecisions) {
      items.push({
        kind: "resolve",
        severity: decision.required ? "critical" : "warning",
        title: decision.description,
        decisionId: decision.id,
        options: decision.options.map((o) => ({
          id: o.id,
          label: o.label,
          impact: o.impact,
        })),
        icon: "git-branch",
      });
    }
  }

  // 9. Sponsor contract expiry (if sponsorPool has expiring contracts)
  // Deferred: sponsor expiry system not yet verified

  return items.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
