/**
 * economyUtils.ts
 *
 * Helper functions for economy page.
 */

import type { RunwayBand, KoenkaiBandType } from "@/engine/types/narrative";

export function kenshoTierLabel(total: number): { label: string; detail: string } {
  if (total >= 200) return { label: "Legendary", detail: "A magnet for banners and sponsors." };
  if (total >= 80) return { label: "Star Earner", detail: "Frequently featured in sponsor bouts." };
  if (total >= 25) return { label: "Noticed", detail: "Sponsors are beginning to follow." };
  if (total >= 5) return { label: "Emerging", detail: "Occasional sponsor attention." };
  return { label: "Unproven", detail: "Little sponsor draw so far." };
}

const RUNWAY_BANDS = new Set<RunwayBand>([
  "secure",
  "comfortable",
  "tight",
  "critical",
  "desperate",
]);
const KOENKAI_BANDS = new Set<KoenkaiBandType>(["powerful", "strong", "moderate", "weak", "none"]);

export function safeRunwayBand(v: unknown): RunwayBand {
  const s = typeof v === "string" ? v : "";
  return RUNWAY_BANDS.has(s as RunwayBand) ? (s as RunwayBand) : "tight";
}

export function safeKoenkaiBand(v: unknown): KoenkaiBandType {
  const s = typeof v === "string" ? v : "";
  return KOENKAI_BANDS.has(s as KoenkaiBandType) ? (s as KoenkaiBandType) : "none";
}
