import React, { useMemo } from "react";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BaseWidget } from "./BaseWidget";
import {
  Newspaper,
  Trophy,
  Swords,
  HeartPulse,
  GraduationCap,
  Coins,
  Star,
  Search,
  MessageCircle,
  AlertTriangle,
  Scale,
} from "lucide-react";
import type { EngineEvent } from "@/engine/types/events";
import type { LucideIcon } from "lucide-react";

const CAT_ICON: Record<string, LucideIcon> = {
  match: Swords,
  basho: Trophy,
  training: GraduationCap,
  injury: HeartPulse,
  economy: Coins,
  sponsor: Coins,
  promotion: Star,
  rivalry: Swords,
  career: Star,
  welfare: AlertTriangle,
  scouting: Search,
  media: MessageCircle,
  milestone: Star,
  discipline: Scale,
  misc: Newspaper,
};

const CAT_COLOR: Record<string, string> = {
  match: "text-primary",
  basho: "text-gold",
  training: "text-success",
  promotion: "text-primary",
  rivalry: "text-accent",
  milestone: "text-gold",
  welfare: "text-warning",
  media_jsa: "text-foreground",
  media_sports: "text-blue-500",
  media_tabloid: "text-yellow-500",
};

const NewsEventRow = React.memo(
  ({ e, isPlayer }: { e: EngineEvent; isPlayer: boolean }) => {
    let Icon = CAT_ICON[e.category] || Newspaper;
    let color = CAT_COLOR[e.category] || "text-muted-foreground";

    // Special handling for media outlets
    if (e.category === "media" && (e.data as any)?.outlet) {
      const outlet = (e.data as any).outlet;
      if (outlet === "TABLOID") {
        color = "text-yellow-500 font-bold";
      } else if (outlet === "SPORTS_DAILY") {
        color = "text-blue-500 font-semibold";
      } else if (outlet === "JSA_OFFICIAL") {
        color =
          "text-foreground font-mono uppercase border-b border-foreground/20";
        Icon = Scale;
      }

      return (
        <div
          className={`flex items-start gap-2 py-1.5 px-2 rounded-md text-xs transition-colors hover:bg-muted/50 ${
            isPlayer ? "border-l-2 border-l-primary bg-primary/5" : ""
          }`}
        >
          <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${color}`} />
          <div className="flex-1 min-w-0">
            <div
              className={`font-medium truncate ${e.category === "media" && (e.data as any)?.outlet === "TABLOID" ? "text-yellow-600" : ""}`}
            >
              {e.title}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {e.summary}
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground/60 shrink-0 tabular-nums">
            W{e.week}
          </span>
        </div>
      );
    }
    return (
      <div className="flex">
        <span>News</span>
      </div>
    );
  },
);

/** news widget. */
export function NewsWidget() {
  const { state } = useGame();
  const world = state.world;

  const recentEvents = useMemo(() => {
    if (!world?.events?.log) return [];
    const log = world.events.log;
    const len = log.length;
    const result = [];
    for (let i = Math.max(0, len - 15); i < len; i++) {
      result.unshift(log[i]);
    }
    return result;
  }, [world?.events?.log?.length]);

  return (
    <BaseWidget
      title="News & Events"
      icon={Newspaper}
      headerContent={
        recentEvents.length > 0 && (
          <Badge variant="secondary" className="text-[10px] ml-auto">
            {recentEvents.length}
          </Badge>
        )
      }
    >
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
            {recentEvents.map((e) => (
              <NewsEventRow
                key={e.id}
                e={e}
                isPlayer={e.heyaId === world?.playerHeyaId}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </BaseWidget>
  );
}
