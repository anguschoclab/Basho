// ProgressionTracker.tsx — Ozeki Run, Yokozuna Deliberation, Kadoban Drama narratives
// Shows multi-season progression arcs for the player's rikishi

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Crown, ShieldAlert, TrendingUp, AlertTriangle } from "lucide-react";
import { RikishiName } from "@/components/ClickableName";
import type { UIRikishi } from "@/presenters/uiModels";
import React from "react";
import { OzekiRunCandidate, RANK_HIERARCHY, YokozunaCandidate } from "@/presenters/uiDigest";
import type { Rank } from "@/engine/types/banzuke";

const YokozunaRow = React.memo(
  ({
    rikishiId,
    shikona,
    isStrong,
    isPlayer,
    narrative,
    consecutiveYushos,
    recentYushos,
  }: {
    rikishiId: string;
    shikona: string;
    isStrong?: boolean;
    isPlayer: boolean;
    narrative: string;
    consecutiveYushos: number;
    recentYushos: number;
  }) => {
    return (
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold">
              <RikishiName id={rikishiId} name={shikona} />
            </span>
            {isStrong && (
              <Badge className="bg-amber-500/20 text-amber-500 text-xs">Strong Candidate</Badge>
            )}
            {isPlayer && <Badge className="bg-primary/20 text-primary text-xs">YOUR</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{narrative}</p>
          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
            <span>Yūshō: {consecutiveYushos}</span>
            <span>Recent yūshō: {recentYushos}</span>
          </div>
        </div>
      </div>
    );
  }
);

const OzekiRow = React.memo(
  ({
    rikishiId,
    shikona,
    rank,
    isPlayer,
    narrative,
    progress,
    recentWins,
    threshold,
  }: {
    rikishiId: string;
    shikona: string;
    rank: string;
    isPlayer: boolean;
    narrative: string;
    progress: number;
    recentWins: number;
    threshold: number;
  }) => {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold">
            <RikishiName id={rikishiId} name={shikona} />
          </span>
          <Badge variant="outline" className="capitalize text-xs">
            {RANK_HIERARCHY[rank as Rank]?.nameJa ?? rank}
          </Badge>
          {isPlayer && <Badge className="bg-primary/20 text-primary text-xs">YOUR</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{narrative}</p>
        <div className="flex items-center gap-3">
          <Progress value={progress} className="flex-1 h-2" />
          <span className="text-xs font-mono text-muted-foreground">
            {recentWins}/{threshold}
          </span>
        </div>
      </div>
    );
  }
);

const KadobanRow = React.memo(
  ({
    rikishiId,
    shikona,
    isDemoted,
    isPlayer,
    narrative,
  }: {
    rikishiId: string;
    shikona: string;
    isDemoted: boolean;
    isPlayer: boolean;
    narrative: string;
  }) => {
    return (
      <div className="flex items-start gap-3">
        <AlertTriangle
          className={`h-4 w-4 mt-0.5 shrink-0 ${isDemoted ? "text-destructive" : "text-amber-500"}`}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold">
              <RikishiName id={rikishiId} name={shikona} />
            </span>
            <Badge variant={isDemoted ? "destructive" : "outline"} className="text-xs">
              {isDemoted ? "DEMOTED" : "KADOBAN"}
            </Badge>
            {isPlayer && <Badge className="bg-primary/20 text-primary text-xs">YOUR</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{narrative}</p>
        </div>
      </div>
    );
  }
);

/** Defines the structure for progression tracker props. */
interface ProgressionTrackerProps {
  ozekiRuns: OzekiRunCandidate[];
  yokozunaCandidates: YokozunaCandidate[];
  kadobanDrama: Array<{ rikishi: UIRikishi; narrative: string; isDemoted: boolean }>;
  playerHeyaId: string;
}

/**
 * progression tracker.
 *  * @param { ozekiRuns, yokozunaCandidates, kadobanDrama, playerHeyaId } - The computed data from UIDigest.
 */
export function ProgressionTracker({
  ozekiRuns,
  yokozunaCandidates,
  kadobanDrama,
  playerHeyaId,
}: ProgressionTrackerProps) {
  const hasContent =
    ozekiRuns.length > 0 || yokozunaCandidates.length > 0 || kadobanDrama.length > 0;
  if (!hasContent) return null;

  return (
    <div className="space-y-4">
      {/* Yokozuna Deliberation */}
      {yokozunaCandidates.length > 0 && (
        <Card className="border-gold/30 bg-gold/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="h-5 w-5 text-gold" />
              横綱審議委員会 Yokozuna Deliberation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(() => {
              const limit = yokozunaCandidates.length;
              const nodes = new Array(limit);
              for (let i = 0; i < limit; i++) {
                const c = yokozunaCandidates[i];
                nodes[i] = (
                  <YokozunaRow
                    key={c.rikishi.id}
                    rikishiId={c.rikishi.id}
                    shikona={c.rikishi.shikona}
                    isStrong={c.isStrong}
                    isPlayer={c.rikishi.heyaId === playerHeyaId}
                    narrative={c.narrative}
                    consecutiveYushos={c.consecutiveYushos}
                    recentYushos={c.recentYushos}
                  />
                );
              }
              return nodes;
            })()}
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
            {(() => {
              const limit = ozekiRuns.length;
              const nodes = new Array(limit);
              for (let i = 0; i < limit; i++) {
                const c = ozekiRuns[i];
                nodes[i] = (
                  <OzekiRow
                    key={c.rikishi.id}
                    rikishiId={c.rikishi.id}
                    shikona={c.rikishi.shikona}
                    rank={c.rikishi.rank}
                    isPlayer={c.rikishi.heyaId === playerHeyaId}
                    narrative={c.narrative}
                    progress={c.progress}
                    recentWins={c.recentWins}
                    threshold={c.threshold}
                  />
                );
              }
              return nodes;
            })()}
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
            {(() => {
              const limit = kadobanDrama.length;
              const nodes = new Array(limit);
              for (let i = 0; i < limit; i++) {
                const entry = kadobanDrama[i];
                nodes[i] = (
                  <KadobanRow
                    key={entry.rikishi.id}
                    rikishiId={entry.rikishi.id}
                    shikona={entry.rikishi.shikona}
                    isDemoted={entry.isDemoted}
                    isPlayer={entry.rikishi.heyaId === playerHeyaId}
                    narrative={entry.narrative}
                  />
                );
              }
              return nodes;
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
