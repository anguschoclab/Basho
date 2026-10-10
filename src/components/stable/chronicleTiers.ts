/**
 * chronicleTiers.ts
 *
 * Legacy-tier metadata and the dynasty-report type for ChronicleRoom.
 */

import { Scroll, Trophy, Award, Star } from "lucide-react";
import type { DynastyService } from "@/presenters/engineAccess";

export type DynastyReport = NonNullable<ReturnType<typeof DynastyService.generateDynastyReport>>;

export const LEGACY_TIERS = {
  emerging: { label: "Emerging Stable", icon: Scroll },
  established: { label: "Established Power", icon: Award },
  dynasty: { label: "Elite Dynasty", icon: Trophy },
  legend: { label: "Eternal Legend", icon: Star },
};
