// BoutResultDisplay.tsx — Polished bout result with dramatic winner reveal
// Supports kimarite/kimariteId/kimariteName fields across engine revisions

import { cn } from "@/lib/utils";
import type { BoutResult } from "@/engine/types/basho";
import type { Rikishi } from "@/engine/types/rikishi";
import { Badge } from "@/components/ui/badge";
import { getKimarite } from "@/engine/kimarite";
import { RikishiName } from "@/components/ClickableName";
import { Trophy, Zap, Timer, Shield } from "lucide-react";

/** Defines the structure for bout result display props. */
interface BoutResultDisplayProps {
  result: BoutResult;
  eastRikishi: Rikishi;
  westRikishi: Rikishi;
  className?: string;
}

/**
 * Safe string.
 *  * @param v - The V.
 *  * @param fallback - The Fallback.
 *  * @returns The result.
 */
function safeString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

/**
 * Safe number.
 *  * @param v - The V.
 *  * @param fallback - The Fallback.
 *  * @returns The result.
 */
function safeNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/**
 * Format stance.
 *  * @param raw - The Raw.
 *  * @returns The result.
 */
import { formatStance } from "@/engine/utils/formatters";

/**
 * bout result display.
 *  * @param {
 *   result,
 *   eastRikishi,
 *   westRikishi,
 *   className,
 * } - The {
 *   result,
 *   east rikishi,
 *   west rikishi,
 *   class name,
 * }.
 */
export function BoutResultDisplay({
  result,
  eastRikishi,
  westRikishi,
  className,
}: BoutResultDisplayProps) {
  const winner = result.winner === "east" ? eastRikishi : westRikishi;
  const loser = result.winner === "east" ? westRikishi : eastRikishi;
  const winnerSide = result.winner;

  const kimariteId = safeString((result as any).kimarite) || safeString((result as any).kimariteId) || "";
  const kimariteFromLookup = kimariteId ? getKimarite(kimariteId) : null;
  const kimariteName = safeString((result as any).kimariteName) || safeString(kimariteFromLookup?.name) || "—";
  const kimariteNameJa = safeString(kimariteFromLookup?.nameJa);
  const kimariteDescription = safeString(kimariteFromLookup?.description);
  const rarity = safeString((kimariteFromLookup as any)?.rarity, "").toLowerCase();
  const duration = safeNumber((result as any).duration, 0);
  const tachiaiWinner = (result as any).tachiaiWinner as "east" | "west" | undefined;
  const isUpset = Boolean((result as any).upset);

  return (
    <div className={cn("paper p-0 overflow-hidden text-center", className)}>
      {/* Top color accent bar */}
      <div className="flex h-1">
        <div className={cn("flex-1 transition-all", winnerSide === "east" ? "bg-east" : "bg-east/20")} />
        <div className={cn("flex-1 transition-all", winnerSide === "west" ? "bg-west" : "bg-west/20")} />
      </div>

      <div className="p-6 space-y-5">
        {/* Winner announcement */}
        <div className="result-reveal">
          {isUpset && (
            <Badge variant="destructive" className="mb-3 animate-scale-in gap-1">
              <Zap className="h-3 w-3" /> UPSET!
            </Badge>
          )}

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
        </div>

        {/* Kimarite card */}
        <div className={cn(
          "rounded-lg p-4 border",
          rarity === "legendary" ? "kimarite-rare border-gold/30" :
          rarity === "rare" ? "kimarite-rare" :
          "bg-secondary/40 border-border/50"
        )}>
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-1.5">
            Winning Technique
          </p>
          <p className="font-display text-xl font-semibold text-foreground">{kimariteName}</p>
          {kimariteNameJa && (
            <p className="text-base text-muted-foreground/80 mt-0.5">{kimariteNameJa}</p>
          )}
          {kimariteDescription && (
            <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto">{kimariteDescription}</p>
          )}
          {rarity && rarity !== "common" && (
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

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-muted/30">
            <Zap className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground uppercase">Tachiai</p>
            <p className={cn(
              "font-medium text-sm",
              tachiaiWinner === "east" ? "text-east" : tachiaiWinner === "west" ? "text-west" : "text-muted-foreground"
            )}>
              {tachiaiWinner === "east"
                ? eastRikishi?.shikona ?? "—"
                : tachiaiWinner === "west"
                ? westRikishi?.shikona ?? "—"
                : "—"}
            </p>
          </div>

          <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-muted/30">
            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground uppercase">Stance</p>
            <p className="font-medium text-sm text-foreground">{formatStance((result as any).stance)}</p>
          </div>

          <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-muted/30">
            <Timer className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground uppercase">Duration</p>
            <p className="font-medium text-sm text-foreground">{duration > 0 ? `${duration} ticks` : "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
