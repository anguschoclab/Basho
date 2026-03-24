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
  User
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { formatRank } from "@/engine/banzuke";

export default function RikishiPage() {
  const { rikishiId } = useParams({ strict: false });
  const { state } = useGame();
  const { world, playerHeyaId } = state;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");

  if (!world || !rikishiId) return null;

  const rikishi = world.rikishi.get(rikishiId);
  if (!rikishi) return <div>Rikishi not found</div>;

  const isOwned = rikishi.heyaId === playerHeyaId;
  const history = rikishi.careerHistory || [];
  const milestones = rikishi.milestones || [];

  return (
    <AppLayout pageTitle={`${rikishi.shikona} - Profile`}>
      <Helmet>
        <title>{rikishi.shikona} - Rikishi Profile</title>
      </Helmet>

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate({ to: ".." })} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Directory
        </Button>

        {/* Hero Header */}
        <Card className="paper overflow-hidden border-t-4 border-t-primary">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={`rank-${rikishi.rank}`}>
                    {formatRank({ rank: rikishi.rank, rankNumber: rikishi.rankNumber, side: rikishi.side } as any)}
                  </Badge>
                  {isOwned && <Badge variant="secondary">My Stable</Badge>}
                </div>
                <h1 className="text-4xl font-display font-bold">{rikishi.shikona}</h1>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {rikishi.origin || rikishi.nationality}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Age {world.year - rikishi.birthYear}</span>
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
                 {rikishi.careerRecord?.yusho > 0 && (
                   <div>
                     <div className="text-3xl font-mono font-bold text-amber-500">{rikishi.careerRecord.yusho}</div>
                     <div className="text-[10px] uppercase text-muted-foreground font-semibold">Yūshō</div>
                   </div>
                 )}
              </div>
            </div>
          </CardContent>
        </Card>

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
