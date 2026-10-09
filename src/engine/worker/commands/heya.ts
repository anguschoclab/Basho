/**
 * commands/heya.ts
 * ================
 * Stable-management commands: rikishi health/retirement, facilities,
 * mentorship, sparring pairs, diet, tsukebito, and training state.
 */

import type { EngineCommand } from "../types";
import { withdrawRikishi, treatInjury } from "../../systems/health/HealthActions";
import { recordGomenfuda } from "../../systems/governance/GomenfudaService";
import { investInFacility } from "../../facilities";
import { InfrastructureService } from "../../systems/economy/InfrastructureService";
import { assignMentor } from "../../lineage";
import { removeMentor } from "../../systems/training/MentorshipService";
import { assignSparringPair, removeSparringPair } from "../../systems/training/SparringService";
import { setTsukebito, clearTsukebito } from "../../systems/training/TsukebitoService";
import { updateHeyaInWorld } from "../../queries";
import { retireRikishiImpact } from "../../core/ImpactBuilder";
import { resolveImpacts } from "../../core/ImpactResolver";
import type { StateImpact } from "../../core/StateImpact";
import type { WorkerRuntime } from "../runtime";
import type { CommandHandlerMap } from "./types";

type Cmd<T extends EngineCommand["type"]> = Extract<EngineCommand, { type: T }>;

function withdrawRikishiCmd(rt: WorkerRuntime, cmd: Cmd<"WITHDRAW_RIKISHI">) {
  if (rt.world) {
    const impacts: StateImpact[] = [withdrawRikishi(rt.world, cmd.rikishiId)];
    // Post a gomenfuda (apology notice) when the player withdraws a
    // rikishi mid-basho. Without this, player-initiated withdrawals never
    // increment the gomenfuda count or trigger JSA sanctions — only
    // auto-injuries from phase01_week_health did. The gomenfuda UI
    // (GomenfudaStatusBadge, GovernancePage history) would show 0/3
    // forever regardless of how many rikishi the player withdrew.
    const r = rt.world.rikishi.get(cmd.rikishiId);
    const heya = r ? rt.world.heyas.get(r.heyaId) : undefined;
    if (r && heya && rt.world.cyclePhase === "active_basho") {
      const bashoName = rt.world.currentBashoName ?? "current";
      impacts.push(recordGomenfuda(rt.world, heya, r, bashoName, "injury"));
    }
    rt.world = resolveImpacts(rt.world, impacts);
    rt.syncAndDigest();
  }
}

function treatInjuryCmd(rt: WorkerRuntime, cmd: Cmd<"TREAT_INJURY">) {
  if (rt.world) {
    rt.world = resolveImpacts(rt.world, [
      treatInjury(rt.world, cmd.rikishiId, cmd.weeks),
    ]);
    rt.syncAndDigest();
  }
}

function retireRikishiCmd(rt: WorkerRuntime, cmd: Cmd<"RETIRE_RIKISHI">) {
  if (rt.world) {
    // Ownership gate — the UI renders the button only for the player's
    // stable, but commands can arrive from any caller.
    const target = rt.world.rikishi.get(cmd.rikishiId);
    if (!target || target.heyaId !== rt.world.playerHeyaId) return;
    // 4-arg form: (id, year, reason, source) — the 2-arg overload treats
    // arg2 as the impact source and defaults year to DEFAULT_START_YEAR.
    const impact = retireRikishiImpact(
      cmd.rikishiId,
      rt.world.year,
      cmd.reason,
      "RETIRE_RIKISHI"
    );
    rt.world = resolveImpacts(rt.world, [impact]);
    rt.syncAndDigest();
  }
}

function setHeyaDietCmd(rt: WorkerRuntime, cmd: Cmd<"SET_HEYA_DIET">) {
  if (rt.world) {
    const heya = rt.world.heyas.get(cmd.heyaId);
    if (!heya) return;
    const welfareState = heya.welfareState
      ? { ...heya.welfareState, activeDiet: cmd.diet }
      : {
          welfareRisk: 0,
          activeDiet: cmd.diet,
          complianceState: "compliant" as const,
          weeksInState: 0,
        };
    rt.world = updateHeyaInWorld(rt.world, cmd.heyaId, { welfareState });
    rt.syncAndDigest();
  }
}

function investInFacilityCmd(rt: WorkerRuntime, cmd: Cmd<"INVEST_IN_FACILITY">) {
  if (rt.world) {
    const impact = investInFacility(rt.world, cmd.heyaId, cmd.axis, cmd.points);
    rt.world = resolveImpacts(rt.world, [impact]);
    rt.syncAndDigest();
  }
}

function buildInfrastructureCmd(rt: WorkerRuntime, cmd: Cmd<"BUILD_INFRASTRUCTURE">) {
  if (rt.world) {
    const impact = InfrastructureService.startConstruction(
      rt.world,
      cmd.heyaId,
      cmd.facilityId
    );
    rt.world = resolveImpacts(rt.world, [impact]);
    rt.syncAndDigest();
  }
}

