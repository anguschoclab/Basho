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

export function safeRunwayBand(v: unknown): RunwayBand {
  const s = typeof v === "string" ? v : "";
  if (
    s === "secure" ||
    s === "comfortable" ||
    s === "tight" ||
    s === "critical" ||
    s === "desperate"
  )
    return s;
  return "tight";
}

export function safeKoenkaiBand(v: unknown): KoenkaiBandType {
  const s = typeof v === "string" ? v : "";
  if (s === "powerful" || s === "strong" || s === "moderate" || s === "weak" || s === "none")
    return s;
  return "none";
}
