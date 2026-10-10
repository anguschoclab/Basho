/**
 * commands/types.ts
 * =================
 * Shared types for worker command handler modules.
 */

import type { EngineCommand } from "../types";

/** Map of command type -> handler. Handler modules return partial maps. */
export type CommandHandlerMap = Partial<{
  [T in EngineCommand["type"]]: (cmd: Extract<EngineCommand, { type: T }>) => void | Promise<void>;
}>;
