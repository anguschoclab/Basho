/**
 * src/engine/systems/narrative/index.ts
 * =====================================
 * Unified barrel for the Narrative Engine.
 * Delegated to specialized sub-services in src/engine/systems/narrative/.
 *
 * Goal: No monoliths, high-fidelity modularity.
 */

export * from "./NarrativeBands";
export * from "./NarrativeProse";
export * from "./NarrativeService";
export * from "./CrisisService";
export * from "./RivalryHeatService";
export * from "./RivalryService";
