/**
 * OpponentScoutingSections.tsx
 *
 * Opponent scouting tab sections — division filter + sort row, and the
 * per-opponent card (identity, scouted attributes, investment controls).
 */

import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Search } from "lucide-react";
import { RANK_NAMES } from "@/presenters/uiDigest";
import { AttrChip } from "./AttrChip";
import { SortMenu, type SortOption } from "@/components/ui/SortMenu";
import type { SortDirection } from "@/lib/sortUtils";
import type { projectOpponentScoutingUIDigest } from "@/presenters/uiDigest";
import { activationKeyHandler } from "@/lib/a11y";

type Opponent = ReturnType<typeof projectOpponentScoutingUIDigest>["opponents"][number];
type ScoutingLevel = "none" | "light" | "standard" | "deep";

const SCOUTING_SORT_OPTIONS: SortOption[] = [
  { key: "rank", label: "Rank" },
  { key: "shikona", label: "Shikona" },
  { key: "scoutLevel", label: "Scout Level" },
];

/** Division filter buttons + sort menu row. */
export function ScoutingFilterRow({
  filterDivision,
  onDivisionChange,
  onSortChange,
}: {
  filterDivision: string;
  onDivisionChange: (division: string) => void;
  onSortChange: (key: string, order: SortDirection) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap items-center">
      {["makuuchi", "juryo", "makushita"].map((div) => (
        <Button
          key={div}
          variant={filterDivision === div ? "default" : "outline"}
          size="sm"
          onClick={() => onDivisionChange(div)}
          className="capitalize"
        >
          {div}
        </Button>
      ))}
      <div className="ml-auto">
        <SortMenu
          options={SCOUTING_SORT_OPTIONS}
          storageKey="basho_sort_opponent_scouting"
          defaultSortKey="rank"
          defaultSortOrder="asc"
          onSortChange={onSortChange}
        />
      </div>
    </div>
  );
}

/** Single opponent card — identity, scouted attrs, invest controls. */
export function OpponentCard({
  opponent: r,
  onInvest,
}: {
  opponent: Opponent;
  onInvest: (rikishiId: string, level: ScoutingLevel) => void;
}) {
  const navigate = useNavigate();
  const rankNames = RANK_NAMES[r.rank] || { ja: r.rank, en: r.rank };

  const openProfile = () =>
    navigate({
      to: "/rikishi/$rikishiId",
      params: { rikishiId: r.id },
    });

  return (
    <Card
      className="paper cursor-pointer hover:border-primary/50 transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background"
      role="button"
      tabIndex={0}
      aria-label={`View details for ${r.shikona}`}
      onClick={openProfile}
      onKeyDown={activationKeyHandler(openProfile)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-semibold text-lg truncate">{r.shikona}</h3>
              <Badge variant="secondary" className="text-xs">
                {rankNames.ja}
                {r.rankNumber ? ` ${r.rankNumber}` : ""}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {r.heyaName} • {r.height}cm{" "}
              <span className="opacity-60">({r.heightDescriptor})</span> / {r.weight}kg{" "}
              <span className="opacity-60">({r.weightDescriptor})</span>
            </div>

            {/* Scouted attributes — narrative only */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-3 text-xs">
              <AttrChip label="Power" attr={r.scoutedAttrs.power} />
              <AttrChip label="Speed" attr={r.scoutedAttrs.speed} />
              <AttrChip label="Balance" attr={r.scoutedAttrs.balance} />
              <AttrChip label="Technique" attr={r.scoutedAttrs.technique} />
              <AttrChip label="Aggression" attr={r.scoutedAttrs.aggression} />
              <AttrChip label="Experience" attr={r.scoutedAttrs.experience} />
            </div>
          </div>

          {/* Scouting level + invest controls */}
          <div className="flex flex-col items-end gap-2 shrink-0 min-w-[140px]">
            <div className="flex items-center gap-2">
              <Search className={`h-4 w-4 ${r.scoutInfo.color}`} />
              <span className={`text-sm font-medium ${r.scoutInfo.color}`}>
                {r.scoutInfo.label}
              </span>
            </div>
            <Progress value={r.scoutedProgress} className="h-1.5 w-24" />

            {/* Investment buttons */}
            <div className="flex gap-1 mt-1">
              {(["none", "light", "standard", "deep"] as const).map((inv) => (
                <Button
                  key={inv}
                  variant={r.scoutingInvestment === inv ? "default" : "ghost"}
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInvest(r.id, inv);
                  }}
                >
                  {inv === "none" ? "—" : inv.charAt(0).toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
