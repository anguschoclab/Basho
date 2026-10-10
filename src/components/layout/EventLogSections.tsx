/**
 * EventLogSections.tsx
 *
 * Event log panel sections — filter header, grouped event list, and the
 * per-event row (icon, mention text, importance/status badges).
 */

import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { EngineEvent } from "@/engine/types/events";
import { formatEventTime } from "@/presenters/uiDigest";
import { getCategoryMeta } from "./eventLogHelpers";
import { MentionText } from "../MentionText";
import { activationKeyHandler } from "@/lib/a11y";

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "basho", label: "Basho" },
  { value: "match", label: "Match" },
  { value: "training", label: "Training" },
  { value: "injury", label: "Injury" },
  { value: "economy", label: "Economy" },
  { value: "career", label: "Career" },
];

/** Header — "Messages" title + category filter pills. */
export function EventLogHeader({
  filter,
  onFilterChange,
}: {
  filter: string;
  onFilterChange: (value: string) => void;
}) {
  return (
    <div className="p-3 border-b border-border shrink-0">
      <h2 className="font-display font-semibold text-sm">Messages</h2>
      <div className="flex gap-1 mt-2 flex-wrap">
        {FILTER_OPTIONS.map((f) => (
          <Button
            variant={filter === f.value ? "default" : "secondary"}
            size="sm"
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            aria-pressed={filter === f.value}
            aria-label={`Filter by ${f.label}`}
            className={`h-auto px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${filter === f.value ? "" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            {f.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** Single event row — category icon, title/summary, status badges. */
function EventRow({
  event: e,
  isPlayerRelevant,
  onClick,
}: {
  event: EngineEvent;
  isPlayerRelevant: boolean;
  onClick: (event: EngineEvent) => void;
}) {
  const meta = getCategoryMeta(e.category);
  const Icon = meta.icon;

  return (
    <div
      onClick={() => onClick(e)}
      onKeyDown={activationKeyHandler(() => onClick(e))}
      role="button"
      aria-label={e.title}
      tabIndex={0}
      className={cn(
        "w-full text-left p-2.5 rounded-md transition-all mb-1 cursor-pointer border border-transparent hover:border-border",
        "hover:bg-card/50 active:bg-card group relative",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        isPlayerRelevant ? "border-l-primary/50 bg-primary/5" : ""
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 shrink-0 p-1.5 rounded-lg bg-card",
            meta.color.replace("text-", "text-opacity-80 ")
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="text-xs font-bold text-muted-foreground group-hover:text-white transition-colors truncate">
              <MentionText text={e.title} />
            </span>
            <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
              {formatEventTime(e)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
            <MentionText text={e.summary} />
          </p>

          {/* Status Badges */}
          <div className="flex items-center gap-1.5 mt-2">
            {e.importance !== "minor" && (
              <div
                className={cn(
                  "w-1 h-1 rounded-full",
                  e.importance === "headline" ? "bg-destructive" : "bg-warning"
                )}
              />
            )}
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              {meta.label}
            </span>
            {isPlayerRelevant && (
              <span className="text-[10px] uppercase font-bold text-primary/70 tracking-wider ml-auto">
                Stable
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export interface EventGroup {
  label: string;
  events: EngineEvent[];
}

/** Scrollable event list grouped by basho/week label. */
export function EventLogList({
  grouped,
  playerHeyaId,
  onEventClick,
}: {
  grouped: EventGroup[];
  playerHeyaId?: string;
  onEventClick: (event: EngineEvent) => void;
}) {
  return (
    <ScrollArea className="flex-1">
      <div className="p-1">
        {grouped.length === 0 && (
          <EmptyState title="No events yet." description="Advance time to see updates." compact />
        )}

        {grouped.map((group, gi) => (
          <div key={gi}>
            <div className="sticky top-0 z-10 px-2 py-1 bg-card/90">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {group.label}
              </span>
            </div>

            {group.events.map((e) => (
              <EventRow
                key={e.id}
                event={e}
                isPlayerRelevant={e.heyaId === playerHeyaId}
                onClick={onEventClick}
              />
            ))}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
