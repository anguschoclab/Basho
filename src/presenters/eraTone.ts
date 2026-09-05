/**
 * eraTone.ts — presenter-layer re-export of the EraTone type.
 *
 * UI components cannot import directly from src/engine/systems/* (architectural
 * boundary enforced by eslint no-restricted-imports). This file re-exports the
 * EraTone type and label helpers so UI layers can consume them.
 */
export type { EraTone } from "@/engine/systems/meta/EraDriftService";

import type { EraTone } from "@/engine/systems/meta/EraDriftService";

export const ERA_TONE_LABELS: Record<EraTone, string> = {
  classic: "Classic",
  explosive: "Explosive",
  technical: "Technical",
  defensive: "Defensive",
};

export const ERA_TONE_COLORS: Record<EraTone, string> = {
  classic: "hsl(var(--gold))",
  explosive: "hsl(var(--east))",
  technical: "hsl(var(--primary))",
  defensive: "hsl(var(--west))",
};

export const ERA_TONE_DESCRIPTIONS: Record<EraTone, string> = {
  classic:
    "The 'Golden Belt' revival. Standard mawashi techniques and traditional grit define the current circuit.",
  explosive:
    "The 'Tsuppari Rush'. High-impact pushing (oshi-sumo) and raw speed overwhelm technical defenses.",
  technical:
    "The 'Technical Renaissance'. Complex throws and diverse maneuvers favour tactical flexibility.",
  defensive:
    "The 'Iron Wall' era. Longer bouts and defensive masterclasses slow the pace as counters become lethal.",
};
