// ProgressionTracker.tsx — Ozeki Run, Yokozuna Deliberation, Kadoban Drama narratives
// Shows multi-season progression arcs for the player's rikishi

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Crown, ShieldAlert, TrendingUp, Flame, AlertTriangle } from "lucide-react";
import { RikishiName } from "@/components/ClickableName";
import { RANK_HIERARCHY } from "@/engine/banzuke";
import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";
import type { OzekiKadobanMap } from "@/engine/banzuke";

interface ProgressionTrackerProps {
  world: WorldState;
}

interface OzekiRunCandidate {
  rikishi: Rikishi;
  recentWins: number; // wins over last 3 basho
  threshold: number; // typically 33
  progress: number; // percentage
  narrative: string;
}

interface YokozunaCandidate {
  rikishi: Rikishi;
  consecutiveYusho: number;
  recentWins: number;
  narrative: string;
  isStrong: boolean;
}

function getOzekiRunCandidates(world: WorldState): OzekiRunCandidate[] {
  const candidates: OzekiRunCandidate[] = [];
  const playerHeyaId = world.playerHeyaId;

  for (const r of world.rikishi.values()) {
    // Ozeki run: sekiwake or komusubi with strong recent results
    if (r.rank !== "sekiwake" && r.rank !== "komusubi") continue;
    if (r.isRetired) continue;

    // Estimate recent 3-basho wins from career wins and current basho
    const currentWins = r.currentBashoWins || 0;
    const careerWins = r.careerWins || 0;
    const careerLosses = r.careerLosses || 0;
    const totalBouts = careerWins + careerLosses;
    
    // Rough estimate: average wins per basho * 3, plus current basho
    const avgWinsPerBasho = totalBouts > 0 ? (careerWins / Math.max(1, Math.ceil(totalBouts / 15))) : 0;
    const recentWins = Math.round(avgWinsPerBasho * 2 + currentWins);
    
    const threshold = 33;
    const progress = Math.min(100, (recentWins / threshold) * 100);

    if (recentWins >= 20) { // Only show if they're actually in contention
      const isPlayerRikishi = r.heyaId === playerHeyaId;
      let narrative = "";
      if (progress >= 90) {
        narrative = `${r.shikona} is on the brink of ōzeki promotion! The Sumo Association is watching closely.`;
      } else if (progress >= 70) {
        narrative = `${r.shikona} is building a strong case for ōzeki. A dominant showing next basho could seal it.`;
      } else {
        narrative = `${r.shikona} has been performing well at san'yaku. An ōzeki run is taking shape.`;
      }

      candidates.push({ rikishi: r, recentWins, threshold, progress, narrative });
    }
  }

  return candidates.sort((a, b) => b.progress - a.progress);
}

function getYokozunaCandidates(world: WorldState): YokozunaCandidate[] {
  const candidates: YokozunaCandidate[] = [];

  for (const r of world.rikishi.values()) {
    if (r.rank !== "ozeki") continue;
    if (r.isRetired) continue;

    const yusho = r.careerRecord?.yusho || 0;
    const currentWins = r.currentBashoWins || 0;
    
    // Strong candidate: ōzeki with yūshō and dominant current results
    if (yusho >= 1 || currentWins >= 13) {
      const isStrong = yusho >= 2 || (yusho >= 1 && currentWins >= 13);
      let narrative = "";
      if (isStrong) {
        narrative = `The Yokozuna Deliberation Council has taken notice of ${r.shikona}. Back-to-back dominant results could trigger promotion discussions.`;
      } else {
        narrative = `${r.shikona} continues to impress at ōzeki. A yūshō or equivalent result would spark yokozuna deliberation.`;
      }

      candidates.push({
        rikishi: r,
        consecutiveYusho: yusho,
        recentWins: currentWins,
        narrative,
        isStrong,
      });
    }
  }

  return candidates;
}

