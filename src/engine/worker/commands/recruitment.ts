/**
 * commands/recruitment.ts
 * =======================
 * Talent-pool scouting, candidate offers/poaching, scouting investment,
 * and academy construction/management commands.
 */

import * as talentpool from "../../systems/generation/TalentPoolService";
import { poachCandidate } from "../../systems/generation/CandidatePoolService";
import { resolveImpacts } from "../../core/ImpactResolver";
import { setScoutingInvestment } from "../../scoutingStore";
import {
  buildYouthAcademy,
  upgradeYouthAcademy,
  investInAcademy,
  hireAcademyStaff,
  promoteIntake,
} from "../../systems/recruitment/YouthAcademyService";
import { WorldCircuitService, manageAcademy } from "../../systems/worldCircuit/WorldCircuitService";
import type { WorkerRuntime } from "../runtime";
import type { CommandHandlerMap } from "./types";

export function recruitmentCommands(rt: WorkerRuntime): CommandHandlerMap {
  return {
    OFFER_CONTRACT: (cmd) => {
      if (rt.world) {
        const result = talentpool.offerCandidate(
          rt.world,
          cmd.candidateId,
          cmd.heyaId,
          "standard",
          "high"
        );
        if (result.ok && result.impact) {
          rt.world = resolveImpacts(rt.world, [result.impact]);
          rt.emitDigest();
          rt.syncWorld();
        } else {
          rt.post({ type: "ERROR", message: result.reason || "Offer failed" });
        }
      }
    },
    SCOUT_POOL: (cmd) => {
      if (rt.world) {
        const result = talentpool.scoutPool(rt.world, cmd.pool, {
          revealCount: cmd.revealCount,
        });
        if (result.impact) {
          rt.world = resolveImpacts(rt.world, [result.impact]);
          rt.emitDigest();
          rt.syncWorld();
        } else {
          rt.post({
            type: "ERROR",
            message: ("reason" in result ? String(result.reason) : "") || "Scout failed",
          });
        }
      }
    },
    SCOUT_CANDIDATE: (cmd) => {
      if (rt.world) {
        const result = talentpool.scoutCandidate(rt.world, cmd.candidateId, {
          effort: cmd.effort,
        });
        if (result.ok && result.impact) {
          rt.world = resolveImpacts(rt.world, [result.impact]);
          rt.emitDigest();
          rt.syncWorld();
        } else {
          rt.post({
            type: "ERROR",
            message: ("reason" in result ? String(result.reason) : "") || "Scout failed",
          });
        }
      }
    },
    POACH_CANDIDATE: (cmd) => {
      if (rt.world) {
        const result = poachCandidate(rt.world, cmd.candidateId, cmd.heyaId);
        if (result.ok && result.impact) {
          rt.world = resolveImpacts(rt.world, [result.impact]);
          rt.emitDigest();
          rt.syncWorld();
        } else {
          rt.post({ type: "ERROR", message: result.reason || "Poach failed" });
        }
      }
    },
    SET_SCOUTING_INVESTMENT: (cmd) => {
      if (rt.world) {
        setScoutingInvestment(rt.world, cmd.rikishiId, cmd.investment);
        rt.syncAndDigest();
      }
    },
    BUILD_FOREIGN_ACADEMY: (cmd) => {
      if (rt.world) {
        const impact = WorldCircuitService.buildForeignAcademy(
          rt.world,
          cmd.heyaId,
          cmd.region
        );
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncAndDigest();
      }
    },
    BUILD_YOUTH_ACADEMY: (cmd) => {
      if (rt.world) {
        const impact = buildYouthAcademy(rt.world, cmd.heyaId);
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncAndDigest();
      }
    },
    UPGRADE_YOUTH_ACADEMY: (cmd) => {
      if (rt.world) {
        const impact = upgradeYouthAcademy(rt.world, cmd.heyaId);
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncAndDigest();
      }
    },
    INVEST_ACADEMY: (cmd) => {
      if (rt.world) {
        const impact = investInAcademy(rt.world, cmd.heyaId, cmd.amount);
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncAndDigest();
      }
    },
    HIRE_ACADEMY_STAFF: (cmd) => {
      if (rt.world) {
        const impact = hireAcademyStaff(rt.world, cmd.heyaId, cmd.role);
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncAndDigest();
      }
    },
    PROMOTE_INTAKE: (cmd) => {
      if (rt.world) {
        const impact = promoteIntake(rt.world, cmd.heyaId, cmd.prospectId);
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncAndDigest();
      }
    },
    MANAGE_ACADEMY: (cmd) => {
      if (rt.world) {
        const impact = manageAcademy(rt.world, cmd.heyaId, cmd.region, cmd.config);
        rt.world = resolveImpacts(rt.world, [impact]);
        rt.syncAndDigest();
      }
    },
  };
}
