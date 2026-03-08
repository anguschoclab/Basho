import { useState, useMemo } from "react";
import { useGame } from "@/contexts/GameContext";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Filter,
  Search,
  ChevronDown,
} from "lucide-react";
import type { EngineEvent, EventCategory } from "@/engine/types";

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
  facility: { icon: GraduationCap, color: "text-muted-foreground", label: "Facility" },
  misc: { icon: MessageCircle, color: "text-muted-foreground", label: "Misc" },
};

function getCategoryMeta(cat: string) {
  return CATEGORY_META[cat] || CATEGORY_META.misc;
}

function formatEventTime(e: EngineEvent): string {
  if (e.day !== undefined && e.bashoNumber !== undefined) {
    return `B${e.bashoNumber} D${e.day}`;
  }
  return `W${e.week}`;
}

interface EventLogPanelProps {
  className?: string;
}

export function EventLogPanel({ className = "" }: EventLogPanelProps) {
  const { state } = useGame();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const world = state.world;
  const events = useMemo(() => {
    if (!world?.events?.log) return [];
    // Show most recent 100 events, newest first
    const all = [...world.events.log];
    all.reverse();
    return all.slice(0, 100);
  }, [world?.events?.log?.length]);

  const filteredEvents = useMemo(() => {
    if (filter === "all") return events;
    return events.filter((e) => e.category === filter);
  }, [events, filter]);

  // Group by date
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
        {/* Filter tabs */}
        <div className="flex gap-1 mt-2 flex-wrap">
          {filterOptions.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
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

                return (
                  <button
                    key={e.id}
                    onClick={() => setExpandedId(isExpanded ? null : e.id)}
                    className={`w-full text-left p-2 rounded-md transition-colors mb-0.5 group ${
                      isExpanded ? "bg-muted" : "hover:bg-muted/50"
                    } ${isPlayerRelevant ? "border-l-2 border-l-primary" : ""}`}
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
                        {isExpanded && (
                          <div className="mt-1 space-y-1">
                            <p className="text-[11px] text-muted-foreground">
                              {e.summary}
                            </p>
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
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
