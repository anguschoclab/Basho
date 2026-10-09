/**
 * phase01_week_rikishi_agency.ts
 * ==============================
 * Pipeline Phase 1 (Weekly) — Rikishi-level agency (WS4).
 *
 * Runs in BOTH weekly pipelines before phase01_week_npc_ai (the welfare phase
 * is off-season only, so it cannot own basho-time agency):
 * 1. Derive each active rikishi's weekly disposition (satisfaction,
 *    restlessness, loyalty band) from visible state.
 * 2. Generate threshold-crossed requests into world.pendingRikishiRequests —
 *    NPC heyas resolve them in phase01_week_npc_ai; the player's surface as
 *    `rikishi_request` pendingDecisions.
 * 3. Escalate ignored unrest into incidents via canonical paths only
 *    (reportScandal / welfare-risk pressure), seeded-rng gated.
 */

import type { WorldState } from "../../types/world";
import type { StateImpact } from "../../core/StateImpact";
import type { RikishiRequest } from "../../rikishiAgency/types";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { getHeya } from "../../queries";
import { reportScandal } from "../../systems/governance/ScandalService";
import { rngForWorld } from "../../rng";
import { clamp } from "../../utils/math";
import {
  deriveDisposition,
  generateRequests,
  shouldEscalate,
} from "../../rikishiAgency/RikishiAgencyService";
import {
  INCIDENT_PROBABILITY,
  INCIDENT_DISCIPLINE_SCANDAL_MAX,
  INCIDENT_WELFARE_RISK_DELTA,
  INCIDENT_STRESS_RELIEF,
  INCIDENT_MOTIVATION_DELTA,
} from "../../../constants/engine/rikishiAgency";

export function phase01_week_rikishi_agency(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_week_rikishi_agency");
  const week = world.week ?? world.calendar?.currentWeek ?? 0;

  const pending: RikishiRequest[] = [...(world.pendingRikishiRequests ?? [])];
  const newRequests: RikishiRequest[] = [];

  for (const [rid, r] of world.rikishi) {
    if (r.isRetired || !r.heyaId) continue;

    const disposition = deriveDisposition(world, r);
    const generated = generateRequests(world, r, disposition, pending.concat(newRequests));
    builder.updateRikishi(rid, {
      agency:
        generated.length > 0 ? { ...disposition, lastRequestWeek: week } : disposition,
    });
    newRequests.push(...generated);

    // Escalation: ignored misery surfaces through canonical governance/welfare
    // paths — never a direct world write outside ImpactBuilder.
    if (shouldEscalate(r, disposition)) {
      const rng = rngForWorld(world, "rikishiAgency", `${rid}:${week}`);
      if (rng.next() < INCIDENT_PROBABILITY) {
        if ((r.behavior?.discipline ?? 50) < INCIDENT_DISCIPLINE_SCANDAL_MAX) {
          builder.merge(
            reportScandal(
              world,
              r.heyaId,
              "minor",
              `${r.shikona ?? rid} involved in misconduct — repeated grievances ignored`
            )
          );
        } else {
          const heya = getHeya(world, r.heyaId);
          if (heya) {
            const ws = heya.welfareState ?? {
              welfareRisk: 0,
              activeDiet: "maintenance" as const,
              complianceState: "compliant" as const,
              weeksInState: 0,
            };
            builder.updateHeya(r.heyaId, {
              welfareState: {
                ...ws,
                welfareRisk: clamp(ws.welfareRisk + INCIDENT_WELFARE_RISK_DELTA, 0, 100),
              },
            });
          }
          builder.logEvent(
            "WELFARE_COMPLIANCE",
            "welfare",
            {
              heyaId: r.heyaId,
              rikishiId: rid,
              status: "stable_unrest",
              reason: "ignored_requests",
            },
            { heyaId: r.heyaId, rikishiId: rid, importance: "minor" }
          );
        }
        // The incident vents pressure: stress relieves, motivation dips.
        builder.updateRikishi(rid, {
          motivation: clamp((r.motivation ?? 50) - INCIDENT_MOTIVATION_DELTA, 0, 100),
          behavior: {
            ...r.behavior,
            stress: clamp((r.behavior?.stress ?? 0) - INCIDENT_STRESS_RELIEF, 0, 100),
          },
        });
      }
    }
  }

  if (newRequests.length > 0) {
    builder.updateWorldField("pendingRikishiRequests", [...pending, ...newRequests]);
  }

  return builder.build();
}
