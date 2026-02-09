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
import { useNavigate } from "react-router-dom";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BASHO_CALENDAR } from "@/engine/calendar";
import { RANK_HIERARCHY } from "@/engine/banzuke";
import { Trophy, Medal, Award, Star, ArrowLeft, Calendar } from "lucide-react";
import { RikishiName, StableName } from "@/components/ClickableName";

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

function safeMillions(yen?: number) {
  if (!Number.isFinite(yen)) return null;
  return (yen as number) / 1_000_000;
}

function safeRankJa(rank: any): string {
  return (RANK_HIERARCHY as any)?.[rank]?.nameJa ?? String(rank ?? "—");
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { state, getRikishi } = useGame();
  const { world } = state;

  if (!world) {
    navigate("/");
    return null;
  }

  const history = [...((world.history ?? []) as HistoryRecord[])].reverse();

  return (
    <>
      <Helmet>
        <title>History - Basho</title>
      </Helmet>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div>
            <h1 className="font-display text-3xl font-bold">Basho History</h1>
            <p className="text-muted-foreground">{history.length} tournaments completed</p>
          </div>
        </div>

        {history.length === 0 ? (
          <Card className="paper">
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-display text-xl font-semibold mb-2">No History Yet</h3>
              <p className="text-muted-foreground mb-4">Complete your first basho to see results here.</p>
              <Button onClick={() => navigate("/")}>Return to Dashboard</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {history.map((basho) => {
              const bashoInfo = (BASHO_CALENDAR as any)?.[basho.bashoName];
              const bashoNameJa = bashoInfo?.nameJa ?? basho.bashoName;
              const bashoNameEn = bashoInfo?.nameEn ?? "Tournament";
              const bashoLocation = bashoInfo?.location ?? "—";

              const yushoRikishi = basho.yusho ? getRikishi?.(basho.yusho) ?? null : null;
              const yushoHeya = yushoRikishi ? world.heyas.get(yushoRikishi.heyaId) : null;

              const junYushoIds = Array.isArray((basho as any).junYusho) ? ((basho as any).junYusho as string[]) : [];
              const prizes = ((basho as any).prizes as HistoryRecord["prizes"]) ?? null;

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
                        <CardDescription className="flex items-center gap-3 mt-1 flex-wrap">
                          <span>{basho.year}年</span>
                          <span>{bashoLocation}</span>
                          <Badge variant="secondary" className="text-xs">
                            Basho #{basho.bashoNumber}
                          </Badge>
                        </CardDescription>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm text-muted-foreground">Yūshō Prize</div>
                        <div className="font-mono">{yushoMillions === null ? "—" : `¥${yushoMillions.toFixed(0)}M`}</div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Yusho Winner */}
                      {yushoRikishi ? (
                        <div className="p-4 rounded-lg bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/20 dark:to-amber-800/10 border border-amber-200 dark:border-amber-800">
                          <div className="flex items-center gap-2 mb-2">
                            <Trophy className="h-5 w-5 text-amber-600" />
                            <span className="text-sm font-medium text-amber-800 dark:text-amber-400">優勝 Yūshō</span>
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
                          <Award className="h-4 w-4 mx-auto mb-1 text-amber-500" />
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
    </>
  );
}
