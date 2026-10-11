import { useState, useMemo, useCallback } from "react";
import type { EngineEvent } from "@/engine/types/events";
import { EventDetailDialog } from "../EventDetailDialog";
import { EventLogHeader, EventLogList, type EventGroup } from "./EventLogSections";

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

  const grouped = useMemo(() => {
    const groups: EventGroup[] = [];
    if (!eventLogData?.events) return groups;
    let currentLabel = "";
    const allEvents = eventLogData.events;
    let count = 0;

    // The event log is append-only and chronologically ordered.
    // We iterate backwards to collect the most recent matches without O(N) filter/sort/reverse.
    for (let i = allEvents.length - 1; i >= 0; i--) {
      const e = allEvents[i];
      if (filter !== "all" && e.category !== filter) {
        continue;
      }
      count++;
      if (count > 100) break;

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
  }, [eventLogData?.events, filter]);

  const handleEventClick = useCallback((e: EngineEvent) => {
    setSelectedEvent(e);
  }, []);

  return (
    <aside className={`flex flex-col border-r border-border bg-card/50 ${className}`}>
      <EventLogHeader filter={filter} onFilterChange={setFilter} />

      <EventLogList
        grouped={grouped}
        playerHeyaId={eventLogData?.playerHeyaId}
        onEventClick={handleEventClick}
      />

      <EventDetailDialog
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </aside>
  );
}
