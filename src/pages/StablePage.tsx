import { Helmet } from "react-helmet";
import { AppLayout } from "@/components/layout/AppLayout";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FacilitiesBand, KoenkaiBandType, PrestigeBand, RunwayBand, StatureBand } from "@/engine/types/narrative";
import { projectRosterEntry, projectRikishi, type UIRosterEntry, type UIRikishi } from "@/presenters/uiModels";
import {
  Activity,
  AlertTriangle,
  Building,
  Coins,
  Crown,
  Dumbbell,
  Heart,
  History,
  Medal,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  Users2,
  Zap,
  Scroll
} from "lucide-react";
import { useMemo, useState } from "react";
import { OyakataName, RikishiName } from "@/components/ClickableName";
import { RANK_HIERARCHY } from "@/presenters/uiDigest";

export default function StablePage() {
  const navigate = useNavigate();
  const { id: routeId } = useParams({ strict: false });
  const { state, updateWorld } = useGame();
  const { world, playerHeyaId } = state;

  const viewingHeyaId = (world && playerHeyaId) ? (routeId || playerHeyaId) : "";
  const isViewingOwnStable = viewingHeyaId === playerHeyaId;
  const heya = world?.heyas.get(viewingHeyaId) ?? null;

  if (!world || !heya) return null;

  const rikishiList = useMemo(() => {
    return heya.rikishiIds
      .map((id) => {
        const r = world.rikishi.get(id);
        return r ? projectRikishi(r, world) : null;
      })
      .filter(Boolean) as UIRikishi[];
  }, [heya, world]);

  const lineage = heya.lineage || [];

  return (
    <AppLayout pageTitle={heya.name}>
      <Helmet>
        <title>{heya.name} — Stable Profile</title>
      </Helmet>

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold flex items-center gap-3">
              <Building className="h-10 w-10 text-primary" />
              {heya.name}
              {heya.nameJa && <span className="text-2xl text-muted-foreground font-normal ml-2">{heya.nameJa}</span>}
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Users className="h-4 w-4" /> {rikishiList.length} Active Rikishi
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="px-3 py-1 text-sm bg-secondary/50">
              {heya.ichimon || "Independent"}
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="roster" className="space-y-6">
          <TabsList className="grid w-80 grid-cols-2">
            <TabsTrigger value="roster">Roster</TabsTrigger>
            <TabsTrigger value="history">Institutional History</TabsTrigger>
          </TabsList>

          <TabsContent value="roster" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rikishiList.map(r => (
                <Card key={r.id} className="paper hover:border-primary transition-colors cursor-pointer" onClick={() => navigate({ to: "/rikishi/$rikishiId", params: { rikishiId: r.id } as any })}>
                   <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <div className="font-bold">{r.shikona}</div>
                        <div className="text-xs text-muted-foreground uppercase">{r.rank}</div>
                      </div>
                      <Badge variant="secondary">{r.currentBashoWins}-{r.currentBashoLosses}</Badge>
                   </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-8">
            {/* Leadership Timeline */}
            <div className="space-y-4">
               <h3 className="text-xl font-bold flex items-center gap-2">
                 <Scroll className="h-5 w-5 text-primary" />
                 Oyakata Lineage
               </h3>
               <div className="space-y-4">
                 {lineage.length === 0 ? (
                   <p className="text-muted-foreground text-sm italic">No lineage recorded yet.</p>
                 ) : (
                   lineage.slice().reverse().map((tenure, i) => (
                     <Card key={i} className="paper">
                       <CardContent className="p-4 flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                              {tenure.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold">{tenure.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {tenure.startYear} — {tenure.endYear || "Present"}
                              </div>
                            </div>
                         </div>
                         {tenure.achievements.length > 0 && (
                           <div className="flex gap-1">
                             {tenure.achievements.map((ach, j) => (
                               <Badge key={j} variant="outline" className="text-[10px]">{ach}</Badge>
                             ))}
                           </div>
                         )}
                       </CardContent>
                     </Card>
                   ))
                 )}
               </div>
            </div>

            {/* Historical Summary */}
            <div className="grid gap-6 md:grid-cols-2">
               <Card className="paper h-full">
                 <CardHeader>
                   <CardTitle className="text-base flex items-center gap-2">
                     <Trophy className="h-5 w-5 text-amber-500" />
                     Championship Legacy
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                    <div className="text-4xl font-display font-bold">{heya.historicalYusho || 0}</div>
                    <p className="text-sm text-muted-foreground mt-1">All-time tournament victories by members of this stable.</p>
                 </CardContent>
               </Card>
               
               <Card className="paper h-full opacity-50 border-dashed">
                 <CardHeader>
                   <CardTitle className="text-base flex items-center gap-2">
                     <Medal className="h-5 w-5 text-slate-400" />
                     Hall of Fame Inductees
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                    <p className="text-sm text-muted-foreground">Coming in future expansion.</p>
                 </CardContent>
               </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
