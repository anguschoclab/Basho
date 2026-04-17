/**
 * shikona/houseStyles.ts
 *
 * House styles for shikona generation system.
 */

import type { HouseStyle } from "./types";

export const HOUSE_STYLES: HouseStyle[] = [
  {
    id: "power_mountain",
    name: "Power & Mountain Lineage",
    patternBias: { "power+any": 8, "nat+terrain": 6, "cat+cat": 3, triple: -2 },
    prefixCategoryBias: { power: 8, tradition: 2 },
    suffixCategoryBias: { mountain: 8, noble: 2 },
  },
  {
    id: "sea_wind",
    name: "Sea & Wind Poets",
    patternBias: { "nat+terrain": 8, "cat+cat": 4, triple: 2 },
    prefixCategoryBias: { nature: 6, tradition: 1 },
    suffixCategoryBias: { water: 7, sky: 6, mountain: -2 },
    connectorBias: { no: 3, yori: 2 },
  },
  {
    id: "tradition_flora",
    name: "Temple & Blossom Tradition",
    patternBias: { "tradition+flora": 10, "nature+noble": 2, triple: 2, "regional+ending": -2 },
    prefixCategoryBias: { tradition: 8, nature: 2 },
    suffixCategoryBias: { flora: 9, noble: 2 },
    connectorBias: { shi: 2, ga: 1 },
  },
  {
    id: "regional_endings",
    name: "Regional Maru House",
    patternBias: { "regional+ending": 12, "cat+cat": 4, triple: -2 },
    prefixCategoryBias: { regional: 10 },
    suffixCategoryBias: { endings: 10, mountain: 1 },
  },
  {
    id: "dragon_noble",
    name: "Dragon & Noble Court",
    patternBias: { "power+any": 4, "nature+noble": 8, triple: 3 },
    prefixCategoryBias: { power: 4, tradition: 3 },
    suffixCategoryBias: { noble: 9, water: 2 },
    connectorBias: { kuni: 2, iwa: 1, ga: 1 },
  },
  {
    id: "balanced_classic",
    name: "Balanced Classic",
    patternBias: { "cat+cat": 4, "nat+terrain": 2 },
    prefixCategoryBias: { power: 2, nature: 2, tradition: 2, regional: 2 },
    suffixCategoryBias: { mountain: 2, water: 2, sky: 2, flora: 2, noble: 2, endings: 2 },
  },
];
