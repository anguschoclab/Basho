/**
 * engine.worker.ts
 * =================
 * Web Worker for the Basho Engine.
 * This runs the simulation off the main thread to prevent UI blocking.
 */

import type { WorldState } from "../types/world";
import { tickOrchestrator, advanceDaysFastOrchestrator } from "../tick/tickOrchestrator";
import { buildWeeklyDigest } from "../../presenters/uiDigest";
import { generateInitialWorld } from "../systems/generation/WorldFactory";
import * as talentpool from "../systems/generation/TalentPoolService";
import { poachCandidate } from "../systems/generation/CandidatePoolService";
import * as myoseki from "../myosekiMarket";
import * as sponsorService from "../systems/economy/SponsorContractService";
import * as legacy from "../systems/legacy/DynastyService";
import { isForeign } from "../utils/identity";
import * as governance from "../systems/governance/GovernanceService";
import {
  PoliticalFavorsService,
  type FavorType,
} from "../systems/governance/PoliticalFavorsService";
import * as staffService from "../staff";
import * as loans from "../loans";
import { resolveImpacts } from "../core/ImpactResolver";
import { resolveLoopDecision } from "../loop/LoopDecisionEngine";
import { shouldHaltAdvance } from "../loop/shouldHaltAdvance";
import { issueGovernanceRuling } from "../systems/governance/ScandalService";
import { handleMediaEvent } from "../systems/media/MediaEventService";
import { withdrawRikishi, treatInjury } from "../systems/health/HealthActions";
import { WorldCircuitService } from "../systems/worldCircuit/WorldCircuitService";
import { runHoliday } from "../holiday";
import { setTsukebito, clearTsukebito } from "../systems/training/TsukebitoService";
import {
  buildYouthAcademy,
  upgradeYouthAcademy,
} from "../systems/recruitment/YouthAcademyService";
import { investInFacility } from "../facilities";
import { InfrastructureService } from "../systems/economy/InfrastructureService";
import { assignMentor } from "../lineage";
import { removeMentor } from "../systems/training/MentorshipService";
import { assignSparringPair, removeSparringPair } from "../systems/training/SparringService";
import {
  addBookmark,
  removeBookmark,
  updateBookmarkNote,
} from "../systems/bookmark/BookmarkService";
import {
  advanceTutorialStep as svcAdvanceTutorialStep,
  setTutorialFlag as svcSetTutorialFlag,
  finishExhibition as svcFinishExhibition,
  completeTutorial as svcCompleteTutorial,
} from "../systems/tutorial/TutorialService";
import { updateHeyaInWorld } from "../queries";
import { retireRikishiImpact } from "../core/ImpactBuilder";
import { spendPoliticalCapital } from "../systems/governance/ScandalService";
import { recruitSponsor } from "../systems/economy/sponsorshipMutations";
import { setScoutingInvestment } from "../scoutingStore";
import { rngForWorld } from "../rng";

/**
 * Adapter matching the { seed, playerConfig? } call shape used in this worker.
 * Initializes a new game world.
 *
 * @param {Object} opts - Generation options.
 * @param {string} opts.seed - The random seed for world generation.
 * @param {Object} [opts.playerConfig] - Optional player configuration.
 * @param {string} [opts.playerConfig.heyaId] - Optional starting heya ID for the player.
 * @returns {WorldState} The newly generated world state.
 */
function generateWorld(opts: { seed: string; playerConfig?: { heyaId?: string } }) {
  const world = generateInitialWorld(opts.seed);
  if (opts.playerConfig?.heyaId) world.playerHeyaId = opts.playerConfig.heyaId; // @world-builder
  return world;
}

/**
 * Migrates old save format to work with Phase J citizenship rules.
 * Back-computes joinedHeyaDate for existing rikishi if missing.
 *
 * @param {WorldState} world - The world state to migrate.
 * @returns {WorldState} The migrated world state.
 */
