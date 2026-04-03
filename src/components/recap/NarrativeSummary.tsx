/**
 * src/components/recap/NarrativeSummary.tsx
 * 
 * Grouped event display for post-basho prestige, promotions, and retirements.
 * Uses a "Timeline Dossier" style for a cinematic summary of the world's drift.
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  UserPlus, 
  UserMinus, 
  UserX,
  ShieldAlert, 
  Building2,
  Clock,
  History,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EngineEvent } from "@/engine/types/events";
import type { Heya } from '../../engine/types/heya';
import type { WorldState } from '../../engine/types/world';

interface NarrativeSummaryProps {
  groupedEvents: Record<string, EngineEvent[]>;
  prestigeChanges: Array<{ heya: Heya; change: string }>;
  world: WorldState;
}

export function NarrativeSummary({ groupedEvents, prestigeChanges, world }: NarrativeSummaryProps) {
  const hasPrestige = prestigeChanges.length > 0;
  const hasPromotions = groupedEvents.promotions?.length > 0;
  const hasRetirements = groupedEvents.retirements?.length > 0;
  const hasGovernance = (groupedEvents.governance?.length > 0) || (world.governanceLog?.length > 0);

  return (
    <div className="space-y-12 animate-in fade-in duration-1000 delay-300 fill-mode-both">
      
      {/* ═══ WORLD PRESTIGE & DRIFT ═══ */}
      {hasPrestige && (
        <section className="space-y-6">
           <div className="flex items-center gap-3">
              <h3 className="pro-header">Association Prestige Shifts</h3>
              <div className="h-px flex-1 bg-border/20" />
           </div>
           
           <div className="grid gap-4 md:grid-cols-2">
              {prestigeChanges.map((item, i) => (
                <div key={i} className="dossier-paper p-5 rounded-xl border-l-4 border-l-primary flex items-start gap-4 hover:border-primary/40 transition-colors">
                   <div className="h-10 w-10 bg-primary/5 rounded-lg flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                   </div>
                   <div className="space-y-2 flex-1">
                      <div className="flex items-center justify-between">
                         <div className="font-display font-black text-lg">{item.heya.name}</div>
                         <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">{item.heya.prestigeBand}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed italic">"{item.change}"</p>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                         <div className="h-full bg-primary opacity-30" style={{ width: `${item.heya.reputation}%` }} />
                      </div>
                      <div className="text-[8px] uppercase font-black text-muted-foreground/60 tracking-widest leading-none">
                        Stability Rating: {item.heya.reputation}%
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-12">
         
         {/* ═══ PROMOTIONS & DEMOTIONS ═══ */}
         {hasPromotions && (
           <section className="space-y-6">
              <div className="flex items-center gap-3 pl-4 border-l-4 border-indigo-500">
                 <div>
                    <h3 className="text-xl font-display font-black uppercase tracking-tight">Movement Ledger</h3>
                    <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground">Promotion & Demotion Records</p>
                 </div>
              </div>
              
              <div className="space-y-3">
                 {groupedEvents.promotions.map((e, i) => {
                    const isPromotion = !e.type.includes("DEMOTION");
                    return (
                       <div key={i} className={cn("dossier-paper p-4 rounded-xl flex items-center gap-4 border-l-4", isPromotion ? "border-l-emerald-500" : "border-l-amber-500")}>
                          <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", isPromotion ? "bg-emerald-500/10" : "bg-amber-500/10")}>
                             {isPromotion ? <TrendingUp className="h-5 w-5 text-emerald-500" /> : <TrendingDown className="h-5 w-5 text-amber-500" />}
                          </div>
                          <div className="flex-1">
                             <div className="font-display font-black text-sm uppercase tracking-tight">{e.title}</div>
                             <p className="text-[10px] text-muted-foreground italic leading-relaxed opacity-80">{e.summary}</p>
                          </div>
                          <div className="text-right">
                             <Badge variant="outline" className={cn("text-[8px] font-black uppercase tracking-widest", isPromotion ? "border-emerald-500/30 text-emerald-600" : "border-amber-500/30 text-amber-600")}>
                                {isPromotion ? "PROMOTION" : "DEMOTION"}
                             </Badge>
                          </div>
                       </div>
                    );
                 })}
              </div>
           </section>
         )}

         {/* ═══ RETIREMENTS & DEPARTURES ═══ */}
         {hasRetirements && (
           <section className="space-y-6">
              <div className="flex items-center gap-3 pl-4 border-l-4 border-red-500">
                 <div>
                    <h3 className="text-xl font-display font-black uppercase tracking-tight">Venerated Departures</h3>
                    <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground">Retirements & Career Erasings</p>
                 </div>
              </div>
              
              <div className="space-y-3">
                 {groupedEvents.retirements.map((e, i) => (
                    <div key={i} className="dossier-paper p-4 rounded-xl border-l-4 border-l-red-500 flex items-center gap-4 bg-red-500/[0.02]">
                       <div className="h-10 w-10 bg-red-500/10 rounded-full flex items-center justify-center shrink-0">
                          <UserX className="h-5 w-5 text-red-500" />
                       </div>
                       <div className="flex-1">
                          <div className="font-display font-black text-sm uppercase tracking-tight">{e.title}</div>
                          <p className="text-[10px] text-muted-foreground italic leading-relaxed opacity-80">{e.summary}</p>
                       </div>
                       <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-widest bg-red-500/10 text-red-700">INTAI</Badge>
                    </div>
                 ))}
                 {groupedEvents.retirements.length === 0 && (
                   <div className="py-12 text-center opacity-30 italic text-sm">No veteran departures recorded this basho.</div>
                 )}
              </div>
           </section>
         )}

      </div>

      {/* ═══ GOVERNANCE & ASSOCIATION LOG ═══ */}
      {hasGovernance && (
        <section className="space-y-6 pt-6">
           <div className="flex items-center gap-3">
              <h3 className="pro-header">Governing Body Deliberations</h3>
              <div className="h-px flex-1 bg-border/20" />
           </div>
           
           <div className="grid gap-6 md:grid-cols-2">
              <Card className="dossier-paper border-0 shadow-none bg-indigo-500/5">
                 <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-display font-black uppercase tracking-tighter flex items-center gap-2">
                       <ShieldAlert className="h-5 w-5 text-indigo-500" /> Official Directives
                    </CardTitle>
                 </CardHeader>
                 <CardContent>
                    <div className="space-y-4">
                       {(groupedEvents.governance ?? []).map((e, i) => (
                          <div key={i} className="flex gap-4 p-3 bg-white/50 border-2 border-indigo-500/10 rounded-xl">
                             <div className="h-8 w-8 bg-indigo-500/10 rounded-full flex items-center justify-center shrink-0">
                                <Info className="h-4 w-4 text-indigo-500" />
                             </div>
                             <div className="space-y-1">
                                <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600">{e.title}</div>
                                <p className="text-xs text-muted-foreground italic leading-relaxed">"{e.summary}"</p>
                             </div>
                          </div>
                       ))}
                       {groupedEvents.governance.length === 0 && (
                         <p className="text-xs italic text-muted-foreground opacity-50 py-4">No disciplinary or political directives issued.</p>
                       )}
                    </div>
                 </CardContent>
              </Card>

              {world.governanceLog && world.governanceLog.length > 0 && (
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3 w-3" /> Historical Timeline Drift
                   </h4>
                   <div className="space-y-3 pl-4 border-l-2 border-border/40">
                      {world.governanceLog.slice(-5).map((log: any, i: number) => (
                        <div key={i} className="relative">
                           <div className="absolute -left-[22px] top-1 h-2 w-2 rounded-full bg-border" />
                           <div className="text-[10px] font-bold text-muted-foreground mb-1">{log.date || 'Association Record'}</div>
                           <p className="text-xs font-display italic leading-snug">{log.summary || log.message}</p>
                        </div>
                      ))}
                   </div>
                </div>
              )}
           </div>
        </section>
      )}

      {/* ═══ PRESS CONFERENCE ═══ */}
      <section className="pt-12 flex justify-center">
         <div className="max-w-2xl w-full dossier-paper p-10 rounded-3xl border-2 border-dashed border-primary/20 text-center space-y-6 bg-primary/[0.01]">
            <div className="h-16 w-16 bg-primary/5 rounded-full mx-auto flex items-center justify-center">
               <History className="h-8 w-8 text-primary opacity-30" />
            </div>
            <div className="space-y-2">
               <h3 className="text-3xl font-display font-black tracking-tighter uppercase italic">Association Wrap-up</h3>
               <p className="text-sm text-muted-foreground max-w-md mx-auto italic font-display">"The Association has ratified another successful tournament. The Banzuke committee will now begin deliberations for the coming year."</p>
            </div>
            <div className="bg-primary/5 p-4 rounded-2xl flex items-center justify-center gap-12">
               <div className="text-center">
                  <div className="text-2xl font-display font-black text-primary">{world.year}</div>
                  <div className="text-[8px] uppercase font-black opacity-40">Association Year</div>
               </div>
               <div className="w-px h-8 bg-primary/10" />
               <div className="text-center">
                  <div className="text-2xl font-display font-black text-primary">{world.heyas.size}</div>
                  <div className="text-[8px] uppercase font-black opacity-40">Active Stables</div>
               </div>
            </div>
         </div>
      </section>

    </div>
  );
}
