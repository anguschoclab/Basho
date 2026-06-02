// NPC Manager AI barrel — implementation decomposed into npcAI/ directory.

export { getManagerPersona } from "./systems/NPCPersonaService";

export type { AgentDecisions, NPCWeeklyDecision } from "./npcAI/types";

export { makeNPCWeeklyDecision } from "./npcAI/weekly";
export { handleNPCCrisis, handleNPCMediaEvent, consolidateOyakataMemory } from "./npcAI/handlers";
export { applyNPCDecision, tickWeekNPC, tickMonthlyNPC, tickYear } from "./npcAI/ticks";
