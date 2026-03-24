import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RANK_HIERARCHY } from "@/engine/banzuke";
import type { RecordEntry } from "@/engine/types/records";
import {
  Building2,
  ChevronRight,
  Crown,
  Medal,
  Scroll,
  Search,
  Star,
  TrendingUp,
  Trophy,
  Users,
  History,
  Award
} from "lucide-react";

/** Leaderboard widget for record book displays. */
function LeaderboardWidget({ title, entries, icon: Icon, colorClass = "text-primary" }: { title: string, entries: RecordEntry[], icon: any, colorClass?: string }) {
  return (
    <Card className="paper h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`h-5 w-5 ${colorClass}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {entries.length === 0 ? (
            <p className="text-muted-foreground text-center py-6 text-sm">No records yet</p>
          ) : (
            entries.map((entry, idx) => (
              <Link
                key={`${entry.rikishiId}-${idx}`}
                to={`/rikishi/${entry.rikishiId}`}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary/50 transition-colors text-sm"
              >
                <span className={`w-5 text-center font-bold ${idx < 3 ? colorClass : "text-muted-foreground"}`}>
                  {idx + 1}
                </span>
                <span className="flex-1 font-display truncate">{entry.shikona}</span>
                <div className="text-right">
                  <Badge variant="outline" className="font-mono text-xs tabular-nums">
                    {entry.value}
                  </Badge>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {entry.achievedDate.year}.{entry.achievedDate.month}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AlmanacPage() {
  const navigate = useNavigate();
  const { state } = useGame();
  const { world } = state;

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("past-bashos");

  if (!world) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4 text-center">
        <Card className="paper py-12">
          <CardHeader>
            <CardTitle>Almanac unavailable</CardTitle>
            <CardDescription>The world state is not loaded yet.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const records = world.records || { 
    allTime: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
    active: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] }
  };

  return (
    <>
      <Helmet>
        <title>Almanac - The Memory of the World</title>
      </Helmet>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-4xl font-bold flex items-center gap-3">
              <Scroll className="h-10 w-10 text-primary" />
              力士名鑑
            </h1>
            <p className="text-muted-foreground">The authoritative history of the Sumo world.</p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2 bg-secondary/50">
            Year {world.year}
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="past-bashos" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Past Bashos
            </TabsTrigger>
            <TabsTrigger value="records" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Record Book
            </TabsTrigger>
            <TabsTrigger value="hof" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Hall of Fame
            </TabsTrigger>
          </TabsList>

          <TabsContent value="past-bashos">
            <div className="grid gap-6">
              {(world.history || []).length === 0 ? (
                <Card className="paper py-12 text-center">
                  <p className="text-muted-foreground">No tournaments have been completed yet in this world.</p>
                </Card>
              ) : (
                [...world.history].reverse().map((basho: any, idx) => (
                  <Card key={idx} className="paper overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center bg-secondary/20">
                      <div>
                        <h3 className="font-bold text-lg capitalize">{basho.bashoName} {basho.year}</h3>
                        <p className="text-xs text-muted-foreground">Tournament Snapshot</p>
                      </div>
                      <Trophy className="h-6 w-6 text-amber-400" />
                    </div>
                    <CardContent className="p-4 grid md:grid-cols-3 gap-4">
                       <div className="space-y-1">
                          <p className="text-xs uppercase text-muted-foreground font-semibold">Yūshō Winner</p>
                          <p className="font-display font-bold text-lg">{basho.yushoShikona || "Reserved"}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-xs uppercase text-muted-foreground font-semibold">Attendance</p>
                          <p className="font-mono text-lg">Full House</p>
                       </div>
                       <div className="text-right">
                          <Link to={`/basho/${basho.id || idx}`} className="text-primary hover:underline text-sm font-semibold">
                            View Full Results →
                          </Link>
                       </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="records" className="space-y-8">
             <div className="space-y-4">
               <h2 className="text-2xl font-bold flex items-center gap-2">
                 <Star className="h-6 w-6 text-amber-400" />
                 All-Time Records
               </h2>
               <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <LeaderboardWidget title="Total Wins" entries={records.allTime.careerWins} icon={TrendingUp} colorClass="text-emerald-400" />
                  <LeaderboardWidget title="Makuuchi Wins" entries={records.allTime.makuuchiWins} icon={Users} colorClass="text-blue-400" />
                  <LeaderboardWidget title="Yūshō Count" entries={records.allTime.yusho} icon={Trophy} colorClass="text-amber-400" />
                  <LeaderboardWidget title="Consecutive Yūshō" entries={records.allTime.consecutiveYusho} icon={Star} colorClass="text-purple-400" />
                  <LeaderboardWidget title="Kinboshi Stars" entries={records.allTime.kinboshi} icon={Medal} colorClass="text-yellow-400" />
               </div>
             </div>

             <div className="space-y-4">
               <h2 className="text-2xl font-bold flex items-center gap-2">
                 <TrendingUp className="h-6 w-6 text-success" />
                 Active Leaders
               </h2>
               <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <LeaderboardWidget title="Total Wins" entries={records.active.careerWins} icon={TrendingUp} colorClass="text-emerald-400" />
                  <LeaderboardWidget title="Makuuchi Wins" entries={records.active.makuuchiWins} icon={Users} colorClass="text-blue-400" />
                  <LeaderboardWidget title="Yūshō Count" entries={records.active.yusho} icon={Trophy} colorClass="text-amber-400" />
               </div>
             </div>
          </TabsContent>

          <TabsContent value="hof">
            <Card className="paper py-12 text-center border-dashed">
              <div className="flex flex-col items-center gap-4">
                <Award className="h-16 w-16 text-amber-400/50" />
                <div>
                  <h3 className="text-xl font-bold">The Hall of Fame</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mt-2">
                    Reserved for the greatest legends of Sumo history. Wrestlers become eligible after retiring with exceptional achievements.
                  </p>
                </div>
                <Badge variant="secondary" className="mt-4">Expansion in Progress</Badge>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
