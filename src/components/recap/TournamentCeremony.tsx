/**
 * src/components/recap/TournamentCeremony.tsx
 * 
 * Cinematic display for post-basho champion reveals and special prizes.
 * Features high-fidelity heraldry, yūshō calligraphy, and medal displays.
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  Star, 
  Medal, 
  Crown,
  Award,
  Zap,
  Quote,
  Building
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RikishiName, StableName } from "@/components/ClickableName";

interface TournamentCeremonyProps {
  lastBasho: any;
  world: any;
}

export function TournamentCeremony({ lastBasho, world }: TournamentCeremonyProps) {
  if (!lastBasho || !world) return null;

  const getRikishiData = (id: string) => {
    const r = world.rikishi.get(id);
    if (!r) return null;
    const h = r.heyaId ? world.heyas.get(r.heyaId) : null;
    return { ...r, heyaName: h?.name ?? "Unknown Stable" };
  };

  const champion = lastBasho.yusho ? getRikishiData(lastBasho.yusho) : null;
  const isPlayerChampion = champion?.heyaId === world.playerHeyaId;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-1000">
      
      {/* ═══ YŪSHŌ CHAMPION ═══ */}
      {champion && (
        <section className="relative group">
           <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-gold/10 to-amber-500/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition duration-1000" />
           <Card className="dossier-paper border-2 border-amber-500/20 relative overflow-hidden bg-amber-500/[0.02]">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] font-display text-9xl font-black italic pointer-events-none -rotate-6">
                 CHAMPION
              </div>
              
              <CardHeader className="pb-2">
                 <div className="flex items-center gap-3">
                    <div className="h-10 w-1 bg-amber-500 rounded-full" />
                    <div>
                       <CardTitle className="text-3xl font-display font-black tracking-tighter flex items-center gap-2 uppercase">
                          <Crown className="h-7 w-7 text-amber-500" />
                          {lastBasho.bashoName} Tournament Champion
                       </CardTitle>
                       <p className="text-[10px] uppercase font-black tracking-[0.3em] text-amber-600/60">Association Hall of Records Entry</p>
                    </div>
                 </div>
              </CardHeader>

              <CardContent className="pt-4 pb-8 flex flex-col md:flex-row items-center gap-12 px-8">
                 <div className="relative">
                    <div className="h-32 w-32 bg-amber-500/10 rounded-full flex items-center justify-center border-4 border-amber-500/20 relative z-10">
                       <Trophy className="h-16 w-16 text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                    </div>
                    <div className="absolute -bottom-2 translate-y-1/2 left-1/2 -translate-x-1/2 bg-amber-500 text-white font-black text-[10px] px-3 py-1 rounded-full shadow-lg z-20">
                       優勝
                    </div>
                 </div>

                 <div className="flex-1 text-center md:text-left space-y-4">
                    <div className="space-y-1">
                       <h3 className="text-5xl font-display font-black tracking-tighter sumi-e-ink">
                          {champion.shikona}
                       </h3>
                       <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 text-sm font-black uppercase tracking-widest text-muted-foreground/70">
                          <span className="flex items-center gap-2">
                             <Building className="h-4 w-4" /> {champion.heyaName} Stable
                          </span>
                          <span className="h-1 w-1 bg-muted-foreground/30 rounded-full" />
                          <span>{champion.rank} Hierarchy</span>
                       </div>
                    </div>
                    
                    <div className="flex items-center justify-center md:justify-start gap-4">
                       <div className="text-center bg-background/50 border border-border/40 px-6 py-2 rounded-xl">
                          <div className="text-2xl font-display font-black text-amber-500">{champion.currentBashoWins}-{champion.currentBashoLosses}</div>
                          <div className="text-[8px] uppercase font-black opacity-40">Final Record</div>
                       </div>
                       {isPlayerChampion && (
                         <Badge className="bg-primary text-white font-black tracking-widest text-[9px] px-4 h-8 animate-pulse shadow-xl shadow-primary/20">
                            YOUR STABLE TRIUMPHS
                         </Badge>
                       )}
                    </div>
                 </div>

                 <div className="hidden lg:flex flex-col items-end opacity-20 select-none pointer-events-none">
                    <div className="text-4xl font-display font-black italic">天皇賜杯</div>
                    <div className="text-xs uppercase font-black tracking-[0.5em]">Emperor's Cup</div>
                 </div>
              </CardContent>
           </Card>
        </section>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
         {/* ═══ JUN-YŪSHŌ (RUNNER-UP) ═══ */}
         <Card className="dossier-paper border-l-4 border-l-amber-400">
            <CardHeader className="pb-4">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-400/10 rounded-lg">
                     <Medal className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                     <CardTitle className="text-lg font-display font-black uppercase tracking-tight">Jun-Yūshō</CardTitle>
                     <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">Tournament Runners-up</p>
                  </div>
               </div>
            </CardHeader>
            <CardContent>
               <div className="space-y-3">
                  {(lastBasho.junYusho ?? []).map((id: string) => {
                     const r = world.rikishi.get(id);
                     if (!r) return null;
                     return (
                        <div key={id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border/40 group hover:border-amber-400/30 transition-colors">
                           <div className="font-display font-black group-hover:text-amber-500 transition-colors">{r.shikona}</div>
                           <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-2">{r.rank}</Badge>
                        </div>
                     );
                  })}
                  {(!lastBasho.junYusho || lastBasho.junYusho.length === 0) && (
                    <p className="text-center py-8 text-xs italic text-muted-foreground opacity-50">No runners-up recorded.</p>
                  )}
               </div>
            </CardContent>
         </Card>

         {/* ═══ KINBOSHI (GOLD STARS) ═══ */}
         <Card className="dossier-paper border-l-4 border-l-gold lg:col-span-2">
            <CardHeader className="pb-4">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-gold/10 rounded-lg">
                     <Star className="h-5 w-5 text-gold" />
                  </div>
                  <div>
                     <CardTitle className="text-lg font-display font-black uppercase tracking-tight">Kinboshi (Gold Stars)</CardTitle>
                     <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">Maegashira victories over Yokozuna</p>
                  </div>
               </div>
            </CardHeader>
            <CardContent>
               <div className="grid gap-4 sm:grid-cols-2">
                  {(() => {
                     const matches = world.currentBasho?.matches || [];
                     const kinboshi = matches.filter((m: any) => m.result?.isKinboshi);
                     
                     return kinboshi.length > 0 ? kinboshi.map((m: any, idx: number) => {
                        const winner = world.rikishi.get(m.result.winnerRikishiId);
                        const loser = world.rikishi.get(m.result.loserRikishiId);
                        if (!winner || !loser) return null;
                        
                        return (
                           <div key={idx} className="p-4 bg-gold/5 border-2 border-gold/10 rounded-xl space-y-3 relative overflow-hidden group">
                              <div className="absolute top-0 right-0 p-2 opacity-5 font-black text-2xl">★</div>
                              <div className="flex justify-between items-start">
                                 <div>
                                    <div className="font-display font-black text-lg group-hover:text-gold transition-colors">{winner.shikona}</div>
                                    <div className="text-[9px] uppercase font-black opacity-40">Defeated Yokozuna {loser.shikona}</div>
                                 </div>
                                 <Badge className="bg-gold text-white font-black text-[8px] h-4">KINBOSHI</Badge>
                              </div>
                              <div className="text-[10px] uppercase font-black text-muted-foreground bg-white/50 px-2 py-1 rounded inline-block tracking-widest">
                                 Tournament Day {m.day}
                              </div>
                           </div>
                        );
                     }) : (
                        <div className="col-span-full py-10 text-center opacity-30 italic text-sm">No Gold Star upsets this tournament.</div>
                     );
                  })()}
               </div>
            </CardContent>
         </Card>
      </div>

      {/* ═══ SPECIAL PRIZES (SANSŌ) ═══ */}
      <section className="space-y-6 pt-4">
         <div className="flex items-center gap-3">
            <h3 className="text-2xl font-display font-black uppercase tracking-tight">Special Prizes (三賞)</h3>
            <div className="h-px flex-1 bg-border/40" />
         </div>
         <div className="grid sm:grid-cols-3 gap-6">
            {[
               { id: lastBasho.shukunsho, label: "Shukun-shō", ja: "殊勲賞", sub: "Outstanding Performance", icon: <Star className="h-5 w-5 text-red-500" />, color: "border-red-500/20 bg-red-500/5" },
               { id: lastBasho.kantosho, label: "Kantō-shō", ja: "敢闘賞", sub: "Fighting Spirit", icon: <Award className="h-5 w-5 text-orange-500" />, color: "border-orange-500/20 bg-orange-500/5" },
               { id: lastBasho.ginoSho, label: "Ginō-shō", ja: "技能賞", sub: "Technique", icon: <Zap className="h-5 w-5 text-blue-500" />, color: "border-blue-500/20 bg-blue-500/5" }
            ].map((prize, i) => {
               const r = prize.id ? world.rikishi.get(prize.id) : null;
               return (
                  <div key={i} className={cn("dossier-paper border-2 p-6 rounded-2xl relative transition-transform hover:scale-[1.02]", prize.color)}>
                     <div className="absolute top-4 right-4">
                        {prize.icon}
                     </div>
                     <div className="space-y-4">
                        <div>
                           <div className="text-xl font-display font-black">{prize.ja}</div>
                           <div className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-4">{prize.label} — {prize.sub}</div>
                        </div>
                        {r ? (
                           <div className="space-y-2">
                              <div className="h-px bg-border/40 w-12" />
                              <div className="font-display font-black text-lg">{r.shikona}</div>
                              <div className="text-[10px] uppercase font-black opacity-50 tracking-widest">{r.rank} Heirarchy</div>
                           </div>
                        ) : (
                           <p className="text-xs italic text-muted-foreground opacity-50 pt-4">No candidate met Association criteria.</p>
                        )}
                     </div>
                  </div>
               );
            })}
         </div>
      </section>
    </div>
  );
}
