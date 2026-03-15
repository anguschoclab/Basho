import { clamp } from "../engine/utils";
import { clamp } from '../engine/utils';
// RivalriesPage.tsx — Polished with heat indicators, H2H visualizations, and intensity badges

import { Helmet } from "react-helmet";
import { AppLayout } from "@/components/layout/AppLayout";
import { useMemo, useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { RikishiName, StableName } from "@/components/ClickableName";
import { Flame, Swords, Users, Trophy, TrendingUp, Search, X, Zap, Shield } from "lucide-react";
import { toRivalryHeatBand as toRHBand, RIVALRY_HEAT_LABELS } from "@/engine/descriptorBands";
import {
  type RivalryPairState,
  type RivalryHeatBand,
  type RivalryTone,
  type RivalryTrigger,
  createDefaultRivalriesState,
} from "@/engine/rivalries";
import { formatRank } from "@/engine/banzuke";

// Display config
const HEAT_BAND_CONFIG: Record<RivalryHeatBand, { label: string; color: string; bgColor: string; barColor: string; glowClass: string }> = {
  inferno: { label: "Inferno", color: "text-destructive", bgColor: "bg-destructive/15 border-destructive/30", barColor: "bg-gradient-to-r from-destructive to-accent", glowClass: "shadow-[0_0_12px_hsl(var(--destructive)/0.3)]" },
  hot:     { label: "Hot",     color: "text-accent",      bgColor: "bg-accent/15 border-accent/30",           barColor: "bg-gradient-to-r from-accent to-warning",      glowClass: "" },
  warm:    { label: "Warm",    color: "text-warning",     bgColor: "bg-warning/15 border-warning/30",         barColor: "bg-warning",                                    glowClass: "" },
  cold:    { label: "Cold",    color: "text-muted-foreground", bgColor: "bg-muted border-border",             barColor: "bg-muted-foreground",                           glowClass: "" },
};

const TONE_CONFIG: Record<RivalryTone, { label: string; description: string; icon: typeof Swords; ja: string }> = {
  respect:        { label: "Mutual Respect",   description: "A rivalry built on admiration and competitive fire.",    icon: Trophy,     ja: "敬意" },
  grudge:         { label: "Grudge",           description: "Bad blood simmers beneath the surface.",                icon: Flame,      ja: "恨み" },
  bad_blood:      { label: "Bad Blood",        description: "Open hostility — every bout is personal.",              icon: Swords,     ja: "因縁" },
  mentor_student: { label: "Mentor vs Student", description: "The student seeks to surpass the master.",             icon: Shield,     ja: "師弟" },
  unstable:       { label: "Volatile",         description: "Unpredictable clashes with explosive outcomes.",        icon: Zap,        ja: "不安定" },
  public_hype:    { label: "Fan Favorite",     description: "The crowd lives for this matchup.",                     icon: Users,      ja: "人気" },
};

const TRIGGER_LABELS: Record<RivalryTrigger, string> = {
  repeat_matches: "Frequent bouts", close_finish: "Close finishes", upset: "Upsets",
  kinboshi: "Kinboshi", title_stakes: "Title stakes", injury_incident: "Injury incident",
  personal_history: "Personal history", heya_feud: "Stable feud",
};

// Helpers


// H2H Bar visualization
/**
 * h2 h bar.
 *  * @param { aWins, bWins, aName, bName } - The { a wins, b wins, a name, b name }.
 */
function H2HBar({ aWins, bWins, aName, bName }: { aWins: number; bWins: number; aName: string; bName: string }) {
  const total = aWins + bWins;
  if (total === 0) return <div className="text-xs text-muted-foreground text-center py-2">No bouts yet</div>;
  const aPct = (aWins / total) * 100;
  const bPct = (bWins / total) * 100;
  const dominant = aWins > bWins ? "a" : bWins > aWins ? "b" : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className={`font-display font-bold ${dominant === "a" ? "text-primary" : "text-muted-foreground"}`}>
          {aName}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">{total} bout{total !== 1 ? "s" : ""}</span>
        <span className={`font-display font-bold ${dominant === "b" ? "text-primary" : "text-muted-foreground"}`}>
          {bName}
        </span>
      </div>
      <div className="flex h-6 rounded-md overflow-hidden border border-border/50">
        <div
          className="bg-primary/80 flex items-center justify-center text-[11px] font-bold text-primary-foreground transition-all"
          style={{ width: `${Math.max(aPct, 8)}%` }}
        >
          {aWins}
        </div>
        <div
          className="bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground transition-all"
          style={{ width: `${Math.max(bPct, 8)}%` }}
        >
          {bWins}
        </div>
      </div>
    </div>
  );
}

// Heat gauge
/**
 * heat gauge.
 *  * @param { heat, band } - The { heat, band }.
 */
