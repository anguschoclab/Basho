// MediaPage.tsx — Media & Press coverage dashboard
// Surfaces headlines, media heat, and heya pressure from media.ts engine

import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RikishiName, StableName } from "@/components/ClickableName";
import { Newspaper, Flame, TrendingUp, Building2, Zap, Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import type { MediaHeadline, MediaDigest, MediaState, MediaBeat } from "@/engine/media";
import { buildMediaDigest, createDefaultMediaState } from "@/engine/media";

/* ── Style maps ── */

const TIER_STYLE: Record<string, { label: string; class: string }> = {
  main_event: { label: "Main Event", class: "bg-primary/20 text-primary border-primary/30" },
  national: { label: "National", class: "bg-accent/20 text-accent-foreground border-accent/30" },
  local: { label: "Local", class: "bg-muted text-muted-foreground border-border" },
};

const TONE_STYLE: Record<string, { label: string; class: string }> = {
  hype: { label: "Hype", class: "bg-yellow-500/20 text-yellow-400" },
  praise: { label: "Praise", class: "bg-emerald-500/20 text-emerald-400" },
  concern: { label: "Concern", class: "bg-orange-500/20 text-orange-400" },
  controversy: { label: "Controversy", class: "bg-red-500/20 text-red-400" },
  disrespect: { label: "Disrespect", class: "bg-red-500/20 text-red-300" },
  neutral: { label: "Neutral", class: "bg-muted text-muted-foreground" },
};

const BEAT_LABELS: Record<MediaBeat, string> = {
  daily_bout: "Bout",
  streak: "Streak",
  upset: "Upset",
  title_race: "Title Race",
  rivalry: "Rivalry",
  injury: "Injury",
  promotion_watch: "Promo Watch",
  heya_story: "Heya Story",
  feature: "Feature",
  retirement_watch: "Retirement",
  discipline: "Discipline",
};

const ALL_BEATS = Object.keys(BEAT_LABELS) as MediaBeat[];

/* ── Sub-components ── */

function HeadlineCard({ headline, world }: { headline: MediaHeadline; world: any }) {
  const tier = TIER_STYLE[headline.tier] ?? TIER_STYLE.local;
  const tone = TONE_STYLE[headline.tone] ?? TONE_STYLE.neutral;
  const beatLabel = BEAT_LABELS[headline.beat] ?? headline.beat;

  return (
    <div className="p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors space-y-2">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-sm leading-tight">{headline.title}</h3>
        <div className="flex gap-1 shrink-0 flex-wrap justify-end">
          <Badge variant="outline" className={`text-[10px] ${tier.class}`}>{tier.label}</Badge>
          <Badge variant="outline" className={`text-[10px] ${tone.class}`}>{tone.label}</Badge>
          <Badge variant="secondary" className="text-[10px]">{beatLabel}</Badge>
        </div>
      </div>
      {headline.subtitle && (
        <p className="text-xs text-muted-foreground italic">{headline.subtitle}</p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        {headline.rikishiIds.map(id => {
          const r = world?.rikishi?.get(id);
          return r ? <RikishiName key={id} id={id} name={r.shikona} className="text-xs" /> : null;
        })}
        {headline.bout?.upset && (
          <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
            <Zap className="h-2.5 w-2.5 mr-0.5" /> Upset
          </Badge>
        )}
      </div>
    </div>
  );
}

function BeatFilter({ selected, onChange }: { selected: Set<MediaBeat>; onChange: (s: Set<MediaBeat>) => void }) {
  const allSelected = selected.size === 0;

  const toggle = (beat: MediaBeat) => {
    const next = new Set(selected);
    if (next.has(beat)) next.delete(beat); else next.add(beat);
    onChange(next);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Filter className="h-3.5 w-3.5" />
          {allSelected ? "All Beats" : `${selected.size} Beat${selected.size > 1 ? "s" : ""}`}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs">Filter by Beat</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={allSelected}
          onCheckedChange={() => onChange(new Set())}
        >
          Show All
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {ALL_BEATS.map(beat => (
          <DropdownMenuCheckboxItem
            key={beat}
            checked={selected.has(beat)}
            onCheckedChange={() => toggle(beat)}
          >
            {BEAT_LABELS[beat]}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HeatSparkline({ data }: { data: Array<{ basho: string; heat: number }> }) {
  if (data.length < 2) return <span className="text-[10px] text-muted-foreground">—</span>;
  return (
    <div className="w-20 h-6">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={[0, 100]} hide />
          <Tooltip
            contentStyle={{ fontSize: 10, padding: "2px 6px" }}
            formatter={(v: number) => [`${Math.round(v)}`, "Heat"]}
            labelFormatter={(l: string) => l.toUpperCase()}
          />
          <Line
            type="monotone"
            dataKey="heat"
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Page ── */

export default function MediaPage() {
  const { state } = useGame();
  const world = state.world;
  const [beatFilter, setBeatFilter] = useState<Set<MediaBeat>>(new Set());

  const mediaState: MediaState = (world as any)?.mediaState ?? createDefaultMediaState();

  const digest: MediaDigest | null = useMemo(() => {
    if (!world) return null;
    return buildMediaDigest({ state: mediaState, world, limit: 20 });
  }, [world, mediaState]);

  const allHeadlines = useMemo(() => {
    let list = [...(mediaState.headlines || [])]
      .sort((a, b) => b.impact - a.impact || b.week - a.week);

    if (beatFilter.size > 0) {
      list = list.filter(h => beatFilter.has(h.beat));
    }

    return list.slice(0, 50);
  }, [mediaState.headlines, beatFilter]);

  const hotRikishi = useMemo(() => {
    return Object.entries(mediaState.mediaHeat || {})
      .map(([id, heat]) => ({
        id,
        heat,
        r: world?.rikishi?.get(id),
        history: mediaState.mediaHeatHistory?.[id] ?? [],
      }))
      .filter(x => x.r)
      .sort((a, b) => b.heat - a.heat)
      .slice(0, 10);
  }, [mediaState.mediaHeat, mediaState.mediaHeatHistory, world]);

  const pressuredHeya = useMemo(() => {
    return Object.entries(mediaState.heyaPressure || {})
      .map(([id, pressure]) => ({ id, pressure, h: world?.heyas?.get(id) }))
      .filter(x => x.h)
      .sort((a, b) => b.pressure - a.pressure)
      .slice(0, 8);
  }, [mediaState.heyaPressure, world]);

  if (!world) {
    return (
      <AppLayout pageTitle="Media">
        <div className="flex items-center justify-center h-64 text-muted-foreground">No world loaded</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Media & Press">
      <Helmet><title>Media & Press — Sumo Manager</title></Helmet>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Newspaper className="h-6 w-6" /> Media & Press
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Headlines, coverage, and public perception across the sumo world.
          </p>
        </div>

        {/* Top Headlines */}
        <Card className="paper">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-primary" /> Top Headlines
                </CardTitle>
                <CardDescription>
                  {digest ? `Week ${digest.week} — ${allHeadlines.length} stories tracked` : "No media data yet"}
                </CardDescription>
              </div>
              <BeatFilter selected={beatFilter} onChange={setBeatFilter} />
            </div>
          </CardHeader>
          <CardContent>
            {allHeadlines.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {beatFilter.size > 0
                  ? "No headlines match the selected filters."
                  : "No headlines generated yet. Play through some basho days for media coverage to build up."}
              </p>
            ) : (
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-2">
                  {allHeadlines.map((h, i) => (
                    <HeadlineCard key={h.id || i} headline={h} world={world} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Hot Rikishi with Sparklines */}
          <Card className="paper">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" /> Media Heat — Rikishi
              </CardTitle>
              <CardDescription>Most covered wrestlers with basho-over-basho trend</CardDescription>
            </CardHeader>
            <CardContent>
              {hotRikishi.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No media heat data yet.</p>
              ) : (
                <div className="space-y-2">
                  {hotRikishi.map(({ id, heat, r, history }) => (
                    <div key={id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <RikishiName id={id} name={r!.shikona} className="font-medium text-sm" />
                        <div className="text-xs text-muted-foreground">{r!.rank}</div>
                      </div>
                      <HeatSparkline data={history} />
                      <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.min(100, heat)}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono w-8 text-right">{Math.round(heat)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Heya Pressure */}
          <Card className="paper">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" /> Media Pressure — Stables
              </CardTitle>
              <CardDescription>Public scrutiny on heya</CardDescription>
            </CardHeader>
            <CardContent>
              {pressuredHeya.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No pressure data yet.</p>
              ) : (
                <div className="space-y-2">
                  {pressuredHeya.map(({ id, pressure, h }) => (
                    <div key={id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <StableName id={id} name={h!.name} className="font-medium text-sm" />
                      </div>
                      <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-destructive/70 transition-all"
                          style={{ width: `${Math.min(100, pressure)}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono w-8 text-right">{Math.round(pressure)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
