/**
 * RikishiPage.tsx
 * 
 * Individual Profile and Stable Roster Management.
 * Features a "Rich Aesthetics" Dossier design for rikishi profiles.
 * Architecturally decomposed to use RosterList for list views.
 */

import React, { useState, useMemo } from "react";
import { Helmet } from "react-helmet";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  History, 
  Trophy, 
  Award, 
  Star, 
  TrendingUp, 
  Activity,
  Zap,
  MapPin,
  Calendar,
  Ruler,
  Scale,
  Globe,
  UserPlus,
  Info,
  Medal,
  Award as AwardIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { HQ_TABS } from "@/constants/navigation";
import { projectRikishi } from "@/presenters/uiModels";
import { RosterList } from "@/components/rikishi/RosterList";

export default function RikishiPage() {
  const { rikishiId } = useParams({ strict: false });
  const { state } = useGame();
  const { world, playerHeyaId } = state;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");

  if (!world) return null;

  // ── Roster List View ────────────────────────────────
  if (!rikishiId) {
     const rikishiList = Array.from(world.rikishi.values())
        .filter(r => r.heyaId === playerHeyaId)
        .map(r => projectRikishi(r, world));

     return (
        <AppLayout pageTitle="Roster Management" subNavTabs={HQ_TABS} activeSubTab="roster">
           <Helmet><title>Roster Management | Basho</title></Helmet>
           <RosterList 
              rikishiList={rikishiList} 
              onRikishiClick={(id) => navigate({ to: "/rikishi/$rikishiId", params: { rikishiId: id } as any })} 
           />
        </AppLayout>
     );
  }

  // ── Individual Profile View ─────────────────────────
  const rawRikishi = world.rikishi.get(rikishiId);
  if (!rawRikishi) return (
    <AppLayout pageTitle="Rikishi Not Found">
       <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <p className="text-muted-foreground font-display italic">The requested rikishi does not exist in the Association records.</p>
          <Button variant="outline" onClick={() => navigate({ to: "/stable/roster" })}>Return to Roster</Button>
       </div>
    </AppLayout>
  );

  const rikishi = projectRikishi(rawRikishi, world);
  const isOwned = rikishi.heyaId === playerHeyaId;
  const history = rikishi.careerHistory;
  const milestones = rikishi.milestones;

  return (
    <AppLayout pageTitle="Rikishi Profile" subNavTabs={HQ_TABS} activeSubTab="roster">
      <Helmet>
        <title>{rikishi.shikona} — Official Association Profile | Basho</title>
      </Helmet>

      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
        <Button 
          variant="ghost" 
          onClick={() => navigate({ to: "/stable/roster" })} 
          className="gap-2 h-10 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to stable roster
        </Button>

        {/* ═══ DOSSIER HEADER ═══ */}
        <div className="dossier-paper rounded-2xl overflow-hidden shadow-2xl border-2 border-primary/10">
           <div className="bg-primary pt-12 pb-10 px-8 relative overflow-hidden text-primary-foreground hero-gradient border-b-4 border-primary">
              <div className="absolute top-0 right-0 p-8 opacity-10 font-display text-9xl font-black pointer-events-none uppercase italic -rotate-12 translate-x-12 -translate-y-8">
                 {rikishi.rankLabel}
              </div>
              
              <div className="flex flex-col md:flex-row items-start justify-between gap-8 relative z-10">
                 <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Badge className={cn("text-[10px] font-black uppercase tracking-widest px-3 h-6 border-0", `rank-${rikishi.rank}`)}>
                           {rikishi.rankLabel}
                        </Badge>
                        {isOwned && <Badge variant="outline" className="bg-white/10 text-white border-white/20 font-bold h-6 uppercase text-[9px] tracking-widest">Active Roster</Badge>}
                        {rikishi.nationality !== "Japan" && (
                          <Badge variant="outline" className="border-amber-400 text-amber-400 bg-amber-400/10 flex items-center gap-1.5 h-6 font-bold text-[9px] tracking-widest">
                            <Globe className="h-3 w-3" /> Foreign Slot
                          </Badge>
                        )}
                    </div>
                    
                    <h1 className="text-6xl font-display font-black tracking-tighter sumi-e-ink leading-none">{rikishi.shikona}</h1>
                    
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] uppercase font-black tracking-[0.2em] opacity-80 pt-2">
                       <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-secondary" /> {rikishi.origin}</span>
                       <span className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-secondary" /> {rikishi.age} Years</span>
                       <span className="flex items-center gap-2"><Ruler className="h-3.5 w-3.5 text-secondary" /> {rikishi.height}cm</span>
                       <span className="flex items-center gap-2"><Scale className="h-3.5 w-3.5 text-secondary" /> {rikishi.weight}kg</span>
                    </div>
                 </div>

                 <div className="flex gap-4 md:gap-8 shrink-0 bg-black/20 p-6 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
                    {[
                      { label: "Current Record", value: `${rikishi.currentBashoWins}-${rikishi.currentBashoLosses}`, sub: "This Tournament", color: rikishi.currentBashoWins >= rikishi.currentBashoLosses ? "text-emerald-400" : "text-amber-400" },
                      { label: "Career History", value: `${rikishi.careerWins}-${rikishi.careerLosses}`, sub: "Professional Record", color: "text-white" },
                      { label: "Elite Titles", value: rikishi.careerYusho, sub: "Yūshō Count", color: "text-gold", condition: rikishi.careerYusho > 0 }
                    ].map((stat, i) => (
                      <React.Fragment key={i}>
                        {(!stat.condition || stat.condition === true) && (
                           <div className="text-center group">
                              <div className={cn("text-4xl font-display font-black leading-none mb-1 transition-transform group-hover:scale-110", stat.color)}>{stat.value}</div>
                              <div className="text-[10px] uppercase font-black opacity-60 tracking-widest mb-0.5">{stat.label}</div>
                              <div className="text-[8px] uppercase font-bold opacity-40">{stat.sub}</div>
                           </div>
                        )}
                        {i < 2 && <div className="w-px h-12 bg-white/10 hidden md:block" />}
                      </React.Fragment>
                    ))}
                 </div>
              </div>
           </div>

           <div className="p-8">
              {/* Naturalization Progress */}
              {rikishi.nationality !== "Japan" && (
                <div className="mb-10 p-6 bg-amber-500/5 border-2 border-amber-500/10 rounded-2xl relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <UserPlus className="h-24 w-24 text-amber-600" />
                   </div>
                   <div className="flex items-center justify-between mb-6 relative z-10">
                      <div>
                        <h3 className="text-lg font-display font-black flex items-center gap-2 uppercase tracking-tight">
                          Naturalization Timeline
                        </h3>
                        <p className="text-[10px] uppercase font-black tracking-[0.2em] text-amber-600/70">Institutional Residency Tracker</p>
                      </div>
                      <Badge className={cn("font-black tracking-widest text-[10px] h-6", (rikishi.careerWins >= 400 ? "bg-emerald-500" : "bg-amber-500"))}>
                        {rikishi.careerWins >= 400 ? "ELIGIBLE" : "IN REVIEW"}
                      </Badge>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                      {[
                        { label: "Tenure", val: Math.min(100, Math.floor((rikishi.careerHistory.length / 60) * 100)), target: "60 Basho" },
                        { label: "Wins", val: Math.min(100, Math.floor((rikishi.careerWins / 400) * 100)), target: "400 Wins" },
                        { label: "Stature", val: (rikishi.rank === "yokozuna" || rikishi.rank === "ozeki" ? 100 : 30), target: "Sanyaku" }
                      ].map((p, i) => (
                        <div key={i} className="space-y-2">
                           <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                             <span>{p.label}</span>
                             <span>{p.val}%</span>
                           </div>
                           <Progress value={p.val} className="h-1.5 bg-amber-200/30" />
                           <p className="text-[9px] font-bold text-amber-600/60 uppercase tracking-widest italic">{p.target} Target</p>
                        </div>
                      ))}
                   </div>
                </div>
              )}

              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                <TabsList className="bg-muted/50 p-1 rounded-full border border-border/50 max-w-sm">
                  <TabsTrigger value="profile" className="rounded-full px-8 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white">Profile</TabsTrigger>
                  <TabsTrigger value="history" className="rounded-full px-8 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white">Career Archives</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-8 animate-in fade-in slide-in-from-left-2 duration-300">
                   <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                         <h3 className="text-xl font-display font-black flex items-center gap-2 uppercase tracking-tight">
                            <Activity className="h-5 w-5 text-primary" /> Physical Attributes
                         </h3>
                         <div className="grid grid-cols-2 gap-4">
                            {[
                              { label: "Forcefulness", val: rikishi.perceivedStats?.strength || 50, color: "bg-amber-500", icon: <Zap className="h-3.5 w-3.5" /> },
                              { label: "Agility", val: rikishi.perceivedStats?.speed || 50, color: "bg-blue-500", icon: <TrendingUp className="h-3.5 w-3.5" /> },
                              { label: "Resilience", val: 75, color: "bg-emerald-500", icon: <Shield className="h-3.5 w-3.5" /> },
                              { label: "Precision", val: 65, color: "bg-purple-500", icon: <Target className="h-3.5 w-3.5" /> }
                            ].map((stat, i) => (
                              <div key={i} className="bg-muted/30 p-4 rounded-xl border border-border/50 space-y-3 hover:border-primary/20 transition-colors">
                                 <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none">
                                    {stat.icon} {stat.label}
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <div className="text-2xl font-display font-black">{stat.val}</div>
                                    <Progress value={stat.val} className={cn("h-1 flex-1 opacity-40", stat.color)} />
                                 </div>
                              </div>
                            ))}
                         </div>
                      </div>

                      <div className="space-y-6">
                         <h3 className="text-xl font-display font-black flex items-center gap-2 uppercase tracking-tight">
                            <AwardIcon className="h-5 w-5 text-primary" /> Narrative Notes
                         </h3>
                         <div className="bg-muted/20 border-2 border-dashed rounded-2xl p-6 space-y-4 opacity-70">
                            <div className="flex items-start gap-4">
                               <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center shrink-0">
                                  <Info className="h-5 w-5 text-muted-foreground" />
                               </div>
                               <p className="text-sm italic font-display leading-relaxed">
                                  "{rikishi.shikona} is known for a traditional style that emphasizes lower-body strength and direct thrusting. While his Tachiai is among the most disciplined in the stable, critics argue his defensive belt-work remains a point of vulnerability."
                                </p>
                            </div>
                            <div className="h-px bg-border/40" />
                            <div className="flex gap-2">
                               <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest">Steady Gainer</Badge>
                               <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest">Crowd Favorite</Badge>
                            </div>
                         </div>
                      </div>
                   </div>
                </TabsContent>

                <TabsContent value="history" className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-300">
                  <Card className="paper border-0 shadow-none bg-transparent overflow-hidden">
                    <CardHeader className="px-0 pb-6 border-b border-dashed border-border mb-6">
                      <CardTitle className="text-2xl font-display font-black flex items-center gap-3 uppercase tracking-tight">
                        <History className="h-6 w-6 text-primary" />
                        Basho History Archives
                      </CardTitle>
                      <CardDescription className="text-xs uppercase font-black tracking-widest opacity-50">Historical ledger of all professional bouts and ranks.</CardDescription>
                    </CardHeader>
                    <CardContent className="px-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="text-left border-b-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                              <th className="pb-4 pr-6">Official Basho</th>
                              <th className="pb-4 px-6 text-center">Association Rank</th>
                              <th className="pb-4 px-6 text-center">Final Record</th>
                              <th className="pb-4 px-6 text-center">Accolades</th>
                              <th className="pb-4 pl-6 text-right">Physicality</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {history.slice().reverse().map((snap, i) => (
                              <tr key={i} className="hover:bg-primary/5 transition-colors group">
                                <td className="py-4 pr-6 font-display font-black text-sm uppercase tracking-tighter">
                                  {snap.bashoName} {snap.year}
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest px-2 h-5 border-2 group-hover:border-primary/30 transition-colors")}>
                                    {snap.rank} {snap.rankNumber > 0 ? snap.rankNumber : ""}
                                  </Badge>
                                </td>
                                <td className="py-4 px-6 text-center tabular-nums">
                                  <div className="flex flex-col items-center">
                                     <div className={cn("text-lg font-display font-black", snap.wins >= snap.losses ? "text-emerald-500" : "text-amber-500")}>
                                       {snap.wins}-{snap.losses}
                                     </div>
                                     <div className="text-[8px] uppercase font-black opacity-40">{snap.wins >= 8 ? 'Kachi-Koshi' : 'Make-Koshi'}</div>
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                   <div className="flex items-center justify-center gap-2">
                                     {snap.isYusho && <Trophy className="h-5 w-5 text-gold animate-pulse" />}
                                     {snap.isJunYusho && <Star className="h-4 w-4 text-amber-300" title="Jun-Yūshō" />}
                                     {snap.specialPrizes.shukunsho && <Medal className="h-4 w-4 text-purple-400" title="Outstanding Performance" />}
                                     {snap.specialPrizes.kantosho && <Medal className="h-4 w-4 text-emerald-400" title="Fighting Spirit" />}
                                     {snap.specialPrizes.ginosho && <Medal className="h-4 w-4 text-blue-400" title="Technique Prize" />}
                                     {!snap.isYusho && !snap.isJunYusho && !Object.values(snap.specialPrizes).some(v => v) && (
                                       <span className="text-muted-foreground text-[10px] font-black opacity-30 tracking-widest">NONE</span>
                                     )}
                                   </div>
                                </td>
                                <td className="py-4 pl-6 text-right tabular-nums">
                                  <div className="text-xs font-black opacity-60">Weight: <span className="text-foreground">{snap.weight}kg</span></div>
                                </td>
                              </tr>
                            ))}
                            {history.length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-20 text-center space-y-4 opacity-50">
                                   <div className="text-5xl text-muted-foreground animate-pulse font-display">∅</div>
                                   <p className="text-sm font-display italic">No historical snapshots found in the career ledger.</p>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Milestone Timeline */}
                  <div className="space-y-6 pt-10 border-t-2 border-dashed">
                    <h3 className="text-2xl font-display font-black flex items-center gap-3 uppercase tracking-tight">
                      <Star className="h-6 w-6 text-gold" />
                      Association Milestones
                    </h3>
                    <div className="relative pl-10 space-y-12 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-1 before:bg-muted before:rounded-full">
                       {milestones.length === 0 ? (
                         <div className="py-10 text-center bg-muted/20 border-2 border-dashed rounded-2xl opacity-50">
                            <p className="text-sm font-display italic">This rikishi has not yet participated in Association milestones.</p>
                         </div>
                       ) : (
                         milestones.slice().reverse().map((m, i) => (
                           <div key={i} className="relative animate-in slide-in-from-left-2 duration-500 fill-mode-both" style={{ animationDelay: `${i * 100}ms` }}>
                             <div className="absolute -left-[35px] top-1.5 h-4 w-4 rounded-full bg-primary border-4 border-background shadow-lg ring-4 ring-primary/10" />
                             <div className="space-y-2 max-w-2xl">
                               <div className="flex items-center gap-4">
                                 <h4 className="font-display font-black text-xl uppercase tracking-tighter">{m.title}</h4>
                                 <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-2">{m.date.year}.{m.date.month}</Badge>
                               </div>
                               <p className="text-sm text-muted-foreground leading-relaxed font-display italic opacity-80">
                                 {m.description}
                               </p>
                             </div>
                           </div>
                         ))
                       )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
           </div>
        </div>
      </div>
    </AppLayout>
  );
}
