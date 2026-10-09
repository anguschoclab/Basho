/**
 * RosterListSections.tsx
 *
 * Sections of RosterList — header toolbar with sort menu and the
 * per-rikishi roster card.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { Zap, Activity, Filter, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UIRikishi } from "@/presenters/uiModels";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { KeshoBadge } from "@/components/kesho/KeshoBadge";
import { RankBadge } from "./RankBadge";
import { SortMenu, type SortOption } from "@/components/ui/SortMenu";
import type { SortDirection } from "@/lib/sortUtils";

const SORT_OPTIONS: SortOption[] = [
  { key: "rank", label: "Rank" },
  { key: "shikona", label: "Shikona" },
  { key: "winPercentage", label: "Win %" },
  { key: "streak", label: "Streak" },
  { key: "condition", label: "Condition" },
];

/** Header row — title, registry toggle, filter, sort menu. */
export function RosterToolbar({
  onSortChange,
}: {
  onSortChange: (key: string, order: SortDirection) => void;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-2 bg-primary rounded-full" />
          <h2 className="text-2xl sm:text-4xl font-display font-black tracking-tight">
            Stable Roster
          </h2>
        </div>
        <p className="text-sm text-muted-foreground font-medium opacity-70">
          Official Association registry for your active professional roster.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="bg-muted p-1 rounded-lg flex items-center gap-1 border">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-[10px] font-black uppercase tracking-widest bg-background shadow-xs"
            tooltip="Toggle official Association registry view"
          >
            <LayoutGrid className="h-3 w-3 mr-1.5" /> Registry
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-10 px-4 text-[10px] font-black uppercase tracking-widest border-2 gap-2"
          tooltip="Filter roster by rank, division, or status"
        >
          <Filter className="h-3.5 w-3.5" /> Filter
        </Button>
        <SortMenu
          options={SORT_OPTIONS}
          storageKey="basho_sort_roster"
          defaultSortKey="rank"
          defaultSortOrder="asc"
          onSortChange={onSortChange}
        />
      </div>
    </div>
  );
}

/** One rikishi roster card — identity, basho record, perceived stats. */
export function RosterCard({
  rikishi: r,
  index,
  onRikishiClick,
}: {
  rikishi: UIRikishi;
  index: number;
  onRikishiClick: (id: string) => void;
}) {
  return (
    <TooltipWrap
      content={`View detailed Association dossier for ${r.shikona}`}
      side="top"
    >
      <Card
        className="paper group hover:border-primary/50 cursor-pointer overflow-hidden relative animate-in zoom-in-95 fill-mode-both focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background"
        style={{ animationDelay: `${index * 40}ms` }}
        onClick={() => onRikishiClick(r.id)}
        role="button"
        aria-label={`View ${r.shikona}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onRikishiClick(r.id);
          }
        }}
      >
        <div
          className={cn(
            "absolute top-0 right-0 p-4 opacity-5 font-display text-5xl font-black italic group-hover:opacity-10 transition-opacity",
            `text-primary`
          )}
        >
          {r.shikona.charAt(0)}
        </div>

        <CardContent className="p-5 relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <SumoAvatar
                  config={r.avatarConfig}
                  size="xs"
                  showHairstyle={true}
                  expression={
                    r.isInjured ? "intense" : r.motivation > 70 ? "confident" : "neutral"
                  }
                  fallback={r.shikona}
                />
                {/* Kesho badge for sekitori */}
                {r.keshoMawashi && (
                  <TooltipWrap content={`Kesho-mawashi (${r.keshoMawashi.tier})`} side="top">
                    <KeshoBadge kesho={r.keshoMawashi} size="sm" />
                  </TooltipWrap>
                )}
                <RankBadge
                  rank={r.rank}
                  rankNumber={r.rankNumber}
                  side={r.side}
                  variant="roster"
                />
              </div>
              <div className="font-display font-black text-xl tracking-tight group-hover:text-primary transition-colors">
                {r.shikona}
              </div>
              <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                <TooltipWrap content={`Age: ${r.ageDescriptor}`} side="top">
                  <span className="cursor-help">
                    {r.origin} • {r.age} Years
                  </span>
                </TooltipWrap>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-display font-black leading-none tabular-nums">
                <span className="text-primary">{r.currentBashoWins}</span>
                <span className="opacity-20 mx-0.5">-</span>
                <span className="opacity-40">{r.currentBashoLosses}</span>
              </div>
              <div className="text-[8px] uppercase font-black text-muted-foreground tracking-tighter mt-1">
                Basho Record
              </div>
              {r.kachiNokori !== null && r.kachiNokori > 0 && (
                <div
                  className="text-[9px] font-mono uppercase tracking-widest text-gold/80 mt-1"
                  data-testid={`kachi-nokori-${r.id}`}
                >
                  {r.kachiNokori} to kachi-koshi
                </div>
              )}
              {r.kachiNokori === 0 && (
                <div
                  className="text-[9px] font-mono uppercase tracking-widest text-primary mt-1"
                  data-testid={`kachi-koshi-${r.id}`}
                >
                  Kachi-koshi
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-dashed border-border/40">
            <div className="space-y-1 border-r border-dashed border-border/40 pr-3">
              <TooltipWrap content="Observed physical power and pushing force" side="top">
                <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-muted-foreground leading-none cursor-help">
                  <Zap className="h-2.5 w-2.5 text-gold" /> Power
                </div>
              </TooltipWrap>
              <div className="font-display font-black text-sm">
                {r.perceivedStats?.strength || "??"}
              </div>
            </div>
            <div className="space-y-1 pl-1">
              <TooltipWrap
                content="Observed match pace and initial reaction speed"
                side="top"
              >
                <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-muted-foreground leading-none cursor-help">
                  <Activity className="h-2.5 w-2.5 text-west" /> Pace
                </div>
              </TooltipWrap>
              <div className="font-display font-black text-sm">
                {r.perceivedStats?.speed || "??"}
              </div>
            </div>
          </div>
        </CardContent>

        {/* Progress bar for perceived skill */}
        <div className="h-1 bg-muted w-full mt-auto">
          <div
            className="h-full bg-primary opacity-20"
            style={{
              width: `${((Number(r.perceivedStats?.strength) || 0) + (Number(r.perceivedStats?.speed) || 0)) / 2}%`,
            }}
          />
        </div>
      </Card>
    </TooltipWrap>
  );
}
