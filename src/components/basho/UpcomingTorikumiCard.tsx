/**
 * UpcomingTorikumiCard.tsx
 *
 * §3 JSA rolling torikumi preview card on BashoPage:
 * Shows the already-announced next-day pairings ( prioritizing player-stable
 * bouts), or the Day 14 hold notice explaining that Senshuraku (Day 15)
 * pairings await Day 14 results.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock } from "lucide-react";
import type { BoutMatchUI } from "@/presenters/uiDigestTypes";

export function UpcomingTorikumiCard({
  day,
  postedThroughDay,
  upcomingMatches,
}: {
  day: number;
  postedThroughDay?: number;
  upcomingMatches: BoutMatchUI[];
}) {
  if (day >= 15) return null;

  const isSenshurakuHeld = day === 14 && upcomingMatches.length === 0;
  if (!isSenshurakuHeld && upcomingMatches.length === 0) return null;

  const playerUpcoming = upcomingMatches.filter((m) => m.isPlayerBout);
  const previewList = (playerUpcoming.length > 0 ? playerUpcoming : upcomingMatches).slice(0, 4);

  return (
    <Card className="border-border/60 bg-muted/20" data-testid="upcoming-torikumi-card">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5 text-primary" />
            <span>
              {isSenshurakuHeld
                ? "Senshuraku (Day 15) Torikumi Hold"
                : `Announced Day ${day + 1} Torikumi`}
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            {isSenshurakuHeld
              ? "Awaiting Day 14 Results"
              : `Posted through Day ${postedThroughDay ?? day + 1} · ${upcomingMatches.length} bouts`}
          </Badge>
        </div>

        {isSenshurakuHeld ? (
          <p className="text-xs text-muted-foreground">
            Per JSA shimpan protocol, Senshuraku pairings are held until Day 14 concludes so yūshō
            contenders and 7–7 kachi-koshi bouts can be paired directly.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {previewList.map((m) => (
              <span
                key={m.boutId}
                className={`text-xs px-2 py-0.5 rounded border ${
                  m.isPlayerBout
                    ? "border-primary/40 bg-primary/10 font-medium"
                    : "border-border/50 bg-background/60 text-muted-foreground"
                }`}
              >
                {m.eastRikishi.shikona} vs {m.westRikishi.shikona}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
