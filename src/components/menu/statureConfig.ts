/**
 * statureConfig.ts
 *
 * Stature configuration constants for HeyaCard component.
 * Extracted to comply with react-refresh/only-export-components rule.
 */

import { Star, Sparkles, Building2, TrendingDown, AlertTriangle, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { StatureBand } from "@/engine/types/narrative";

export const STATURE_CONFIG: Record<
  StatureBand,
  {
    label: string;
    labelJa: string;
    difficulty: string;
    color: string;
    icon: LucideIcon;
  }
> = {
  legendary: {
    label: "Legendary",
    labelJa: "伝説",
    difficulty: "Very Easy",
    color: "bg-gold/15 text-gold border-gold/30",
    icon: Star,
  },
  powerful: {
    label: "Powerful",
    labelJa: "強豪",
    difficulty: "Easy",
    color: "bg-primary/15 text-primary border-primary/30",
    icon: Sparkles,
  },
  established: {
    label: "Established",
    labelJa: "安定",
    difficulty: "Normal",
    color: "bg-west/15 text-west border-west/30",
    icon: Building2,
  },
  rebuilding: {
    label: "Rebuilding",
    labelJa: "再建中",
    difficulty: "Hard",
    color: "bg-warning/15 text-warning border-warning/30",
    icon: TrendingDown,
  },
  fragile: {
    label: "Fragile",
    labelJa: "危機",
    difficulty: "Very Hard",
    color: "bg-destructive/15 text-destructive border-destructive/30",
    icon: AlertTriangle,
  },
  new: {
    label: "New",
    labelJa: "新規",
    difficulty: "Extreme",
    color: "bg-success/15 text-success border-success/30",
    icon: Plus,
  },
};
