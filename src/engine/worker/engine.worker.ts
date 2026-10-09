/**
 * engine.worker.ts
 * =================
 * Web Worker for the Basho Engine.
 * This runs the simulation off the main thread to prevent UI blocking.
 *
 * Command handlers live in ./commands/ grouped by domain; this file only
 * owns the runtime, the handler map, and the message dispatch loop.
 */

import type { EngineCommand } from "./types";
import { warn } from "../utils/Logger";
import { createWorkerRuntime } from "./runtime";
import type { CommandHandlerMap } from "./commands/types";
import { lifecycleCommands } from "./commands/lifecycle";
import { recruitmentCommands } from "./commands/recruitment";
import { governanceCommands } from "./commands/governance";
import { heyaCommands } from "./commands/heya";
import { economyCommands } from "./commands/economy";
import { metaCommands } from "./commands/meta";

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
self.onmessage = async (event: MessageEvent<EngineCommand>) => {
  const command = event.data;

  try {
    // Explicit generic function type to assert that the handler will process the correct command.
    const handler = COMMAND_HANDLERS[command.type] as
      ((cmd: EngineCommand) => void | Promise<void>) | undefined;
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

// Signal that worker is ready
self.postMessage({ type: "READY", worldExists: !!rt.world });
