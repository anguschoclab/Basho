import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { RikishiName, StableName } from "@/components/ClickableName";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import type { EngineEvent } from "@/engine/types/events";
import { formatEventTime } from "@/presenters/uiDigest";
import { getCategoryMeta, getEventRoute, getLinkLabel } from "./eventLogHelpers";

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
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /** Render inline clickable entity tags for rikishi/stable referenced by an event */
  const renderEntityTags = useCallback(
    (e: EngineEvent) => {
      if (!eventLogData) return null;
      const tags: React.ReactNode[] = [];
      const seen = new Set<string>();

      const addRikishi = (id: string) => {
        if (seen.has(id)) return;
        seen.add(id);
        const r = eventLogData.getRikishi(id);
        if (r)
          tags.push(
            <RikishiName
              key={`r-${r.id}`}
              id={r.id}
              name={r.shikona || r.id}
              className="text-[11px] font-medium"
            />
          );
      };

      if (e.rikishiId) addRikishi(e.rikishiId);

      // Bout events: show winner & loser as clickable names with "vs" separator
      if ((e.category === "match" || e.category === "basho") && e.data) {
        const winnerId = e.data.winnerId as string | undefined;
        const loserId = e.data.loserId as string | undefined;
        if (winnerId && loserId) {
          // Clear primary tag, show bout-specific layout instead
          tags.length = 0;
          seen.clear();
          const winner = eventLogData.getRikishi(winnerId);
          const loser = eventLogData.getRikishi(loserId);
          if (winner && loser) {
            tags.push(
              <span key="bout-pair" className="inline-flex items-center gap-1 text-[11px]">
                <RikishiName
                  id={winner.id}
                  name={winner.shikona || winner.id}
                  className="text-[11px] font-medium text-primary"
                />
                <span className="text-muted-foreground">def.</span>
                <RikishiName
                  id={loser.id}
                  name={loser.shikona || loser.id}
                  className="text-[11px] font-medium"
                />
                {winnerId === loserId && (
                  <span className="text-[10px] font-bold text-destructive">Fusen</span>
                )}
              </span>
            );
            // Mark both as seen so they're not duplicated
            seen.add(winnerId);
          }
        }
      }

      if (e.heyaId) {
        const h = eventLogData.getHeya(e.heyaId);
        if (h)
          tags.push(
            <StableName
              key={`h-${h.id}`}
              id={h.id}
              name={h.name}
              className="text-[11px] font-medium"
            />
          );
      }
      if (tags.length === 0) return null;
      return <span className="inline-flex items-center gap-1.5 flex-wrap">{tags}</span>;
    },
    [eventLogData]
  );
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

  const handleEventClick = useCallback(
    (e: EngineEvent) => {
      const route = getEventRoute(e);
      if (route) {
        navigate({ to: route });
      }
    },
    [navigate]
  );

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
            <p className="text-xs text-muted-foreground p-3 text-center italic">
              No events yet. Advance time to see updates.
            </p>
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
                const isExpanded = expandedId === e.id;
                const isPlayerRelevant = e.heyaId === eventLogData?.playerHeyaId;
                const route = getEventRoute(e);
                const hasLink = !!route;

                return (
                  <div
                    key={e.id}
                    className={`w-full text-left p-2 rounded-md transition-colors mb-0.5 group ${
                      isExpanded ? "bg-muted" : "hover:bg-muted/50"
                    } ${isPlayerRelevant ? "border-l-2 border-l-primary" : ""}`}
                  >
                    <Button
                      variant="ghost"
                      onClick={() => setExpandedId(isExpanded ? null : e.id)}
                      className="w-full h-auto p-0 justify-start whitespace-normal hover:bg-transparent text-left rounded-sm"
                      aria-expanded={isExpanded}
                      aria-controls={`event-details-${e.id}`}
                    >
                      <div className="flex items-start gap-2 text-left">
                        <div className={`mt-0.5 shrink-0 ${meta.color}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-medium truncate text-foreground">
                              {e.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0 font-normal">
                              {formatEventTime(e)}
                            </span>
                          </div>
                          {!isExpanded && (
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5 font-normal">
                              {e.summary}
                            </p>
                          )}
                          {!isExpanded && renderEntityTags(e)}
                        </div>
                      </div>
                    </Button>

                    {isExpanded && (
                      <div id={`event-details-${e.id}`} className="mt-1 ml-6 space-y-1.5">
                        <p className="text-[11px] text-muted-foreground">{e.summary}</p>
                        {renderEntityTags(e)}
                        <div className="flex items-center gap-1 flex-wrap">
                          <Badge variant="outline" className="text-[9px] h-4">
                            {meta.label}
                          </Badge>
                          {e.importance !== "minor" && (
                            <Badge
                              variant={e.importance === "headline" ? "default" : "secondary"}
                              className="text-[9px] h-4"
                            >
                              {e.importance}
                            </Badge>
                          )}
                          {isPlayerRelevant && (
                            <Badge className="text-[9px] h-4 bg-primary/20 text-primary">
                              Your stable
                            </Badge>
                          )}
                        </div>

                        {/* Clickable navigation link */}
                        {hasLink && (
                          <Button
                            variant="link"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              handleEventClick(e);
                            }}
                            className="h-auto p-0 inline-flex items-center gap-1 text-[10px] text-primary hover:underline underline-offset-2 transition-colors mt-0.5 rounded-sm"
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                            {getLinkLabel(e)}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
