// ProgressionTracker.tsx — Ozeki Run, Yokozuna Deliberation, Kadoban Drama narratives
// Shows multi-season progression arcs for the player's rikishi

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Crown, ShieldAlert, TrendingUp, Flame, AlertTriangle } from "lucide-react";
import { RikishiName } from "@/components/ClickableName";
import { RANK_HIERARCHY } from "@/engine/banzuke";
import { getOzekiRunCandidates, getYokozunaCandidates, getKadobanDrama, OzekiRunCandidate, YokozunaCandidate } from "@/engine/uiDigest";
import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";
import type { OzekiKadobanMap } from "@/engine/banzuke";

/** Defines the structure for progression tracker props. */
interface ProgressionTrackerProps {
  world: WorldState;
}

/** Defines the structure for ozeki run candidate. */

/** Defines the structure for yokozuna candidate. */

/**
 * Get ozeki run candidates.
 *  * @param world - The World.
 *  * @returns The result.
 */
}

/**
 * Get kadoban drama.
 *  * @param world - The World.
 *  * @returns The result.
 */
}

/**
 * progression tracker.
 *  * @param { world } - The { world }.
 */
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
