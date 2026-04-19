/**
 * npc_ai/index.ts
 * ================
 * NPC AI phase module exports.
 */

export { collectManagementDecisionEvents, collectStrategyShiftEvents } from "./events";
export { consolidateOyakataMemoryPure } from "./memory";
export { applyNPCDecisionPure } from "./training";
export { processOyakataMood } from "./mood";
