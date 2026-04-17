/**
 * shikona/types.ts
 *
 * Types for shikona generation system.
 */

import type { SeededRNG } from "../rng";

export interface ShikonaGenerationConfig {
  nationality?: string;
  heyaId?: string;
  rank?: string; // e.g. "Jonokuchi", "Yokozuna"
  preferPrestigious?: boolean;
  rng?: SeededRNG;
  legacyShikona?: string; // Optional oyakata's former shikona for legacy naming patterns
}

export type RankTier = "rookie" | "developing" | "upper" | "salaried" | "top" | "legend";

export type PatternId =
  | "nat+terrain"
  | "power+any"
  | "nature+noble"
  | "tradition+flora"
  | "regional+ending"
  | "cat+cat"
  | "triple";

export type PatternWeights = Record<PatternId, number>;

export type HouseStyleId =
  | "power_mountain"
  | "sea_wind"
  | "tradition_flora"
  | "regional_endings"
  | "balanced_classic"
  | "dragon_noble";

export type Connector = "no" | "ga" | "shi" | "kuni" | "iwa" | "yori";

export interface HouseStyle {
  id: HouseStyleId;
  name: string;
  patternBias: Partial<PatternWeights>;
  prefixCategoryBias: Partial<Record<string, number>>;
  suffixCategoryBias: Partial<Record<string, number>>;
  connectorBias?: Partial<Record<Connector, number>>;
}

export interface RankRule {
  tier: RankTier;
  prestigeChance: number;
  tripleChance: number;
  maxLen: number;
  patternBias: Partial<PatternWeights>;
}
