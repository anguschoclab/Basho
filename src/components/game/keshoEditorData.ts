/**
 * keshoEditorData.ts
 *
 * Selectable motifs and preset palettes for the KeshoEditor.
 */

import type { TraditionalMotif } from "@/engine/types/keshoMawashi";

export const MOTIFS: TraditionalMotif[] = [
  "dragon",
  "phoenix",
  "tiger",
  "mt_fuji",
  "waves",
  "sakura",
  "pine",
  "bamboo",
  "crane",
  "rising_sun",
  "lightning",
  "waterfall",
  "temple",
  "treasure_ship",
  "carp",
  "lotus",
  "thunder",
  "wind",
  "mountain",
];

export const PRESET_PALETTES = [
  { name: "Sovereign Gold", primary: "#8B0000", secondary: "#D4AF37", accent: "#FFD700" },
  { name: "Imperial Phoenix", primary: "#FF4500", secondary: "#8B0000", accent: "#FFD700" },
  { name: "Deep Ocean", primary: "#001F3F", secondary: "#0074D9", accent: "#FFFFFF" },
  { name: "Silent Bamboo", primary: "#2F4F4F", secondary: "#228B22", accent: "#F5F5DC" },
  { name: "Midnight Storm", primary: "#121212", secondary: "#4B0082", accent: "#E0E0E0" },
];
