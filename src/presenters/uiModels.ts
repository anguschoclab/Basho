/**
 * uiModels.ts — UI Projection Layer (Consolidated Re-exports)
 * 
 * This file serves as the main entry point for UI Data Transfer Objects (DTOs).
 * It re-exports types and functions from specialized modules to maintain 
 * compatibility with existing imports while enforcing strict typing.
 */

export * from "./rikishiUI";
export * from "./heyaUI";
export * from "./bashoUI";
export * from "./banzukeUI";
export * from "./boutPreviewUI";

// Legacy compat: Added only if absolutely necessary for un-refactored code
export function getLocalizedArchetype(archetype?: string): string {
    if (!archetype) return "All-Rounder";
    const map: Record<string, string> = {
        oshi: "Explosive Blitzer",
        giant: "Immovable Mountain",
        trickster: "Acrobatic Trickster",
        yotsu: "Defensive Stalwart",
        hybrid: "Dynamic Tactician",
        speedster: "Lightning Specialist",
    };
    return map[archetype] || "Unknown";
}
