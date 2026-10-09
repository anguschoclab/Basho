/**
 * facilityMeta.ts
 *
 * Facility-axis metadata, band labels/colors, and display helpers for the
 * facilities management panel.
 */

import { Building, Bed, ChefHat } from "lucide-react";
import type { FacilitiesBand } from "@/engine/types/narrative";
import type { FacilityAxis } from "@/presenters/engineAccess";

export const AXIS_META: Record<
  FacilityAxis,
  { label: string; icon: typeof Building; description: string; effectLabel: string }
> = {
  training: {
    label: "Training Dohyo",
    icon: Building,
    description:
      "Quality of practice facilities. Higher levels boost stat growth for all wrestlers.",
    effectLabel: "Stat growth bonus",
  },
  recovery: {
    label: "Recovery Center",
    icon: Bed,
    description:
      "Medical and rehab equipment. Higher levels reduce injury risk and speed up recovery.",
    effectLabel: "Recovery speed & injury prevention",
  },
  nutrition: {
    label: "Kitchen & Chanko",
    icon: ChefHat,
    description: "Nutrition program quality. Higher levels boost strength and stamina gains.",
    effectLabel: "Strength & stamina bonus",
  },
};

export const FACILITY_BAND_COLORS: Record<FacilitiesBand, string> = {
  world_class: "text-gold",
  excellent: "text-primary",
  adequate: "text-west",
  basic: "text-warning",
  minimal: "text-destructive",
};

export const BAND_LABELS: Record<FacilitiesBand, string> = {
  world_class: "World-Class",
  excellent: "Excellent",
  adequate: "Adequate",
  basic: "Basic",
  minimal: "Minimal",
};

/**
 * Get level band label from level value (simple conversion without RNG).
 */
export function getLevelBand(level: number): string {
  if (level >= 85) return "Exceptional";
  if (level >= 65) return "Outstanding";
  if (level >= 45) return "Strong";
  if (level >= 25) return "Capable";
  return "Limited";
}

/**
 * Get effect percent.
 *  * @param axis - The Axis.
 *  * @param level - The Level.
 *  * @returns The result.
 */
export function getEffectPercent(axis: FacilityAxis, level: number): string {
  if (axis === "training") {
    const mult = 0.85 + (level / 100) * 0.35;
    return `${mult >= 1 ? "+" : ""}${((mult - 1) * 100).toFixed(0)}%`;
  }
  if (axis === "recovery") {
    const mult = 0.9 + level / 166;
    return `${mult >= 1 ? "+" : ""}${((mult - 1) * 100).toFixed(0)}%`;
  }
  // nutrition
  const mult = 0.92 + (level / 100) * 0.16;
  return `${mult >= 1 ? "+" : ""}${((mult - 1) * 100).toFixed(0)}%`;
}
