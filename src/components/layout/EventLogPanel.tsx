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
    const groups: EventGroup[] = [];
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
