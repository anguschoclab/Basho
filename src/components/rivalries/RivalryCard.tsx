/**
 * RivalryCard.tsx
 *
 * Rivalry card component for displaying individual rivalries.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame } from "lucide-react";
import { RikishiName, StableName } from "@/components/ClickableName";
import { formatRank, clamp } from "@/presenters/uiDigest";
import { getHeatBand, H2HBar, HeatGauge } from "./rivalryUtils";
import { HEAT_BAND_CONFIG, TONE_CONFIG, TRIGGER_LABELS } from "../../constants/ui/rivalry";
import type { RivalryPairState, RivalryTrigger } from "@/engine/rivalries";
import type { WorldState } from "@/engine/types/world";
import { toRankPosition } from "@/engine/types/banzuke";

interface RivalryCardProps {
  pair: RivalryPairState;
  world: WorldState;
  isPlayerRivalry?: boolean;
  index: number;
}

export function RivalryCard({ pair, world, isPlayerRivalry, index }: RivalryCardProps) {
  const rikishiA = world.rikishi.get(pair.aId);
  const rikishiB = world.rikishi.get(pair.bId);
  if (!rikishiA || !rikishiB) return null;

  const heyaA = world.heyas.get(rikishiA.heyaId);
  const heyaB = world.heyas.get(rikishiB.heyaId);

  const heat = clamp(pair.heat || 0, 0, 100);
  const heatBand = getHeatBand(heat);
  const heatConfig = HEAT_BAND_CONFIG[heatBand];
  const toneInfo = TONE_CONFIG[pair.tone || "respect"];

  const topTriggers = Object.entries(pair.triggers || {})
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 3)
    .filter(([t]) => t in TRIGGER_LABELS)
    .map(([t]) => t as RivalryTrigger);

  const aWins = pair.aWins || 0;
  const bWins = pair.bWins || 0;

  const rankA = formatRank(
    toRankPosition({
      rank: rikishiA.rank,
      side: rikishiA.side ?? "east",
      rankNumber: rikishiA.rankNumber,
    })
  );

  const rankB = formatRank(
    toRankPosition({
      rank: rikishiB.rank,
      side: rikishiB.side ?? "east",
      rankNumber: rikishiB.rankNumber,
    })
  );

  return (
    <Card
      className={`overflow-hidden bout-enter ${isPlayerRivalry ? "ring-1 ring-primary/30" : ""} ${heatConfig.glowClass}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className={`h-1 ${heatConfig.barColor}`} />

      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={`${heatConfig.bgColor} ${heatConfig.color} border text-[10px] gap-1`}>
              <Flame className={`h-3 w-3 ${heatBand === "inferno" ? "animate-pulse" : ""}`} />
              {heatConfig.label}
            </Badge>
            {isPlayerRivalry && (
              <Badge variant="default" className="text-[10px] h-5">
                Your Stable
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 text-right space-y-0.5">
            <div className="font-display font-bold text-base">
              <RikishiName id={rikishiA.id} name={rikishiA.shikona} />
            </div>
            <div className="text-[10px] text-muted-foreground">{rankA}</div>
            {heyaA && (
              <div className="text-[10px]">
                <StableName id={heyaA.id} name={heyaA.name} className="text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="shrink-0 flex flex-col items-center">
            <div className="h-10 w-10 rounded-full bg-muted/80 border border-border flex items-center justify-center">
              <span className="font-display text-xs font-bold text-muted-foreground">VS</span>
            </div>
          </div>
          <div className="flex-1 space-y-0.5">
            <div className="font-display font-bold text-base">
              <RikishiName id={rikishiB.id} name={rikishiB.shikona} />
            </div>
            <div className="text-[10px] text-muted-foreground">{rankB}</div>
            {heyaB && (
              <div className="text-[10px]">
                <StableName id={heyaB.id} name={heyaB.name} className="text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        <H2HBar aWins={aWins} bWins={bWins} aName={rikishiA.shikona} bName={rikishiB.shikona} />

        <p className="text-xs text-muted-foreground italic">{toneInfo.description}</p>

        {topTriggers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {topTriggers.map((t) => (
              <Badge key={t} variant="outline" className="text-[10px] font-normal">
                {TRIGGER_LABELS[t]}
              </Badge>
            ))}
          </div>
        )}

        <HeatGauge heat={heat} band={heatBand} />
      </CardContent>
    </Card>
  );
}
