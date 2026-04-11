/**
 * src/components/menu/HeyaCard.tsx
 * 
 * Individual Heya selection card for the Main Menu.
 * Handles selection, preview triggers, and stature-based styling.
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Sparkles, Building2, TrendingDown, AlertTriangle, Plus } from "lucide-react";
import type { Heya } from "@/engine/types/heya";
import type { StatureBand } from "@/engine/types/narrative";
import type { LucideIcon } from 'lucide-react';

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
    color: "bg-gold/20 text-gold border-gold/30",
    icon: Star
  },
  powerful: {
    label: "Powerful",
    labelJa: "強豪",
    difficulty: "Easy",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    icon: Sparkles
  },
  established: {
    label: "Established",
    labelJa: "安定",
    difficulty: "Normal",
    color: "bg-west/20 text-west border-west/30",
    icon: Building2
  },
  rebuilding: {
    label: "Rebuilding",
    labelJa: "再建中",
    difficulty: "Hard",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    icon: TrendingDown
  },
  fragile: {
    label: "Fragile",
    labelJa: "危機",
    difficulty: "Very Hard",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: AlertTriangle
  },
  new: {
    label: "New",
    labelJa: "新規",
    difficulty: "Extreme",
    color: "bg-success/20 text-success border-success/30",
    icon: Plus
  }
};

interface HeyaCardProps {
  heya: Heya;
  isSelected: boolean;
  onSelect: () => void;
  onPreview?: () => void;
  isRecommended?: boolean;
  sekitoriCount: number;
}

export function HeyaCard({ heya, isSelected, onSelect, onPreview, isRecommended, sekitoriCount }: HeyaCardProps) {
  const config = STATURE_CONFIG[heya.statureBand];
  const Icon = config.icon;

  const financial = !!(heya as any)?.riskIndicators?.financial;
  const governance = !!(heya as any)?.riskIndicators?.governance;
  const rivalry = !!(heya as any)?.riskIndicators?.rivalry;

  return (
    <Card
      className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300 ${
        isSelected ? "border-primary ring-2 ring-primary/30 bg-primary/5" : ""
      }`}
      onClick={onSelect}
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onPreview?.();
      }}
      title="Click to select • Double-click to preview roster"
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="truncate">{heya.name}</span>
              {isRecommended && (
                <Badge variant="secondary" className="text-xs font-bold uppercase tracking-tighter h-5">
                  REC
                </Badge>
              )}
            </CardTitle>
            {heya.nameJa && <p className="text-sm text-muted-foreground font-display truncate opacity-70">{heya.nameJa}</p>}
          </div>
          <Badge className={`${config.color} border shrink-0 font-bold`}>
            <Icon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {heya.descriptor && <p className="text-xs text-muted-foreground italic line-clamp-2">{heya.descriptor}</p>}

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] uppercase font-bold tracking-widest">
          <span className="text-muted-foreground">
            Difficulty: <span className="text-foreground">{config.difficulty}</span>
          </span>
          <span className="text-muted-foreground">
            Sekitori: <span className="text-foreground">{sekitoriCount}</span>
          </span>
        </div>

        {(financial || governance || rivalry) && (
          <div className="flex gap-1 pt-1 flex-wrap">
            {financial && (
              <Badge variant="outline" className="text-[9px] bg-red-500/10 text-red-500 border-red-500/20 font-bold">
                💴 FINANCIAL RISK
              </Badge>
            )}
            {governance && (
              <Badge variant="outline" className="text-[9px] bg-gold/10 text-gold border-gold/20 font-bold">
                ⚖️ GOVERNANCE
              </Badge>
            )}
            {rivalry && (
              <Badge variant="outline" className="text-[9px] bg-purple-500/10 text-purple-500 border-purple-500/20 font-bold">
                🔥 RIVALRY
              </Badge>
            )}
          </div>
        )}

        <div className="pt-2 flex items-center justify-between">
           <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                onPreview?.();
              }}
            >
              Review Roster
            </Button>
            {isSelected && <Badge className="bg-primary h-5 w-5 rounded-full p-0 flex items-center justify-center">✓</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}
