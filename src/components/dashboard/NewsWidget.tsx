import React, { useMemo } from "react";
import { useGame } from "@/contexts/useGame";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BaseWidget } from "./BaseWidget";
import { EmptyState } from "@/components/ui/EmptyState";
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
  media_sports: "text-west",
  media_tabloid: "text-gold",
};

/** Resolves display icon + color for an event category, with media-outlet overrides. */
function resolveCategoryMeta(
  category: string,
  outlet: string | undefined
): { Icon: LucideIcon; color: string; titleClass: string } {
  let Icon = CAT_ICON[category] || Newspaper;
  let color = CAT_COLOR[category] || "text-muted-foreground";

  // Special handling for media outlets
  if (category === "media" && outlet === "TABLOID") {
    color = "text-gold font-bold";
  } else if (category === "media" && outlet === "SPORTS_DAILY") {
    color = "text-west font-semibold";
  } else if (category === "media" && outlet === "JSA_OFFICIAL") {
    color = "text-foreground font-mono uppercase border-b border-foreground/20";
    Icon = Scale;
  }

  return {
    Icon,
    color,
    titleClass: category === "media" && outlet === "TABLOID" ? "text-gold" : "",
  };
}

const NewsEventRow = React.memo(
  ({
    category,
    title,
    summary,
    week,
    outlet,
    isPlayer,
  }: {
    category: string;
    title: string;
    summary: string;
    week: number;
    outlet?: string;
    isPlayer: boolean;
  }) => {
    const { Icon, color, titleClass } = resolveCategoryMeta(category, outlet);
    return (
      <div
        className={`flex items-start gap-2 py-1.5 px-2 rounded-md text-xs transition-colors hover:bg-muted/50 ${
          isPlayer ? "border-l-2 border-l-primary bg-primary/5" : ""
        }`}
      >
        <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${color}`} />
        <div className="flex-1 min-w-0">
          <div className={`font-medium truncate ${titleClass}`}>{title}</div>
          <div className="text-[11px] text-muted-foreground truncate">{summary}</div>
        </div>
        <span className="text-[10px] text-muted-foreground/60 shrink-0 tabular-nums">W{week}</span>
      </div>
    );
  }
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
  }, [world?.events?.log]);

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
          <EmptyState
            icon={Newspaper}
            title="No events yet."
            description="Advance time to see updates."
            compact
          />
        ) : (
          <div className="space-y-0.5 pr-3">
            {recentEvents.map((e) => (
              <NewsEventRow
                key={e.id}
                category={e.category}
                title={e.title}
                summary={e.summary}
                week={e.week}
                outlet={(e.data as { outlet?: string })?.outlet}
                isPlayer={e.heyaId === world?.playerHeyaId}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </BaseWidget>
  );
}