function migrateWorldState(world: WorldState): WorldState {
  const currentYear = world.year;
  let rikishiChanged = false;
  const nextRikishi = new Map(world.rikishi);

  for (const [id, r] of nextRikishi) {
    let nextR = r;
    if (!r.joinedHeyaDate) {
      nextR = { ...nextR, joinedHeyaDate: String(currentYear - 5) };
      rikishiChanged = true;
    }
    if (!r.citizenshipStatus) {
      nextR = {
        ...nextR,
        citizenshipStatus: !isForeign(r) ? "native" : "foreign",
      };
      rikishiChanged = true;
    }
    if (nextR !== r) {
      nextRikishi.set(id, nextR);
    }
  }

  return rikishiChanged ? { ...world, rikishi: nextRikishi } : world;
}

import type { EngineCommand } from "./types";
import { warn } from "../utils/Logger";

let currentWorld: WorldState | null = null;
let worldVersion = 0;
let digestRevision = 0;
let simPaused = false;

/**
 * Main message handler for the Web Worker.
 * Dispatches commands from the UI thread to their respective engine handlers.
 *
 * @param {MessageEvent<EngineCommand>} event - The message event containing the command.
 */
self.onmessage = async (event: MessageEvent<EngineCommand>) => {
  const command = event.data;

  const COMMAND_HANDLERS: Partial<{
    [T in EngineCommand["type"]]: (
      cmd: Extract<EngineCommand, { type: T }>
    ) => void | Promise<void>;
  }> = {
    START_WORLD: (cmd) => {
      currentWorld = generateWorld({
        seed: cmd.seed,
        playerConfig: { heyaId: cmd.playerHeyaId },
      });
      // B4.1.1: Sync world back to main thread so the reducer can load it.
      // This makes the worker the single source of truth — the main thread
      // no longer generates worlds independently.
      syncWorld();
      emitDigest();
    },
    LOAD_WORLD: (cmd) => {
      currentWorld = migrateWorldState(cmd.world);
      emitDigest();
    },
    TICK_DAY: () => {
      if (currentWorld) {
        currentWorld = tickOrchestrator(currentWorld);
        syncAndDigest();
      }
    },
    TICK_MULTIPLE_DAYS: async (cmd) => {
      if (currentWorld) {
        const days = cmd.days;
        // Use fast path (skip daily micro-phases) only for week+ advances.
        // Short advances (2-6 days) should run full daily micro-phases for correctness.
        const useFast = days >= 7;
        const chunk = useFast ? 7 : 1;

        for (let i = 0; i < days; i += chunk) {
          // B4.1.4 INVARIANT: simPaused is ONLY read here at the loop top,
          // never inside the chunk processing below. This ensures pause is
          // strictly between-chunk — currentWorld is not yet advanced when
          // the retry occurs, so no partial advancement can be re-run.
          if (simPaused) {
            // Yield control and resume on next iteration when RESUME_SIM clears the flag
            await new Promise((resolve) => setTimeout(resolve, 100));
            i -= chunk; // retry same chunk
            continue;
          }

          const remaining = days - i;
          const step = Math.min(chunk, remaining);

          if (useFast) {
            currentWorld = advanceDaysFastOrchestrator(currentWorld, step);
          } else {
            for (let j = 0; j < step; j++) {
              currentWorld = tickOrchestrator(currentWorld);
            }
          }

          if (shouldHaltAdvance(currentWorld)) {
            self.postMessage({
              type: "PROGRESS",
              message: `Paused for a decision on day ${i + step} of ${days}.`,
              current: i + step,
              total: days,
            });
            break;
          }

          if (i % 7 === 0 || i + step >= days) {
            self.postMessage({
              type: "PROGRESS",
              message: `Advancing day ${i + step} of ${days}...`,
              current: i + step,
              total: days,
            });
          }
        }

        emitDigest();
        worldVersion++;
        self.postMessage({ type: "WORLD_UPDATED", world: currentWorld, version: worldVersion });
      }
    },
    AUTO_SIM_DAYS: async (cmd) => {
      if (currentWorld) {
        // Use fast orchestrator for parity with AutoSimService (skip daily micro-phases).
        const chunk = 7;
        for (let i = 0; i < cmd.days; i += chunk) {
          if (simPaused) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            i -= chunk; // retry same chunk
            continue;
          }
          const remaining = cmd.days - i;
          const step = Math.min(chunk, remaining);
          currentWorld = advanceDaysFastOrchestrator(currentWorld, step);
          if (shouldHaltAdvance(currentWorld)) break;
          if (i % (chunk * 2) === 0 || i + step >= cmd.days) {
            self.postMessage({
              type: "PROGRESS",
              message: `Simulating day ${i + step} of ${cmd.days}...`,
              current: i + step,
              total: cmd.days,
            });
          }
        }
        emitDigest();
        worldVersion++;
        self.postMessage({ type: "WORLD_UPDATED", world: currentWorld, version: worldVersion });
      }
    },
    OFFER_CONTRACT: (cmd) => {
      if (currentWorld) {
        const result = talentpool.offerCandidate(
          currentWorld,
          cmd.candidateId,
          cmd.heyaId,
          "standard",
          "high"
        );
        if (result.ok && result.impact) {
          currentWorld = resolveImpacts(currentWorld, [result.impact]);
          emitDigest();
          syncWorld();
        } else {
          self.postMessage({ type: "ERROR", message: result.reason || "Offer failed" });
        }
      }
    },
    SCOUT_POOL: (cmd) => {
      if (currentWorld) {
        const result = talentpool.scoutPool(currentWorld, cmd.pool, {
          revealCount: cmd.revealCount,
        });
        if (result.impact) {
          currentWorld = resolveImpacts(currentWorld, [result.impact]);
          emitDigest();
          syncWorld();
        }
      }
    },
    SCOUT_CANDIDATE: (cmd) => {
      if (currentWorld) {
        const result = talentpool.scoutCandidate(currentWorld, cmd.candidateId, {
          effort: cmd.effort,
        });
        if (result.ok && result.impact) {
          currentWorld = resolveImpacts(currentWorld, [result.impact]);
          emitDigest();
          syncWorld();
        }
      }
    },
    POACH_CANDIDATE: (cmd) => {
      if (currentWorld) {
        const result = poachCandidate(currentWorld, cmd.candidateId, cmd.heyaId);
        if (result.ok && result.impact) {
          currentWorld = resolveImpacts(currentWorld, [result.impact]);
          emitDigest();
          syncWorld();
        } else {
          self.postMessage({ type: "ERROR", message: result.reason || "Poach failed" });
        }
      }
    },
    RESOLVE_CRISIS: (cmd) => {
      if (currentWorld) {
        const impact = governance.resolveCrisis(
          currentWorld,
          cmd.crisisId,
          cmd.choice as "harsh" | "cover_up"
        );
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncAndDigest();
      }
    },
    RESOLVE_LOOP_DECISION: (cmd) => {
      if (currentWorld) {
        const impact = resolveLoopDecision(currentWorld, cmd.decisionId, cmd.optionId);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncAndDigest();
      }
    },
    ISSUE_RULING: (cmd) => {
      if (currentWorld) {
        const impact = issueGovernanceRuling(currentWorld, cmd.rulingId, cmd.severity);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncAndDigest();
      }
    },
    HANDLE_MEDIA_EVENT: (cmd) => {
      if (currentWorld) {
        const impact = handleMediaEvent(currentWorld, cmd.eventId, cmd.choice);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncAndDigest();
      }
    },
    WITHDRAW_RIKISHI: (cmd) => {
      if (currentWorld) {
        currentWorld = resolveImpacts(currentWorld, [withdrawRikishi(currentWorld, cmd.rikishiId)]);
        syncAndDigest();
      }
    },
    TREAT_INJURY: (cmd) => {
      if (currentWorld) {
        currentWorld = resolveImpacts(currentWorld, [
          treatInjury(currentWorld, cmd.rikishiId, cmd.weeks),
        ]);
        syncAndDigest();
      }
    },
    INVEST_IN_FACILITY: (cmd) => {
      if (currentWorld) {
        const impact = investInFacility(currentWorld, cmd.heyaId, cmd.axis, cmd.points);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncAndDigest();
      }
    },
    BUILD_INFRASTRUCTURE: (cmd) => {
      if (currentWorld) {
        const impact = InfrastructureService.startConstruction(
          currentWorld,
          cmd.heyaId,
          cmd.facilityId
        );
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncAndDigest();
      }
    },
    ASSIGN_MENTOR: (cmd) => {
      if (currentWorld) {
        const { ok, impact } = assignMentor(currentWorld, cmd.apprenticeId, cmd.mentorId);
        if (!ok || !impact) return;
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncAndDigest();
      }
    },
    REMOVE_MENTOR: (cmd) => {
      if (currentWorld) {
        const impact = removeMentor(currentWorld, cmd.apprenticeId);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncAndDigest();
      }
    },
    ADD_SPARRING_PAIR: (cmd) => {
      if (currentWorld) {
        const impact = assignSparringPair(
          currentWorld,
          cmd.heyaId,
          cmd.aId,
          cmd.bId,
          currentWorld.week
        );
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncAndDigest();
      }
    },
    REMOVE_SPARRING_PAIR: (cmd) => {
      if (currentWorld) {
        const impact = removeSparringPair(currentWorld, cmd.heyaId, cmd.aId, cmd.bId);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncAndDigest();
      }
    },
    BOOKMARK_ENTITY: (cmd) => {
      if (currentWorld) {
        const impact = addBookmark(currentWorld, cmd.entityType, cmd.entityId, cmd.note);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncWorld();
      }
    },
    UNBOOKMARK_ENTITY: (cmd) => {
      if (currentWorld) {
        const impact = removeBookmark(currentWorld, cmd.entityType, cmd.entityId);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncWorld();
      }
    },
    UPDATE_BOOKMARK_NOTE: (cmd) => {
      if (currentWorld) {
        const impact = updateBookmarkNote(currentWorld, cmd.entityType, cmd.entityId, cmd.note);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncWorld();
      }
    },
    ADVANCE_TUTORIAL_STEP: (cmd) => {
      if (currentWorld) {
        const impact = svcAdvanceTutorialStep(currentWorld, cmd.step);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncWorld();
      }
    },
    SET_TUTORIAL_FLAG: (cmd) => {
      if (currentWorld) {
        const impact = svcSetTutorialFlag(currentWorld, cmd.flag);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncWorld();
      }
    },
    FINISH_EXHIBITION: (cmd) => {
      if (currentWorld) {
        const impact = svcFinishExhibition(currentWorld, cmd.flag, cmd.step);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncWorld();
      }
    },
    COMPLETE_TUTORIAL: () => {
      if (currentWorld) {
        const impact = svcCompleteTutorial(currentWorld);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncWorld();
      }
    },
    APPLY_PRESS_CONFERENCE: (cmd) => {
      if (currentWorld) {
        const heya = currentWorld.heyas.get(cmd.heyaId);
        if (!heya) return;
        const reputation = Math.max(
          0,
          Math.min(100, (heya.reputation ?? 50) + cmd.reputationDelta)
        );
        currentWorld = updateHeyaInWorld(currentWorld, cmd.heyaId, { reputation });
        syncAndDigest();
      }
    },
    SET_HEYA_DIET: (cmd) => {
      if (currentWorld) {
        const heya = currentWorld.heyas.get(cmd.heyaId);
        if (!heya) return;
        const welfareState = heya.welfareState
          ? { ...heya.welfareState, activeDiet: cmd.diet }
          : {
              welfareRisk: 0,
              activeDiet: cmd.diet,
              complianceState: "compliant" as const,
              weeksInState: 0,
            };
        currentWorld = updateHeyaInWorld(currentWorld, cmd.heyaId, { welfareState });
        syncAndDigest();
      }
    },
    RETIRE_RIKISHI: (cmd) => {
      if (currentWorld) {
        const impact = retireRikishiImpact(cmd.rikishiId, cmd.reason);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncAndDigest();
      }
    },
    SPEND_POLITICAL_CAPITAL: (cmd) => {
      if (currentWorld) {
        const impact = spendPoliticalCapital(currentWorld, cmd.heyaId, cmd.amount);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncAndDigest();
      }
    },
    RECRUIT_SPONSOR: (cmd) => {
      if (currentWorld) {
        const rng = rngForWorld(
          currentWorld,
          "sponsors",
          `recruit_${cmd.heyaId}_${cmd.sponsorId}_${currentWorld.dayIndexGlobal}`
        );
        const impact = recruitSponsor(currentWorld, cmd.heyaId, cmd.sponsorId, rng);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncAndDigest();
      }
    },
    SET_SCOUTING_INVESTMENT: (cmd) => {
      if (currentWorld) {
        setScoutingInvestment(currentWorld, cmd.rikishiId, cmd.investment);
        syncAndDigest();
      }
    },
    SET_KESHO_CONFIG: (cmd) => {
      if (currentWorld) {
        currentWorld = {
          ...currentWorld,
          customKeshoConfigs: {
            ...(currentWorld.customKeshoConfigs || {}),
            [cmd.rikishiId]: cmd.config,
          },
        };
        syncAndDigest();
      }
    },
    ACCEPT_EXHIBITION: (cmd) => {
      if (currentWorld) {
        const pending = currentWorld.pendingExhibitions ?? [];
        const invitation = pending.find((i) => i.id === cmd.invitationId);
        if (invitation) {
          const heyaId = invitation.heyaId;
          const impact = WorldCircuitService.processExhibitionResult(
            currentWorld,
            heyaId,
            cmd.rikishiId,
            invitation
          );
          currentWorld = resolveImpacts(currentWorld, [impact]);
          // Remove the accepted invitation from pending
          const remaining = (currentWorld.pendingExhibitions ?? []).filter(
            (i) => i.id !== cmd.invitationId
          );
          currentWorld = { ...currentWorld, pendingExhibitions: remaining };
          syncAndDigest();
        }
      }
    },
    DECLINE_EXHIBITION: (cmd) => {
      if (currentWorld) {
        const remaining = (currentWorld.pendingExhibitions ?? []).filter(
          (i) => i.id !== cmd.invitationId
        );
        currentWorld = { ...currentWorld, pendingExhibitions: remaining };
        syncAndDigest();
      }
    },
    GO_ON_HOLIDAY: (cmd) => {
      if (currentWorld) {
        const result = runHoliday(currentWorld, cmd.config);
        // runHoliday returns reports[] — the last report is the final world state
        if (result && result.reports.length > 0) {
          currentWorld = result.reports[result.reports.length - 1];
        }
        syncAndDigest();
      }
    },
    SET_TSUKEBITO: (cmd) => {
      if (currentWorld) {
        const impact = setTsukebito(currentWorld, cmd.seniorId, cmd.juniorId);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncAndDigest();
      }
    },
    CLEAR_TSUKEBITO: (cmd) => {
      if (currentWorld) {
        const impact = clearTsukebito(currentWorld, cmd.seniorId, cmd.juniorId);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncAndDigest();
      }
    },
    BUILD_FOREIGN_ACADEMY: (cmd) => {
      if (currentWorld) {
        const impact = WorldCircuitService.buildForeignAcademy(
          currentWorld,
          cmd.heyaId,
          cmd.region
        );
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncAndDigest();
      }
    },
    BUILD_YOUTH_ACADEMY: (cmd) => {
      if (currentWorld) {
        const impact = buildYouthAcademy(currentWorld, cmd.heyaId);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncAndDigest();
      }
    },
    UPGRADE_YOUTH_ACADEMY: (cmd) => {
      if (currentWorld) {
        const impact = upgradeYouthAcademy(currentWorld, cmd.heyaId);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncAndDigest();
      }
    },
    BUY_MYOSEKI: (cmd) => {
      if (currentWorld) {
        const impact = myoseki.buyMyoseki(
          currentWorld,
          cmd.buyerId,
          cmd.buyerHeyaId,
          cmd.myosekiId
        );
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncAndDigest();
      }
    },
    LEASE_MYOSEKI: (cmd) => {
      if (currentWorld) {
        const impact = myoseki.leaseMyoseki(currentWorld, cmd.buyerId, cmd.myosekiId);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncAndDigest();
      }
    },
    RENEW_SPONSOR: (cmd) => {
      if (currentWorld) {
        const impact = sponsorService.renewSponsorContract(
          currentWorld,
          cmd.relationshipId,
          cmd.sponsorId
        );
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncAndDigest();
      }
    },
    REQUEST_BAILOUT: (cmd) => {
      if (currentWorld) {
        const impact = loans.issueBailoutLoanIfNeeded(currentWorld, cmd.heyaId);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncAndDigest();
      }
    },
    PREPAY_LOAN: (cmd) => {
      if (currentWorld) {
        const impact = loans.prepayLoan(currentWorld, cmd.heyaId, cmd.loanId);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncAndDigest();
      }
    },
    HIRE_STAFF: (cmd) => {
      if (currentWorld) {
        const impact = staffService.hireStaff(currentWorld, cmd.heyaId, cmd.role);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncAndDigest();
      }
    },
    FIRE_STAFF: (cmd) => {
      if (currentWorld) {
        const impact = staffService.fireStaff(currentWorld, cmd.heyaId, cmd.staffId);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncAndDigest();
      }
    },
    TRIGGER_SUCCESSION: (cmd) => {
      if (currentWorld) {
        const impact = legacy.DynastyService.triggerSuccession(
          currentWorld,
          cmd.heyaId,
          cmd.successorId
        );
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncAndDigest();
      }
    },
    SET_TRAINING_STATE: (cmd) => {
      if (currentWorld) {
        const impact = {
          entities: {
            trainingStateUpdates: new Map([[cmd.heyaId, cmd.trainingState]]),
          },
        };
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncWorld();
      }
    },
    REQUEST_POLITICAL_FAVOR: (cmd) => {
      if (currentWorld) {
        const impact = PoliticalFavorsService.requestFavor(
          currentWorld,
          cmd.heyaId,
          cmd.favorId as FavorType
        );
        currentWorld = resolveImpacts(currentWorld, [impact]);
        syncAndDigest();
      }
    },
    PAUSE_SIM: () => {
      simPaused = true;
      self.postMessage({ type: "PROGRESS", message: "Simulation paused", current: 0, total: 0 });
    },
    RESUME_SIM: () => {
      simPaused = false;
      self.postMessage({ type: "PROGRESS", message: "Simulation resumed", current: 0, total: 0 });
    },
    GET_DIGEST: () => {
      emitDigest();
    },
  };

  try {
    // Explicit generic function type to assert that the handler will process the correct command.
    const handler = COMMAND_HANDLERS[command.type] as
      | ((cmd: EngineCommand) => void | Promise<void>)
      | undefined;
    if (handler) {
      await handler(command);
    } else {
      warn(`Unknown command: ${command.type}`, "Worker");
    }
  } catch (err) {
    self.postMessage({
      type: "ERROR",
      message: err instanceof Error ? err.message : "Unknown engine error",
    });
  }
};

/**
 * Builds and emits the latest UI digest to the main thread.
 * This digest is used to update the UI components with current game data.
 */
function emitDigest() {
  if (!currentWorld) return;
  const digest = buildWeeklyDigest(currentWorld);
  if (digest) {
    digestRevision++;
    self.postMessage({ type: "TICK_COMPLETED", digest, digestRevision });
  }
}

/**
 * Sync the latest world state to the main thread.
 */
function syncWorld() {
  if (!currentWorld) return;
  worldVersion++;
  self.postMessage({ type: "WORLD_UPDATED", world: currentWorld, version: worldVersion });
}

/**
 * Emits the UI digest and syncs the world state to the main thread.
 * Consolidates the repeated emitDigest() + syncWorld() pattern.
 */
function syncAndDigest() {
  emitDigest();
  syncWorld();
}

// Signal that worker is ready
self.postMessage({ type: "READY", worldExists: !!currentWorld });