function getKadobanDrama(world: WorldState): Array<{ rikishi: Rikishi; narrative: string; isDemoted: boolean }> {
  const kadobanMap: OzekiKadobanMap = (world as any).ozekiKadoban ?? {};
  const entries: Array<{ rikishi: Rikishi; narrative: string; isDemoted: boolean }> = [];

  for (const [rid, status] of Object.entries(kadobanMap)) {
    if (!status.isKadoban && status.consecutiveMakeKoshi < 2) continue;
    const r = world.rikishi.get(rid);
    if (!r) continue;

    const isDemoted = status.consecutiveMakeKoshi >= 2;
    let narrative = "";
    if (isDemoted) {
      narrative = `${r.shikona} has been demoted from ōzeki after two consecutive losing records. A painful fall from grace.`;
    } else if (status.isKadoban) {
      narrative = `${r.shikona} is kadoban (角番) — they must achieve a winning record next basho or face demotion from ōzeki. The pressure is immense.`;
    }

    entries.push({ rikishi: r, narrative, isDemoted });
  }

  return entries;
}

export function ProgressionTracker({ world }: ProgressionTrackerProps) {
  const ozekiRuns = useMemo(() => getOzekiRunCandidates(world), [world]);
  const yokozunaCandidates = useMemo(() => getYokozunaCandidates(world), [world]);
  const kadobanDrama = useMemo(() => getKadobanDrama(world), [world]);

  const hasContent = ozekiRuns.length > 0 || yokozunaCandidates.length > 0 || kadobanDrama.length > 0;
  if (!hasContent) return null;

  return (
    <div className="space-y-4">
      {/* Yokozuna Deliberation */}
      {yokozunaCandidates.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="h-5 w-5 text-amber-500" />
              横綱審議委員会 Yokozuna Deliberation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {yokozunaCandidates.map((c) => (
              <div key={c.rikishi.id} className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold">
                      <RikishiName id={c.rikishi.id} name={c.rikishi.shikona} />
                    </span>
                    {c.isStrong && (
                      <Badge className="bg-amber-500/20 text-amber-500 text-xs">Strong Candidate</Badge>
                    )}
                    {c.rikishi.heyaId === world.playerHeyaId && (
                      <Badge className="bg-primary/20 text-primary text-xs">YOUR</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{c.narrative}</p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>Yūshō: {c.consecutiveYusho}</span>
                    <span>Current basho: {c.recentWins}W</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Ozeki Runs */}
      {ozekiRuns.length > 0 && (
        <Card className="border-purple-500/30 bg-purple-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              大関取り Ōzeki Run Watch
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ozekiRuns.map((c) => (
              <div key={c.rikishi.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold">
                    <RikishiName id={c.rikishi.id} name={c.rikishi.shikona} />
                  </span>
                  <Badge variant="outline" className="capitalize text-xs">
                    {RANK_HIERARCHY[c.rikishi.rank]?.nameJa ?? c.rikishi.rank}
                  </Badge>
                  {c.rikishi.heyaId === world.playerHeyaId && (
                    <Badge className="bg-primary/20 text-primary text-xs">YOUR</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{c.narrative}</p>
                <div className="flex items-center gap-3">
                  <Progress value={c.progress} className="flex-1 h-2" />
                  <span className="text-xs font-mono text-muted-foreground">
                    {c.recentWins}/{c.threshold}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Kadoban Drama */}
      {kadobanDrama.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              角番 Kadoban Watch
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {kadobanDrama.map((entry) => (
              <div key={entry.rikishi.id} className="flex items-start gap-3">
                <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${entry.isDemoted ? "text-destructive" : "text-amber-500"}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold">
                      <RikishiName id={entry.rikishi.id} name={entry.rikishi.shikona} />
                    </span>
                    <Badge variant={entry.isDemoted ? "destructive" : "outline"} className="text-xs">
                      {entry.isDemoted ? "DEMOTED" : "KADOBAN"}
                    </Badge>
                    {entry.rikishi.heyaId === world.playerHeyaId && (
                      <Badge className="bg-primary/20 text-primary text-xs">YOUR</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{entry.narrative}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
