/**
 * keshoEditorData.ts
 *
 * Selectable motifs and preset palettes for the KeshoEditor.
 */

import type { TraditionalMotif } from "@/engine/types/keshoMawashi";
import { KESHO_PRESET } from "@/constants/ui/drawingPalette";

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
  {
    name: "Sovereign Gold",
    primary: KESHO_PRESET.CRIMSON,
    secondary: KESHO_PRESET.ANTIQUE_GOLD,
    accent: KESHO_PRESET.GOLD,
  },
  {
    name: "Imperial Phoenix",
    primary: KESHO_PRESET.PHOENIX,
    secondary: KESHO_PRESET.CRIMSON,
    accent: KESHO_PRESET.GOLD,
  },
  {
    name: "Deep Ocean",
    primary: KESHO_PRESET.NAVY,
    secondary: KESHO_PRESET.OCEAN,
    accent: KESHO_PRESET.WHITE,
  },
  {
    name: "Silent Bamboo",
    primary: KESHO_PRESET.SLATE_GREEN,
    secondary: KESHO_PRESET.BAMBOO,
    accent: KESHO_PRESET.BEIGE,
  },
  {
    name: "Midnight Storm",
    primary: KESHO_PRESET.INK,
    secondary: KESHO_PRESET.INDIGO,
    accent: KESHO_PRESET.PALE_GRAY,
  },
];
