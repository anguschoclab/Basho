// RivalriesPage.tsx
// Rivalries Page - Display rivalries between rikishi with narrative descriptions
// Per Rivalries System v1.0: heat bands, tone descriptions, head-to-head records
//
// FIXES / UPDATES:
// - Avoids crashing if world / rivalries state is missing or partially shaped
// - Uses safe defaulting for pair fields (wins/meetings/heat/triggers/tone/key)
// - Ensures triggers sort is stable even when trigger values are undefined
// - Makes heat meter width safe (0–100)
// - Keeps “allowed numbers” (H2H + meetings + heat %) but avoids any hidden stats
// - Keeps “Your Stable” wording consistent with canon (Basho) and avoids “Stable Lords”
// - Improves empty states and guards for unknown tone/trigger keys

import { Helmet } from "react-helmet";
import { useMemo } from "react";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RikishiName, StableName } from "@/components/ClickableName";
import { Flame, Swords, Users, Trophy, TrendingUp } from "lucide-react";
import {
  type RivalryPairState,
  type RivalryHeatBand,
  type RivalryTone,
  type RivalryTrigger,
  createDefaultRivalriesState
} from "@/engine/rivalries";

// -----------------------------
// Display configuration
// -----------------------------

const HEAT_BAND_CONFIG: Record<
  RivalryHeatBand,
  { label: string; color: string; bgColor: string; description: string }
> = {
  inferno: {
    label: "Inferno",
    color: "text-red-400",
    bgColor: "bg-red-500/20 border-red-500/30",
    description: "Blood feud — every bout is a war"
  },
  hot: {
    label: "Hot",
    color: "text-orange-400",
    bgColor: "bg-orange-500/20 border-orange-500/30",
    description: "Active rivalry with real stakes"
  },
  warm: {
    label: "Warm",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20 border-yellow-500/30",
    description: "Developing tension and interest"
  },
  cold: {
    label: "Cold",
    color: "text-muted-foreground",
    bgColor: "bg-secondary/50 border-border",
    description: "Dormant or historical rivalry"
  }
};

const TONE_DESCRIPTIONS: Record<RivalryTone, { label: string; description: string; icon: typeof Swords }> = {
  respect: {
    label: "Mutual Respect",
    description: "A rivalry built on admiration and competitive spirit.",
    icon: Trophy
  },
  grudge: {
    label: "Grudge",
    description: "Bad blood simmers beneath the surface.",
    icon: Flame
  },
  bad_blood: {
    label: "Bad Blood",
    description: "Open hostility between these two.",
    icon: Swords
  },
  mentor_student: {
    label: "Mentor vs Student",
    description: "The student seeks to surpass the master.",
    icon: Users
  },
  unstable: {
    label: "Unstable",
    description: "Volatile clashes with unpredictable outcomes.",
    icon: TrendingUp
  },
  public_hype: {
    label: "Fan Favorite",
    description: "The crowd loves this matchup.",
    icon: Users
  }
};

const TRIGGER_LABELS: Record<RivalryTrigger, string> = {
  repeat_matches: "Frequent meetings",
  close_finish: "Close finishes",
  upset: "Upsets",
  kinboshi: "Gold star victories",
  title_stakes: "Title implications",
  injury_incident: "Injury incident",
  personal_history: "Personal history",
  heya_feud: "Stable rivalry"
};

// -----------------------------
// Helpers
// -----------------------------

function clamp01to100(n: any): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return Math.max(0, Math.min(100, v));
}

function safeInt(n: any, fallback = 0): number {
  return typeof n === "number" && Number.isFinite(n) ? Math.floor(n) : fallback;
}

function getHeatBand(heat: number): RivalryHeatBand {
  if (heat >= 80) return "inferno";
  if (heat >= 55) return "hot";
  if (heat >= 30) return "warm";
  return "cold";
}

function safeTone(tone: any): RivalryTone {
  if (tone && typeof tone === "string" && tone in TONE_DESCRIPTIONS) return tone as RivalryTone;
  return "respect";
}

function safeKey(pair: any): string {
  if (pair?.key && typeof pair.key === "string") return pair.key;
  const a = typeof pair?.aId === "string" ? pair.aId : "a";
  const b = typeof pair?.bId === "string" ? pair.bId : "b";
  return `${a}__${b}`;
}

function safeTriggers(triggers: any): Record<string, number> {
  if (!triggers || typeof triggers !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(triggers)) {
    out[String(k)] = typeof v === "number" && Number.isFinite(v) ? v : 0;
  }
  return out;
}

function heatBarClass(band: RivalryHeatBand) {
  if (band === "inferno") return "bg-red-500";
  if (band === "hot") return "bg-orange-500";
  if (band === "warm") return "bg-yellow-500";
  return "bg-muted-foreground";
}

