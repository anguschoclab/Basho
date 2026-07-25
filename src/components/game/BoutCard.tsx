import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { Star, Swords, Eye, CircleDot, Flame, Shield, Zap } from "lucide-react";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { BookmarkButton } from "@/components/bookmark/BookmarkButton";
import type { MatchRowData } from "./boutCardTypes.tsx";
import { HEAT_CONFIG } from "./boutCardTypes.tsx";
import { RikishiSide, H2HCenter, MatchFooter } from "./boutCardComponents";
import { TACTIC_PROFILES, type TacticProfile } from "@/engine/bout/tacticProfiles";
import type { BoutTactic } from "@/engine/types/combat";
import { isSekitoriDivision } from "@/constants/engine/rankDisplay";

function getTacticRiskIcon(profile: TacticProfile) {
  if (profile.injuryRiskMultiplier >= 1.3) return <Flame className="h-3 w-3 text-rose-500" />;
  if (profile.injuryRiskMultiplier <= 0.8) return <Shield className="h-3 w-3 text-emerald-500" />;
  return <Zap className="h-3 w-3 text-amber-500" />;
}

const TACTIC_ENTRIES = Object.values(TACTIC_PROFILES) as TacticProfile[];
const DEFAULT_TACTIC: BoutTactic = "STANDARD";

export const BoutCard = React.memo(
  ({
    match,
    idx,
    onBoutClick,
    onTacticChange,
    playerTactics,
  }: {
    match: MatchRowData;
    idx: number;
    onBoutClick?: (match: MatchRowData) => void;
    onTacticChange?: (boutId: string, tactic: string) => void;
    playerTactics?: Record<string, string>;
  }) => {
    const navigate = useNavigate();
    const hasResult = !!match.result;
    return (
      <div
        key={match.boutId || `${match.eastRikishiId}-${match.westRikishiId}-${idx}`}
        onClick={() => hasResult && onBoutClick?.(match)}
        className={`
                  bout-card bout-enter p-3 px-4
                  ${hasResult ? "cursor-pointer" : ""}
                  ${match.isPlayerBout ? "bout-card--player bg-primary/[0.03]" : ""}
                  ${hasResult ? "bg-card" : "bg-card/60"}
                `}
      >
        <div className="flex items-center gap-2">
          {match.isPlayerBout && (
            <Star className="h-3.5 w-3.5 text-primary shrink-0" fill="currentColor" />
          )}

          <SumoAvatar
            config={match.east.avatarConfig}
            size="sm"
            showHairstyle={isSekitoriDivision(match.east.division)}
            fallback={match.east.shikona}
            expression={match.east.condition < 50 ? "intense" : "neutral"}
          />
          <RikishiSide
            rikishi={match.east}
            side="east"
            isWinner={match.result?.winner === "east"}
            onClick={() =>
              navigate({ to: "/rikishi/$rikishiId", params: { rikishiId: match.east.id } })
            }
          />

          <H2HCenter wins={match.h2h.wins} losses={match.h2h.losses} />

          <RikishiSide
            rikishi={match.west}
            side="west"
            isWinner={match.result?.winner === "west"}
            onClick={() =>
              navigate({ to: "/rikishi/$rikishiId", params: { rikishiId: match.west.id } })
            }
          />
          <SumoAvatar
            config={match.west.avatarConfig}
            size="sm"
            showHairstyle={isSekitoriDivision(match.west.division)}
            fallback={match.west.shikona}
            expression={match.west.condition < 50 ? "intense" : "neutral"}
          />

          <div className="shrink-0 ml-1 flex items-center gap-1.5">
            <BookmarkButton entityType="rikishi" entityId={match.east.id} size="sm" />
            <BookmarkButton entityType="rikishi" entityId={match.west.id} size="sm" />
            {hasResult ? (
              <div className="result-reveal flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={`text-[10px] font-mono ${
                    match.result?.rarity === "legendary" || match.result?.rarity === "rare"
                      ? "kimarite-rare"
                      : ""
                  }`}
                >
                  {match.result?.kimariteName ?? "—"}
                </Badge>
                <Eye className="h-3.5 w-3.5 text-muted-foreground/60" />
              </div>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                <CircleDot className="h-3 w-3 mr-0.5 animate-pulse-glow" />
                Pending
              </Badge>
            )}
          </div>
        </div>

        {match.isPlayerBout && !hasResult && onTacticChange && (
          <div
            className="mt-3 p-3 bg-card border rounded-md shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-2 pb-2 border-b">
              <Swords className="h-4 w-4 text-primary" />
              <h4 className="font-semibold text-sm">Shikiri Prep: Set Tactic</h4>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs mb-3 p-2 bg-muted/30 rounded">
              <div className="text-muted-foreground">Opponent Style:</div>
              <div className="font-medium capitalize">
                {match.east.style} vs {match.west.style}
              </div>
              {match.scoutHint && (
                <div className="col-span-2 text-[10px] text-primary/70 italic">
                  {match.scoutHint}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {TACTIC_ENTRIES.map((t) => {
                const isSelected = (playerTactics?.[match.boutId || ""] || DEFAULT_TACTIC) === t.id;
                return (
                  <Button
                    variant={isSelected ? "secondary" : "outline"}
                    key={t.id}
                    onClick={() => match.boutId && onTacticChange?.(match.boutId, t.id)}
                    className={`h-auto p-2 justify-start flex-col items-start ${isSelected ? "bg-primary/10 border-primary ring-1 ring-primary" : ""}`}
                  >
                    <div className="flex items-center gap-1.5 w-full">
                      <span className="font-semibold text-xs">{t.label}</span>
                      {getTacticRiskIcon(t)}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-normal">{t.desc}</span>
                    <span className="text-[9px] text-muted-foreground/60 mt-0.5">
                      {t.tachiaiPowerModifier > 0 && `+${t.tachiaiPowerModifier} power `}
                      {t.tachiaiPowerModifier < 0 && `${t.tachiaiPowerModifier} power `}
                      {t.fatigueCost > 0 && `| ${t.fatigueCost} fatigue`}
                    </span>
                  </Button>
                );
              })}
            </div>
            <div className="mt-3 pt-2 text-right">
              <Badge
                variant="outline"
                className="text-xs bg-muted hover:bg-muted/80 cursor-pointer"
                onClick={() => onBoutClick?.(match)}
              >
                Confirm & Sim Bout &rarr;
              </Badge>
            </div>
          </div>
        )}

        <MatchFooter match={match} heatConfig={HEAT_CONFIG} />
      </div>
    );
  }
);
