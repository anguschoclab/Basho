/**
 * engine.worker.ts
 * =================
 * Web Worker for the Basho Engine.
 * This runs the simulation off the main thread to prevent UI blocking.
 */

import type { WorldState } from "../types/world";
import { tickOrchestrator } from "../tick/tickOrchestrator";
import { buildWeeklyDigest } from "../../presenters/uiDigest";
import { generateInitialWorld } from "../systems/generation/WorldFactory";
import * as talentpool from "../systems/generation/TalentPoolService";
import * as myoseki from "../myosekiMarket";
import * as sponsorService from "../systems/economy/SponsorContractService";
import * as legacy from "../systems/legacy/DynastyService";
import * as governance from "../systems/governance/GovernanceService";
import { PoliticalFavorsService, type FavorType } from "../systems/politics/PoliticalFavorsService";
import * as staffService from "../staff";
import * as loans from "../loans";
import { resolveImpacts } from "../core/ImpactResolver";

/** Adapter matching the { seed, playerConfig? } call shape used in this worker */
function generateWorld(opts: { seed: string; playerConfig?: { heyaId?: string } }) {
  const world = generateInitialWorld(opts.seed);
  if (opts.playerConfig?.heyaId) world.playerHeyaId = opts.playerConfig.heyaId;
  return world;
}

/**
 * Migrates old save format to work with Phase J citizenship rules.
 * Back-computes joinedHeyaDate for existing rikishi if missing.
 */
function migrateWorldState(world: WorldState): WorldState {
  const currentYear = world.year;
  world.rikishi?.forEach((r) => {
    if (!r.joinedHeyaDate) {
      r.joinedHeyaDate = String(currentYear - 5);
    }
    if (!r.citizenshipStatus) {
      r.citizenshipStatus =
        r.nationality === "Japan" || r.nationality === "Japanese" ? "native" : "foreign";
    }
  });
  return world;
}

import type { EngineCommand } from "./types";

let currentWorld: WorldState | null = null;
let worldVersion = 0;

/**
 * Handle incoming commands from the UI.
 *  * @param event - The Event.
 */