function HeatGauge({ heat, band }: { heat: number; band: RivalryHeatBand }) {
  const config = HEAT_BAND_CONFIG[band];
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Rivalry Heat</span>
        <span className={`text-[10px] font-semibold ${config.color}`}>{Math.round(heat)}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${config.barColor}`} style={{ width: `${heat}%` }} />
      </div>
    </div>
  );
}

// Rivalry Card
/** Defines the structure for rivalry card props. */
interface RivalryCardProps {
  pair: RivalryPairState;
  world: NonNullable<ReturnType<typeof useGame>["state"]["world"]>;
  isPlayerRivalry?: boolean;
  index: number;
}

/**
 * rivalry card.
 *  * @param { pair, world, isPlayerRivalry, index } - The { pair, world, is player rivalry, index }.
 */
function RivalryCard({ pair, world, isPlayerRivalry, index }: RivalryCardProps) {
  const rikishiA = world.rikishi.get(pair.aId);
  const rikishiB = world.rikishi.get(pair.bId);
  if (!rikishiA || !rikishiB) return null;

  const heyaA = world.heyas.get(rikishiA.heyaId);
  const heyaB = world.heyas.get(rikishiB.heyaId);
  const heat = clamp(, 0, 100)
    .sort((a, b) => b[1] - a[1]).slice(0, 3)
    .filter(([t]) => t in TRIGGER_LABELS)
    .map(([t]) => t as RivalryTrigger);
  const aWins = safeInt((pair as any).aWins);
  const bWins = safeInt((pair as any).bWins);

  const rankA = formatRank({ rank: rikishiA.rank, side: rikishiA.side ?? "east", rankNumber: rikishiA.rankNumber } as any);
  const rankB = formatRank({ rank: rikishiB.rank, side: rikishiB.side ?? "east", rankNumber: rikishiB.rankNumber } as any);

  return (
    <Card className={`overflow-hidden bout-enter ${isPlayerRivalry ? "ring-1 ring-primary/30" : ""} ${heatConfig.glowClass}`}
      style={{ animationDelay: `${index * 60}ms` }}>
      {/* Heat intensity bar at top */}
      <div className={`h-1 ${heatConfig.barColor}`} />

      <CardContent className="p-4 space-y-4">
        {/* Header: Heat badge + tone */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={`${heatConfig.bgColor} ${heatConfig.color} border text-[10px] gap-1`}>
              <Flame className={`h-3 w-3 ${heatBand === "inferno" ? "animate-pulse" : ""}`} />
              {heatConfig.label}
            </Badge>
            {isPlayerRivalry && (
              <Badge variant="default" className="text-[10px] h-5">Your Stable</Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <ToneIcon className={`h-3.5 w-3.5 ${heatConfig.color}`} />
            <span className="text-[10px] font-medium">{toneInfo.label}</span>
            <span className="text-[9px] font-display opacity-60">{toneInfo.ja}</span>
          </div>
        </div>

        {/* VS display */}
        <div className="flex items-center gap-3">
          <div className="flex-1 text-right space-y-0.5">
            <div className="font-display font-bold text-base">
              <RikishiName id={rikishiA.id} name={rikishiA.shikona} />
            </div>
            <div className="text-[10px] text-muted-foreground">{rankA}</div>
            {heyaA && <div className="text-[10px]"><StableName id={heyaA.id} name={heyaA.name} className="text-muted-foreground" /></div>}
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
            {heyaB && <div className="text-[10px]"><StableName id={heyaB.id} name={heyaB.name} className="text-muted-foreground" /></div>}
          </div>
        </div>

        {/* H2H bar */}
        <H2HBar aWins={aWins} bWins={bWins} aName={rikishiA.shikona} bName={rikishiB.shikona} />

        {/* Tone description */}
        <p className="text-xs text-muted-foreground italic">{toneInfo.description}</p>

        {/* Triggers */}
        {topTriggers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {topTriggers.map(t => (
              <Badge key={t} variant="outline" className="text-[10px] font-normal">{TRIGGER_LABELS[t]}</Badge>
            ))}
          </div>
        )}

        {/* Heat gauge */}
        <HeatGauge heat={heat} band={heatBand} />
      </CardContent>
    </Card>
  );
}

// Page
/** rivalries page. */
export default function RivalriesPage() {
  const { state } = useGame();
  const { world, playerHeyaId } = state;
  const [searchQuery, setSearchQuery] = useState("");

  const rivalriesState = useMemo(() => {
    if (!world) return createDefaultRivalriesState();
    const rs = (world as any).rivalries;
    return rs && typeof rs === "object" && rs.pairs ? rs : createDefaultRivalriesState();
  }, [world]);

  const playerRikishiIds = useMemo(() => {
    if (!world || !playerHeyaId) return new Set<string>();
    const heya = world.heyas.get(playerHeyaId);
    return new Set(heya?.rikishiIds ?? []);
  }, [world, playerHeyaId]);

  const { playerRivalries, hotRivalries, coolRivalries, stats } = useMemo(() => {
    const rawPairs = Object.values((rivalriesState as any).pairs ?? {}) as any[];
    const normalized: RivalryPairState[] = rawPairs
      .filter(p => p && typeof p === "object" && typeof p.aId === "string" && typeof p.bId === "string")
      .map(p => ({ ...p, key: safeKey(p), heat: clamp(, 0, 100), aWins: safeInt(p.aWins), bWins: safeInt(p.bWins), triggers: safeTriggers(p.triggers), tone: safeTone(p.tone) })) as RivalryPairState[];

    // Search filter
    const filtered = searchQuery
      ? normalized.filter(p => {
          const a = world?.rikishi.get(p.aId);
          const b = world?.rikishi.get(p.bId);
          const q = searchQuery.toLowerCase();
          return (a?.shikona?.toLowerCase().includes(q)) || (b?.shikona?.toLowerCase().includes(q));
        })
      : normalized;

    const player: RivalryPairState[] = [];
    const hot: RivalryPairState[] = [];
    const cool: RivalryPairState[] = [];

    for (const pair of filtered) {
      const isPlayer = playerRikishiIds.has(pair.aId) || playerRikishiIds.has(pair.bId);
      if (isPlayer) player.push(pair);
      if ((pair.heat ?? 0) >= 55 && !isPlayer) hot.push(pair);
      if ((pair.heat ?? 0) < 55 && !isPlayer) cool.push(pair);
    }

    const byHeat = (a: RivalryPairState, b: RivalryPairState) => (b.heat ?? 0) - (a.heat ?? 0);
    player.sort(byHeat); hot.sort(byHeat); cool.sort(byHeat);

    const { infernoCount, hotCount } = normalized.reduce((acc, p) => {
      const heat = p.heat ?? 0;
      if (heat >= 80) acc.infernoCount++;
      else if (heat >= 55) acc.hotCount++;
      return acc;
    }, { infernoCount: 0, hotCount: 0 });

    return { playerRivalries: player, hotRivalries: hot, coolRivalries: cool, stats: { total: normalized.length, inferno: infernoCount, hot: hotCount } };
  }, [rivalriesState, playerRikishiIds, searchQuery, world]);

  if (!world) {
    return (
      <AppLayout pageTitle="Rivalries & Feuds">
        <Card><CardContent className="p-12 text-center text-muted-foreground">No world loaded.</CardContent></Card>
      </AppLayout>
    );
  }

  const competitionTabs = [
    { id: "basho", label: "Basho", href: "/basho" },
    { id: "banzuke", label: "Banzuke", href: "/banzuke" },
    { id: "rivalries", label: "Rivalries" },
  ];

  const hasRivalries = stats.total > 0;

  return (
    <AppLayout pageTitle="Rivalries & Feuds" subNavTabs={competitionTabs} activeSubTab="rivalries">
      <Helmet><title>Rivalries & Feuds - Basho</title></Helmet>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-destructive/20 flex items-center justify-center">
              <Swords className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {stats.inferno > 0 && (
                  <Badge className="bg-destructive/15 text-destructive border-destructive/30 border text-[10px] gap-1">
                    <Flame className="h-3 w-3 animate-pulse" /> {stats.inferno} Inferno
                  </Badge>
                )}
                {stats.hot > 0 && (
                  <Badge className="bg-accent/15 text-accent border-accent/30 border text-[10px] gap-1">
                    <Flame className="h-3 w-3" /> {stats.hot} Hot
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground">{stats.total} total rivalries</span>
              </div>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search rikishi…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-8 w-48 pl-8 pr-8 text-xs"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {!hasRivalries ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Swords className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-display text-xl font-semibold mb-2">No Rivalries Yet</h3>
              <p className="text-muted-foreground">Rivalries develop as rikishi meet repeatedly. Complete tournaments to see tensions form.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {playerRivalries.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Your Stable's Rivalries
                  <span className="text-xs text-muted-foreground font-normal">({playerRivalries.length})</span>
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {playerRivalries.slice(0, 6).map((pair, i) => (
                    <RivalryCard key={pair.key} pair={pair} world={world} isPlayerRivalry index={i} />
                  ))}
                </div>
              </section>
            )}

            {hotRivalries.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                  <Flame className="h-4 w-4 text-accent" />
                  Hot Rivalries Across Sumo
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {hotRivalries.slice(0, 6).map((pair, i) => (
                    <RivalryCard key={pair.key} pair={pair} world={world} index={i} />
                  ))}
                </div>
              </section>
            )}

            {coolRivalries.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-display text-lg font-semibold flex items-center gap-2 text-muted-foreground">
                  <Swords className="h-4 w-4" />
                  Developing Rivalries
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {coolRivalries.slice(0, 6).map((pair, i) => (
                    <RivalryCard key={pair.key} pair={pair} world={world}
                      isPlayerRivalry={playerRikishiIds.has(pair.aId) || playerRikishiIds.has(pair.bId)}
                      index={i} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Heat legend */}
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground border border-border/50 rounded-md px-3 py-2 bg-muted/20 w-fit flex-wrap">
          {(["inferno", "hot", "warm", "cold"] as RivalryHeatBand[]).map(band => {
            const c = HEAT_BAND_CONFIG[band];
            return (
              <span key={band} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${c.bgColor} border`} />
                <span className={c.color}>{c.label}</span>
              </span>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
