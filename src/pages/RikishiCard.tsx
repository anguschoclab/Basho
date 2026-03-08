/**
 * File Name: src/pages/RikishiCard.tsx
 * Notes:
 * - NO-LEAK RETROFIT: replaced raw stat bars with descriptor bands.
 * - Uses UIRikishi projection DTO from uiModels.ts.
 */

import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { UIRikishi } from '@/engine/uiModels';
import { Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Zap, Shield, Brain, Activity, Sword, Anchor, Sparkles } from "lucide-react";
import { toConditionBand, CONDITION_LABELS, STAT_BAND_LABELS, POTENTIAL_LABELS } from "@/engine/descriptorBands";

interface RikishiCardProps {
  rikishi: UIRikishi;
  compact?: boolean;
}

const RikishiCard: React.FC<RikishiCardProps> = ({ rikishi, compact = false }) => {
  return (
    <Card className="hover:shadow-md transition-all duration-200 overflow-hidden border-l-4 border-l-primary/40">
      <CardHeader className={`${compact ? 'p-3' : 'p-4'} bg-secondary/5 pb-2`}>
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <Link to={`/rikishi/${rikishi.id}`} className="font-bold text-lg hover:underline decoration-primary leading-tight">
              {rikishi.shikona}
            </Link>
            <div className="text-xs text-muted-foreground font-mono mt-0.5">
              {rikishi.heyaName}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={rikishi.rank === "yokozuna" ? "default" : "secondary"} className="text-[10px] font-bold uppercase tracking-wider">
              {rikishi.rankLabel}
            </Badge>
            <span className="text-[10px] text-muted-foreground">{rikishi.currentBashoRecord}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className={`${compact ? 'p-3' : 'p-4'} space-y-3 pt-2`}>
        {/* Status Line */}
        <div className="flex justify-between items-center text-xs">
          <div className="flex gap-2">
            {rikishi.isInjured && (
              <Badge variant="destructive" className="text-[10px] h-5 px-1.5 py-0">
                {rikishi.injurySummary}
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
                  {rikishi.archetypeName}
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
          {rikishi.potentialBand !== "unknown" && (() => {
            const potBand = rikishi.potentialBand;
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

        {/* Stat Descriptors (Non-compact only) — Uses descriptor bands */}
        {!compact && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-dashed mt-2">
            <StatDescriptor icon={<Sword size={12} />} label="Power" band={rikishi.descriptor.powerBand} />
            <StatDescriptor icon={<Shield size={12} />} label="Technique" band={rikishi.descriptor.techniqueBand} />
            <StatDescriptor icon={<Zap size={12} />} label="Speed" band={rikishi.descriptor.speedBand} />
            <StatDescriptor icon={<Anchor size={12} />} label="Balance" band={rikishi.descriptor.balanceBand} />
            <StatDescriptor icon={<Brain size={12} />} label="Condition" band={rikishi.descriptor.conditionBand} />
            <StatDescriptor icon={<Activity size={12} />} label="Momentum" band={rikishi.descriptor.momentumBand} />
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
  band: string;
}> = ({ icon, label, band }) => {
  const bandLabel = (STAT_BAND_LABELS as any)[band]?.label
    ?? (CONDITION_LABELS as any)[band]?.label
    ?? band;

  const color = band === "exceptional" || band === "outstanding" ? "text-primary"
    : band === "limited" || band === "struggling" || band === "fragile" ? "text-destructive"
    : "text-foreground";

  return (
    <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase font-semibold py-1">
      <div className="flex items-center gap-1">
        {icon}
        <span>{label}</span>
      </div>
      <span className={color}>{bandLabel}</span>
    </div>
  );
};

export default RikishiCard;
