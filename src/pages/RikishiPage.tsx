import { useState } from "react";
import { Helmet } from "react-helmet";
import { useNavigate, useParams, Link } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  History, 
  Trophy, 
  Award, 
  Star, 
  TrendingUp, 
  ChevronRight,
  Activity,
  Flame,
  Zap,
  Shield,
  Target,
  Ruler,
  Scale,
  MapPin,
  Calendar,
  User,
  Globe,
  UserPlus,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { HQ_TABS } from "@/constants/navigation";
import { projectRikishi, type UIRikishi } from "@/presenters/uiModels";

export default function RikishiPage() {
  const { rikishiId } = useParams({ strict: false });
  const { state } = useGame();
  const { world, playerHeyaId } = state;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");

  if (!world) return null;

  // Handle Roster List View
  if (!rikishiId) {
     const playerHeya = world.heyas.get(playerHeyaId || "");
     const rikishiList = Array.from(world.rikishi.values())
        .filter(r => r.heyaId === playerHeyaId)
        .map(r => projectRikishi(r, world));

     return (
        <AppLayout pageTitle="Roster Management" subNavTabs={HQ_TABS} activeSubTab="roster">
           <Helmet><title>Roster Management | Basho</title></Helmet>
           <div className="space-y-8">
              <div className="flex justify-between items-end">
                 <div>
                    <h1 className="text-3xl font-display font-bold text-foreground">Stable Roster</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage your active wrestlers and track their current tournament status.</p>
                 </div>
                 <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs font-bold uppercase tracking-widest">Filter</Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs font-bold uppercase tracking-widest">Sort</Button>
                 </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 {rikishiList.map(r => (
                    <Card key={r.id} className="paper hover:scale-[1.02] transition-transform cursor-pointer" onClick={() => navigate({ to: "/rikishi/$rikishiId", params: { rikishiId: r.id } as any })}>
                       <CardContent className="p-5">
                          <div className="flex justify-between items-start mb-4">
                             <div className="space-y-1">
                                <Badge className={cn("rank-badge text-[10px]", `rank-${r.rank}`)}>{r.rankLabel}</Badge>
                                <div className="font-display font-bold text-lg">{r.shikona}</div>
                             </div>
                             <div className="text-right">
                                <div className="text-lg font-mono font-bold leading-none">{r.currentBashoWins}-{r.currentBashoLosses}</div>
                                <div className="text-[9px] uppercase font-bold text-muted-foreground">Current Basho</div>
                             </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80">
                             <div className="flex items-center gap-1.5"><Zap className="h-3 w-3" /> Power: {r.perceivedStats?.strength || '??'}</div>
                             <div className="flex items-center gap-1.5"><Activity className="h-3 w-3" /> Speed: {r.perceivedStats?.speed || '??'}</div>
                          </div>
                       </CardContent>
                    </Card>
                 ))}
              </div>
           </div>
        </AppLayout>
     );
  }

  const rawRikishi = world.rikishi.get(rikishiId);
  if (!rawRikishi) return <div>Rikishi not found</div>;

  const rikishi = projectRikishi(rawRikishi, world);

  const isOwned = rikishi.heyaId === playerHeyaId;
  const history = rikishi.careerHistory;
  const milestones = rikishi.milestones;

  return (
    <AppLayout 
        pageTitle="Rikishi Profile" 
        subNavTabs={HQ_TABS} 
        activeSubTab="roster"
    >
      <Helmet>
        <title>{rikishi.shikona} — Rikishi Profile | Basho</title>
      </Helmet>

      <div className="space-y-8">
        <Button variant="ghost" onClick={() => navigate({ to: "/stable/roster" })} className="gap-2 h-8 text-xs font-bold uppercase tracking-widest">
          <ArrowLeft className="h-3 w-3" /> Back to Roster
        </Button>

        {/* Hero Header */}
        <Card className="paper overflow-hidden border-t-4 border-t-primary">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={`rank-${rikishi.rank}`}>
                    {rikishi.rankLabel}
                  </Badge>
                  {isOwned && <Badge variant="secondary">My Stable</Badge>}
                  {rikishi.nationality !== "Japan" && (
                    <Badge variant="outline" className="border-amber-500/50 text-amber-500 flex items-center gap-1">
                      <Globe className="h-3 w-3" /> Foreign Slot
                    </Badge>
                  )}
                </div>
                <h1 className="text-4xl font-display font-bold">{rikishi.shikona}</h1>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {rikishi.origin}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Age {rikishi.age}</span>
                  <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" /> {rikishi.height}cm</span>
                  <span className="flex items-center gap-1"><Scale className="h-3.5 w-3.5" /> {rikishi.weight}kg</span>
                </div>
              </div>
              <div className="flex gap-8 shrink-0 text-center">
                 <div>
                   <div className="text-3xl font-mono font-bold">{rikishi.currentBashoWins}-{rikishi.currentBashoLosses}</div>
                   <div className="text-[10px] uppercase text-muted-foreground font-semibold">Current Basho</div>
                 </div>
                 <div>
                   <div className="text-3xl font-mono font-bold">{rikishi.careerWins}-{rikishi.careerLosses}</div>
                   <div className="text-[10px] uppercase text-muted-foreground font-semibold">Career Record</div>
                 </div>
                 {rikishi.careerYusho > 0 && (
                   <div>
                     <div className="text-3xl font-mono font-bold text-amber-500">{rikishi.careerYusho}</div>
                     <div className="text-[10px] uppercase text-muted-foreground font-semibold">Yūshō</div>
                   </div>
                 )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Naturalization Progress (v2.0) */}
        {rikishi.nationality !== "Japan" && (
          <Card className="paper border-l-4 border-l-amber-500 bg-amber-500/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-amber-600" />
                    Naturalization Timeline
                  </CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-amber-600/70">Institutional Residency Tracker</CardDescription>
                </div>
                {rikishi.careerWins >= 400 || (rikishi.rank === "yokozuna" && rikishi.age >= 28) ? (
                  <Badge className="bg-emerald-500 text-white border-0">ELIGIBLE</Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500/30 text-amber-600">IN PROGRESS</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                   <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider">
                     <span>Residency (Bout Tenure)</span>
                     <span>{Math.min(100, Math.floor((rikishi.careerHistory.length / 60) * 100))}%</span>
                   </div>
                   <Progress value={Math.min(100, (rikishi.careerHistory.length / 60) * 100)} className="h-1 bg-amber-200/50" />
                   <p className="text-[9px] text-muted-foreground italic">Target: 10 Years (60 Basho)</p>
                </div>
                <div className="space-y-1.5">
                   <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider">
                     <span>Career Win Target</span>
                     <span>{Math.min(100, Math.floor((rikishi.careerWins / 400) * 100))}%</span>
                   </div>
                   <Progress value={Math.min(100, (rikishi.careerWins / 400) * 100)} className="h-1 bg-amber-200/50" />
                   <p className="text-[9px] text-muted-foreground italic">Target: 400 Professional Wins</p>
                </div>
                <div className="space-y-1.5">
                   <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider">
                     <span>Institutional Stature</span>
                     <span>{rikishi.rank === "yokozuna" || rikishi.rank === "ozeki" ? "100%" : "30%"}</span>
                   </div>
                   <Progress value={rikishi.rank === "yokozuna" || rikishi.rank === "ozeki" ? 100 : 30} className="h-1 bg-amber-200/50" />
                   <p className="text-[9px] text-muted-foreground italic">Target: Sanyaku/Elite Ranks</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg border border-amber-500/10">
                <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Upon completion of criteria, the Association may grant citizenship during the New Year review. Naturalized citizens no longer count towards your foreign roster limit (1 per stable).
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-80 grid-cols-2">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            {/* Existing profile content would go here... for now let's focus on History tab */}
            <Card className="paper">
              <CardHeader>
                <CardTitle>Rikishi Overview</CardTitle>
              </CardHeader>
              <CardContent>
                 <p className="text-muted-foreground text-sm">Full profile attributes and narrative descriptions.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            {/* Career History Grid */}
            <Card className="paper">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Career History
                </CardTitle>
                <CardDescription>Dense historical record of every tournament.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b text-muted-foreground">
                        <th className="pb-2 font-semibold">Basho</th>
                        <th className="pb-2 font-semibold text-center">Rank</th>
                        <th className="pb-2 font-semibold text-center">Record</th>
                        <th className="pb-2 font-semibold text-center">Results</th>
                        <th className="pb-2 font-semibold text-right">Weight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {history.slice().reverse().map((snap, i) => (
                        <tr key={i} className="hover:bg-secondary/20 transition-colors">
                          <td className="py-2 font-medium">
                            {snap.bashoName.toUpperCase()} {snap.year}
                          </td>
                          <td className="py-2 text-center">
                            <Badge variant="outline" className="text-[10px] uppercase px-1 h-5">
                              {snap.rank} {snap.rankNumber}
                            </Badge>
                          </td>
                          <td className="py-2 text-center font-mono">
                            <span className={snap.wins >= snap.losses ? "text-success" : "text-destructive"}>
                              {snap.wins}-{snap.losses}
                            </span>
                          </td>
                          <td className="py-2">
                             <div className="flex items-center justify-center gap-1">
                               {snap.isYusho && <Trophy className="h-4 w-4 text-amber-500" />}
                               {snap.isJunYusho && <Star className="h-3 w-3 text-amber-300" />}
                               {snap.specialPrizes.shukunsho && <Award className="h-3 w-3 text-purple-400" />}
                               {snap.specialPrizes.kantosho && <Award className="h-3 w-3 text-green-400" />}
                               {snap.specialPrizes.ginosho && <Award className="h-3 w-3 text-blue-400" />}
                               {!snap.isYusho && !snap.isJunYusho && !Object.values(snap.specialPrizes).some(v => v) && (
                                 <span className="text-muted-foreground text-[10px]">MK</span>
                               )}
                             </div>
                          </td>
                          <td className="py-2 text-right font-mono text-xs">
                            {snap.weight}kg
                          </td>
                        </tr>
                      ))}
                      {history.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-muted-foreground italic">
                            No tournament snapshots recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Milestone Timeline */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                Career Milestones
              </h3>
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
                 {milestones.length === 0 ? (
                   <p className="text-muted-foreground text-sm italic">No significant milestones reached yet.</p>
                 ) : (
                   milestones.slice().reverse().map((m, i) => (
                     <div key={i} className="relative">
                       <div className="absolute -left-7 top-1 h-3 w-3 rounded-full bg-primary border-4 border-background" />
                       <div className="space-y-1">
                         <div className="flex items-baseline justify-between">
                           <h4 className="font-bold text-sm">{m.title}</h4>
                           <span className="text-[10px] text-muted-foreground font-mono">{m.date.year}.{m.date.month}</span>
                         </div>
                         <p className="text-xs text-muted-foreground leading-relaxed">
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
    </AppLayout>
  );
}
