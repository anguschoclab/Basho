/**
 * RikishiPage.tsx
 *
 * Individual Profile and Stable Roster Management.
 * Features a "Rich Aesthetics" Dossier design for rikishi profiles.
 * Architecturally decomposed to use RosterList for list views.
 */

import React, { useState, useMemo } from "react";
import { Helmet } from "react-helmet";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  History,
  Trophy,
  Star,
  TrendingUp,
  Activity,
  Zap,
  MapPin,
  Calendar,
  Ruler,
  Scale,
  Globe,
  UserPlus,
  Info,
  Medal,
  Shield,
  Target,
  Award as AwardIcon,
  Users,
} from "lucide-react";
import { RikishiName } from "@/components/ClickableName";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { HQ_TABS } from "@/constants/navigation";
import { projectRikishi } from "@/presenters/uiModels";
import { RosterList } from "@/components/rikishi/RosterList";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { NarrativeService } from "@/engine/systems/narrative/NarrativeService";
import { rngFromSeed } from "@/engine/rng";

export default function RikishiPage() {
  const { rikishiId } = useParams({ strict: false });
  const { state } = useGame();
  const { world, playerHeyaId } = state;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");

  // Prepare data for roster list view (before any early returns)
  const rikishiList = useMemo(() => {
    if (!world || rikishiId) return [];
    return Array.from(world.rikishi.values())
      .filter((r) => r.heyaId === playerHeyaId)
      .map((r) => projectRikishi(r, world));
  }, [world, playerHeyaId, rikishiId]);

  // Get raw rikishi data safely
  const rawRikishi = world?.rikishi.get(rikishiId || "");
  const rikishi = rawRikishi ? projectRikishi(rawRikishi, world!) : null;
  const history = rikishi?.careerHistory;

  // Prepare career progression data for chart (called before early returns)
  const careerProgressionData = useMemo(() => {
    if (!history || history.length === 0) return [];
    const rankOrder: Record<string, number> = {
      yokozuna: 100,
      ozeki: 90,
      sekiwake: 80,
      komusubi: 70,
      maegashira: 60,
      juryo: 40,
      makushita: 30,
      sandanme: 20,
      jonidan: 10,
      jonokuchi: 5,
    };
    return history
      .slice()
      .reverse()
      .map((snap: any) => ({
        basho: `${snap.bashoName} ${snap.year}`,
        rankValue: (rankOrder[snap.rank] || 0) + (snap.rankNumber || 0),
        wins: snap.wins,
        losses: snap.losses,
        winRate:
          snap.wins + snap.losses > 0
            ? Math.round((snap.wins / (snap.wins + snap.losses)) * 100)
            : 0,
      }));
  }, [history]);

  // Prepare kimarite distribution data for chart (called before early returns)
  const kimariteDistributionData = useMemo(() => {
    if (!rikishi?.favoredKimariteDetailed || rikishi.favoredKimariteDetailed.length === 0)
      return [];
    return rikishi.favoredKimariteDetailed
      .slice(0, 8)
      .map((k: any) => ({
        kimarite: k.kimarite,
        percentage: k.percentage,
      }))
      .sort((a: any, b: any) => b.percentage - a.percentage);
  }, [rikishi?.favoredKimariteDetailed]);

  if (!world) return null;

  // ── Roster List View ────────────────────────────────
  if (!rikishiId) {
    return (
      <AppLayout pageTitle="Roster Management" subNavTabs={HQ_TABS} activeSubTab="roster">
        <Helmet>
          <title>Roster Management | Basho</title>
        </Helmet>
        <RosterList
          rikishiList={rikishiList}
          onRikishiClick={(id) =>
            navigate({ to: "/rikishi/$rikishiId", params: { rikishiId: id } as any })
          }
        />
      </AppLayout>
    );
  }

  // ── Individual Profile View ─────────────────────────
  if (!rawRikishi || !rikishi)
    return (
      <AppLayout pageTitle="Rikishi Not Found">
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <p className="text-muted-foreground font-display italic">
            The requested rikishi does not exist in the Association records.
          </p>
          <Button variant="outline" onClick={() => navigate({ to: "/stable/roster" })}>
            Return to Roster
          </Button>
        </div>
      </AppLayout>
    );

  const isOwned = rikishi.heyaId === playerHeyaId;
  const milestones = rikishi.milestones;

  // Get mentorship info
  const mentor = rawRikishi.mentorId ? world.rikishi.get(rawRikishi.mentorId) : null;
  const mentees = (rawRikishi.menteeIds ?? []).map((id) => world.rikishi.get(id)).filter(Boolean);

  return (
    <AppLayout pageTitle="Rikishi Profile" subNavTabs={HQ_TABS} activeSubTab="roster">
      <Helmet>
        <title>{rikishi.shikona} — Official Association Profile | Basho</title>
      </Helmet>

      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
        <Button
          variant="ghost"
          onClick={() => navigate({ to: "/stable/roster" })}
          className="gap-2 h-10 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to stable roster
        </Button>

        {/* ═══ DOSSIER HEADER ═══ */}
        <div className="dossier-paper rounded-lg overflow-hidden shadow-2xl border-2 border-primary/10">
          <div className="bg-primary pt-12 pb-10 px-8 relative overflow-hidden text-primary-foreground hero-gradient border-b-4 border-primary">
            <div className="absolute top-0 right-0 p-8 opacity-10 font-display text-9xl font-black pointer-events-none uppercase italic -rotate-12 translate-x-12 -translate-y-8">
              {rikishi.rankLabel}
            </div>

            <div className="flex flex-col md:flex-row items-start justify-between gap-8 relative z-10">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-3 h-6 border-0",
                      `rank-${rikishi.rank}`
                    )}
                  >
                    {rikishi.rankLabel}
                  </Badge>
                  {isOwned && (
                    <Badge
                      variant="outline"
                      className="bg-white/10 text-white border-white/20 font-bold h-6 uppercase text-[9px] tracking-widest"
                    >
                      Active Roster
                    </Badge>
                  )}
                  {rikishi.nationality !== "Japan" && (
                    <Badge
                      variant="outline"
                      className="border-gold text-gold bg-gold/10 flex items-center gap-1.5 h-6 font-bold text-[9px] tracking-widest"
                    >
                      <Globe className="h-3 w-3" /> Foreign Slot
                    </Badge>
                  )}
                </div>

                <h1 className="text-6xl font-display font-black tracking-tighter sumi-e-ink leading-none">
                  {rikishi.shikona}
                </h1>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] uppercase font-black tracking-[0.2em] opacity-80 pt-2">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-secondary" /> {rikishi.origin}
                  </span>
                  <span className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-secondary" /> {rikishi.age} Years
                  </span>
                  <span className="flex items-center gap-2">
                    <Ruler className="h-3.5 w-3.5 text-secondary" /> {rikishi.height}cm
                  </span>
                  <span className="flex items-center gap-2">
                    <Scale className="h-3.5 w-3.5 text-secondary" /> {rikishi.weight}kg
                  </span>
                </div>
              </div>

              <div className="flex gap-4 md:gap-8 shrink-0 bg-black/20 p-6 rounded-lg border border-white/10 shadow-inner">
                {[
                  {
                    label: "Current Record",
                    value: `${rikishi.currentBashoWins}-${rikishi.currentBashoLosses}`,
                    sub: "This Tournament",
                    color:
                      rikishi.currentBashoWins >= rikishi.currentBashoLosses
                        ? "text-success"
                        : "text-gold",
                    tooltip: "Current tournament win-loss record",
                  },
                  {
                    label: "Career History",
                    value: `${rikishi.careerWins}-${rikishi.careerLosses}`,
                    sub: "Professional Record",
                    color: "text-white",
                    tooltip: "Lifetime professional record across all tournaments",
                  },
                  {
                    label: "Elite Titles",
                    value: rikishi.careerYusho,
                    sub: "Yūshō Count",
                    color: "text-gold",
                    condition: rikishi.careerYusho > 0,
                    tooltip: "Total top-division championship victories",
                  },
                ].map((stat, i) => (
                  <React.Fragment key={i}>
                    {(!stat.condition || stat.condition === true) && (
                      <TooltipWrap content={stat.tooltip} side="bottom">
                        <div className="text-center group cursor-help">
                          <div
                            className={cn(
                              "text-4xl font-display font-black leading-none mb-1 transition-transform group-hover:scale-110",
                              stat.color
                            )}
                          >
                            {stat.value}
                          </div>
                          <div className="text-[10px] uppercase font-black opacity-60 tracking-widest mb-0.5">
                            {stat.label}
                          </div>
                          <div className="text-[8px] uppercase font-bold opacity-40">
                            {stat.sub}
                          </div>
                        </div>
                      </TooltipWrap>
                    )}
                    {i < 2 && <div className="w-px h-12 bg-white/10 hidden md:block" />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* Mentorship Lineage */}
            {(mentor || mentees.length > 0) && (
              <div className="mb-10 p-6 bg-primary/5 border-2 border-primary/10 rounded-lg">
                <h3 className="text-lg font-display font-black flex items-center gap-2 uppercase tracking-tight mb-4">
                  <Users className="h-5 w-5 text-primary" /> Lineage & Mentorship
                </h3>
                <div className="space-y-4">
                  {mentor && (
                    <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground w-20">
                        Mentor
                      </div>
                      <RikishiName id={mentor.id} name={mentor.shikona} className="font-bold" />
                      <Badge variant="outline" className="text-xs">
                        {mentor.rank}
                      </Badge>
                    </div>
                  )}
                  {mentees.length > 0 && (
                    <div className="flex items-start gap-4 p-3 bg-muted/30 rounded-lg">
                      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground w-20 shrink-0">
                        Mentees
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {mentees.map((m) => (
                          <div key={m!.id} className="flex items-center gap-2">
                            <RikishiName id={m!.id} name={m!.shikona} className="text-sm" />
                            <Badge variant="outline" className="text-[10px]">
                              {m!.rank}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Naturalization Progress */}
            {rikishi.nationality !== "Japan" && (
              <div className="mb-10 p-6 bg-gold/5 border-2 border-gold/10 rounded-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <UserPlus className="h-24 w-24 text-gold" />
                </div>
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div>
                    <h3 className="text-lg font-display font-black flex items-center gap-2 uppercase tracking-tight">
                      Naturalization Timeline
                    </h3>
                    <p className="text-[10px] uppercase font-black tracking-[0.2em] text-gold/70">
                      Institutional Residency Tracker
                    </p>
                  </div>
                  <Badge
                    className={cn(
                      "font-black tracking-widest text-[10px] h-6",
                      rikishi.careerWins >= 400 ? "bg-success" : "bg-gold"
                    )}
                  >
                    {rikishi.careerWins >= 400 ? "ELIGIBLE" : "IN REVIEW"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                  {[
                    {
                      label: "Tenure",
                      val: Math.min(100, Math.floor((rikishi.careerHistory.length / 60) * 100)),
                      target: "60 Basho",
                      tooltip: "Tenure progress: 60 basho required for naturalization eligibility",
                    },
                    {
                      label: "Wins",
                      val: Math.min(100, Math.floor((rikishi.careerWins / 400) * 100)),
                      target: "400 Wins",
                      tooltip: "Victory progress: 400 career wins required",
                    },
                    {
                      label: "Stature",
                      val: rikishi.rank === "yokozuna" || rikishi.rank === "ozeki" ? 100 : 30,
                      target: "Sanyaku",
                      tooltip: "Rank requirement: Must reach Komusubi or higher",
                    },
                  ].map((p, i) => (
                    <TooltipWrap key={i} content={p.tooltip} side="top">
                      <div className="space-y-2 cursor-help">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          <span>{p.label}</span>
                          <span>{p.val}%</span>
                        </div>
                        <Progress value={p.val} className="h-1.5 bg-gold/30" />
                        <p className="text-[9px] font-bold text-gold/60 uppercase tracking-widest italic">
                          {p.target} Target
                        </p>
                      </div>
                    </TooltipWrap>
                  ))}
                </div>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
              <TabsList className="bg-muted/50 p-1 rounded-full border border-border/50 max-w-lg">
                <TabsTrigger
                  value="profile"
                  className="rounded-full px-8 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white"
                >
                  Profile
                </TabsTrigger>
                <TabsTrigger
                  value="combat"
                  className="rounded-full px-8 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white"
                >
                  Combat
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="rounded-full px-8 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white"
                >
                  Career Archives
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="profile"
                className="space-y-8 animate-in fade-in slide-in-from-left-2 duration-300"
              >
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="text-xl font-display font-black flex items-center gap-2 uppercase tracking-tight">
                      <Activity className="h-5 w-5 text-primary" /> Physical Attributes
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        {
                          label: "Forcefulness",
                          key: "strength",
                          val: rikishi.perceivedStats.strength,
                          raw: rawRikishi.stats?.strength ?? 50,
                          color: "bg-gold",
                          icon: <Zap className="h-3.5 w-3.5" />,
                        },
                        {
                          label: "Agility",
                          key: "speed",
                          val: rikishi.perceivedStats.speed,
                          raw: rawRikishi.stats?.speed ?? 50,
                          color: "bg-west",
                          icon: <TrendingUp className="h-3.5 w-3.5" />,
                        },
                        {
                          label: "Resilience",
                          key: "stamina",
                          val: rikishi.perceivedStats.stamina,
                          raw: rawRikishi.stats?.stamina ?? 50,
                          color: "bg-success",
                          icon: <Shield className="h-3.5 w-3.5" />,
                        },
                        {
                          label: "Precision",
                          key: "technique",
                          val: rikishi.perceivedStats.technique,
                          raw: rawRikishi.stats?.technique ?? 50,
                          color: "bg-purple-500",
                          icon: <Target className="h-3.5 w-3.5" />,
                        },
                      ].map((stat, i) => (
                        <TooltipWrap
                          key={i}
                          content={NarrativeService.describeAttribute(
                            rngFromSeed(world.seed, "ui", "rikishi-dossier"),
                            stat.key,
                            stat.raw
                          )}
                          side="top"
                        >
                          <div className="bg-muted/30 p-4 rounded-lg border border-border/50 space-y-3 hover:border-primary/20 transition-colors cursor-help">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none">
                              {stat.icon} {stat.label}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-2xl font-display font-black">{stat.val}</div>
                              <Progress
                                value={stat.raw}
                                className={cn("h-1 flex-1 opacity-40", stat.color)}
                              />
                            </div>
                          </div>
                        </TooltipWrap>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xl font-display font-black flex items-center gap-2 uppercase tracking-tight">
                      <AwardIcon className="h-5 w-5 text-primary" /> Narrative Notes
                    </h3>
                    <div className="bg-muted/20 border-2 border-dashed rounded-lg p-6 space-y-4 opacity-70">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center shrink-0">
                          <Info className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm italic font-display leading-relaxed">
                          "{rikishi.shikona} is known for a traditional style that emphasizes
                          lower-body strength and direct thrusting. While his Tachiai is among the
                          most disciplined in the stable, critics argue his defensive belt-work
                          remains a point of vulnerability."
                        </p>
                      </div>
                      <div className="h-px bg-border/40" />
                      <div className="flex gap-2">
                        <Badge
                          variant="outline"
                          className="text-[9px] font-bold uppercase tracking-widest"
                        >
                          Steady Gainer
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[9px] font-bold uppercase tracking-widest"
                        >
                          Crowd Favorite
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ═══ COMBAT PROFILE TAB ═══ */}
              <TabsContent
                value="combat"
                className="space-y-8 animate-in fade-in slide-in-from-left-2 duration-300"
              >
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Archetype card */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-display font-black flex items-center gap-2 uppercase tracking-tight">
                      <Shield className="h-5 w-5 text-primary" /> Combat Archetype
                    </h3>
                    <div className="bg-muted/30 border-2 border-border/50 rounded-lg p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <Badge className="text-[11px] font-black uppercase tracking-widest px-3 h-7 bg-primary/80">
                          {rikishi.archetypeName}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-black uppercase tracking-widest h-7"
                        >
                          {rikishi.styleName}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="bg-muted/40 rounded-lg p-3 space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                            Preferred Grip
                          </p>
                          <p className="text-sm font-display font-black capitalize">
                            {rikishi.preferredGrip === "none"
                              ? "No Preference"
                              : rikishi.preferredGrip}
                          </p>
                        </div>
                        <div className="bg-muted/40 rounded-lg p-3 space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                            Grip Depth
                          </p>
                          <p className="text-sm font-display font-black capitalize">
                            {rikishi.preferredGripDepth}
                          </p>
                        </div>
                      </div>
                      {rikishi.favoredKimariteDetailed.length > 0 && (
                        <div className="pt-2 space-y-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                            Signature Techniques
                          </p>

                          {/* Kimarite Distribution Chart */}
                          {kimariteDistributionData.length > 0 && (
                            <div className="h-[200px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={kimariteDistributionData}
                                  layout="vertical"
                                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                    horizontal={false}
                                    stroke="hsl(var(--border))"
                                  />
                                  <XAxis
                                    type="number"
                                    tick={{
                                      fontSize: 10,
                                      fontWeight: 600,
                                      fontFamily: "JetBrains Mono",
                                    }}
                                    axisLine={false}
                                    tickLine={false}
                                    domain={[0, 100]}
                                    unit="%"
                                  />
                                  <YAxis
                                    type="category"
                                    dataKey="kimarite"
                                    tick={{
                                      fontSize: 10,
                                      fontWeight: 600,
                                      fontFamily: "JetBrains Mono",
                                    }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={80}
                                  />
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: "hsl(var(--card))",
                                      borderColor: "hsl(var(--border))",
                                      fontSize: "11px",
                                      fontFamily: "Spectral",
                                      borderRadius: "8px",
                                      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                                    }}
                                    labelStyle={{ fontWeight: 600, fontFamily: "JetBrains Mono" }}
                                    formatter={(value: number) => `${value}%`}
                                  />
                                  <Bar
                                    dataKey="percentage"
                                    fill="hsl(var(--primary))"
                                    radius={[0, 4, 4, 0]}
                                  />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          )}

                          {/* Badge fallback for quick reference */}
                          <div className="flex flex-wrap gap-2">
                            {rikishi.favoredKimariteDetailed.slice(0, 5).map((k, i) => (
                              <TooltipWrap key={i} content={`${k.percentage}% of wins`} side="top">
                                <Badge
                                  variant="outline"
                                  className="text-[9px] font-bold uppercase tracking-widest cursor-help"
                                >
                                  {k.kimarite}{" "}
                                  <span className="text-muted-foreground ml-1">
                                    {k.percentage}%
                                  </span>
                                </Badge>
                              </TooltipWrap>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Family preferences radar */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-display font-black flex items-center gap-2 uppercase tracking-tight">
                      <Target className="h-5 w-5 text-primary" /> Tactical Tendencies
                    </h3>
                    <div className="space-y-3">
                      {(
                        [
                          { label: "Push / Thrust", key: "push", color: "bg-gold" },
                          { label: "Belt / Grapple", key: "belt", color: "bg-west" },
                          { label: "Trick / Evasion", key: "trick", color: "bg-purple-500" },
                          { label: "Speed / Angle", key: "speed", color: "bg-success" },
                        ] as const
                      ).map(({ label, key, color }) => {
                        const rawPref =
                          (rawRikishi.combatProfile?.familyPreferences as any)?.[key] ?? 25;
                        const total = Object.values(
                          rawRikishi.combatProfile?.familyPreferences ?? {
                            push: 25,
                            belt: 25,
                            trick: 25,
                            speed: 25,
                          }
                        ).reduce((a: number, b) => a + (b as number), 0);
                        const pct = total > 0 ? Math.round((rawPref / total) * 100) : 25;
                        return (
                          <TooltipWrap
                            key={key}
                            content={`${pct}% tendency toward ${label.toLowerCase()} actions`}
                            side="right"
                          >
                            <div className="space-y-1 cursor-help">
                              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                <span>{label}</span>
                                <span>{pct}%</span>
                              </div>
                              <Progress value={pct} className={cn("h-2", color)} />
                            </div>
                          </TooltipWrap>
                        );
                      })}
                    </div>

                    {/* Condition / Morale snapshot */}
                    <div className="pt-4 grid grid-cols-2 gap-3">
                      <div className="bg-muted/30 rounded-lg p-3 space-y-1 border border-border/40">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                          Condition
                        </p>
                        <p className="text-lg font-display font-black">
                          {rikishi.conditionDescriptor}
                        </p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3 space-y-1 border border-border/40">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                          Morale
                        </p>
                        <p className="text-lg font-display font-black">
                          {rikishi.moraleDescriptor}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* H2H Rivals */}
                {rikishi.topRivals.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-dashed border-border">
                    <h3 className="text-xl font-display font-black flex items-center gap-2 uppercase tracking-tight">
                      <Zap className="h-5 w-5 text-gold" /> Top Rivals
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {rikishi.topRivals.map((rival, i) => (
                        <div
                          key={i}
                          className="bg-muted/20 border border-border/40 rounded-lg p-4 space-y-2 hover:border-primary/30 transition-colors"
                        >
                          <p className="text-sm font-display font-black uppercase tracking-tight truncate">
                            {rival.opponentShikona}
                          </p>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "text-xl font-display font-black",
                                rival.wins >= rival.losses ? "text-success" : "text-gold"
                              )}
                            >
                              {rival.record}
                            </span>
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                              {rival.totalBouts} bouts
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent
                value="history"
                className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-300"
              >
                {/* Career Progression Chart */}
                {careerProgressionData.length > 0 && (
                  <Card className="paper">
                    <CardHeader>
                      <CardTitle className="text-lg font-display font-black flex items-center gap-2 uppercase tracking-tight">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Career Progression
                      </CardTitle>
                      <CardDescription className="text-xs uppercase font-black tracking-widest opacity-50">
                        Rank trajectory and win rate over time
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={careerProgressionData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="hsl(var(--border))"
                            />
                            <XAxis
                              dataKey="basho"
                              tick={{ fontSize: 10, fontWeight: 600, fontFamily: "JetBrains Mono" }}
                              axisLine={false}
                              tickLine={false}
                              interval="preserveStartEnd"
                            />
                            <YAxis
                              yAxisId="rank"
                              orientation="left"
                              tick={{ fontSize: 10, fontWeight: 600, fontFamily: "JetBrains Mono" }}
                              axisLine={false}
                              tickLine={false}
                              reversed
                            />
                            <YAxis
                              yAxisId="winRate"
                              orientation="right"
                              tick={{ fontSize: 10, fontWeight: 600, fontFamily: "JetBrains Mono" }}
                              axisLine={false}
                              tickLine={false}
                              domain={[0, 100]}
                              unit="%"
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                borderColor: "hsl(var(--border))",
                                fontSize: "12px",
                                fontFamily: "Spectral",
                                borderRadius: "8px",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                              }}
                              labelStyle={{ fontWeight: 600, fontFamily: "JetBrains Mono" }}
                            />
                            <Legend verticalAlign="top" height={36} iconType="circle" />
                            <Line
                              yAxisId="rank"
                              type="monotone"
                              dataKey="rankValue"
                              stroke="hsl(var(--primary))"
                              strokeWidth={2}
                              dot={{ r: 4, fill: "hsl(var(--primary))" }}
                              activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                              name="Rank Value"
                            />
                            <Line
                              yAxisId="winRate"
                              type="monotone"
                              dataKey="winRate"
                              stroke="hsl(var(--success))"
                              strokeWidth={2}
                              dot={{ r: 4, fill: "hsl(var(--success))" }}
                              activeDot={{ r: 6, fill: "hsl(var(--success))" }}
                              name="Win Rate %"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="paper border-0 shadow-none bg-transparent overflow-hidden">
                  <CardHeader className="px-0 pb-6 border-b border-dashed border-border mb-6">
                    <CardTitle className="text-2xl font-display font-black flex items-center gap-3 uppercase tracking-tight">
                      <History className="h-6 w-6 text-primary" />
                      Basho History Archives
                    </CardTitle>
                    <CardDescription className="text-xs uppercase font-black tracking-widest opacity-50">
                      Historical ledger of all professional bouts and ranks.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left border-b-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                            <th className="pb-4 pr-6">Official Basho</th>
                            <th className="pb-4 px-6 text-center">Association Rank</th>
                            <th className="pb-4 px-6 text-center">Final Record</th>
                            <th className="pb-4 px-6 text-center">Accolades</th>
                            <th className="pb-4 pl-6 text-right">Physicality</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {(history || [])
                            .slice()
                            .reverse()
                            .map((snap: any, i: number) => (
                              <tr key={i} className="hover:bg-primary/5 transition-colors group">
                                <td className="py-4 pr-6 font-display font-black text-sm uppercase tracking-tighter">
                                  {snap.bashoName} {snap.year}
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[9px] font-black uppercase tracking-widest px-2 h-5 border-2 group-hover:border-primary/30 transition-colors"
                                    )}
                                  >
                                    {snap.rank} {snap.rankNumber > 0 ? snap.rankNumber : ""}
                                  </Badge>
                                </td>
                                <td className="py-4 px-6 text-center tabular-nums">
                                  <div className="flex flex-col items-center">
                                    <div
                                      className={cn(
                                        "text-lg font-display font-black",
                                        snap.wins >= snap.losses ? "text-success" : "text-gold"
                                      )}
                                    >
                                      {snap.wins}-{snap.losses}
                                    </div>
                                    <div className="text-[8px] uppercase font-black opacity-40">
                                      {snap.wins >= 8 ? "Kachi-Koshi" : "Make-Koshi"}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex items-center justify-center gap-2">
                                    {snap.isYusho && (
                                      <TooltipWrap content="Basho Yusho: Tournament Champion">
                                        <Trophy className="h-5 w-5 text-gold animate-pulse cursor-help" />
                                      </TooltipWrap>
                                    )}
                                    {snap.isJunYusho && (
                                      <TooltipWrap content="Jun-Yusho: Runner-up">
                                        <Star className="h-4 w-4 text-gold cursor-help" />
                                      </TooltipWrap>
                                    )}
                                    {snap.specialPrizes.shukunsho && (
                                      <TooltipWrap content="Shukun-sho: Outstanding Performance Prize">
                                        <Medal className="h-4 w-4 text-purple-400 cursor-help" />
                                      </TooltipWrap>
                                    )}
                                    {snap.specialPrizes.kantosho && (
                                      <TooltipWrap content="Kanto-sho: Fighting Spirit Prize">
                                        <Medal className="h-4 w-4 text-success cursor-help" />
                                      </TooltipWrap>
                                    )}
                                    {snap.specialPrizes.ginosho && (
                                      <TooltipWrap content="Gino-sho: Technique Prize">
                                        <Medal className="h-4 w-4 text-west cursor-help" />
                                      </TooltipWrap>
                                    )}
                                    {!snap.isYusho &&
                                      !snap.isJunYusho &&
                                      !Object.values(snap.specialPrizes).some((v) => v) && (
                                        <span className="text-muted-foreground text-[10px] font-black opacity-30 tracking-widest">
                                          NONE
                                        </span>
                                      )}
                                  </div>
                                </td>
                                <td className="py-4 pl-6 text-right tabular-nums">
                                  <div className="text-xs font-black opacity-60">
                                    Weight: <span className="text-foreground">{snap.weight}kg</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          {(!history || history.length === 0) && (
                            <tr>
                              <td colSpan={5} className="py-20 text-center space-y-4 opacity-50">
                                <div className="text-5xl text-muted-foreground animate-pulse font-display">
                                  ∅
                                </div>
                                <p className="text-sm font-display italic">
                                  No historical snapshots found in the career ledger.
                                </p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Milestone Timeline */}
                <div className="space-y-6 pt-10 border-t-2 border-dashed">
                  <h3 className="text-2xl font-display font-black flex items-center gap-3 uppercase tracking-tight">
                    <Star className="h-6 w-6 text-gold" />
                    Association Milestones
                  </h3>
                  <div className="relative pl-10 space-y-12 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-1 before:bg-muted before:rounded-full">
                    {milestones.length === 0 ? (
                      <div className="py-10 text-center bg-muted/20 border-2 border-dashed rounded-lg opacity-50">
                        <p className="text-sm font-display italic">
                          This rikishi has not yet participated in Association milestones.
                        </p>
                      </div>
                    ) : (
                      milestones
                        .slice()
                        .reverse()
                        .map((m: any, i: number) => (
                          <div
                            key={i}
                            className="relative animate-in slide-in-from-left-2 duration-500 fill-mode-both"
                            style={{ animationDelay: `${i * 100}ms` }}
                          >
                            <div className="absolute -left-[35px] top-1.5 h-4 w-4 rounded-full bg-primary border-4 border-background shadow-lg ring-4 ring-primary/10" />
                            <div className="space-y-2 max-w-2xl">
                              <div className="flex items-center gap-4">
                                <h4 className="font-display font-black text-xl uppercase tracking-tighter">
                                  {m.title}
                                </h4>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-black uppercase tracking-widest border-2"
                                >
                                  {m.date.year}.{m.date.month}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed font-display italic opacity-80">
                                {m.description}
                              </p>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
