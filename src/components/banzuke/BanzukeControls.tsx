/**
 * BanzukeControls.tsx
 *
 * Controls row + movement legend for BanzukePage — pyramid, search
 * input, changes toggle, sort menu, and the promoted/demoted legend.
 */

import { ArrowUp, ArrowDown, Minus, ArrowUpRight, Search, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { BanzukePyramid } from "@/components/charts/BanzukePyramid";
import { SortMenu } from "@/components/ui/SortMenu";
import type { SortDirection } from "@/lib/sortUtils";

const BANZUKE_SORT_OPTIONS = [
  { key: "rank", label: "Rank" },
  { key: "shikona", label: "Shikona" },
];

/** Pyramid + search + changes toggle + sort menu. */
export function BanzukeControlsRow({
  pyramidData,
  searchQuery,
  onSearchChange,
  hasPrevBasho,
  showChanges,
  onShowChanges,
  onSortChange,
}: {
  pyramidData: { rank: string; count: number }[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  hasPrevBasho: boolean;
  showChanges: boolean;
  onShowChanges: (v: boolean) => void;
  onSortChange: (key: string, order: SortDirection) => void;
}) {
  return (
    <div className="flex items-start gap-4 flex-wrap">
      <div className="min-w-[200px]">
        <BanzukePyramid data={pyramidData} />
      </div>
      <div className="flex flex-col gap-3 flex-1">
        <div className="flex items-center gap-3">
          {/* Player stable legend */}
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase text-gold border border-gold/30 rounded px-2 py-1 bg-gold/5 tracking-wider">
            <span className="h-1.5 w-1.5 rounded-xs bg-gold" />
            Your Stable
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search wrestler…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 w-48 pl-8 pr-8 text-xs"
            />
            {searchQuery && (
              <TooltipWrap content="Clear search filter" side="top">
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </TooltipWrap>
            )}
          </div>
          {hasPrevBasho && (
            <div className="flex items-center gap-2">
              <TooltipWrap
                content="Toggle rank movement indicators relative to the previous tournament"
                side="top"
              >
                <div className="flex items-center gap-2">
                  <Switch id="show-changes" checked={showChanges} onCheckedChange={onShowChanges} />
                  <Label
                    htmlFor="show-changes"
                    className="text-xs text-muted-foreground cursor-pointer"
                  >
                    Changes
                  </Label>
                </div>
              </TooltipWrap>
            </div>
          )}
          <SortMenu
            options={BANZUKE_SORT_OPTIONS}
            storageKey="basho_sort_banzuke"
            defaultSortKey="rank"
            defaultSortOrder="asc"
            onSortChange={onSortChange}
          />
        </div>
      </div>
    </div>
  );
}

/** Movement-indicator legend — promoted/demoted/unchanged/new. */
export function MovementLegend() {
  return (
    <div className="flex items-center gap-4 text-[10px] text-muted-foreground border border-border/50 rounded-md px-3 py-1.5 bg-muted/20 w-fit">
      <span className="flex items-center gap-1 text-success">
        <ArrowUp className="h-3 w-3" /> Promoted
      </span>
      <span className="flex items-center gap-1 text-destructive">
        <ArrowDown className="h-3 w-3" /> Demoted
      </span>
      <span className="flex items-center gap-1 text-muted-foreground">
        <Minus className="h-3 w-3" /> Unchanged
      </span>
      <span className="flex items-center gap-1 text-primary">
        <ArrowUpRight className="h-2.5 w-2.5" /> New entry
      </span>
    </div>
  );
}
