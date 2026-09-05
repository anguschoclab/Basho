/**
 * NakabiHighlightCard — prominent day-8 checkpoint display.
 *
 * Shows the basho leader, undefeated count, and notable performers
 * at the halfway point of a honbasho.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flag, TrendingUp } from "lucide-react";
import type { NakabiProjection } from "@/presenters/nakabiProjections";

export function NakabiHighlightCard({ projection }: { projection: NakabiProjection }) {
  const { summary, isNakabiDay } = projection;

  if (!summary) {
    if (!isNakabiDay) return null;
    return (
      <Card className="border-primary/30" data-testid="nakabi-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Nakabi (Day 8)</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Checkpoint summary not yet available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30" data-testid="nakabi-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            Nakabi — {summary.bashoName} {summary.year}
          </span>
          <Badge variant="outline" className="ml-auto text-[9px]">Day 8</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded bg-muted/20">
            <div className="text-muted-foreground">Leader</div>
            <div className="text-sm font-medium">
              {summary.leaderId ? summary.leaderId : "—"}
            </div>
            <div className="text-xs tabular-nums text-muted-foreground">
              {summary.leaderWins}-{summary.leaderLosses}
            </div>
          </div>
          <div className="p-2 rounded bg-muted/20">
            <div className="text-muted-foreground">Undefeated</div>
            <div className="text-sm font-medium tabular-nums">
              {summary.undefeatedCount}
            </div>
          </div>
        </div>

        {summary.notablePerformers.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-widest">
              <TrendingUp className="h-3 w-3" />
              Notable Performers
            </div>
            {summary.notablePerformers.map((p) => (
              <div
                key={p.rikishiId}
                className="flex items-center justify-between p-2 rounded border border-border/50 text-xs"
                data-testid={`nakabi-performer-${p.rikishiId}`}
              >
                <div>
                  <span className="font-medium">{p.shikona}</span>
                  <span className="text-muted-foreground ml-2 tabular-nums">
                    {p.wins}-{p.losses}
                  </span>
                </div>
                <span className="text-muted-foreground text-[10px]">{p.note}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