function assignMentorCmd(rt: WorkerRuntime, cmd: Cmd<"ASSIGN_MENTOR">) {
  if (rt.world) {
    const { ok, impact } = assignMentor(rt.world, cmd.apprenticeId, cmd.mentorId);
    if (!ok || !impact) return;
    rt.world = resolveImpacts(rt.world, [impact]);
    rt.syncAndDigest();
  }
}

function removeMentorCmd(rt: WorkerRuntime, cmd: Cmd<"REMOVE_MENTOR">) {
  if (rt.world) {
    const impact = removeMentor(rt.world, cmd.apprenticeId);
    rt.world = resolveImpacts(rt.world, [impact]);
    rt.syncAndDigest();
  }
}

function addSparringPairCmd(rt: WorkerRuntime, cmd: Cmd<"ADD_SPARRING_PAIR">) {
  if (rt.world) {
    const impact = assignSparringPair(
      rt.world,
      cmd.heyaId,
      cmd.aId,
      cmd.bId,
      rt.world.week
    );
    rt.world = resolveImpacts(rt.world, [impact]);
    rt.syncAndDigest();
  }
}

function removeSparringPairCmd(rt: WorkerRuntime, cmd: Cmd<"REMOVE_SPARRING_PAIR">) {
  if (rt.world) {
    const impact = removeSparringPair(rt.world, cmd.heyaId, cmd.aId, cmd.bId);
    rt.world = resolveImpacts(rt.world, [impact]);
    rt.syncAndDigest();
  }
}

function setTsukebitoCmd(rt: WorkerRuntime, cmd: Cmd<"SET_TSUKEBITO">) {
  if (rt.world) {
    // Apply each tsukebito ID sequentially — setTsukebito validates eligibility per junior
    let world = rt.world;
    for (const juniorId of cmd.tsukebitoIds) {
      const impact = setTsukebito(world, cmd.seniorId, juniorId);
      world = resolveImpacts(world, [impact]);
    }
    rt.world = world;
    rt.syncAndDigest();
  }
}

function removeTsukebitoCmd(rt: WorkerRuntime, cmd: Cmd<"REMOVE_TSUKEBITO">) {
  if (rt.world) {
    // Remove a single junior from this senior's tsukebito list.
    // SET_TSUKEBITO only appends (early-returns if already present), so it
    // cannot be used to remove — the Remove button must dispatch this.
    const impact = clearTsukebito(rt.world, cmd.seniorId, cmd.juniorId);
    rt.world = resolveImpacts(rt.world, [impact]);
    rt.syncAndDigest();
  }
}

function setTrainingStateCmd(rt: WorkerRuntime, cmd: Cmd<"SET_TRAINING_STATE">) {
  if (rt.world) {
    const impact = {
      entities: {
        trainingStateUpdates: new Map([[cmd.heyaId, cmd.trainingState]]),
      },
    };
    rt.world = resolveImpacts(rt.world, [impact]);
    rt.syncWorld();
  }
}

function setKeshoConfigCmd(rt: WorkerRuntime, cmd: Cmd<"SET_KESHO_CONFIG">) {
  if (rt.world) {
    rt.world = {
      ...rt.world,
      customKeshoConfigs: {
        ...(rt.world.customKeshoConfigs || {}),
        [cmd.rikishiId]: cmd.config,
      },
    };
    rt.syncAndDigest();
  }
}

export function heyaCommands(rt: WorkerRuntime): CommandHandlerMap {
  return {
    WITHDRAW_RIKISHI: (cmd) => withdrawRikishiCmd(rt, cmd),
    TREAT_INJURY: (cmd) => treatInjuryCmd(rt, cmd),
    RETIRE_RIKISHI: (cmd) => retireRikishiCmd(rt, cmd),
    SET_HEYA_DIET: (cmd) => setHeyaDietCmd(rt, cmd),
    INVEST_IN_FACILITY: (cmd) => investInFacilityCmd(rt, cmd),
    BUILD_INFRASTRUCTURE: (cmd) => buildInfrastructureCmd(rt, cmd),
    ASSIGN_MENTOR: (cmd) => assignMentorCmd(rt, cmd),
    REMOVE_MENTOR: (cmd) => removeMentorCmd(rt, cmd),
    ADD_SPARRING_PAIR: (cmd) => addSparringPairCmd(rt, cmd),
    REMOVE_SPARRING_PAIR: (cmd) => removeSparringPairCmd(rt, cmd),
    SET_TSUKEBITO: (cmd) => setTsukebitoCmd(rt, cmd),
    REMOVE_TSUKEBITO: (cmd) => removeTsukebitoCmd(rt, cmd),
    SET_TRAINING_STATE: (cmd) => setTrainingStateCmd(rt, cmd),
    SET_KESHO_CONFIG: (cmd) => setKeshoConfigCmd(rt, cmd),
  };
}
