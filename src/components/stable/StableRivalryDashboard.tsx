/**
 * StableRivalryDashboard.tsx
 * ==========================
 * Visualizes the relationships and feuds between stables.
 * (Phase 3: Global Circuit & Rivalry Dynamics)
 */

import { cn } from "@/lib/utils";
import { Flame, Shield, Swords, TrendingUp, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  StableRelationRecord,
  StableRelationTone,
} from "@/engine/systems/narrative/StableRivalryService";

interface RivalryEntry {
  heyaId: string;
  heyaName: string;
  relation: StableRelationRecord;
}

interface StableRivalryDashboardProps {
  rivalries: RivalryEntry[];
}

export function StableRivalryDashboard({ rivalries }: StableRivalryDashboardProps) {
  // Sort by heat descending
  const sortedRivalries = [...rivalries].sort((a, b) => b.relation.heat - a.relation.heat);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-display font-black tracking-tight uppercase">
            Institutional Feuds
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Stable-to-stable global heat and diplomatic relations
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="h-6 gap-1 font-black px-3">
            <Activity className="h-3 w-3 text-orange-500" /> Active Rivalries:{" "}
            {rivalries.filter((r) => r.relation.heat > 50).length}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4">
        {sortedRivalries.length === 0 ? (
          <Card className="paper border-2 border-dashed bg-muted/5">
            <CardContent className="h-40 flex flex-col items-center justify-center text-center space-y-2">
              <Shield className="h-8 w-8 text-muted-foreground/40" />
              <div className="text-xs font-black uppercase text-muted-foreground">
                No institutional records found yet
              </div>
              <p className="text-[9px] text-muted-foreground font-medium max-w-xs">
                Engage in high-stakes matches or media clashes with other stables to build your
                reputation and rivalries.
              </p>
            </CardContent>
          </Card>
        ) : (
          sortedRivalries.map((rivalry) => (
            <Card
              key={rivalry.heyaId}
              className={cn(
                "paper border-2 transition-all hover:translate-x-1 duration-300",
                getToneBorder(rivalry.relation.tone)
              )}
            >
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  {/* Left: Stable Identity */}
                  <div className="p-6 md:w-64 border-b md:border-b-0 md:border-r bg-muted/5">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                          Opposing Stable
                        </div>
                        <h3 className="text-xl font-display font-black tracking-tight uppercase leading-tight">
                          {rivalry.heyaName}
                        </h3>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge
                          className={cn(
                            "font-black tracking-widest uppercase text-[9px] px-3",
                            getToneBadgeClass(rivalry.relation.tone)
                          )}
                        >
                          {rivalry.relation.tone.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Mid: Heat Metrics */}
                  <div className="p-6 flex-1 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="flex items-center gap-1.5">
                            <Flame className="h-3 w-3 text-orange-500" /> Current Heat
                          </span>
                          <span className="text-primary">{rivalry.relation.heat}%</span>
                        </div>
                        <Progress value={rivalry.relation.heat} className="h-1.5" />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="flex items-center gap-1.5">
                            <Swords className="h-3 w-3 text-red-500" /> Spite
                          </span>
                          <span className="text-red-500">{rivalry.relation.spite}%</span>
                        </div>
                        <Progress value={rivalry.relation.spite} className="h-1.5 bg-red-500/10" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                      <div className="space-y-1">
                        <div className="text-[8px] font-black uppercase opacity-40">
                          Total Bouts
                        </div>
                        <div className="text-sm font-black font-mono">
                          {rivalry.relation.totalMeetings}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[8px] font-black uppercase opacity-40">Closeness</div>
                        <div className="text-sm font-black font-mono">
                          {rivalry.relation.closeness}%
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[8px] font-black uppercase opacity-40">Last Met</div>
                        <div className="text-sm font-black font-mono">
                          Week {rivalry.relation.lastBoutWeek}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[8px] font-black uppercase opacity-40">Win rate</div>
                        <div className="text-sm font-black font-mono text-emerald-500">55%</div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="p-6 md:w-48 flex items-center justify-center border-t md:border-t-0 md:border-l bg-muted/5">
                    <Button
                      variant="ghost"
                      className="h-10 px-6 rounded-full font-black uppercase tracking-widest text-[9px] gap-2 hover:bg-primary/5"
                    >
                      Historical <TrendingUp className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function getToneBadgeClass(tone: StableRelationTone): string {
  switch (tone) {
    case "bad_blood":
      return "bg-red-500 text-white shadow-lg shadow-red-500/20";
    case "rivalry":
      return "bg-orange-500 text-white shadow-lg shadow-orange-500/20";
    case "tense":
      return "bg-amber-500 text-white shadow-lg shadow-amber-500/20";
    case "respect":
      return "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getToneBorder(tone: StableRelationTone): string {
  switch (tone) {
    case "bad_blood":
      return "border-red-500/40 hover:border-red-500/60";
    case "rivalry":
      return "border-orange-500/40 hover:border-orange-500/60";
    case "tense":
      return "border-amber-500/40 hover:border-amber-500/60";
    case "respect":
      return "border-emerald-500/40 hover:border-emerald-500/60";
    default:
      return "border-border/40 hover:border-border/80";
  }
}