// -----------------------------
// Card
// -----------------------------

interface RivalryCardProps {
  pair: RivalryPairState;
  world: NonNullable<ReturnType<typeof useGame>["state"]["world"]>;
  isPlayerRivalry?: boolean;
}

function RivalryCard({ pair, world, isPlayerRivalry }: RivalryCardProps) {
  const rikishiA = world.rikishi.get(pair.aId);
  const rikishiB = world.rikishi.get(pair.bId);
  if (!rikishiA || !rikishiB) return null;

  const heyaA = world.heyas.get(rikishiA.heyaId);
  const heyaB = world.heyas.get(rikishiB.heyaId);

  const heat = clamp01to100((pair as any).heat);
  const heatBand = getHeatBand(heat);
  const heatConfig = HEAT_BAND_CONFIG[heatBand];

  const tone = safeTone((pair as any).tone);
  const toneInfo = TONE_DESCRIPTIONS[tone];
  const ToneIcon = toneInfo.icon;

  const triggersObj = safeTriggers((pair as any).triggers);
  const topTriggers = Object.entries(triggersObj)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 3)
    .map(([t]) => t)
    .filter((t): t is RivalryTrigger => t in TRIGGER_LABELS)
    .map((t) => t as RivalryTrigger);

  const meetings = safeInt((pair as any).meetings, safeInt((pair as any).aWins, 0) + safeInt((pair as any).bWins, 0));
  const aWins = safeInt((pair as any).aWins, 0);
  const bWins = safeInt((pair as any).bWins, 0);

  return (
    <Card className={`paper ${isPlayerRivalry ? "ring-1 ring-primary/30" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Badge className={`${heatConfig.bgColor} ${heatConfig.color} border`}>
              <Flame className="h-3 w-3 mr-1" />
              {heatConfig.label}
            </Badge>
            {isPlayerRivalry && (
              <Badge variant="default" className="text-xs">
                Your Stable
              </Badge>
            )}
          </div>
          <div className="text-right text-xs text-muted-foreground">
            {meetings} bout{meetings !== 1 ? "s" : ""}
          </div>
        </div>

        <CardTitle className="font-display text-lg mt-2">
          <span className="flex items-center gap-2 flex-wrap">
            <RikishiName id={rikishiA.id} name={rikishiA.shikona} />
            <span className="text-muted-foreground">vs</span>
            <RikishiName id={rikishiB.id} name={rikishiB.shikona} />
          </span>
        </CardTitle>

        <CardDescription className="flex items-center gap-4 flex-wrap">
          {heyaA ? (
            <span>
              <StableName id={heyaA.id} name={heyaA.name} className="text-muted-foreground" />
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
          <span className="text-muted-foreground">vs</span>
          {heyaB ? (
            <span>
              <StableName id={heyaB.id} name={heyaB.name} className="text-muted-foreground" />
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Head-to-head record */}
        <div className="flex items-center justify-center gap-4 p-3 rounded-lg bg-secondary/30">
          <div className="text-center">
            <div className="font-display text-2xl font-bold">{aWins}</div>
            <div className="text-xs text-muted-foreground">{rikishiA.shikona}</div>
          </div>
          <div className="text-muted-foreground font-display">-</div>
          <div className="text-center">
            <div className="font-display text-2xl font-bold">{bWins}</div>
            <div className="text-xs text-muted-foreground">{rikishiB.shikona}</div>
          </div>
        </div>

        {/* Tone */}
        <div className="flex items-center gap-2">
          <ToneIcon className={`h-4 w-4 ${heatConfig.color}`} />
          <span className="font-medium text-sm">{toneInfo.label}</span>
        </div>
        <p className="text-sm text-muted-foreground">{toneInfo.description}</p>

        {/* Triggers */}
        {topTriggers.length > 0 && (
          <>
            <Separator />
            <div className="flex flex-wrap gap-2">
              {topTriggers.map((trigger) => (
                <Badge key={trigger} variant="outline" className="text-xs">
                  {TRIGGER_LABELS[trigger] ?? String(trigger)}
                </Badge>
              ))}
            </div>
          </>
        )}

        {/* Heat meter */}
        <div className="pt-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Rivalry Heat</span>
            <span>{Math.round(heat)}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div className={`h-full transition-all ${heatBarClass(heatBand)}`} style={{ width: `${heat}%` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// -----------------------------
// Page
// -----------------------------

export default function RivalriesPage() {
  const { state } = useGame();
  const { world, playerHeyaId } = state;

  // Rivalries state from world or default
  const rivalriesState = useMemo(() => {
    if (!world) return createDefaultRivalriesState();
    const rs = (world as any).rivalries;
    return rs && typeof rs === "object" && rs.pairs ? rs : createDefaultRivalriesState();
  }, [world]);

  // Player rikishi IDs
  const playerRikishiIds = useMemo(() => {
    if (!world || !playerHeyaId) return new Set<string>();
    const heya = world.heyas.get(playerHeyaId);
    return new Set(heya?.rikishiIds ?? []);
  }, [world, playerHeyaId]);

  // Partition + sort
  const { playerRivalries, hotRivalries, allRivalries } = useMemo(() => {
    const rawPairs = Object.values((rivalriesState as any).pairs ?? {}) as any[];

    const normalized: RivalryPairState[] = rawPairs
      .filter((p) => p && typeof p === "object" && typeof p.aId === "string" && typeof p.bId === "string")
      .map((p) => ({
        ...p,
        key: safeKey(p),
        heat: clamp01to100(p.heat),
        meetings: safeInt(p.meetings, safeInt(p.aWins, 0) + safeInt(p.bWins, 0)),
        aWins: safeInt(p.aWins, 0),
        bWins: safeInt(p.bWins, 0),
        triggers: safeTriggers(p.triggers),
        tone: safeTone(p.tone)
      })) as RivalryPairState[];

    const player: RivalryPairState[] = [];
    const hot: RivalryPairState[] = [];

    for (const pair of normalized) {
      const isPlayer = playerRikishiIds.has(pair.aId) || playerRikishiIds.has(pair.bId);
      if (isPlayer) player.push(pair);
      if ((pair.heat ?? 0) >= 55) hot.push(pair);
    }

    const byHeatDesc = (a: RivalryPairState, b: RivalryPairState) => (b.heat ?? 0) - (a.heat ?? 0);

    player.sort(byHeatDesc);
    hot.sort(byHeatDesc);
    normalized.sort(byHeatDesc);

    const hotNonPlayer = hot.filter((p) => !playerRikishiIds.has(p.aId) && !playerRikishiIds.has(p.bId));

    return {
      playerRivalries: player,
      hotRivalries: hotNonPlayer,
      allRivalries: normalized
    };
  }, [rivalriesState, playerRikishiIds]);

  if (!world) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card className="paper">
          <CardHeader>
            <CardTitle>Rivalries & Feuds</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">No world loaded.</CardContent>
        </Card>
      </div>
    );
  }

  const hasRivalries = allRivalries.length > 0;

  return (
    <>
      <Helmet>
        <title>Rivalries & Feuds - Basho</title>
      </Helmet>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Flame className="h-8 w-8 text-orange-400" />
            Rivalries & Feuds
          </h1>
          <p className="text-muted-foreground mt-1">The personal battles that define the sumo world</p>
        </div>

        {!hasRivalries ? (
          <Card className="paper">
            <CardContent className="p-12 text-center">
              <Swords className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-display text-xl font-semibold mb-2">No Rivalries Yet</h3>
              <p className="text-muted-foreground">
                Rivalries develop as rikishi meet repeatedly across basho. Complete tournaments to see tensions form.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Player Stable Rivalries */}
            {playerRivalries.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Your Stable's Rivalries
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {playerRivalries.slice(0, 4).map((pair) => (
                    <RivalryCard key={pair.key} pair={pair} world={world} isPlayerRivalry />
                  ))}
                </div>
              </div>
            )}

            {/* Hot Rivalries Across Sumo */}
            {hotRivalries.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-400" />
                  Hot Rivalries Across Sumo
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {hotRivalries.slice(0, 4).map((pair) => (
                    <RivalryCard key={pair.key} pair={pair} world={world} />
                  ))}
                </div>
              </div>
            )}

            {/* All Rivalries (cooler) */}
            {allRivalries.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  <Swords className="h-5 w-5" />
                  All Active Rivalries
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {allRivalries
                    .filter((p) => (p.heat ?? 0) < 55) // warm/cold
                    .slice(0, 6)
                    .map((pair) => (
                      <RivalryCard
                        key={pair.key}
                        pair={pair}
                        world={world}
                        isPlayerRivalry={playerRikishiIds.has(pair.aId) || playerRikishiIds.has(pair.bId)}
                      />
                    ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Legend */}
        <Card className="paper">
          <CardContent className="pt-4">
            <div className="text-sm font-medium mb-3">Heat Levels</div>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              {(Object.entries(HEAT_BAND_CONFIG) as [RivalryHeatBand, (typeof HEAT_BAND_CONFIG)["inferno"]][])
                .sort((a, b) => {
                  const order: Record<RivalryHeatBand, number> = { inferno: 0, hot: 1, warm: 2, cold: 3 };
                  return order[a[0]] - order[b[0]];
                })
                .map(([band, config]) => (
                  <div key={band} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-full ${config.bgColor} border`} />
                    <span className={config.color}>{config.label}</span>
                    <span>— {config.description}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
