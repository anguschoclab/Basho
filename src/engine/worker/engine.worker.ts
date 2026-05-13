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
  const COMMAND_HANDLERS: {
    [T in EngineCommand["type"]]: (cmd: Extract<EngineCommand, { type: T }>) => void | Promise<void>;
  } = {
    START_WORLD: (cmd) => {
      currentWorld = generateWorld({
        seed: cmd.seed,
        playerConfig: { heyaId: cmd.playerHeyaId },
      });
      emitDigest();
    },
    LOAD_WORLD: (cmd) => {
      currentWorld = migrateWorldState(cmd.world);
      emitDigest();
    },
    TICK_DAY: () => {
      if (currentWorld) {
        currentWorld = tickOrchestrator(currentWorld);
        emitDigest();
      }
    },
    AUTO_SIM_DAYS: (cmd) => {
      if (currentWorld) {
        for (let i = 0; i < cmd.days; i++) {
          currentWorld = tickOrchestrator(currentWorld);
          if (i % 5 === 0) {
            self.postMessage({
              type: "PROGRESS",
              message: `Simulating day ${i + 1} of ${cmd.days}...`,
              current: i + 1,
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
    RESOLVE_CRISIS: (cmd) => {
      if (currentWorld) {
        const impact = governance.resolveCrisis(
          currentWorld,
          cmd.crisisId,
          cmd.choice as "harsh" | "cover_up"
        );
        currentWorld = resolveImpacts(currentWorld, [impact]);
        emitDigest();
        syncWorld();
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
        emitDigest();
        syncWorld();
      }
    },
    LEASE_MYOSEKI: (cmd) => {
      if (currentWorld) {
        const impact = myoseki.leaseMyoseki(currentWorld, cmd.buyerId, cmd.myosekiId);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        emitDigest();
        syncWorld();
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
        emitDigest();
        syncWorld();
      }
    },
    REQUEST_BAILOUT: (cmd) => {
      if (currentWorld) {
        const impact = loans.issueBailoutLoanIfNeeded(currentWorld, cmd.heyaId);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        emitDigest();
        syncWorld();
      }
    },
    PREPAY_LOAN: (cmd) => {
      if (currentWorld) {
        const impact = loans.prepayLoan(currentWorld, cmd.heyaId, cmd.loanId);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        emitDigest();
        syncWorld();
      }
    },
    HIRE_STAFF: (cmd) => {
      if (currentWorld) {
        const impact = staffService.hireStaff(currentWorld, cmd.heyaId, cmd.role);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        emitDigest();
        syncWorld();
      }
    },
    FIRE_STAFF: (cmd) => {
      if (currentWorld) {
        const impact = staffService.fireStaff(currentWorld, cmd.heyaId, cmd.staffId);
        currentWorld = resolveImpacts(currentWorld, [impact]);
        emitDigest();
        syncWorld();
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
        emitDigest();
        syncWorld();
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
        emitDigest();
        syncWorld();
      }
    },
    GET_DIGEST: () => {
      emitDigest();
    },
  };

  try {
    const handler = COMMAND_HANDLERS[command.type];
    if (handler) {
      await handler(command as any);
    } else {
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
