import { useState, useMemo, useCallback } from "react";
import { useGame } from "@/contexts/GameContext";
import { useNavigate } from "@tanstack/react-router";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { RikishiName, StableName } from "@/components/ClickableName";
import {
  Trophy,
  Swords,
  HeartPulse,
  Coins,
  GraduationCap,
  Scale,
  Star,
  AlertTriangle,
  MessageCircle,
  Search,
  ExternalLink,
  Wrench,
} from "lucide-react";
import type { EngineEvent } from "@/engine/types/events";
import type { WorldState } from "@/engine/types/world";

const CATEGORY_META: Record<string, { icon: any; color: string; label: string }> = {
  match: { icon: Swords, color: "text-primary", label: "Match" },
  basho: { icon: Trophy, color: "text-gold", label: "Basho" },
  training: { icon: GraduationCap, color: "text-success", label: "Training" },
  injury: { icon: HeartPulse, color: "text-destructive", label: "Injury" },
  economy: { icon: Coins, color: "text-warning", label: "Economy" },
  sponsor: { icon: Coins, color: "text-warning", label: "Sponsor" },
  promotion: { icon: Star, color: "text-primary", label: "Rank" },
  discipline: { icon: Scale, color: "text-muted-foreground", label: "Discipline" },
  rivalry: { icon: Swords, color: "text-accent", label: "Rivalry" },
  career: { icon: Star, color: "text-muted-foreground", label: "Career" },
  welfare: { icon: AlertTriangle, color: "text-warning", label: "Welfare" },
  scouting: { icon: Search, color: "text-primary", label: "Scouting" },
  media: { icon: MessageCircle, color: "text-muted-foreground", label: "Media" },
  milestone: { icon: Star, color: "text-gold", label: "Milestone" },
  facility: { icon: Wrench, color: "text-blue-400", label: "Facility" },
  misc: { icon: MessageCircle, color: "text-muted-foreground", label: "Misc" },
};

/**
 * Get category meta.
 *  * @param cat - The Cat.
 */
function getCategoryMeta(cat: string) {
  return CATEGORY_META[cat] || CATEGORY_META.misc;
}

/**
 * Format event time.
 *  * @param e - The E.
 *  * @returns The result.
 */
import { formatEventTime } from "@/engine/utils/formatters";


/**
 * Derive the best navigation route for an event based on its category, type, and entity references.
 */
function getEventRoute(e: EngineEvent): string | null {
  const cat = e.category;
  const type = e.type?.toLowerCase() ?? "";

  // Match/bout events → basho page
  if (cat === "match" || type.includes("bout") || type.includes("match")) {
    return "/basho";
  }

  // Basho-level events
  if (cat === "basho") {
    if (type.includes("recap") || type.includes("wrap") || type.includes("end")) return "/recap";
    return "/basho";
  }

  // Rikishi-specific events → rikishi profile
  if (e.rikishiId) {
    // Training, injury, career, promotion for a specific rikishi
    if (["training", "injury", "career", "promotion"].includes(cat)) {
      return `/rikishi/${e.rikishiId}`;
    }
  }

  // Scouting → talent pool
  if (cat === "scouting") return "/talent-pool";

  // Economy/sponsor → economy page
  if (cat === "economy" || cat === "sponsor") return "/economy";

  // Rivalry → rivalries page
  if (cat === "rivalry") return "/rivalries";

  // Discipline/governance → governance
  if (cat === "discipline") return "/governance";

  // Welfare → stable page (player's)
  if (cat === "welfare" && e.heyaId) return `/stable/${e.heyaId}`;

  // Media → almanac or stable
  if (cat === "media") {
    if (e.rikishiId) return `/rikishi/${e.rikishiId}`;
    if (e.heyaId) return `/stable/${e.heyaId}`;
  }

  // Milestone → rikishi or stable
  if (cat === "milestone") {
    if (e.rikishiId) return `/rikishi/${e.rikishiId}`;
    if (e.heyaId) return `/stable/${e.heyaId}`;
  }

  // Facility → stable
  if (cat === "facility" && e.heyaId) return `/stable/${e.heyaId}`;

  // Fallback: if we have a rikishi, link there; if heya, link there
  if (e.rikishiId) return `/rikishi/${e.rikishiId}`;
  if (e.heyaId) return `/stable/${e.heyaId}`;

  return null;
}

/** Defines the structure for event log panel props. */
interface EventLogPanelProps {
  className?: string;
}

/**
 * event log panel.
 *  * @param { className = "" } - The { class name = "" }.
 */
