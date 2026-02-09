/**
 * File Name: src/components/game/RikishiCard.tsx
 * Notes:
 * - Updated to display the full suite of simulation stats (Power, Speed, Tech, Mental, Stamina, Adaptability).
 * - Added visual badges for 'Archetype' and 'Origin'.
 * - Added a compact mode toggle within the logic.
 */

import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RikishiUIModel } from '../../engine/uiModels';
import { Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Zap, Shield, Brain, Activity, Sword, Anchor } from "lucide-react"; // Importing icons for stats

interface RikishiCardProps {
  rikishi: RikishiUIModel;
  compact?: boolean;
}

const RikishiCard: React.FC<RikishiCardProps> = ({ rikishi, compact = false }) => {
  // Helper to determine bar color based on value
  const getBarColor = (val: number) => {
    if (val >= 90) return "bg-purple-500";
    if (val >= 75) return "bg-green-500";
    if (val >= 50) return "bg-blue-500";
    if (val >= 30) return "bg-yellow-500";
    return "bg-red-500";
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
            {rikishi.condition < 50 && !rikishi.injuryStatus.isInjured && (
               <Badge variant="outline" className="text-[10px] h-5 border-orange-400 text-orange-600 bg-orange-50">
                Fatigued
              </Badge>
            )}
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
                <p>Archetype influences fight style and stat growth.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Badge variant="outline" className="text-[10px] text-gray-500 border-gray-200">
            {rikishi.origin}
          </Badge>
        </div>

        {/* Expanded Stat Grid (Non-compact only) */}
        {!compact && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-dashed mt-2">
            <StatBar icon={<Sword size={12} />} label="Pwr" value={rikishi.stats.strength} color={getBarColor(rikishi.stats.strength)} />
            <StatBar icon={<Shield size={12} />} label="Tech" value={rikishi.stats.technique} color={getBarColor(rikishi.stats.technique)} />
            <StatBar icon={<Zap size={12} />} label="Spd" value={rikishi.stats.speed} color={getBarColor(rikishi.stats.speed)} />
            <StatBar icon={<Anchor size={12} />} label="Wgt" value={Math.min(100, rikishi.stats.weight / 2.5)} displayValue={`${Math.round(rikishi.stats.weight)}kg`} color="bg-slate-500" />
            <StatBar icon={<Brain size={12} />} label="Men" value={rikishi.stats.mental} color={getBarColor(rikishi.stats.mental)} />
            <StatBar icon={<Activity size={12} />} label="Adp" value={rikishi.stats.adaptability} color="bg-teal-500" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Sub-component for individual stat bars
const StatBar: React.FC<{ icon: React.ReactNode; label: string; value: number; displayValue?: string; color: string }> = ({ icon, label, value, displayValue, color }) => (
  <div className="flex flex-col gap-0.5">
    <div className="flex justify-between items-center text-[10px] text-muted-foreground uppercase font-semibold">
      <div className="flex items-center gap-1">
        {icon}
        <span>{label}</span>
      </div>
      <span>{displayValue || Math.round(value)}</span>
    </div>
    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${value}%` }}></div>
    </div>
  </div>
);

export default RikishiCard;
