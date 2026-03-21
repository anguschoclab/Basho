import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ChevronRight, HeartPulse, AlertTriangle, Star } from "lucide-react";
import { RikishiName } from "@/components/ClickableName";
import { projectRosterEntry, type UIRosterEntry } from "@/engine/uiModels";

export function RosterWidget() {
  const { state } = useGame();
  const navigate = useNavigate();
  const world = state.world;

  const roster = useMemo<UIRosterEntry[]>(() => {
    if (!world?.playerHeyaId) return [];
    const heya = world.heyas.get(world.playerHeyaId);
    if (!heya) return [];

    // ⚡ Bolt Performance Optimization: Single-pass for loop over rikishiIds
    const entries: UIRosterEntry[] = [];
    for (const id of heya.rikishiIds) {
      const r = world.rikishi.get(id);
      if (r && !r.isRetired) {
        entries.push(projectRosterEntry(r));
      }
    }
    return entries.sort((a, b) => a.id.localeCompare(b.id));
  }, [world]);

  if (!world) return null;

  const injuredCount = roster.reduce((count, r) => count + (r.isInjured ? 1 : 0), 0);
  const exhaustedCount = roster.reduce((count, r) => count + (r.fatigueBand === "exhausted" || r.fatigueBand === "spent" ? 1 : 0), 0);
  const fatigueWarning = exhaustedCount > 0;

  return (
    <div className="widget-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">My Roster</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/rikishi")} className="h-6 text-xs gap-1 text-muted-foreground" aria-label="View all rikishi">
          All Rikishi <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Summary row with visual indicators */}
      <div className="flex gap-3 text-xs">
        <div className="flex items-center gap-1.5 bg-primary/10 px-2 py-1 rounded-md">
          <Users className="h-3 w-3 text-primary" />
          <span className="font-bold text-primary">{roster.length}</span>
          <span className="text-muted-foreground">active</span>
        </div>
        {injuredCount > 0 && (
          <div className="flex items-center gap-1 bg-destructive/10 px-2 py-1 rounded-md text-destructive">
            <HeartPulse className="h-3 w-3" />
            <span className="font-bold">{injuredCount}</span>
            <span>hurt</span>
          </div>
        )}
        <div className="flex items-center gap-1 text-muted-foreground ml-auto">
          <AlertTriangle className="h-3 w-3" />
          <span className="text-[10px]">{exhaustedCount} exhausted</span>
        </div>
      </div>

      {/* Team fatigue warning */}
      {fatigueWarning && (
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500 bg-destructive" style={{ width: `${(exhaustedCount / roster.length) * 100}%` }} />
        </div>
      )}

      {/* Roster list */}
      <div className="space-y-0.5">
        {roster.slice(0, 8).map((entry) => (
          <div key={entry.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md text-xs hover:bg-muted/50 transition-colors group">
            <RikishiName id={entry.id} name={entry.shikona}  className="flex-1 font-medium truncate" />
            <span className="text-[10px] text-muted-foreground capitalize w-14 text-right">{entry.rank}</span>
            {entry.isInjured && <HeartPulse className="h-3 w-3 text-destructive shrink-0" />}
            {(entry.potentialBand === "star" || entry.potentialBand === "generational") && (
              <Star className="h-3 w-3 text-gold shrink-0" />
            )}
            {/* Fatigue bar */}
            <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  entry.fatigueBand === "spent" || entry.fatigueBand === "exhausted" ? "bg-destructive w-[90%]" : entry.fatigueBand === "tired" ? "bg-warning w-[60%]" : entry.fatigueBand === "light" ? "bg-primary/60 w-[30%]" : "bg-success w-[10%]"
                }`}
              />
            </div>
          </div>
        ))}
        {roster.length > 8 && (
          <button
            onClick={() => navigate("/rikishi")}
            className="w-full text-[11px] text-primary hover:text-primary/80 text-center py-1.5 transition-colors"
          >
            +{roster.length - 8} more wrestlers →
          </button>
        )}
      </div>
    </div>
  );
}
