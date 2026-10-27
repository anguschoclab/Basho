/**
 * npc_ai/index.ts
 * ================
 * NPC AI phase module exports.
 */

export { collectManagementDecisionEvents, collectStrategyShiftEvents } from "@/engine/tick/phases/npc_ai/events";
export { consolidateOyakataMemoryPure } from "@/engine/tick/phases/npc_ai/memory";
export { applyNPCDecisionPure } from "@/engine/tick/phases/npc_ai/training";
export { processOyakataMood } from "@/engine/tick/phases/npc_ai/mood";
