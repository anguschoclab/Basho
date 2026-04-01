/**
 * src/components/rikishi/RosterList.tsx
 * 
 * Component for managing the stable's active rikishi roster.
 * Provides quick overview statistics and links to individual profiles.
 */

import React from "react";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { Zap, Activity, Filter, SortAsc, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UIRikishi } from "@/presenters/uiModels";

interface RosterListProps {
  rikishiList: UIRikishi[];
  onRikishiClick: (id: string) => void;
}

export function RosterList({ rikishiList, onRikishiClick }: RosterListProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-2 bg-primary rounded-full" />
              <h1 className="text-4xl font-display font-black tracking-tight uppercase">Stable Roster</h1>
           </div>
           <p className="text-sm text-muted-foreground font-medium opacity-70">Official Association registry for your active professional roster.</p>
        </div>
        
        <div className="flex items-center gap-2">
           <div className="bg-muted p-1 rounded-lg flex items-center gap-1 border">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-3 text-[10px] font-black uppercase tracking-widest bg-background shadow-sm"
                tooltip="Toggle official Association registry view"
              >
                 <LayoutGrid className="h-3 w-3 mr-1.5" /> Registry
              </Button>
           </div>
           <Button 
             variant="outline" 
             size="sm" 
             className="h-10 px-4 text-[10px] font-black uppercase tracking-widest border-2 gap-2"
             tooltip="Filter roster by rank, division, or status"
           >
              <Filter className="h-3.5 w-3.5" /> Filter
           </Button>
           <Button 
             variant="outline" 
             size="sm" 
             className="h-10 px-4 text-[10px] font-black uppercase tracking-widest border-2 gap-2"
             tooltip="Sort roster by name, rank, or performance"
           >
              <SortAsc className="h-3.5 w-3.5" /> Sort
           </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rikishiList.map((r, idx) => (
          <TooltipWrap key={r.id} content={`View detailed Association dossier for ${r.shikona}`} side="top">
            <Card 
              className="paper group hover:border-primary/50 cursor-pointer overflow-hidden relative animate-in zoom-in-95 fill-mode-both"
              style={{ animationDelay: `${idx * 40}ms` }}
              onClick={() => onRikishiClick(r.id)}
            >
               <div className={cn("absolute top-0 right-0 p-4 opacity-5 font-display text-5xl font-black italic group-hover:opacity-10 transition-opacity", `text-primary`)}>
                  {r.shikona.charAt(0)}
               </div>
               
               <CardContent className="p-5 relative z-10">
                  <div className="flex justify-between items-start mb-6">
                     <div className="space-y-1">
                        <Badge className={cn("text-[9px] font-black uppercase tracking-widest px-2 h-5 border-0", `rank-${r.rank}`)}>
                           {r.rankLabel}
                        </Badge>
                        <div className="font-display font-black text-xl tracking-tight group-hover:text-primary transition-colors">
                           {r.shikona}
                        </div>
                        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                           {r.origin} • {r.age} Years
                        </div>
                     </div>
                     <div className="text-right">
                        <div className="text-2xl font-display font-black leading-none tabular-nums">
                           <span className="text-primary">{r.currentBashoWins}</span>
                           <span className="opacity-20 mx-0.5">-</span>
                           <span className="opacity-40">{r.currentBashoLosses}</span>
                        </div>
                        <div className="text-[8px] uppercase font-black text-muted-foreground tracking-tighter mt-1">Today's Record</div>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-dashed border-border/40">
                     <div className="space-y-1 border-r border-dashed border-border/40 pr-3">
                        <TooltipWrap content="Observed physical power and pushing force" side="top">
                          <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-muted-foreground leading-none cursor-help">
                             <Zap className="h-2.5 w-2.5 text-amber-500" /> Power
                          </div>
                        </TooltipWrap>
                        <div className="font-display font-black text-sm">{r.perceivedStats?.strength || '??'}</div>
                     </div>
                     <div className="space-y-1 pl-1">
                        <TooltipWrap content="Observed match pace and initial reaction speed" side="top">
                          <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-muted-foreground leading-none cursor-help">
                             <Activity className="h-2.5 w-2.5 text-blue-500" /> Pace
                          </div>
                        </TooltipWrap>
                        <div className="font-display font-black text-sm">{r.perceivedStats?.speed || '??'}</div>
                     </div>
                  </div>
               </CardContent>
               
               {/* Progress bar for perceived skill */}
               <div className="h-1 bg-muted w-full mt-auto">
                  <div 
                     className="h-full bg-primary opacity-20" 
                     style={{ width: `${((Number(r.perceivedStats?.strength) || 0) + (Number(r.perceivedStats?.speed) || 0)) / 2}%` }} 
                  />
               </div>
            </Card>
          </TooltipWrap>
        ))}
        
        {rikishiList.length === 0 && (
           <div className="col-span-full py-32 text-center bg-muted/20 border-2 border-dashed rounded-xl space-y-4">
              <div className="h-12 w-12 bg-muted rounded-full mx-auto flex items-center justify-center">
                 <Zap className="h-6 w-6 text-muted-foreground opacity-30" />
              </div>
              <div className="space-y-1">
                 <p className="font-display font-black uppercase tracking-tighter text-xl">Dohyo Empty</p>
                 <p className="text-sm text-muted-foreground max-w-xs mx-auto">Your stable records show no active rikishi under Association tenure.</p>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
