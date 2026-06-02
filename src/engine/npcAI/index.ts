export { getManagerPersona } from "../systems/NPCPersonaService";

export type { AgentDecisions, NPCWeeklyDecision } from "./types";

export { makeNPCWeeklyDecision } from "./weekly";
export { handleNPCCrisis, handleNPCMediaEvent, consolidateOyakataMemory } from "./handlers";
export { applyNPCDecision, tickWeekNPC, tickMonthlyNPC, tickYear } from "./ticks";
