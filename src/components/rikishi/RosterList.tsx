/**
 * src/components/rikishi/RosterList.tsx
 *
 * Component for managing the stable's active rikishi roster.
 * Provides quick overview statistics and links to individual profiles.
 * Sort helper in ./rosterSort.ts; sections in ./RosterListSections.tsx.
 */

import { useMemo, useState } from "react";
import { Zap } from "lucide-react";
import type { UIRikishi } from "@/presenters/uiModels";
import type { SortDirection } from "@/lib/sortUtils";
import { EmptyState } from "@/components/ui/EmptyState";
import { sortRoster } from "./rosterSort";
import { RosterToolbar, RosterCard } from "./RosterListSections";

interface RosterListProps {
  rikishiList: UIRikishi[];
  onRikishiClick: (id: string) => void;
}

/**
 * Renders a list of rikishi in the stable's roster.
 * Displays each rikishi in a card format with their avatar, rank, current basho record, and perceived stats.
 * Supports sorting by rank and clicking on a rikishi to view their detailed profile.
 */
export function RosterList({ rikishiList, onRikishiClick }: RosterListProps) {
  const [sortKey, setSortKey] = useState<string>("rank");
  const [sortOrder, setSortOrder] = useState<SortDirection>("asc");

  const sorted = useMemo(
    () => sortRoster(rikishiList, sortKey, sortOrder),
    [rikishiList, sortKey, sortOrder]
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      <RosterToolbar
        onSortChange={(key, order) => {
          setSortKey(key);
          setSortOrder(order);
        }}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sorted.map((r, idx) => (
          <RosterCard key={r.id} rikishi={r} index={idx} onRikishiClick={onRikishiClick} />
        ))}

        {rikishiList.length === 0 && (
          <div className="col-span-full py-32 bg-muted/20 border-2 border-dashed rounded-lg">
            <EmptyState
              icon={Zap}
              title="Dohyo Empty"
              description="Your stable records show no active rikishi under Association tenure."
            />
          </div>
        )}
      </div>
    </div>
  );
}
