import { useMemo } from "react";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Newspaper, Trophy, Swords, HeartPulse, GraduationCap, Coins, Star,
  Search, MessageCircle, AlertTriangle, Scale,
} from "lucide-react";
import type { EngineEvent } from "@/engine/types";

const CAT_ICON: Record<string, any> = {
  match: Swords, basho: Trophy, training: GraduationCap,
  injury: HeartPulse, economy: Coins, sponsor: Coins,
  promotion: Star, rivalry: Swords, career: Star,
  welfare: AlertTriangle, scouting: Search, media: MessageCircle,
  milestone: Star, discipline: Scale, misc: Newspaper,
};

const CAT_COLOR: Record<string, string> = {
  match: "text-primary", basho: "text-gold", training: "text-success",
  injury: "text-destructive", economy: "text-warning", promotion: "text-primary",
  rivalry: "text-accent", milestone: "text-gold", welfare: "text-warning",
};

/** news widget. */
export function NewsWidget() {
  const { state } = useGame();
  const world = state.world;

  const recentEvents = useMemo(() => {
    if (!world?.events?.log) return [];
    const all = [...world.events.log];
    all.reverse();
    return all.slice(0, 15);
  }, [world?.events?.log?.length]);

  return (
    <div className="widget-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Newspaper className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">News & Events</span>
        {recentEvents.length > 0 && (
          <Badge variant="secondary" className="text-[10px] ml-auto">{recentEvents.length}</Badge>
        )}
      </div>

      <ScrollArea className="h-[260px]">
        {recentEvents.length === 0 ? (
          <div className="text-center py-8">
            <Newspaper className="h-6 w-6 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground italic">
              No events yet. Advance time to see updates.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 pr-2">
            {recentEvents.map((e) => {
              const Icon = CAT_ICON[e.category] || Newspaper;
              const color = CAT_COLOR[e.category] || "text-muted-foreground";
              const isPlayer = e.heyaId === world?.playerHeyaId;

              return (
                <div
                  key={e.id}
                  className={`flex items-start gap-2 py-1.5 px-2 rounded-md text-xs transition-colors hover:bg-muted/50 ${
                    isPlayer ? "border-l-2 border-l-primary bg-primary/5" : ""
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{e.title}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{e.summary}</div>
                  </div>
                  <span className="text-[10px] text-muted-foreground/60 shrink-0 tabular-nums">
                    W{e.week}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
