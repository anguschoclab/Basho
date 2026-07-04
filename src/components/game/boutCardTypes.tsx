/**
 * boutCardTypes.ts
 *
 * Types and constants for BoutCard component.
 */

import React from "react";
import type { UIRikishi } from "@/presenters/uiModels";
import { Flame, Thermometer, Snowflake } from "lucide-react";

export type RivalryHeatBand = "cold" | "warm" | "hot" | "inferno";

export interface MatchLike {
  day?: number;
  boutId?: string;
  eastRikishiId: string;
  westRikishiId: string;
  result?: {
    winner: "east" | "west";
    kimariteName?: string;
    kimarite?: string;
    rarity?: string;
    isKinboshi?: boolean;
    upset?: boolean;
  };
}

export interface MatchRowData extends MatchLike {
  east: UIRikishi;
  west: UIRikishi;
  h2h: { wins: number; losses: number };
  rivalry: {
    tone?: string;
    meetings?: number;
  } | null;
  heatBand: RivalryHeatBand | null;
  isPlayerBout: boolean;
  h2hCommentary: string;
  scoutHint?: string;
}

export function getHeatBand(heat: number): RivalryHeatBand {
  if (heat >= 75) return "inferno";
  if (heat >= 50) return "hot";
  if (heat >= 25) return "warm";
  return "cold";
}

export const HEAT_CONFIG: Record<
  string,
  { icon: React.ReactNode; label: string; classes: string }
> = {
  inferno: {
    icon: <Flame className="h-3.5 w-3.5" />,
    label: "Inferno Rivalry",
    classes: "bg-destructive/15 text-destructive border-destructive/25",
  },
  hot: {
    icon: <Thermometer className="h-3.5 w-3.5" />,
    label: "Heated Rivalry",
    classes: "bg-warning/15 text-warning border-warning/25",
  },
  warm: {
    icon: <Thermometer className="h-3.5 w-3.5" />,
    label: "Warm Rivalry",
    classes: "bg-warning/10 text-warning/80 border-warning/20",
  },
  cold: {
    icon: <Snowflake className="h-3.5 w-3.5" />,
    label: "Cold",
    classes: "bg-muted text-muted-foreground border-border",
  },
};

export function getH2HRecord(r1: UIRikishi, r2: UIRikishi) {
  const record = (r1 as UIRikishi & { h2h?: Record<string, { wins: number; losses: number }> })
    .h2h?.[r2.id];
  return record ? { wins: record.wins, losses: record.losses } : { wins: 0, losses: 0 };
}
