// BoutResultDisplay.tsx
// Bout Result display - shows outcome with kimarite
//
// Fixes:
// - Works with either `result.kimarite` OR `result.kimariteId` OR `result.kimariteName`
// - Safely handles missing fields (stance/duration/log/tachiaiWinner)
// - Robust kimarite lookup even if registry/getKimarite expects an id
// - Avoids calling .replace on undefined stance
// - Safe rarity badge even if rarity missing

import { cn } from "@/lib/utils";
import type { BoutResult, Rikishi } from "@/engine/types";
import { Badge } from "@/components/ui/badge";
import { getKimarite } from "@/engine/kimarite";

interface BoutResultDisplayProps {
  result: BoutResult;
  eastRikishi: Rikishi;
  westRikishi: Rikishi;
  className?: string;
}

function safeString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function safeNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function titleCase(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatStance(raw: unknown): string {
  const s = safeString(raw, "");
  if (!s) return "—";
  return titleCase(s.split("-").join(" "));
}

export function BoutResultDisplay({
  result,
  eastRikishi,
  westRikishi,
  className
}: BoutResultDisplayProps) {
  const winner = result.winner === "east" ? eastRikishi : westRikishi;
  const loser = result.winner === "east" ? westRikishi : eastRikishi;

  // Support multiple possible fields across engine revisions
  const kimariteId =
    safeString((result as any).kimarite) ||
    safeString((result as any).kimariteId) ||
    "";

  // Prefer explicit name from result; fallback to lookup; fallback to em dash
  const kimariteFromLookup = kimariteId ? getKimarite(kimariteId) : null;
  const kimariteName =
    safeString((result as any).kimariteName) ||
    safeString(kimariteFromLookup?.name) ||
    "—";

  const kimariteNameJa = safeString(kimariteFromLookup?.nameJa);
  const kimariteDescription = safeString(kimariteFromLookup?.description);

  const rarity = safeString((kimariteFromLookup as any)?.rarity, "").toLowerCase();
  const showRarity = Boolean(rarity);

  const duration = safeNumber((result as any).duration, 0);
  const tachiaiWinner = (result as any).tachiaiWinner as "east" | "west" | undefined;

  return (
    <div className={cn("paper p-6 text-center", className)}>
      {/* Winner announcement */}
      <div className="mb-4">
        {Boolean((result as any).upset) && (
          <Badge variant="destructive" className="mb-2 animate-scale-in">
            🎊 UPSET!
          </Badge>
        )}

        <h2 className="font-display text-3xl font-bold text-foreground mb-1 animate-fade-in">
          {winner?.shikona ?? "Unknown"}
        </h2>

        <p className="text-muted-foreground">
          defeats <span className="font-medium">{loser?.shikona ?? "Unknown"}</span>
        </p>
      </div>

      {/* Kimarite */}
      <div className="bg-secondary/50 rounded-lg p-4 mb-4">
        <p className="text-sm text-muted-foreground uppercase tracking-wide mb-1">
          Winning Technique
        </p>

        <p className="font-display text-2xl font-semibold text-foreground">
          {kimariteName}
        </p>

        {kimariteNameJa && (
          <p className="text-lg text-muted-foreground">{kimariteNameJa}</p>
        )}

        {kimariteDescription && (
          <p className="text-sm text-muted-foreground mt-2">{kimariteDescription}</p>
        )}

        {showRarity && (
          <Badge
            variant="outline"
            className={cn(
              "mt-2 capitalize",
              rarity === "legendary" && "border-gold text-gold",
              rarity === "rare" && "border-accent text-accent",
              rarity === "uncommon" && "border-primary text-primary"
            )}
          >
            {rarity}
          </Badge>
        )}
      </div>

      {/* Match details */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Tachiai</p>
          <p
            className={cn(
              "font-medium",
              tachiaiWinner === "east" ? "text-east" : tachiaiWinner === "west" ? "text-west" : "text-muted-foreground"
            )}
          >
            {tachiaiWinner === "east"
              ? eastRikishi?.shikona ?? "—"
              : tachiaiWinner === "west"
              ? westRikishi?.shikona ?? "—"
              : "—"}
          </p>
        </div>

        <div>
          <p className="text-muted-foreground">Stance</p>
          <p className="font-medium text-foreground">{formatStance((result as any).stance)}</p>
        </div>

        <div>
          <p className="text-muted-foreground">Duration</p>
          <p className="font-medium text-foreground">{duration > 0 ? `${duration} ticks` : "—"}</p>
        </div>
      </div>
    </div>
  );
}
