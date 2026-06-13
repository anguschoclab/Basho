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
import * as myoseki from "../myosekiMarket";
import * as sponsorService from "../systems/economy/SponsorContractService";
import * as legacy from "../systems/legacy/DynastyService";
import * as governance from "../systems/governance/GovernanceService";
import { PoliticalFavorsService, type FavorType } from "../systems/governance/PoliticalFavorsService";
import * as staffService from "../staff";
import * as loans from "../loans";
import { resolveImpacts } from "../core/ImpactResolver";

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
  if (opts.playerConfig?.heyaId) world.playerHeyaId = opts.playerConfig.heyaId;
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
        citizenshipStatus:
          r.nationality === "Japan" || r.nationality === "Japanese" ? "native" : "foreign",
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

let currentWorld: WorldState | null = null;
let worldVersion = 0;
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
    TICK_MULTIPLE_DAYS: async (cmd) => {
      if (currentWorld) {
        const days = cmd.days;
        const useFast = days >= 7;
        const chunk = useFast ? 7 : 1;

        for (let i = 0; i < days; i += chunk) {
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
        for (let i = 0; i < cmd.days; i++) {
          if (simPaused) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            i--; // retry same day
            continue;
          }
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
 * Builds and emits the latest UI digest to the main thread.
 * This digest is used to update the UI components with current game data.
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
