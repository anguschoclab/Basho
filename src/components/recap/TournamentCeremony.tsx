/**
 * src/components/recap/TournamentCeremony.tsx
 *
 * Cinematic display for post-basho champion reveals and special prizes.
 * Features high-fidelity heraldry, yūshō calligraphy, and medal displays.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Trophy, Star, Medal, Crown, Award, Zap, Building } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BashoResult } from "@/engine/types/basho";
import type { UIRikishi } from "@/presenters/uiModels";
import { RikishiName } from "@/components/ClickableName";
import { StableName } from "@/components/ClickableName";

interface TournamentCeremonyProps {
  lastBasho: BashoResult;
  champion: { rikishi: UIRikishi; heyaName: string } | null;
  isPlayerChampion: boolean;
  junYusho: Array<{ rikishi: UIRikishi; heyaName: string }>;
  kinboshi: Array<{ winner: UIRikishi; loser: UIRikishi }>;
  ginoSho: UIRikishi | null;
  shukunSho: UIRikishi | null;
  kantoSho: UIRikishi | null;
}

export function TournamentCeremony({
  lastBasho,
  champion,
  isPlayerChampion,
  junYusho,
  kinboshi,
  ginoSho,
  shukunSho,
  kantoSho,
}: TournamentCeremonyProps) {
  if (!lastBasho) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-1000">
      {/* ═══ YŪSHŌ CHAMPION ═══ */}
      {champion && (
        <section className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-gold/20 via-gold/10 to-gold/20 rounded-lg blur-xl opacity-50 group-hover:opacity-100 transition duration-1000" />
          <Card className="dossier-paper border-2 border-gold/20 relative overflow-hidden bg-gold/[0.02]">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] font-display text-9xl font-black italic pointer-events-none -rotate-6">
              CHAMPION
            </div>
            <div className="p-8 relative z-10">
              <div className="flex items-start gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Crown className="h-6 w-6 text-gold" />
                    <h2 className="text-3xl font-display font-black text-gold">YŪSHŌ</h2>
                    <Badge className="bg-gold/20 text-gold border-gold/40">Emperor's Cup</Badge>
                  </div>
                  <p className="text-lg font-display font-bold">
                    <RikishiName id={champion.rikishi.id} name={champion.rikishi.shikona} />
                  </p>
                  <p className="text-sm text-muted-foreground">{champion.heyaName}</p>
                </div>
              </div>
            </div>

            <CardContent className="pt-4 pb-8 flex flex-col md:flex-row items-center gap-12 px-8">
              <div className="relative">
                <div className="h-32 w-32 bg-gold/10 rounded-full flex items-center justify-center border-4 border-gold/20 relative z-10">
                  <Trophy className="h-16 w-16 text-gold drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                </div>
                <div className="absolute -bottom-2 translate-y-1/2 left-1/2 -translate-x-1/2 bg-gold text-white font-black text-[10px] px-3 py-1 rounded-full shadow-lg z-20">
                  優勝
                </div>
              </div>

              <div className="flex-1 text-center md:text-left space-y-4">
                <div className="space-y-1">
                  <h3 className="text-5xl font-display font-black tracking-tighter sumi-e-ink">
                    <RikishiName id={champion.rikishi.id} name={champion.rikishi.shikona} />
                  </h3>
                  <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 text-sm font-black uppercase tracking-widest text-muted-foreground/70">
                    <span className="flex items-center gap-2">
                      <Building className="h-4 w-4" />{" "}
                      <StableName id={champion.rikishi.heyaId} name={champion.heyaName} /> Stable
                    </span>
                    <span className="h-1 w-1 bg-muted-foreground/30 rounded-full" />
                    <span>{champion.rikishi.rank} Hierarchy</span>
                  </div>
                </div>

                <div className="flex items-center justify-center md:justify-start gap-4">
                  <div className="text-center bg-background/50 border border-border/40 px-6 py-2 rounded-lg">
                    <div className="text-2xl font-display font-black text-gold">
                      {champion.rikishi.currentBashoWins}-{champion.rikishi.currentBashoLosses}
                    </div>
                    <div className="text-[8px] uppercase font-black opacity-40">Final Record</div>
                  </div>
                  {isPlayerChampion && (
                    <Badge className="bg-primary text-white font-black tracking-widest text-[9px] px-4 h-8 animate-pulse shadow-xl shadow-primary/20">
                      YOUR STABLE TRIUMPHS
                    </Badge>
                  )}
                </div>
              </div>

              <div className="hidden lg:flex flex-col items-end opacity-20 select-none pointer-events-none">
                <div className="text-4xl font-display font-black italic">天皇賜杯</div>
                <div className="text-xs uppercase font-black tracking-[0.5em]">Emperor's Cup</div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* ═══ JUN-YŪSHŌ (RUNNER-UP) ═══ */}
        <Card className="dossier-paper border-l-4 border-l-gold">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gold/10 rounded-lg">
                <Medal className="h-5 w-5 text-gold" />
              </div>
              <div>
                <CardTitle className="text-lg font-display font-black uppercase tracking-tight">
                  Jun-Yūshō
                </CardTitle>
                <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">
                  Tournament Runners-up
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {junYusho.map((entry) => (
                <div
                  key={entry.rikishi.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/40 group hover:border-gold/30 transition-colors"
                >
                  <div className="font-display font-black group-hover:text-gold transition-colors">
                    <RikishiName id={entry.rikishi.id} name={entry.rikishi.shikona} />
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs font-bold uppercase tracking-wider border-gold/30 text-gold"
                  >
                    Runner-up
                  </Badge>
                </div>
              ))}
              {!junYusho.length && (
                <EmptyState icon={Medal} title="No runners-up recorded." compact />
              )}
            </div>
          </CardContent>
        </Card>

        {/* ═══ KINBOSHI (GOLD STARS) ═══ */}
        <Card className="dossier-paper border-l-4 border-l-gold lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gold/10 rounded-lg">
                <Star className="h-5 w-5 text-gold" />
              </div>
              <div>
                <CardTitle className="text-lg font-display font-black uppercase tracking-tight">
                  Kinboshi (Gold Stars)
                </CardTitle>
                <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">
                  Maegashira victories over Yokozuna
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {kinboshi.length > 0 ? (
                kinboshi.map((k, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-gold/5 border-2 border-gold/10 rounded-lg space-y-3 relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 p-2 opacity-5 font-black text-2xl">
                      ★
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-gold" />
                        <span className="text-xs font-bold uppercase tracking-wider text-gold">
                          Kinboshi
                        </span>
                      </div>
                      <p className="font-display font-black">
                        <RikishiName id={k.winner.id} name={k.winner.shikona} />
                      </p>
                      <p className="text-sm text-muted-foreground">
                        defeated <RikishiName id={k.loser.id} name={k.loser.shikona} />
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2">
                  <EmptyState icon={Star} title="No kinboshi this tournament." compact />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ SPECIAL PRIZES (SANSŌ) ═══ */}
      <section className="space-y-6 pt-4">
        <div className="flex items-center gap-3">
          <h3 className="text-2xl font-display font-black uppercase tracking-tight">
            Special Prizes (三賞)
          </h3>
          <div className="h-px flex-1 bg-border/40" />
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              rikishi: shukunSho,
              label: "Shukun-shō",
              ja: "殊勲賞",
              sub: "Outstanding Performance",
              icon: <Star className="h-5 w-5 text-destructive" />,
              color: "border-destructive/20 bg-destructive/5",
            },
            {
              rikishi: kantoSho,
              label: "Kantō-shō",
              ja: "敢闘賞",
              sub: "Fighting Spirit",
              icon: <Award className="h-5 w-5 text-west" />,
              color: "border-west/20 bg-west/5",
            },
            {
              rikishi: ginoSho,
              label: "Ginō-shō",
              ja: "技能賞",
              sub: "Technique",
              icon: <Zap className="h-5 w-5 text-west" />,
              color: "border-west/20 bg-west/5",
            },
          ].map((prize, i) => (
            <div
              key={i}
              className={cn(
                "dossier-paper border-2 p-6 rounded-lg relative transition-transform hover:scale-[1.02]",
                prize.color
              )}
            >
              <div className="absolute top-4 right-4">{prize.icon}</div>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {prize.label}
                  </div>
                  <div className="text-2xl font-display font-black">{prize.ja}</div>
                </div>
                {prize.rikishi && (
                  <>
                    <div className="text-sm text-muted-foreground">{prize.sub}</div>
                    <div className="font-display font-black">
                      <RikishiName id={prize.rikishi.id} name={prize.rikishi.shikona} />
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
