import { useState, useMemo, useCallback } from "react";
import type { EngineEvent } from "@/engine/types/events";
import { scanRecentEvents } from "@/presenters/selectors";
import { useEventReadStore } from "@/store/eventReadStore";
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
  const readIds = useEventReadStore((s) => s.readIds);
  const markRead = useEventReadStore((s) => s.markRead);
  const markAllRead = useEventReadStore((s) => s.markAllRead);

  const filteredEvents = useMemo(
    () =>
      scanRecentEvents(eventLogData?.events, {
        category: filter === "all" ? undefined : (filter as EngineEvent["category"]),
        limit: 100,
      }),
    [eventLogData?.events, filter]
  );

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

  const handleEventClick = useCallback(
    (e: EngineEvent) => {
      markRead(e.id);
      setSelectedEvent(e);
    },
    [markRead]
  );

  const unreadCount = useMemo(
    () => filteredEvents.reduce((n, e) => (readIds.has(e.id) ? n : n + 1), 0),
    [filteredEvents, readIds]
  );

  const handleMarkAllRead = useCallback(() => {
    markAllRead(filteredEvents.map((e) => e.id));
  }, [markAllRead, filteredEvents]);

  const isUnread = useCallback((id: string) => !readIds.has(id), [readIds]);

  return (
    <aside className={`flex flex-col border-r border-border bg-card/50 ${className}`}>
      <EventLogHeader
        filter={filter}
        onFilterChange={setFilter}
        unreadCount={unreadCount}
        onMarkAllRead={handleMarkAllRead}
      />

      <EventLogList
        grouped={grouped}
        playerHeyaId={eventLogData?.playerHeyaId}
        isUnread={isUnread}
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
