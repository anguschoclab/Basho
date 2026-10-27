/**
 * boutCardTypes.ts
 *
 * Types and constants for BoutCard component.
 */

import React from "react";
import type { UIRikishi } from "@/presenters/uiModels";
import { toRivalryHeatBand, type RivalryHeatBand } from "@/presenters/engineAccess";
import { Flame, Thermometer, Snowflake } from "lucide-react";

export type { RivalryHeatBand };

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
  return toRivalryHeatBand(heat);
}

export const HEAT_CONFIG: Record<
  RivalryHeatBand,
  { icon: React.ReactNode; label: string; classes: string }
> = {
  legendary: {
    icon: <Flame className="h-3.5 w-3.5" />,
    label: "Legendary Rivalry",
    classes: "bg-destructive/15 text-destructive border-destructive/25",
  },
  fierce: {
    icon: <Flame className="h-3.5 w-3.5" />,
    label: "Fierce Rivalry",
    classes: "bg-destructive/10 text-destructive border-destructive/20",
  },
  heated: {
    icon: <Thermometer className="h-3.5 w-3.5" />,
    label: "Heated Rivalry",
    classes: "bg-warning/15 text-warning border-warning/25",
  },
  simmering: {
    icon: <Thermometer className="h-3.5 w-3.5" />,
    label: "Simmering Rivalry",
    classes: "bg-warning/10 text-warning/80 border-warning/20",
  },
  dormant: {
    icon: <Snowflake className="h-3.5 w-3.5" />,
    label: "Dormant",
    classes: "bg-muted text-muted-foreground border-border",
  },
};

export function getH2HRecord(r1: UIRikishi, r2: UIRikishi) {
  const record = (r1 as UIRikishi & { h2h?: Record<string, { wins: number; losses: number }> })
    .h2h?.[r2.id];
  return record ? { wins: record.wins, losses: record.losses } : { wins: 0, losses: 0 };
}