export function EventLogPanel({ className = "" }: EventLogPanelProps) {
  const { state } = useGame();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const world = state.world;

  /** Render inline clickable entity tags for rikishi/stable referenced by an event */
  const renderEntityTags = useCallback((e: EngineEvent) => {
    if (!world) return null;
    const tags: React.ReactNode[] = [];
    const seen = new Set<string>();

    const addRikishi = (id: string) => {
      if (seen.has(id)) return;
      seen.add(id);
      const r = world.rikishi.get(id);
      if (r) tags.push(<RikishiName key={`r-${r.id}`} id={r.id} name={r.shikona || r.id} className="text-[11px] font-medium" />);
    };

    // Primary entity
    if (e.rikishiId) addRikishi(e.rikishiId);

    // Bout events: show winner & loser as clickable names with "vs" separator
    if ((e.category === "match" || e.category === "basho") && e.data) {
      const winnerId = e.data.winnerId as string | undefined;
      const loserId = e.data.loserId as string | undefined;
      if (winnerId && loserId) {
        // Clear primary tag, show bout-specific layout instead
        tags.length = 0;
        seen.clear();
        const winner = world.rikishi.get(winnerId);
        const loser = world.rikishi.get(loserId);
        if (winner && loser) {
          tags.push(
            <span key="bout-pair" className="inline-flex items-center gap-1 text-[11px]">
              <RikishiName id={winner.id} name={winner.shikona || winner.id} className="text-[11px] font-medium text-primary" />
              <span className="text-muted-foreground">def.</span>
              <RikishiName id={loser.id} name={loser.shikona || loser.id} className="text-[11px] font-medium" />
              {e.data.kimarite && <span className="text-muted-foreground">({e.data.kimarite})</span>}
            </span>
          );
          // Mark both as seen so they're not duplicated
          seen.add(winnerId);
          seen.add(loserId);
        }
      }
    }

    if (e.heyaId) {
      const h = world.heyas.get(e.heyaId);
      if (h) tags.push(<StableName key={`h-${h.id}`} id={h.id} name={h.name} className="text-[11px] font-medium" />);
    }
    if (tags.length === 0) return null;
    return <span className="inline-flex items-center gap-1.5 flex-wrap">{tags}</span>;
  }, [world]);
  const events = useMemo(() => {
    if (!world?.events?.log) return [];
    const all = [...world.events.log];
    all.reverse();
    return all.slice(0, 100);
  }, [world?.events?.log?.length]);

  const filteredEvents = useMemo(() => {
    if (filter === "all") return events;
    return events.filter((e) => e.category === filter);
  }, [events, filter]);

  const grouped = useMemo(() => {
    const groups: { label: string; events: EngineEvent[] }[] = [];
    let currentLabel = "";
    
    for (const e of filteredEvents) {
      const label = e.bashoNumber !== undefined
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
    const route = getEventRoute(e);
    if (route) {
      navigate({ to: route as any });
    }
  }, [navigate]);

  const filterOptions = [
    { value: "all", label: "All" },
    { value: "match", label: "Match" },
    { value: "training", label: "Training" },
    { value: "injury", label: "Injury" },
    { value: "economy", label: "Economy" },
    { value: "career", label: "Career" },
  ];

  if (!world) return null;

  return (
    <aside className={`flex flex-col border-r border-border bg-card/50 ${className}`}>
      {/* Header */}
      <div className="p-3 border-b border-border shrink-0">
        <h2 className="font-display font-semibold text-sm">Messages</h2>
        <div className="flex gap-1 mt-2 flex-wrap">
          {filterOptions.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              aria-label={`Filter events by ${f.label}`}
              aria-pressed={filter === f.value}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                filter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f.label}
            </button>
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
              <div className="sticky top-0 z-10 px-2 py-1 bg-card/90 backdrop-blur">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </span>
              </div>
              
              {group.events.map((e) => {
                const meta = getCategoryMeta(e.category);
                const Icon = meta.icon;
                const isExpanded = expandedId === e.id;
                const isPlayerRelevant = e.heyaId === world.playerHeyaId;
                const route = getEventRoute(e);
                const hasLink = !!route;

                return (
                  <div
                    key={e.id}
                    className={`w-full text-left p-2 rounded-md transition-colors mb-0.5 group ${
                      isExpanded ? "bg-muted" : "hover:bg-muted/50"
                    } ${isPlayerRelevant ? "border-l-2 border-l-primary" : ""}`}
                  >
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : e.id)}
                      className="w-full text-left"
                      aria-expanded={isExpanded}
                      aria-controls={`event-details-${e.id}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`mt-0.5 shrink-0 ${meta.color}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-medium truncate">
                              {e.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {formatEventTime(e)}
                            </span>
                          </div>
                          {!isExpanded && (
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {e.summary}
                            </p>
                          )}
                          {!isExpanded && renderEntityTags(e)}
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div id={`event-details-${e.id}`} className="mt-1 ml-6 space-y-1.5">
                        <p className="text-[11px] text-muted-foreground">
                          {e.summary}
                        </p>
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
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              handleEventClick(e);
                            }}
                            aria-label={`${getLinkLabel(e).replace(' →', '')} for ${e.title}`}
                            className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline underline-offset-2 transition-colors mt-0.5"
                          >
                            <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                            {getLinkLabel(e)}
                          </button>
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

/** User-friendly label for the navigation link */
function getLinkLabel(e: EngineEvent): string {
  const cat = e.category;
  const type = e.type?.toLowerCase() ?? "";

  if (cat === "match" || type.includes("bout")) return "View bout →";
  if (cat === "basho") {
    if (type.includes("recap") || type.includes("wrap")) return "View recap →";
    return "View tournament →";
  }
  if (cat === "scouting") return "View talent pool →";
  if (cat === "economy" || cat === "sponsor") return "View finances →";
  if (cat === "rivalry") return "View rivalries →";
  if (cat === "discipline") return "View governance →";
  if (e.rikishiId && ["training", "injury", "career", "promotion", "milestone"].includes(cat)) {
    return "View rikishi →";
  }
  if (e.heyaId) return "View stable →";
  if (e.rikishiId) return "View rikishi →";
  return "View details →";
}