self.onmessage = async (event: MessageEvent<EngineCommand>) => {
  const command = event.data;

  try {
    switch (command.type) {
      case "START_WORLD":
        // Initialize a new world state
        currentWorld = generateWorld({
          seed: command.seed,
          playerConfig: { heyaId: command.playerHeyaId },
        });
        emitDigest();
        break;

      case "LOAD_WORLD":
        currentWorld = migrateWorldState(command.world);
        emitDigest();
        break;

      case "TICK_DAY":
        if (currentWorld) {
          currentWorld = tickOrchestrator(currentWorld);
          emitDigest();
        }
        break;

      case "AUTO_SIM_DAYS":
        if (currentWorld) {
          for (let i = 0; i < command.days; i++) {
            currentWorld = tickOrchestrator(currentWorld);
            // Optional: Emit progress for long sims
            if (i % 5 === 0) {
              self.postMessage({
                type: "PROGRESS",
                message: `Simulating day ${i + 1} of ${command.days}...`,
                current: i + 1,
                total: command.days,
              });
            }
          }
          emitDigest();
          // Return updated world so main thread can sync its own state
          worldVersion++;
          self.postMessage({ type: "WORLD_UPDATED", world: currentWorld, version: worldVersion });
        }
        break;

      case "OFFER_CONTRACT":
        if (currentWorld) {
          const result = talentpool.offerCandidate(
            currentWorld,
            command.candidateId,
            command.heyaId,
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
        break;

      case "SCOUT_POOL":
        if (currentWorld) {
          const result = talentpool.scoutPool(currentWorld, command.pool, {
            revealCount: command.revealCount,
          });
          if (result.impact) {
            currentWorld = resolveImpacts(currentWorld, [result.impact]);
            emitDigest();
            syncWorld();
          }
        }
        break;

      case "SCOUT_CANDIDATE":
        if (currentWorld) {
          const result = talentpool.scoutCandidate(currentWorld, command.candidateId, {
            effort: command.effort,
          });
          if (result.ok && result.impact) {
            currentWorld = resolveImpacts(currentWorld, [result.impact]);
            emitDigest();
            syncWorld();
          }
        }
        break;

      case "RESOLVE_CRISIS":
        if (currentWorld) {
          const impact = governance.resolveCrisis(
            currentWorld,
            command.crisisId,
            command.choice as "harsh" | "cover_up"
          );
          currentWorld = resolveImpacts(currentWorld, [impact]);
          emitDigest();
          syncWorld();
        }
        break;

      case "BUY_MYOSEKI":
        if (currentWorld) {
          const impact = myoseki.buyMyoseki(
            currentWorld,
            command.buyerId,
            command.buyerHeyaId,
            command.myosekiId
          );
          currentWorld = resolveImpacts(currentWorld, [impact]);
          emitDigest();
          syncWorld();
        }
        break;

      case "LEASE_MYOSEKI":
        if (currentWorld) {
          const impact = myoseki.leaseMyoseki(currentWorld, command.buyerId, command.myosekiId);
          currentWorld = resolveImpacts(currentWorld, [impact]);
          emitDigest();
          syncWorld();
        }
        break;

      case "RENEW_SPONSOR":
        if (currentWorld) {
          const impact = sponsorService.renewSponsorContract(
            currentWorld,
            command.relationshipId,
            command.sponsorId
          );
          currentWorld = resolveImpacts(currentWorld, [impact]);
          emitDigest();
          syncWorld();
        }
        break;

      case "REQUEST_BAILOUT":
        if (currentWorld) {
          const impact = loans.issueBailoutLoanIfNeeded(currentWorld, command.heyaId);
          currentWorld = resolveImpacts(currentWorld, [impact]);
          emitDigest();
          syncWorld();
        }
        break;

      case "PREPAY_LOAN":
        if (currentWorld) {
          const impact = loans.prepayLoan(currentWorld, command.heyaId, command.loanId);
          currentWorld = resolveImpacts(currentWorld, [impact]);
          emitDigest();
          syncWorld();
        }
        break;

      case "HIRE_STAFF":
        if (currentWorld) {
          const impact = staffService.hireStaff(currentWorld, command.heyaId, command.role);
          currentWorld = resolveImpacts(currentWorld, [impact]);
          emitDigest();
          syncWorld();
        }
        break;

      case "FIRE_STAFF":
        if (currentWorld) {
          const impact = staffService.fireStaff(currentWorld, command.heyaId, command.staffId);
          currentWorld = resolveImpacts(currentWorld, [impact]);
          emitDigest();
          syncWorld();
        }
        break;

      case "TRIGGER_SUCCESSION":
        if (currentWorld) {
          const impact = legacy.DynastyService.triggerSuccession(
            currentWorld,
            command.heyaId,
            command.successorId
          );
          currentWorld = resolveImpacts(currentWorld, [impact]);
          emitDigest();
          syncWorld();
        }
        break;

      case "SET_TRAINING_STATE":
        if (currentWorld) {
          const impact = {
            entities: {
              trainingStateUpdates: new Map([[command.heyaId, command.trainingState]]),
            },
          };
          currentWorld = resolveImpacts(currentWorld, [impact]);
          syncWorld();
        }
        break;

      case "REQUEST_POLITICAL_FAVOR":
        if (currentWorld) {
          const impact = PoliticalFavorsService.requestFavor(
            currentWorld,
            command.heyaId,
            command.favorId as FavorType
          );
          currentWorld = resolveImpacts(currentWorld, [impact]);
          emitDigest();
          syncWorld();
        }
        break;

      case "GET_DIGEST":
        emitDigest();
        break;

      default:
        console.warn(`[Worker] Unknown command: ${command.type}`);
    }
  } catch (err) {
    self.postMessage({
      type: "ERROR",
      message: err instanceof Error ? err.message : "Unknown engine error",
    });
  }
};

/**
 * Build and emit the latest UI digest.
 *  * @returns The result.
 */
function emitDigest() {
  if (!currentWorld) return;
  const digest = buildWeeklyDigest(currentWorld);
  if (digest) {
    self.postMessage({ type: "TICK_COMPLETED", digest });
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

// Signal that worker is ready
self.postMessage({ type: "READY", worldExists: !!currentWorld });
