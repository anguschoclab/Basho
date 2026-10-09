/**
 * commands/governance.ts
 * ======================
 * Governance, media, and political-capital commands.
 */

import * as governance from "../../systems/governance/GovernanceService";
import { resolveLoopDecision } from "../../loop/LoopDecisionEngine";
import { issueGovernanceRuling } from "../../systems/governance/ScandalService";
import { handleMediaEvent } from "../../systems/media/MediaEventService";
import { spendPoliticalCapital } from "../../systems/governance/ScandalService";
import {
  PoliticalFavorsService,
  type FavorType,
} from "../../systems/governance/PoliticalFavorsService";
import { resolveImpacts } from "../../core/ImpactResolver";
import { updateHeyaInWorld } from "../../queries";
import type { WorkerRuntime } from "../runtime";
import type { CommandHandlerMap } from "./types";

export function governanceCommands(rt: WorkerRuntime): CommandHandlerMap {
  return {
    RESOLVE_CRISIS: (cmd) => {
      if (rt.world) {
        const impact = governance.resolveCrisis(
          rt.world,
          cmd.crisisId,
          cmd.choice as "harsh" | "cover_up"
        );
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncAndDigest();
      }
    },
    RESOLVE_LOOP_DECISION: (cmd) => {
      if (rt.world) {
        const impact = resolveLoopDecision(rt.world, cmd.decisionId, cmd.optionId);
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncAndDigest();
      }
    },
    ISSUE_RULING: (cmd) => {
      if (rt.world) {
        const impact = issueGovernanceRuling(rt.world, cmd.rulingId, cmd.severity);
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncAndDigest();
      }
    },
    HANDLE_MEDIA_EVENT: (cmd) => {
      if (rt.world) {
        const impact = handleMediaEvent(rt.world, cmd.eventId, cmd.choice);
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncAndDigest();
      }
    },
    APPLY_PRESS_CONFERENCE: (cmd) => {
      if (rt.world) {
        const heya = rt.world.heyas.get(cmd.heyaId);
        if (!heya) return;
        const reputation = Math.max(
          0,
          Math.min(100, (heya.reputation ?? 50) + cmd.reputationDelta)
        );
        const morale = Math.max(
          0,
          Math.min(100, (heya.welfareState?.morale ?? 50) + cmd.moraleDelta)
        );
        const welfareState = heya.welfareState
          ? { ...heya.welfareState, morale }
          : {
              welfareRisk: 0,
              activeDiet: "maintenance" as const,
              complianceState: "compliant" as const,
              weeksInState: 0,
              morale,
            };
        rt.world = updateHeyaInWorld(rt.world, cmd.heyaId, {
          reputation,
          welfareState,
        });
        const prevHeat = rt.world.mediaState?.mediaHeat?.[cmd.heyaId] ?? 0;
        if (rt.world.mediaState) {
          rt.world = {
            ...rt.world,
            mediaState: {
              ...rt.world.mediaState,
              mediaHeat: {
                ...(rt.world.mediaState.mediaHeat ?? {}),
                [cmd.heyaId]: Math.max(0, prevHeat + cmd.mediaHeatDelta),
              },
            },
          };
        }
        rt.syncAndDigest();
      }
    },
    SPEND_POLITICAL_CAPITAL: (cmd) => {
      if (rt.world) {
        const impact = spendPoliticalCapital(rt.world, cmd.heyaId, cmd.amount);
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncAndDigest();
      }
    },
    REQUEST_POLITICAL_FAVOR: (cmd) => {
      if (rt.world) {
        const impact = PoliticalFavorsService.requestFavor(
          rt.world,
          cmd.heyaId,
          cmd.favorId as FavorType
        );
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncAndDigest();
      }
    },
  };
}
