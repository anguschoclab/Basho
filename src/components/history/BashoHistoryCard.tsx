/**
 * BashoHistoryCard.tsx
 *
 * Per-basho record card for HistoryPage — yūshō winner, jun-yūshō,
 * special prizes, and prize-tier summary.
 */

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Star } from "lucide-react";
import { RikishiName, StableName } from "@/components/ClickableName";
import {
  BASHO_CALENDAR,
  RANK_HIERARCHY,
  getBashoByNumber,
  getBashoIndex,
} from "@/presenters/uiDigest";
import type { Rank } from "@/engine/types/banzuke";
import type { BashoName } from "@/engine/types/basho";
import type { Rikishi } from "@/engine/types/rikishi";
import { getHeya } from "@/presenters/worldAccess";
import type { WorldState } from "@/presenters/uiDigest";
import type { HistoryRecord } from "./historySort";

/**
 * Safe millions.
 *  * @param yen - The Yen.
 */
function safeMillions(yen?: number) {
  if (!Number.isFinite(yen)) return null;
  return (yen as number) / 1_000_000;
}

/**
 * Safe rank ja.
 *  * @param rank - The Rank.
 *  * @returns The result.
 */
function safeRankJa(rank: string | null | undefined): string {
  const info = rank ? RANK_HIERARCHY[rank as Rank] : undefined;
  return info?.nameJa ?? String(rank ?? "—");
}

type GetRikishi = (id: string) => Rikishi | null | undefined;

/** One basho record card — header meta plus yūshō/jun-yūshō/prize grid. */
export function BashoHistoryCard({
  basho,
  world,
  getRikishi,
}: {
  basho: HistoryRecord;
  world: WorldState;
  getRikishi: GetRikishi | undefined;
}) {
  const bashoInfo = basho.bashoNumber
    ? getBashoByNumber(basho.bashoNumber as 1 | 2 | 3 | 4 | 5 | 6)
    : BASHO_CALENDAR[basho.bashoName as BashoName];
  const bashoNameJa = bashoInfo?.nameJa ?? basho.bashoName;
  const bashoNameEn = bashoInfo?.nameEn ?? "Tournament";
  const bashoLocation = bashoInfo?.location ?? "—";
  const bashoIdx = basho.bashoName ? getBashoIndex(basho.bashoName as BashoName) : -1;

  const yushoRikishi = basho.yusho ? (getRikishi?.(basho.yusho) ?? null) : null;
  const yushoHeya = yushoRikishi ? getHeya(world, yushoRikishi.heyaId) : null;

  const junYushoIds = Array.isArray(basho.junYusho) ? basho.junYusho : [];
  const prizes = basho.prizes ?? null;

  // Prefer yusho prize as "headline" prize; otherwise show none.
  const yushoMillions = safeMillions(prizes?.yushoAmount);

  const shukun = basho.shukunsho ? (getRikishi?.(basho.shukunsho) ?? null) : null;
  const kanto = basho.kantosho ? (getRikishi?.(basho.kantosho) ?? null) : null;
  const gino = basho.ginoSho ? (getRikishi?.(basho.ginoSho) ?? null) : null;

  return (
    <Card className="paper">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="font-display text-2xl flex items-center gap-3 flex-wrap">
              {bashoNameJa}
              <Badge variant="outline">{bashoNameEn}</Badge>
            </CardTitle>
            <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1 flex-wrap">
              <span>{basho.year}年</span>
              <span>{bashoLocation}</span>
              <Badge variant="secondary" className="text-xs">
                {bashoIdx >= 0 ? `${bashoIdx + 1}/6` : `#${basho.bashoNumber}`}
              </Badge>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-sm text-muted-foreground">Yūshō Prize</div>
            <div className="font-mono">
              {yushoMillions === null
                ? "—"
                : yushoMillions >= 30
                  ? "Grand Prize"
                  : yushoMillions >= 10
                    ? "Substantial"
                    : "Modest"}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Yusho Winner */}
          {yushoRikishi ? (
            <div className="p-4 rounded-lg bg-gold/10 border border-gold/20">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-5 w-5 text-gold" />
                <span className="text-sm font-medium text-gold">優勝 Yūshō</span>
              </div>
              <div className="font-display text-xl font-bold">
                <RikishiName id={yushoRikishi.id} name={yushoRikishi.shikona} />
              </div>
              <div className="text-sm text-muted-foreground">
                {safeRankJa(yushoRikishi.rank)} •{" "}
                {yushoHeya ? <StableName id={yushoHeya.id} name={yushoHeya.name} /> : "—"}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">優勝 Yūshō</span>
              </div>
              <div className="text-sm text-muted-foreground">Winner not available</div>
            </div>
          )}

          {/* Jun-Yusho */}
          {junYushoIds.length > 0 ? (
            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-2 mb-2">
                <Medal className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">準優勝 Jun-Yūshō</span>
              </div>
              <div className="space-y-1">
                {junYushoIds
                  .slice(0, 3)
                  .map((rid) => ({ rid, rikishi: getRikishi?.(rid) ?? null }))
                  .filter((e): e is { rid: string; rikishi: Rikishi } => e.rikishi !== null)
                  .map(({ rid, rikishi }) => (
                    <div key={rid} className="font-display">
                      <RikishiName id={rid} name={rikishi.shikona} />
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-2 mb-2">
                <Medal className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">準優勝 Jun-Yūshō</span>
              </div>
              <div className="text-sm text-muted-foreground">—</div>
            </div>
          )}

          {/* Special Prizes */}
          <SpecialPrizesRow shukun={shukun} kanto={kanto} gino={gino} />
        </div>
      </CardContent>
    </Card>
  );
}

/** One special-prize cell (sansō) — icon, ja label, recipient. */
function PrizeCell({
  icon,
  label,
  rikishi,
}: {
  icon: ReactNode;
  label: string;
  rikishi: Rikishi | null;
}) {
  return (
    <div className="p-3 rounded-lg bg-secondary/30 text-center">
      {icon}
      <div className="text-xs text-muted-foreground">{label}</div>
      {rikishi ? (
        <div className="text-sm font-display">
          <RikishiName id={rikishi.id} name={rikishi.shikona} />
        </div>
      ) : (
        <div className="text-sm font-display">—</div>
      )}
    </div>
  );
}

/** Shukun-shō / Kantō-shō / Ginō-shō trio. */
function SpecialPrizesRow({
  shukun,
  kanto,
  gino,
}: {
  shukun: Rikishi | null;
  kanto: Rikishi | null;
  gino: Rikishi | null;
}) {
  return (
    <div className="md:col-span-2 grid grid-cols-3 gap-3">
      <PrizeCell
        icon={<Award className="h-4 w-4 mx-auto mb-1 text-gold" />}
        label="殊勲賞"
        rikishi={shukun}
      />
      <PrizeCell
        icon={<Star className="h-4 w-4 mx-auto mb-1 text-destructive" />}
        label="敢闘賞"
        rikishi={kanto}
      />
      <PrizeCell
        icon={<Medal className="h-4 w-4 mx-auto mb-1 text-primary" />}
        label="技能賞"
        rikishi={gino}
      />
    </div>
  );
}
