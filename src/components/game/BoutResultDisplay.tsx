// BoutResultDisplay.tsx — Polished bout result with dramatic winner reveal
// Supports kimarite/kimariteId/kimariteName fields across engine revisions

import { cn } from "@/lib/utils";
import type { BoutResult } from "@/engine/types/basho";
import type { UIRikishi } from "@/presenters/uiModels";
import { getKimarite } from "@/presenters/uiDigest";
import { WinnerReveal, KimariteCard, BoutStatsRow } from "./BoutResultDisplaySections";

/** Defines the structure for bout result display props. */
interface BoutResultDisplayProps {
  result: BoutResult;
  eastRikishi: UIRikishi;
  westRikishi: UIRikishi;
  className?: string;
  compact?: boolean;
  /** Observed share of this kimarite this era (0–100), from world stats.
   * Omit when unavailable — nothing is rendered in its place. */
  kimariteObservedPct?: number;
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
  compact = false,
  kimariteObservedPct,
}: BoutResultDisplayProps) {
  const winner = result.winner === "east" ? eastRikishi : westRikishi;
  const loser = result.winner === "east" ? westRikishi : eastRikishi;
  const winnerSide = result.winner;

  const kimariteId =
    safeString(result.kimarite) || safeString((result as { kimariteId?: string }).kimariteId) || "";
  const kimariteFromLookup = kimariteId ? getKimarite(kimariteId) : null;
  const kimariteName =
    safeString((result as { kimariteName?: string }).kimariteName) ||
    safeString(kimariteFromLookup?.name) ||
    "—";
  const kimariteNameJa = safeString(kimariteFromLookup?.nameJa);
  const kimariteDescription = safeString(kimariteFromLookup?.description);
  const rarity = safeString((kimariteFromLookup as { rarity?: string })?.rarity, "").toLowerCase();
  const duration = safeNumber(result.duration, 0);
  const tachiaiWinner = result.tachiaiWinner;
  const isUpset = Boolean(result.upset);

  return (
    <div className={cn("paper p-0 overflow-hidden text-center", className)}>
      {/* Top color accent bar */}
      <div className="flex h-1">
        <div
          className={cn("flex-1 transition-all", winnerSide === "east" ? "bg-east" : "bg-east/20")}
        />
        <div
          className={cn("flex-1 transition-all", winnerSide === "west" ? "bg-west" : "bg-west/20")}
        />
      </div>

      <div className="p-6 space-y-5">
        <WinnerReveal result={result} winner={winner} loser={loser} isUpset={isUpset} />

        <KimariteCard
          kimariteId={kimariteId}
          kimariteName={kimariteName}
          kimariteNameJa={kimariteNameJa}
          kimariteDescription={kimariteDescription}
          rarity={rarity}
          compact={compact}
          kimariteObservedPct={kimariteObservedPct}
        />

        {!compact && (
          <BoutStatsRow
            result={result}
            eastRikishi={eastRikishi}
            westRikishi={westRikishi}
            tachiaiWinner={tachiaiWinner}
            duration={duration}
          />
        )}
      </div>
    </div>
  );
}
