/**
 * BoutResultDisplaySections.tsx
 *
 * Section components for BoutResultDisplay — the winner reveal (avatars,
 * upset/kinboshi badges, kenshō), the kimarite card, and the stats row.
 */

import { cn } from "@/lib/utils";
import type { BoutResult } from "@/engine/types/basho";
import type { UIRikishi } from "@/presenters/uiModels";
import { Badge } from "@/components/ui/badge";
import { RikishiName } from "@/components/ClickableName";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { Trophy, Zap, Timer, Shield } from "lucide-react";
import { formatStance } from "@/presenters/uiDigest";
import { KimariteTag } from "@/components/ui/KimariteTag";
import { GlossaryTip } from "@/components/ui/GlossaryTip";

/** Winner announcement — badges, winner/loser avatars, defeat line, kenshō. */
export function WinnerReveal({
  result,
  winner,
  loser,
  isUpset,
}: {
  result: BoutResult;
  winner: UIRikishi | undefined;
  loser: UIRikishi | undefined;
  isUpset: boolean;
}) {
  return (
    <div className="result-reveal">
      {isUpset && (
        <Badge variant="destructive" className="mb-3 animate-scale-in gap-1">
          <Zap className="h-3 w-3" /> UPSET!
        </Badge>
      )}
      {result.isKinboshi && (
        <Badge variant="outline" className="mb-3 animate-scale-in gap-1 border-gold text-gold">
          <Trophy className="h-3 w-3" /> KINBOSHI — 金星
        </Badge>
      )}

      {/* Winner/Loser avatars */}
      <div className="flex items-center justify-center gap-6 mb-3">
        {winner && (
          <div className="flex flex-col items-center gap-1">
            <SumoAvatar
              config={winner.avatarConfig}
              size="lg"
              showHairstyle={true}
              expression="confident"
              fallback={winner.shikona}
              className="border-2 border-gold/50 shadow-lg"
            />
            <span className="text-xs text-muted-foreground">Winner</span>
          </div>
        )}
        <div className="text-2xl font-bold text-muted-foreground">VS</div>
        {loser && (
          <div className="flex flex-col items-center gap-1">
            <SumoAvatar
              config={loser.avatarConfig}
              size="lg"
              showHairstyle={true}
              expression="neutral"
              fallback={loser.shikona}
              className="border-2 border-muted opacity-70"
            />
            <span className="text-xs text-muted-foreground">Loser</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 mb-1">
        <Trophy className="h-5 w-5 text-gold" />
        <h2 className="font-display text-2xl font-bold text-foreground winner-glow">
          {winner ? <RikishiName id={winner.id} name={winner.shikona} /> : "Unknown"}
        </h2>
      </div>

      <p className="text-sm text-muted-foreground">
        defeats{" "}
        <span className="font-medium text-foreground/70">
          {loser ? <RikishiName id={loser.id} name={loser.shikona} /> : "Unknown"}
        </span>
      </p>
      {(result.kenshoEnvelopes ?? 0) > 0 && (
        <p className="mt-2 text-xs font-medium text-gold">
          {result.kenshoEnvelopes} kenshō envelopes collected
        </p>
      )}
    </div>
  );
}

/** Winning-technique card — name, kanji, description, rarity badge. */
export function KimariteCard({
  kimariteId,
  kimariteName,
  kimariteNameJa,
  kimariteDescription,
  rarity,
  compact,
  kimariteObservedPct,
}: {
  kimariteId: string;
  kimariteName: string;
  kimariteNameJa: string;
  kimariteDescription: string;
  rarity: string;
  compact: boolean;
  kimariteObservedPct?: number;
}) {
  return (
    <div
      className={cn(
        "rounded-lg p-4 border",
        rarity === "legendary"
          ? "kimarite-rare border-gold/30"
          : rarity === "rare"
            ? "kimarite-rare"
            : "bg-secondary/40 border-border/50"
      )}
    >
      <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-1.5">
        Winning Technique
      </p>
      <KimariteTag
        kimariteId={kimariteId}
        kimariteName={kimariteName}
        observedPct={kimariteObservedPct}
        className="font-display text-xl font-semibold text-foreground"
      />
      {kimariteNameJa && (
        <p className="text-base text-muted-foreground/80 mt-0.5">{kimariteNameJa}</p>
      )}
      {kimariteDescription && !compact && (
        <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto">
          {kimariteDescription}
        </p>
      )}
      {rarity && rarity !== "common" && !compact && (
        <Badge
          variant="outline"
          className={cn(
            "mt-2.5 capitalize text-[10px]",
            rarity === "legendary" && "border-gold text-gold",
            rarity === "rare" && "border-accent text-accent",
            rarity === "uncommon" && "border-primary text-primary"
          )}
        >
          {rarity}
        </Badge>
      )}
    </div>
  );
}

/** Stats row — tachiai winner, stance, duration. */
export function BoutStatsRow({
  result,
  eastRikishi,
  westRikishi,
  tachiaiWinner,
  duration,
}: {
  result: BoutResult;
  eastRikishi: UIRikishi;
  westRikishi: UIRikishi;
  tachiaiWinner: BoutResult["tachiaiWinner"];
  duration: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 text-xs">
      <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-muted/30">
        <Zap className="h-3.5 w-3.5 text-muted-foreground" />
        <GlossaryTip termId="tachiai">
          <p className="text-[10px] text-muted-foreground uppercase">Tachiai</p>
        </GlossaryTip>
        <p
          className={cn(
            "font-medium text-sm",
            tachiaiWinner === "east"
              ? "text-east"
              : tachiaiWinner === "west"
                ? "text-west"
                : "text-muted-foreground"
          )}
        >
          {tachiaiWinner === "east"
            ? (eastRikishi?.shikona ?? "—")
            : tachiaiWinner === "west"
              ? (westRikishi?.shikona ?? "—")
              : "—"}
        </p>
      </div>

      <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-muted/30">
        <Shield className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[10px] text-muted-foreground uppercase">Stance</p>
        <p className="font-medium text-sm text-foreground">{formatStance(result.stance)}</p>
      </div>

      <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-muted/30">
        <Timer className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[10px] text-muted-foreground uppercase">Duration</p>
        <p className="font-medium text-sm text-foreground">
          {duration > 0 ? `${duration} ticks` : "—"}
        </p>
      </div>
    </div>
  );
}
