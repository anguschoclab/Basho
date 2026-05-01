/**
 * RikishiCombatTab.tsx
 *
 * Combat tab content for rikishi profile page.
 */

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, Shield, Flame } from "lucide-react";
import { RikishiRadarChart } from "@/components/rikishi/RikishiRadarChart";
import { RikishiPotentialPanel } from "@/components/rikishi/RikishiPotentialPanel";
import { cn } from "@/lib/utils";
import type { UIRikishi } from "@/presenters/uiModels";
import type { Rikishi } from "@/engine/types";
import type { UIRivalEntry } from "@/presenters/rikishi/types";
import { getCombatArchetypeDescription } from "@/engine/archetype";

interface RikishiCombatTabProps {
  rikishi: UIRikishi;
  rawRikishi: Rikishi;
  isOwned?: boolean;
}

export function RikishiCombatTab({ rikishi, rawRikishi, isOwned = false }: RikishiCombatTabProps) {
  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Radar Chart */}
        <div className="space-y-6">
          <h3 className="text-xl font-display font-black flex items-center gap-2 uppercase tracking-tight">
            <Activity className="h-5 w-5 text-primary" /> Combat Radar
          </h3>
          <div className="bg-muted/20 rounded-lg p-6 border border-border/50">
            <RikishiRadarChart rikishi={rawRikishi} className="h-64" />
          </div>
        </div>

        {/* Archetype card */}
        <div className="space-y-6">
          <h3 className="text-xl font-display font-black flex items-center gap-2 uppercase tracking-tight">
            <Shield className="h-5 w-5 text-primary" /> Combat Archetype
          </h3>
          <div className="bg-muted/30 border-2 border-border/50 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className="text-[11px] font-black uppercase tracking-widest px-3 h-7 bg-primary/80 cursor-help">
                      {rikishi.archetypeName}
                    </Badge>
                  </TooltipTrigger>
                  {rikishi.combatArchetype && (
                    <TooltipContent>
                      <p className="max-w-xs">{getCombatArchetypeDescription(rikishi.combatArchetype as any)}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              {rikishi.styleName !== rikishi.archetypeName && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-black uppercase tracking-widest h-7"
                >
                  {rikishi.styleName}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-muted/40 rounded-lg p-3 space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  Preferred Grip
                </p>
                <p className="text-sm font-display font-black capitalize">
                  {rikishi.preferredGrip === "none" ? "No Preference" : rikishi.preferredGrip}
                </p>
              </div>
              <div className="bg-muted/40 rounded-lg p-3 space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  Grip Depth
                </p>
                <p className="text-sm font-display font-black capitalize">
                  {rikishi.preferredGripDepth}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Potential / CA vs PA panel — owned rikishi only */}
      <RikishiPotentialPanel rikishi={rawRikishi} isOwned={isOwned} />

      {/* Known Rivals Section (C5) */}
      <div className="space-y-6 pt-4 border-t border-border/50">
        <h3 className="text-xl font-display font-black flex items-center gap-2 uppercase tracking-tight">
          <Flame className="h-5 w-5 text-west" /> Known Rivals
        </h3>
        <div className="grid gap-3">
          {rikishi.topRivals.length > 0 ? (
            rikishi.topRivals.map((rival: UIRivalEntry) => (
              <div
                key={rival.opponentId}
                className="bg-muted/10 border border-border/30 rounded-lg p-3 flex items-center justify-between text-sm group hover:bg-muted/20 transition-all"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base">{rival.opponentShikona}</span>
                    <Badge
                      variant="outline"
                      className="text-[9px] uppercase font-black tracking-widest"
                    >
                      {rival.tone || "respect"}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-tight font-bold">
                    Record: {rival.record} ({rival.totalBouts} bouts)
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1 w-24">
                  <div className="flex items-center justify-between w-full text-[9px] font-black uppercase tracking-tighter">
                    <span>HEAT</span>
                    <span className={rival.heat >= 70 ? "text-west" : "text-muted-foreground"}>
                      {Math.round(rival.heat)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-1000",
                        rival.heat >= 75
                          ? "bg-west"
                          : rival.heat >= 40
                            ? "bg-gold"
                            : "bg-primary/40"
                      )}
                      style={{ width: `${rival.heat}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground italic p-4 bg-muted/5 border border-dashed rounded-lg">
              No significant rivalries established yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
