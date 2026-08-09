/**
 * RivalriesHeader.tsx
 *
 * Header section for rivalries page with stats and search.
 */

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Swords, Flame, Search, X } from "lucide-react";

interface RivalriesHeaderProps {
  stats: { total: number; inferno: number; hot: number };
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchClear: () => void;
}

export function RivalriesHeader({
  stats,
  searchQuery,
  onSearchChange,
  onSearchClear,
}: RivalriesHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <div
          className="h-8 w-8 rounded-md bg-destructive/20 flex items-center justify-center" aria-hidden="true"
        >
          <Swords className="h-4 w-4 text-destructive" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            {stats.inferno > 0 && (
              <Badge className="bg-destructive/15 text-destructive border-destructive/30 border text-[10px] gap-1">
                <Flame className="h-3 w-3 animate-pulse" /> {stats.inferno} Inferno
              </Badge>
            )}
            {stats.hot > 0 && (
              <Badge className="bg-accent/15 text-accent border-accent/30 border text-[10px] gap-1">
                <Flame className="h-3 w-3" /> {stats.hot} Hot
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground">{stats.total} total rivalries</span>
          </div>
        </div>
      </div>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search rikishi…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 w-48 pl-8 pr-8 text-xs"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onSearchClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground h-7 w-7"
            aria-label="Clear search"
            tooltip="Clear search"
            tooltipSide="bottom"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
