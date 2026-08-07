// MediaPage.tsx — Media & Press coverage dashboard
// Surfaces headlines, media heat, and heya pressure from media.ts engine
import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { AppLayout } from "@/components/layout/AppLayout";
import { ASSOCIATION_TABS } from "@/constants/ui/navigation";
import { useGame } from "@/contexts/useGame";
import { useGameStore } from "@/store/gameStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RikishiName, StableName } from "@/components/ClickableName";
import { Flame, TrendingUp, Building2, Zap, Filter, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/control-center";
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
import { MediaHeadline, MediaBeat } from "@/engine/types/media";
import { projectMediaUIDigest } from "@/presenters/uiDigest";
import { getMediaHeatLabel, getMediaToneColor } from "@/presenters/PerceptionPresenter";
import { EventFeed } from "@/components/dashboard/EventFeed";

/* ── Style maps ── */

const TIER_STYLE: Record<string, { label: string; class: string }> = {
  main_event: {
    label: "Main Event",
    class: "bg-primary/20 text-primary border-primary/30",
  },
  national: {
    label: "National",
    class: "bg-accent/20 text-accent-foreground border-accent/30",
  },
  local: {
    label: "Local",
    class: "bg-muted text-muted-foreground border-border",
  },
};

const TONE_STYLE: Record<string, { label: string; class: string }> = {
  hype: { label: "Hype", class: "bg-gold/20 text-gold" },
  praise: { label: "Praise", class: "bg-success/20 text-success" },
  concern: { label: "Concern", class: "bg-warning/20 text-warning" },
  controversy: { label: "Controversy", class: "bg-destructive/20 text-destructive" },
  disrespect: { label: "Disrespect", class: "bg-destructive/20 text-destructive/70" },
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
  controversy: "Controversy",
};

const ALL_BEATS = Object.keys(BEAT_LABELS) as MediaBeat[];

/* ── Sub-components ── */

function HeadlineCard({
  headline,
}: {
  headline: MediaHeadline & { rikishiNames?: Record<string, string> };
}) {
  const tier = TIER_STYLE[headline.tier] ?? TIER_STYLE.local;
  const tone = TONE_STYLE[headline.tone] ?? TONE_STYLE.neutral;
  const toneColor = getMediaToneColor(headline.tone);
  const beatLabel = BEAT_LABELS[headline.beat] ?? headline.beat;

  return (
    <div className="p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors space-y-2">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-sm leading-tight" style={{ color: toneColor }}>
          {headline.title}
        </h3>
        <div className="flex gap-1 shrink-0 flex-wrap justify-end">
          <Badge variant="outline" className={`text-[10px] ${tier.class}`}>
            {tier.label}
          </Badge>
          <Badge
            variant="outline"
            className="text-[10px]"
            style={{ borderColor: toneColor, color: toneColor }}
          >
            {tone.label}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {beatLabel}
          </Badge>
        </div>
      </div>
      {headline.subtitle && (
        <p className="text-xs text-muted-foreground italic">{headline.subtitle}</p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        {headline.rikishiIds.map((id) => {
          const name = headline.rikishiNames?.[id] || "Unknown";
          return <RikishiName key={id} id={id} name={name} className="text-xs" />;
        })}
        {headline.bout?.upset && (
          <Badge variant="outline" className="text-[10px] bg-gold/10 text-gold border-gold/30">
            <Zap className="h-2.5 w-2.5 mr-0.5" /> Upset
          </Badge>
        )}
      </div>
    </div>
  );
}

function BeatFilter({
  selected,
  onChange,
}: {
  selected: Set<MediaBeat>;
  onChange: (s: Set<MediaBeat>) => void;
}) {
  const allSelected = selected.size === 0;

  const toggle = (beat: MediaBeat) => {
    const next = new Set(selected);
    if (next.has(beat)) next.delete(beat);
    else next.add(beat);
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
        <DropdownMenuCheckboxItem checked={allSelected} onCheckedChange={() => onChange(new Set())}>
          Show All
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {ALL_BEATS.map((beat) => (
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

export default function MediaPage() {
  const { state } = useGame();
  const sendCommand = useGameStore((s) => s.sendCommand);
  const world = state.world;
  const [beatFilter, setBeatFilter] = useState<Set<MediaBeat>>(new Set());

  const digest = useMemo(() => {
    if (!world) return null;
    return projectMediaUIDigest(world);
  }, [world]);

  const allHeadlines = useMemo(() => {
    if (!digest) return [];
    let list = digest.headlines.map((h) => {
      const rikishiNames: Record<string, string> = {};
      h.rikishiIds.forEach((rid: string) => {
        rikishiNames[rid] = world?.rikishi?.get(rid)?.shikona || "Unknown";
      });
      return { ...h, rikishiNames };
    });

    if (beatFilter.size > 0) {
      list = list.filter((h) => beatFilter.has(h.beat));
    }

    return list.slice(0, 50);
  }, [digest, beatFilter, world]);

  const hotRikishi = digest?.hotRikishi ?? [];
  const pressuredHeya = digest?.pressuredHeya ?? [];

  const pendingMediaEvents = useMemo(() => {
    if (!world?.playerHeyaId || !world.governanceLog) return [];
    return world.governanceLog.filter((r) => r.heyaId === world.playerHeyaId && !r.playerChoice);
  }, [world]);

  if (!world) {
    return (
      <AppLayout subNavTabs={ASSOCIATION_TABS} activeSubTab="media" pageTitle="Media">
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No world loaded
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Media & Press" subNavTabs={ASSOCIATION_TABS} activeSubTab="media">
      <Helmet>
        <title>Media & Press — Sumo Manager</title>
      </Helmet>
      <div className="space-y-6">
        <PageHeader
          eyebrow="── ASSOCIATION ──"
          title="Media & Press"
          lede="Headlines, coverage, and public perception across the sumo world."
        />

        {/* Action Required: pending media events */}
        {pendingMediaEvents.length > 0 && (
          <Card className="paper border-warning/40 bg-warning/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MessageSquare className="h-4 w-4 text-warning" />
                Response Required
                <Badge variant="destructive" className="ml-1 h-4 px-1.5 text-[9px]">
                  {pendingMediaEvents.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                The press is waiting. Choose your response strategy for each story.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingMediaEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-3 rounded-lg border border-border/60 bg-card/60 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {event.type.replace("_", " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">{event.reason}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {event.date}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 border-success/40 text-success hover:bg-success/10"
                      onClick={() => {
                        sendCommand({
                          type: "HANDLE_MEDIA_EVENT",
                          eventId: event.id,
                          choice: "apologize",
                        });
                        toast.success("Issued public apology — reduces media heat.");
                      }}
                    >
                      Apologize
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        sendCommand({
                          type: "HANDLE_MEDIA_EVENT",
                          eventId: event.id,
                          choice: "deny",
                        });
                        toast.warning("Denied the story — increases media pressure.");
                      }}
                    >
                      Deny
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 text-muted-foreground"
                      onClick={() => {
                        sendCommand({
                          type: "HANDLE_MEDIA_EVENT",
                          eventId: event.id,
                          choice: "ignore",
                        });
                        toast.info("Chose to ignore — story may fade on its own.");
                      }}
                    >
                      Ignore
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Top Headlines */}
        <Card className="paper">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-primary" /> Top Headlines
                </CardTitle>
                <CardDescription>
                  {digest
                    ? `Week ${world.week} — ${allHeadlines.length} stories tracked`
                    : "No media data yet"}
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
                    <HeadlineCard key={h.id || i} headline={h} />
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
                <p className="text-muted-foreground text-sm text-center py-4">
                  No media heat data yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {hotRikishi.map(({ id, heat, rikishi, history }) => {
                    const heatLabel = getMediaHeatLabel(heat);
                    return (
                      <div key={id} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <RikishiName
                            id={id}
                            name={rikishi?.shikona || "Unknown"}
                            className="font-medium text-sm"
                          />
                          <div className="text-xs text-muted-foreground">
                            {rikishi?.rank || "Unknown"}
                          </div>
                        </div>
                        <HeatSparkline data={history} />
                        <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${Math.min(100, heat)}%` }}
                          />
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[9px] font-bold uppercase tracking-wider px-2 h-5"
                          style={{ borderColor: heatLabel.color, color: heatLabel.color }}
                        >
                          {heatLabel.label}
                        </Badge>
                        <span className="text-xs font-mono w-8 text-right">{Math.round(heat)}</span>
                      </div>
                    );
                  })}
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
                <p className="text-muted-foreground text-sm text-center py-4">
                  No pressure data yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {pressuredHeya.map(({ id, pressure, heya }) => (
                    <div key={id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <StableName
                          id={id}
                          name={heya?.name || "Unknown"}
                          className="font-medium text-sm"
                        />
                      </div>
                      <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-destructive/70 transition-all"
                          style={{ width: `${Math.min(100, pressure)}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono w-8 text-right">
                        {Math.round(pressure)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Global Event Feed */}
        <EventFeed maxEvents={20} minImportance="notable" />
      </div>
    </AppLayout>
  );
}
