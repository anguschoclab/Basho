/**
 * EventFeed.tsx
 * ============
 * Real-time event feed for dashboard showing Global Cup and other game events.
 */

import React, { useMemo } from "react";
import {
  Trophy,
  Bell,
  TrendingUp,
  AlertTriangle,
  Info,
  ShieldAlert,
  Zap,
  Target,
  CheckCircle2,
} from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { BaseWidget } from "./BaseWidget";
import { EmptyState } from "@/components/ui/EmptyState";
import type { EngineEvent, EventImportance } from "@/engine/types/events";
import { MentionText } from "@/components/MentionText";

interface EventFeedProps {
  maxEvents?: number;
  filterTypes?: string[];
  minImportance?: EventImportance;
}

const importanceStyles: Record<EventImportance, string> = {
  minor: "opacity-60",
  notable: "bg-slate-800/20",
  major: "border-l-2 border-amber-500 pl-2 bg-amber-500/5",
  headline: "border-l-2 border-rose-500 pl-2 bg-rose-950/20",
};

const typeIcons: Record<string, React.ReactNode> = {
  GLOBAL_CUP: <Trophy className="w-4 h-4 text-gold" />,
  BASHO_STATUS: <TrendingUp className="w-4 h-4 text-primary" />,
  FINANCIAL_ALERT: <AlertTriangle className="w-4 h-4 text-destructive" />,
  NPC_MANAGER_DECISION: <Target className="w-4 h-4 text-indigo-400" />,
  GOVERNANCE_RULING: <ShieldAlert className="w-4 h-4 text-amber-500" />,
  RIVALRY_HEAT_SPIKE: <Zap className="w-4 h-4 text-orange-500" />,
  STRATEGY_SHIFT: <TrendingUp className="w-4 h-4 text-emerald-400" />,
  DECISION_RESOLVED: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  DECISION_AUTO_RESOLVED: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  default: <Info className="w-4 h-4 text-muted-foreground" />,
};

function formatEventTime(event: EngineEvent): string {
  return `Year ${event.year}, Week ${event.week}`;
}

const EventFeedItem = React.memo(
  ({ event }: { event: EngineEvent }) => {
    const Icon = typeIcons[event.type] || typeIcons.default;
    const importanceClass = importanceStyles[event.importance] || importanceStyles.notable;

    return (
      <div
        className={`flex gap-3 p-2 rounded hover:bg-slate-800/50 transition-colors ${importanceClass}`}
      >
        <div className="mt-0.5 flex-shrink-0">{Icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200 truncate">{event.title}</p>
          <MentionText text={event.summary} className="text-xs text-slate-400 line-clamp-2" />
          <p className="text-xs text-slate-500 mt-1">{formatEventTime(event)}</p>
        </div>
      </div>
    );
  },
  (prev, next) => prev.event.id === next.event.id
);

export function EventFeed({ maxEvents = 10, filterTypes, minImportance }: EventFeedProps) {
  const workerWorld = useGameStore((s) => s.workerWorld);

  const events = useMemo(() => {
    const allEvents = workerWorld?.events?.log || [];
    const filterSet = filterTypes ? new Set(filterTypes) : null;
    let filtered = filterSet
      ? allEvents.filter((e: EngineEvent) => filterSet.has(e.type))
      : allEvents;

    if (minImportance) {
      const impMap: Record<EventImportance, number> = {
        minor: 0,
        notable: 1,
        major: 2,
        headline: 3,
      };
      const minVal = impMap[minImportance];
      filtered = filtered.filter((e: EngineEvent) => impMap[e.importance || "minor"] >= minVal);
    }

    // Sort by most recent first
    filtered = [...filtered].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      if (a.week !== b.week) return b.week - a.week;
      return 0;
    });

    return filtered.slice(0, maxEvents);
  }, [workerWorld?.events?.log, maxEvents, filterTypes, minImportance]);

  return (
    <BaseWidget title="Event Feed" icon={Bell}>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {events.length === 0 ? (
          <EmptyState icon={Bell} title="No recent events" compact />
        ) : (
          events.map((event: EngineEvent) => <EventFeedItem key={event.id} event={event} />)
        )}
      </div>
    </BaseWidget>
  );
}

export function GlobalCupEventFeed() {
  return <EventFeed filterTypes={["GLOBAL_CUP"]} maxEvents={5} />;
}
