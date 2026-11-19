/**
 * engine.worker.ts
 * =================
 * Web Worker for the Basho Engine.
 * This runs the simulation off the main thread to prevent UI blocking.
 *
 * Command handlers live in ./commands/ grouped by domain; this file only
 * owns the runtime, the handler map, and the message dispatch loop.
 */

import type { EngineCommand } from "@/engine/worker/types";
import { warn } from "@/engine/utils/Logger";
import { createWorkerRuntime } from "@/engine/worker/runtime";
import type { CommandHandlerMap } from "@/engine/worker/commands/types";
import { lifecycleCommands } from "@/engine/worker/commands/lifecycle";
import { recruitmentCommands } from "@/engine/worker/commands/recruitment";
import { governanceCommands } from "@/engine/worker/commands/governance";
import { heyaCommands } from "@/engine/worker/commands/heya";
import { economyCommands } from "@/engine/worker/commands/economy";
import { metaCommands } from "@/engine/worker/commands/meta";

const rt = createWorkerRuntime();

const COMMAND_HANDLERS: CommandHandlerMap = {
  ...lifecycleCommands(rt),
  ...recruitmentCommands(rt),
  ...governanceCommands(rt),
  ...heyaCommands(rt),
  ...economyCommands(rt),
  ...metaCommands(rt),
};

/**
 * Main message handler for the Web Worker.
 * Dispatches commands from the UI thread to their respective engine handlers.
 *
 * @param {MessageEvent<EngineCommand>} event - The message event containing the command.
 */
// Commands whose execution sets pendingTick on the main thread (mirrors the
// flag list in gameStore.sendCommand). While one runs, its completion events
// may legitimately clear that flag — events posted outside this window must
// not, or a queued non-tick command's WORLD_UPDATED/TICK_COMPLETED ends the
// pending window early and the sendCommand drop-guard fails open.
const PENDING_TICK_COMMANDS = new Set(["TICK_DAY", "TICK_MULTIPLE_DAYS", "GO_ON_HOLIDAY"]);

self.onmessage = async (event: MessageEvent<EngineCommand>) => {
  const command = event.data;

  try {
    // Explicit generic function type to assert that the handler will process the correct command.
    const handler = COMMAND_HANDLERS[command.type] as
      ((cmd: EngineCommand) => void | Promise<void>) | undefined;
    if (handler) {
      if (PENDING_TICK_COMMANDS.has(command.type)) rt.tickDepth++;
      try {
        await handler(command);
      } finally {
        if (PENDING_TICK_COMMANDS.has(command.type)) rt.tickDepth--;
      }
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

// Signal that worker is ready
self.postMessage({ type: "READY", worldExists: !!rt.world });
