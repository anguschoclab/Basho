/**
 * shikona/rankRules.ts
 *
 * Rank rules for shikona generation system.
 */

import type { RankRule, RankTier } from "./types";

export const RANK_RULES: RankRule[] = [
  {
    tier: "rookie",
    prestigeChance: 0.02,
    tripleChance: 0.05,
    maxLen: 14,
    patternBias: { triple: -3, "regional+ending": 1, "cat+cat": 2 },
  },
  {
    tier: "developing",
    prestigeChance: 0.04,
    tripleChance: 0.08,
    maxLen: 16,
    patternBias: { triple: -1, "cat+cat": 2 },
  },
  {
    tier: "upper",
    prestigeChance: 0.06,
    tripleChance: 0.12,
    maxLen: 18,
    patternBias: { triple: 1, "nature+noble": 1, "tradition+flora": 1 },
  },
  {
    tier: "salaried",
    prestigeChance: 0.08,
    tripleChance: 0.16,
    maxLen: 20,
    patternBias: { triple: 2, "nat+terrain": 1 },
  },
  {
    tier: "top",
    prestigeChance: 0.12,
    tripleChance: 0.2,
    maxLen: 22,
    patternBias: { triple: 3, "tradition+flora": 1, "power+any": 1 },
  },
  {
    tier: "legend",
    prestigeChance: 0.16,
    tripleChance: 0.24,
    maxLen: 24,
    patternBias: { triple: 4, "power+any": 1, "nature+noble": 1 },
  },
];

export function resolveRankTier(rank?: string): RankTier {
  const r = (rank || "").toLowerCase();
  if (r.includes("yokozuna") || r.includes("ozeki")) return "legend";
  if (r.includes("makuuchi")) return "top";
  if (r.includes("juryo")) return "salaried";
  if (r.includes("makushita")) return "upper";
  if (r.includes("sandanme")) return "developing";
  return "rookie";
}

export function getRankRule(rank?: string): RankRule {
  const tier = resolveRankTier(rank);
  return RANK_RULES.find((r) => r.tier === tier) || RANK_RULES[1];
}
