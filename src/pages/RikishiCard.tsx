/**
 * File Name: src/pages/RikishiCard.tsx
 * Notes:
 * - NO-LEAK RETROFIT: replaced raw stat bars with descriptor bands.
 * - No raw 0–100 numbers shown to player.
 */

import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RikishiUIModel } from '@/engine/uiModels';
import { Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Zap, Shield, Brain, Activity, Sword, Anchor, Sparkles } from "lucide-react";
import { toStatBand, toConditionBand, toPotentialBand, STAT_BAND_LABELS, CONDITION_LABELS, POTENTIAL_LABELS } from "@/engine/descriptorBands";
import type { PotentialBand } from "@/engine/descriptorBands";

interface RikishiCardProps {
  rikishi: RikishiUIModel;
  compact?: boolean;
}

const RikishiCard: React.FC<RikishiCardProps> = ({ rikishi, compact = false }) => {
  const bandColor = (band: string) => {
    if (band === "exceptional" || band === "outstanding") return "text-primary";
    if (band === "strong" || band === "capable") return "text-foreground";
    if (band === "developing") return "text-muted-foreground";
    return "text-destructive";
  };

  return (
    <Card className="hover:shadow-md transition-all duration-200 overflow-hidden border-l-4 border-l-primary/40">
      <CardHeader className={`${compact ? 'p-3' : 'p-4'} bg-secondary/5 pb-2`}>
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <Link to={`/rikishi/${rikishi.id}`} className="font-bold text-lg hover:underline decoration-primary leading-tight">
              {rikishi.shikona}
            </Link>
            <div className="text-xs text-muted-foreground font-mono mt-0.5">
              {rikishi.heya}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={rikishi.rank === "yokozuna" ? "default" : "secondary"} className="text-[10px] font-bold uppercase tracking-wider">
              {rikishi.rank}
            </Badge>
            <span className="text-[10px] text-muted-foreground">{rikishi.record}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className={`${compact ? 'p-3' : 'p-4'} space-y-3 pt-2`}>
        {/* Status Line */}
        <div className="flex justify-between items-center text-xs">
          <div className="flex gap-2">
             {rikishi.injuryStatus.isInjured && (
              <Badge variant="destructive" className="text-[10px] h-5 px-1.5 py-0">
                {rikishi.injuryStatus.severity} Injury
              </Badge>
            )}
            {(() => {
              const condBand = toConditionBand(rikishi.condition);
              return condBand === "worn" || condBand === "fragile" ? (
                <Badge variant="outline" className="text-[10px] h-5 border-orange-400 text-orange-600 bg-orange-50">
                  {CONDITION_LABELS[condBand].label}
                </Badge>
              ) : null;
            })()}
          </div>
        </div>

        {/* Flavor Tags */}
        <div className="flex flex-wrap gap-1.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-[10px] bg-blue-50/50 text-blue-700 hover:bg-blue-100 cursor-help border-blue-200">
                  {rikishi.archetype}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Archetype influences fight style and development trajectory.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Badge variant="outline" className="text-[10px] text-muted-foreground border-muted">
            {rikishi.origin}
          </Badge>

          {/* Potential Band Indicator */}
          {(() => {
            const r = rikishi as any;
            const potBand = toPotentialBand(r.talentSeed);
            if (potBand === "unknown") return null;
            const info = POTENTIAL_LABELS[potBand];
            const potColor = potBand === "generational" ? "border-amber-400 text-amber-600 bg-amber-50/50"
              : potBand === "star" ? "border-purple-400 text-purple-600 bg-purple-50/50"
              : potBand === "solid" ? "border-blue-400 text-blue-600 bg-blue-50/50"
              : potBand === "average" ? "border-muted text-muted-foreground"
              : "border-destructive/40 text-destructive/70";
            return (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className={`text-[10px] cursor-help ${potColor}`}>
                      <Sparkles size={10} className="mr-0.5" />
                      {info.label}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{info.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })()}
        </div>

        {/* Stat Descriptors (Non-compact only) — NO RAW NUMBERS */}
        {!compact && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-dashed mt-2">
            <StatDescriptor icon={<Sword size={12} />} label="Power" value={rikishi.stats.strength} />
            <StatDescriptor icon={<Shield size={12} />} label="Technique" value={rikishi.stats.technique} />
            <StatDescriptor icon={<Zap size={12} />} label="Speed" value={rikishi.stats.speed} />
            <StatDescriptor icon={<Anchor size={12} />} label="Weight" displayValue={`${Math.round(rikishi.stats.weight)}kg`} />
            <StatDescriptor icon={<Brain size={12} />} label="Mental" value={rikishi.stats.mental} />
            <StatDescriptor icon={<Activity size={12} />} label="Adaptability" value={rikishi.stats.adaptability} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Sub-component: shows band label instead of raw number
const StatDescriptor: React.FC<{
  icon: React.ReactNode;
  label: string;
  value?: number;
  displayValue?: string;
}> = ({ icon, label, value, displayValue }) => {
  const band = value != null ? toStatBand(value) : undefined;
  const bandLabel = band ? STAT_BAND_LABELS[band] : displayValue ?? "—";

  return (
    <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase font-semibold py-1">
      <div className="flex items-center gap-1">
        {icon}
        <span>{label}</span>
      </div>
      <span className={band === "exceptional" || band === "outstanding" ? "text-primary" : band === "limited" || band === "struggling" ? "text-destructive" : "text-foreground"}>
        {bandLabel}
      </span>
    </div>
  );
};

export default RikishiCard;
