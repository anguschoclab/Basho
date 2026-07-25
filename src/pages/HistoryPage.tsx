// HistoryPage.tsx
// History Page - Past basho results and records
//
// DROP-IN FIXES:
// - Uses "Basho" naming in title
// - Safer guards around missing/partial history records (junYusho optional, prizes optional)
// - Stable keys (bashoName+year+bashoNumber) instead of array index
// - Clickable prize recipients only when present
// - No assumptions that getRikishi always returns a value
//
// ADDITIONAL HARDENING:
// - Handles missing BASHO_CALENDAR entries gracefully
// - Avoids repeated getRikishi calls (one lookup per award slot)
// - Guards missing rank in RANK_HIERARCHY
// - Safer prize display (shows yusho prize only when available)

import { Helmet } from "react-helmet";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { useRequireWorld } from "@/components/RequireWorld";
import { AppLayout } from "@/components/layout/AppLayout";
import { RECORDS_TABS } from "@/constants/ui/navigation";
import { PageHeader } from "@/components/layout/control-center";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Star, ArrowLeft, Calendar } from "lucide-react";
import { RikishiName, StableName } from "@/components/ClickableName";
import {
  BASHO_CALENDAR,
  RANK_HIERARCHY,
  getBashoByNumber,
  getBashoIndex,
} from "@/presenters/uiDigest";
import type { Rank } from "@/engine/types/banzuke";
import type { BashoName } from "@/engine/types/basho";

/** Type representing history record. */
type HistoryRecord = {
  year: number;
  bashoNumber: number;
  bashoName: string;
  yusho?: string | null;
  junYusho?: string[] | null;
  ginoSho?: string | null;
  kantosho?: string | null;
  shukunsho?: string | null;
  prizes?: {
    yushoAmount?: number;
    junYushoAmount?: number;
    specialPrizes?: number;
  } | null;
};

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

/** history page. */
export default function HistoryPage() {
  const navigate = useNavigate();
  const { state, getRikishi } = useGame();
  const hasWorld = useRequireWorld("/dashboard");
  const { world } = state;

  if (!hasWorld || !world) return null;

  const history = [...((world.history ?? []) as HistoryRecord[])].reverse();

  return (
    <AppLayout pageTitle="Stable History" subNavTabs={RECORDS_TABS} activeSubTab="history">
      <Helmet>
        <title>History - Basho</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate({ to: "/dashboard" })}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <PageHeader
            eyebrow="── RECORDS ──"
            title="Basho History"
            lede={`${history.length} tournaments completed`}
          />
        </div>

        {history.length === 0 ? (
          <Card className="paper">
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-display text-xl font-semibold mb-2">No History Yet</h3>
              <p className="text-muted-foreground mb-4">
                Complete your first basho to see results here.
              </p>
              <Button onClick={() => navigate({ to: "/dashboard" })}>Return to Dashboard</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {history.map((basho) => {
              const bashoInfo = basho.bashoNumber
                ? getBashoByNumber(basho.bashoNumber as 1 | 2 | 3 | 4 | 5 | 6)
                : BASHO_CALENDAR[basho.bashoName as BashoName];
              const bashoNameJa = bashoInfo?.nameJa ?? basho.bashoName;
              const bashoNameEn = bashoInfo?.nameEn ?? "Tournament";
              const bashoLocation = bashoInfo?.location ?? "—";
              const bashoIdx = basho.bashoName ? getBashoIndex(basho.bashoName as BashoName) : -1;

              const yushoRikishi = basho.yusho ? (getRikishi?.(basho.yusho) ?? null) : null;
              const yushoHeya = yushoRikishi ? world.heyas.get(yushoRikishi.heyaId) : null;

              const junYushoIds = Array.isArray(basho.junYusho) ? basho.junYusho : [];
              const prizes = basho.prizes ?? null;

              // Prefer yusho prize as "headline" prize; otherwise show none.
              const yushoMillions = safeMillions(prizes?.yushoAmount);

              const key = `${basho.year}-${basho.bashoNumber}-${basho.bashoName}`;

              const shukun = basho.shukunsho ? (getRikishi?.(basho.shukunsho) ?? null) : null;
              const kanto = basho.kantosho ? (getRikishi?.(basho.kantosho) ?? null) : null;
              const gino = basho.ginoSho ? (getRikishi?.(basho.ginoSho) ?? null) : null;

              return (
                <Card key={key} className="paper">
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
                        <div className="p-4 rounded-lg bg-gradient-to-br from-gold/10 to-gold/5 border border-gold/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Trophy className="h-5 w-5 text-gold" />
                            <span className="text-sm font-medium text-gold">優勝 Yūshō</span>
                          </div>
                          <div className="font-display text-xl font-bold">
                            <RikishiName id={yushoRikishi.id} name={yushoRikishi.shikona} />
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {safeRankJa(yushoRikishi.rank)} •{" "}
                            {yushoHeya ? (
                              <StableName id={yushoHeya.id} name={yushoHeya.name} />
                            ) : (
                              "—"
                            )}
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
                            {junYushoIds.slice(0, 3).map((rid) => {
                              const r = getRikishi?.(rid) ?? null;
                              if (!r) return null;
                              return (
                                <div key={rid} className="font-display">
                                  <RikishiName id={rid} name={r.shikona} />
                                </div>
                              );
                            })}
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
                      <div className="md:col-span-2 grid grid-cols-3 gap-3">
                        {/* Shukunsho */}
                        <div className="p-3 rounded-lg bg-secondary/30 text-center">
                          <Award className="h-4 w-4 mx-auto mb-1 text-gold" />
                          <div className="text-xs text-muted-foreground">殊勲賞</div>
                          {shukun ? (
                            <div className="text-sm font-display">
                              <RikishiName id={shukun.id} name={shukun.shikona} />
                            </div>
                          ) : (
                            <div className="text-sm font-display">—</div>
                          )}
                        </div>

                        {/* Kantosho */}
                        <div className="p-3 rounded-lg bg-secondary/30 text-center">
                          <Star className="h-4 w-4 mx-auto mb-1 text-rose-500" />
                          <div className="text-xs text-muted-foreground">敢闘賞</div>
                          {kanto ? (
                            <div className="text-sm font-display">
                              <RikishiName id={kanto.id} name={kanto.shikona} />
                            </div>
                          ) : (
                            <div className="text-sm font-display">—</div>
                          )}
                        </div>

                        {/* GinoSho */}
                        <div className="p-3 rounded-lg bg-secondary/30 text-center">
                          <Medal className="h-4 w-4 mx-auto mb-1 text-sky-500" />
                          <div className="text-xs text-muted-foreground">技能賞</div>
                          {gino ? (
                            <div className="text-sm font-display">
                              <RikishiName id={gino.id} name={gino.shikona} />
                            </div>
                          ) : (
                            <div className="text-sm font-display">—</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
