/**
 * RikishiGlobalCup.tsx
 * ====================
 * Displays Global Cup tournament history and achievements for a rikishi.
 */

import { Trophy } from "lucide-react";
import { WidgetCard } from "@/components/ui/WidgetCard";
import { WidgetHeader } from "@/components/ui/WidgetHeader";
// eslint-disable-next-line no-restricted-imports
import type { WorldState } from "@/engine/types/world";
import type { GlobalCupHistoryEntry } from "@/engine/types/globalCup";

interface RikishiGlobalCupProps {
  rikishiId: string;
  world: WorldState;
}

export function RikishiGlobalCup({ rikishiId, world }: RikishiGlobalCupProps) {
  // Get Global Cup history from chronicle
  const globalCupHistory = world.chronicle?.globalCups || [];

  // Find all entries where this rikishi participated
  const rikishiEntries = globalCupHistory.filter((entry: GlobalCupHistoryEntry) => {
    return entry.championId === rikishiId;
  });

  // Find championships
  const championships = globalCupHistory.filter(
    (entry: GlobalCupHistoryEntry) => entry.championId === rikishiId
  );

  // Check current tournament participation
  const currentCup = world.globalCup;
  const isInCurrentTournament = currentCup?.participants.some(
    (p: { rikishiId: string }) => p.rikishiId === rikishiId
  );

  if (rikishiEntries.length === 0 && !isInCurrentTournament) {
    return (
      <WidgetCard>
        <WidgetHeader title="Global Cup History" icon={Trophy} />
        <p className="text-sm text-muted-foreground mt-4">
          This rikishi has not yet participated in the Global Cup tournament.
        </p>
      </WidgetCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-card border border-border text-center">
          <div className="text-2xl font-display font-bold text-amber-400">
            {championships.length}
          </div>
          <div className="text-[10px] font-mono uppercase text-muted-foreground">Championships</div>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border text-center">
          <div className="text-2xl font-display font-bold">{rikishiEntries.length}</div>
          <div className="text-[10px] font-mono uppercase text-muted-foreground">Tournaments</div>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border text-center">
          <div className="text-lg font-bold">{isInCurrentTournament ? "Active" : "—"}</div>
          <div className="text-[10px] font-mono uppercase text-muted-foreground">
            Current Status
          </div>
        </div>
      </div>

      {/* Current Tournament */}
      {isInCurrentTournament && currentCup && (
        <WidgetCard className="border-amber-500/30 bg-amber-950/10">
          <WidgetHeader title={`Global Cup ${currentCup.year}`} icon={Trophy} />
          <div className="mt-4 space-y-2">
            <p className="text-sm">
              <span className="text-muted-foreground">Phase:</span>{" "}
              <span className="font-medium capitalize">{currentCup.phase}</span>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Status:</span>{" "}
              <span className="font-medium text-amber-400">
                {currentCup.isActive ? "Active Participant" : "Registered"}
              </span>
            </p>
            {currentCup.championId === rikishiId && (
              <p className="text-sm text-amber-400 font-bold flex items-center gap-2 mt-2">
                <Trophy className="h-4 w-4" />
                Current Champion
              </p>
            )}
          </div>
        </WidgetCard>
      )}

      {/* Championship History */}
      {championships.length > 0 && (
        <WidgetCard>
          <WidgetHeader title="Championships" icon={Trophy} />
          <div className="mt-4 space-y-2">
            {championships.map((entry: GlobalCupHistoryEntry) => (
              <div
                key={entry.year}
                className="flex items-center justify-between p-2 rounded bg-amber-950/20 border border-amber-500/30"
              >
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-400" />
                  <span className="font-medium">{entry.year} Global Cup</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {entry.participantCount} participants
                </span>
              </div>
            ))}
          </div>
        </WidgetCard>
      )}
    </div>
  );
}
