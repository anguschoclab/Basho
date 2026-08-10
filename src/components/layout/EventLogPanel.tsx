import { useState, useMemo, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { EngineEvent } from "@/engine/types/events";
import { formatEventTime } from "@/presenters/uiDigest";
import { getCategoryMeta } from "./eventLogHelpers";
import { MentionText } from "../MentionText";
import { EventDetailDialog } from "../EventDetailDialog";

/** Defines the structure for event log panel props. */
interface EventLogPanelProps {
  eventLogData: {
    events: EngineEvent[];
    getRikishi: (id: string) => { id: string; shikona: string } | null;
    getHeya: (id: string) => { id: string; name: string } | undefined;
    playerHeyaId?: string;
  } | null;
  className?: string;
}

/**
 * event log panel.
 *  * @param { eventLogData, className } - The component props.
 */
export function EventLogPanel({ eventLogData, className }: EventLogPanelProps) {
  const [filter, setFilter] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<EngineEvent | null>(null);

  const events = useMemo(() => {
    if (!eventLogData?.events) return [];
    const all = [...eventLogData.events];
    all.reverse();
    return all.slice(0, 100);
  }, [eventLogData?.events]);

  const filteredEvents = useMemo(() => {
    if (filter === "all") return events;
    return events.filter((e) => e.category === filter);
  }, [events, filter]);

  const grouped = useMemo(() => {
    const groups: { label: string; events: EngineEvent[] }[] = [];
    let currentLabel = "";

    for (const e of filteredEvents) {
      const label =
        e.bashoNumber !== undefined
          ? `Basho ${e.bashoNumber} · Year ${e.year}`
          : `Week ${e.week} · Year ${e.year}`;

      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, events: [e] });
      } else {
        groups[groups.length - 1].events.push(e);
      }
    }
    return groups;
  }, [filteredEvents]);

  const handleEventClick = useCallback((e: EngineEvent) => {
    setSelectedEvent(e);
  }, []);

  const filterOptions = [
    { value: "all", label: "All" },
    { value: "basho", label: "Basho" },
    { value: "match", label: "Match" },
    { value: "training", label: "Training" },
    { value: "injury", label: "Injury" },
    { value: "economy", label: "Economy" },
    { value: "career", label: "Career" },
  ];

  return (
    <aside className={`flex flex-col border-r border-border bg-card/50 ${className}`}>
      {/* Header */}
      <div className="p-3 border-b border-border shrink-0">
        <h2 className="font-display font-semibold text-sm">Messages</h2>
        <div className="flex gap-1 mt-2 flex-wrap">
          {filterOptions.map((f) => (
            <Button
              variant={filter === f.value ? "default" : "secondary"}
              size="sm"
              key={f.value}
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              aria-label={`Filter by ${f.label}`}
              className={`h-auto px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${filter === f.value ? "" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Events list */}
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

              {group.events.map((e) => {
                const meta = getCategoryMeta(e.category);
                const Icon = meta.icon;
                const isPlayerRelevant = e.heyaId === eventLogData?.playerHeyaId;
                return (
                  <div
                    key={e.id}
                    onClick={() => handleEventClick(e)}
                    onKeyDown={(evt) => {
                      if (evt.key === "Enter" || evt.key === " ") {
                        evt.preventDefault();
                        handleEventClick(e);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "w-full text-left p-2.5 rounded-md transition-all mb-1 cursor-pointer border border-transparent hover:border-zinc-800",
                      "hover:bg-zinc-900/50 active:bg-zinc-900 group relative",
                      "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                      isPlayerRelevant ? "border-l-primary/50 bg-primary/5" : ""
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-0.5 shrink-0 p-1.5 rounded-lg bg-zinc-900",
                          meta.color.replace("text-", "text-opacity-80 ")
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-xs font-bold text-zinc-100 group-hover:text-white transition-colors truncate">
                            <MentionText text={e.title} />
                          </span>
                          <span className="text-[10px] text-zinc-500 shrink-0 font-medium">
                            {formatEventTime(e)}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">
                          <MentionText text={e.summary} />
                        </p>

                        {/* Status Badges */}
                        <div className="flex items-center gap-1.5 mt-2">
                          {e.importance !== "minor" && (
                            <div
                              className={cn(
                                "w-1 h-1 rounded-full",
                                e.importance === "headline" ? "bg-red-500" : "bg-orange-500"
                              )}
                            />
                          )}
                          <span className="text-[9px] uppercase font-bold text-zinc-600 tracking-wider">
                            {meta.label}
                          </span>
                          {isPlayerRelevant && (
                            <span className="text-[9px] uppercase font-bold text-primary/70 tracking-wider ml-auto">
                              Stable
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>

      <EventDetailDialog
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </aside>
  );
}
