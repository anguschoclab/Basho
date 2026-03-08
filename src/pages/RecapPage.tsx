// RecapPage.tsx - Post-Basho Narrative Recap
// Summarizes prestige changes, retirements, new recruits, governance, and meta shifts

import React, { useState, useMemo } from "react";
import { PlayoffBracket } from "@/components/game/PlayoffBracket";
import { ProgressionTracker } from "@/components/game/ProgressionTracker";
import { IntaiCeremony } from "@/components/game/IntaiCeremony";
import { YokozunaDeliberation } from "@/components/game/YokozunaDeliberation";
import { PressConference } from "@/components/game/PressConference";
import { HoFInductionCeremony } from "@/components/game/HoFInductionCeremony";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGame } from "@/contexts/GameContext";
import { getHallOfFame, type HoFInductee } from "@/engine/hallOfFame";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { NavLink, useNavigate } from "react-router-dom";
import { RikishiName, StableName } from "@/components/ClickableName";
import { 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  UserMinus, 
  UserPlus, 
  Scale, 
  Sparkles,
  ArrowLeft,
  AlertTriangle,
  Crown,
  Shield,
  Coins,
  UserX,
  Heart,
  Award,
  Star,
  Medal,
  ShieldAlert
} from "lucide-react";
import type { EngineEvent, BashoResult, Heya } from "@/engine/types";
import type { OzekiKadobanMap } from "@/engine/banzuke";

// Narrative band descriptors for prestige changes
function describePrestigeShift(oldBand: string | undefined, newBand: string | undefined): string | null {
  if (!oldBand || !newBand || oldBand === newBand) return null;
  
  const bands = ["fragile", "rebuilding", "established", "powerful", "legendary"];
  const oldIdx = bands.indexOf(oldBand);
  const newIdx = bands.indexOf(newBand);
  
  if (newIdx > oldIdx) {
    return `rose to ${newBand.toUpperCase()} status`;
  } else {
    return `fell to ${newBand.toUpperCase()} status`;
  }
}

// Extract recent basho-relevant events
function getBashoWrapEvents(events: EngineEvent[], bashoNumber?: number): EngineEvent[] {
  return events.filter(e => 
    (e.phase === "basho_wrap" || e.category === "basho" || e.category === "career" || e.category === "promotion") &&
    (bashoNumber === undefined || e.bashoNumber === bashoNumber)
  ).slice(-50); // Last 50 relevant events
}

// Group events by category for narrative display
function groupEventsByNarrative(events: EngineEvent[]) {
  const groups: Record<string, EngineEvent[]> = {
    yusho: [],
    promotions: [],
    retirements: [],
    injuries: [],
    governance: [],
    sponsors: [],
    other: []
  };
  
  for (const e of events) {
    if (e.type.includes("YUSHO") || e.type.includes("CHAMPIONSHIP")) {
      groups.yusho.push(e);
    } else if (e.category === "promotion" || e.type.includes("PROMOTION") || e.type.includes("DEMOTION")) {
      groups.promotions.push(e);
    } else if (e.type.includes("RETIRE") || e.category === "career") {
      groups.retirements.push(e);
    } else if (e.category === "injury") {
      groups.injuries.push(e);
    } else if (e.category === "discipline" || e.type.includes("GOVERNANCE")) {
      groups.governance.push(e);
    } else if (e.category === "sponsor") {
      groups.sponsors.push(e);
    } else {
      groups.other.push(e);
    }
  }
  
  return groups;
}

// Get prestige changes from recent history
function getPrestigeChanges(world: any): Array<{ heya: Heya; change: string }> {
  const changes: Array<{ heya: Heya; change: string }> = [];
  
  if (!world?.heyas) return changes;
  
  // Check events for prestige-related changes
  const prestige_events = (world.events?.log || []).filter((e: EngineEvent) => 
    e.type.includes("PRESTIGE") || e.type.includes("STATURE") || e.category === "milestone"
  ).slice(-20);
  
  for (const e of prestige_events) {
    if (e.heyaId) {
      const heya = world.heyas.get(e.heyaId);
      if (heya) {
        changes.push({ heya, change: e.summary });
      }
    }
  }
  
  return changes;
}

export default function RecapPage() {
  const { state, setPhase, updateWorld } = useGame();
  const navigate = useNavigate();
  const world = state.world;

  const [showPressConference, setShowPressConference] = useState(false);
  const [showYokozunaDelib, setShowYokozunaDelib] = useState(false);
  const [showHoFCeremony, setShowHoFCeremony] = useState<HoFInductee | null>(null);

  const handleContinue = () => {
    setPhase("interim");
    navigate("/dashboard");
  };

  const handlePressConferenceClose = (effects: { reputation: number; morale: number; mediaHeat: number }) => {
    setShowPressConference(false);
    if (world && world.playerHeyaId) {
      const heya = world.heyas.get(world.playerHeyaId);
      if (heya) {
        heya.reputation = Math.max(0, Math.min(100, (heya.reputation ?? 50) + effects.reputation));
      }
      updateWorld({ ...world });
    }
  };

  // Detect yokozuna deliberation candidates
  const yokozunaCandidate = useMemo(() => {
    if (!world) return null;
    for (const r of world.rikishi.values()) {
      if (r.rank !== "ozeki") continue;
      const recentYusho = (r.careerRecord?.yusho ?? 0) >= 2;
      const strongRecord = (r.currentBashoWins ?? 0) >= 12;
      if (recentYusho && strongRecord) return r;
    }
    return null;
  }, [world]);

  // Detect HoF inductees this year
  const newInductees = useMemo(() => {
    if (!world) return [];
    const hof = getHallOfFame(world);
    return hof.inductees.filter(i => i.inductionYear === world.year);
  }, [world]);

  if (!world) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">No world data available</p>
        </div>
      </AppLayout>
    );
  }

  const lastBasho = world.history?.[world.history.length - 1];
  const events = world.events?.log || [];
  const bashoEvents = getBashoWrapEvents(events, lastBasho?.bashoNumber);
  const groupedEvents = groupEventsByNarrative(bashoEvents);
  const prestigeChanges = getPrestigeChanges(world);
  
  const playerHeya = world.playerHeyaId ? world.heyas.get(world.playerHeyaId) : null;

  // Build narrative sections
  const hasYusho = groupedEvents.yusho.length > 0;
  const hasPromotions = groupedEvents.promotions.length > 0;
  const hasRetirements = groupedEvents.retirements.length > 0;
  const hasGovernance = groupedEvents.governance.length > 0 || (world.governanceLog?.length || 0) > 0;
  const hasPrestigeChanges = prestigeChanges.length > 0;
  const hasSponsors = groupedEvents.sponsors.length > 0;
  
  // Get player-specific sponsor events
  const playerSponsorEvents = playerHeya 
    ? groupedEvents.sponsors.filter(e => e.heyaId === playerHeya.id)
    : [];
  
  const bashoName = lastBasho?.bashoName?.toUpperCase() || world.currentBashoName?.toUpperCase() || "RECENT";

  const dashboardTabs = [
    { id: "overview", label: "Overview", href: "/dashboard" },
    { id: "basho", label: "Basho", href: "/basho" },
    { id: "recap", label: "Recap" },
    { id: "history", label: "History", href: "/history" },
    { id: "almanac", label: "Almanac", href: "/almanac" },
  ];

  return (
    <AppLayout
      pageTitle="Post-Basho Recap"
      subNavTabs={dashboardTabs}
      activeSubTab="recap"
    >
      <div className="space-y-6">
        <p className="text-muted-foreground">
          {bashoName} {world.year} — The dust settles on another tournament
        </p>

        {/* YUSHO / CHAMPIONSHIP SECTION - Always show if we have basho data */}
        {lastBasho && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-6 w-6 text-amber-500" />
                {lastBasho.bashoName?.toUpperCase()} {lastBasho.year} Champion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* YUSHO WINNER */}
              {lastBasho.yusho && (() => {
                const champion = world.rikishi.get(lastBasho.yusho);
                const championHeya = champion?.heyaId ? world.heyas.get(champion.heyaId) : null;
                const isPlayerChampion = champion?.heyaId === world.playerHeyaId;
                return (
                  <div className={`p-4 rounded-lg border ${isPlayerChampion ? 'border-primary bg-primary/5' : 'border-amber-500/30 bg-amber-500/10'}`}>
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <Trophy className="h-8 w-8 text-amber-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-2xl font-bold">{champion ? <RikishiName id={champion.id} name={champion.shikona} /> : "Unknown"}</p>
                        <p className="text-muted-foreground">
                          {championHeya ? <StableName id={championHeya.id} name={championHeya.name} /> : "Unknown Stable"} • {champion?.rank?.toUpperCase()}
                        </p>
                        {isPlayerChampion && (
                          <Badge className="mt-2 bg-primary">Your Stable's Champion!</Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-amber-500">優勝</p>
                        <p className="text-sm text-muted-foreground">Yūshō</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* JUN-YUSHO (Runner-up) */}
              {lastBasho.junYusho && lastBasho.junYusho.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Medal className="h-4 w-4" />
                    Jun-Yūshō (Runner-up)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {lastBasho.junYusho.map((id: string) => {
                      const r = world.rikishi.get(id);
                      return (
                        <Badge key={id} variant="secondary" className="text-sm">
                          {r ? <RikishiName id={r.id} name={r.shikona} /> : "Unknown"}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SPECIAL PRIZES */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Special Prizes (三賞 Sanshō)
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  {/* Shukun-shō - Outstanding Performance */}
                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="h-4 w-4 text-red-500" />
                      <span className="font-medium text-sm">殊勲賞</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">Shukun-shō (Outstanding Performance)</p>
                    {lastBasho.shukunsho ? (
                      <p className="font-medium">{(() => { const r = world.rikishi.get(lastBasho.shukunsho); return r ? <RikishiName id={r.id} name={r.shikona} /> : "Unknown"; })()}</p>
                    ) : (
                      <p className="text-muted-foreground italic text-sm">Not awarded</p>
                    )}
                  </div>

                  {/* Kantō-shō - Fighting Spirit */}
                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="h-4 w-4 text-orange-500" />
                      <span className="font-medium text-sm">敢闘賞</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">Kantō-shō (Fighting Spirit)</p>
                    {lastBasho.kantosho ? (
                      <p className="font-medium">{(() => { const r = world.rikishi.get(lastBasho.kantosho); return r ? <RikishiName id={r.id} name={r.shikona} /> : "Unknown"; })()}</p>
                    ) : (
                      <p className="text-muted-foreground italic text-sm">Not awarded</p>
                    )}
                  </div>

                  {/* Ginō-shō - Technique */}
                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-sm">技能賞</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">Ginō-shō (Technique)</p>
                    {lastBasho.ginoSho ? (
                      <p className="font-medium">{(() => { const r = world.rikishi.get(lastBasho.ginoSho); return r ? <RikishiName id={r.id} name={r.shikona} /> : "Unknown"; })()}</p>
                    ) : (
                      <p className="text-muted-foreground italic text-sm">Not awarded</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Prize Money Summary */}
              {lastBasho.prizes && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Prize purse: Yūshō — Grand Prize • 
                    Jun-Yūshō — Substantial • 
                    Special Prizes — Notable
                  </p>
                </div>
              )}

              {/* KINBOSHI - Gold Star Victories */}
              {(() => {
                // Find all kinboshi from the basho matches
                const bashoState = world.currentBasho;
                const matches = bashoState?.matches || [];
                const kinboshiList = matches.filter((m: any) => m.result?.isKinboshi);
                
                if (kinboshiList.length === 0) return null;
                
                return (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      金星 Kinboshi (Gold Star Victories)
                    </p>
                    <div className="space-y-2">
                      {kinboshiList.map((m: any, idx: number) => {
                        const winner = world.rikishi.get(m.result.winnerRikishiId);
                        const loser = world.rikishi.get(m.result.loserRikishiId);
                        const winnerHeya = winner?.heyaId ? world.heyas.get(winner.heyaId) : null;
                        const isPlayerKinboshi = winner?.heyaId === world.playerHeyaId;
                        return (
                          <div key={idx} className={`p-3 rounded-lg border ${isPlayerKinboshi ? 'border-primary bg-primary/5' : 'border-yellow-500/30 bg-yellow-500/10'}`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-bold">{winner ? <RikishiName id={winner.id} name={winner.shikona} /> : "Unknown"}</p>
                                <p className="text-xs text-muted-foreground">{winnerHeya ? <StableName id={winnerHeya.id} name={winnerHeya.name} /> : ""} • Day {m.day}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm">defeated <span className="font-medium">{loser ? <RikishiName id={loser.id} name={loser.shikona} /> : "Yokozuna"}</span></p>
                                <p className="text-xs text-muted-foreground">via {m.result.kimariteName}</p>
                              </div>
                              {isPlayerKinboshi && (
                                <Badge className="ml-2 bg-yellow-500 text-black">YOUR STABLE!</Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* PLAYOFF BRACKET - if there were playoff matches */}
        {lastBasho?.playoffMatches && lastBasho.playoffMatches.length > 0 && (
          <PlayoffBracket matches={lastBasho.playoffMatches} world={world} />
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* PROMOTIONS & DEMOTIONS */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Rank Changes
              </CardTitle>
              <CardDescription>Promotions and demotions following the tournament</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                {hasPromotions ? (
                  <div className="space-y-2">
                    {groupedEvents.promotions.map((e, i) => (
                      <div key={e.id || i} className="flex items-center gap-2 text-sm">
                        {e.type.includes("DEMOTION") ? (
                          <TrendingDown className="h-3 w-3 text-destructive" />
                        ) : (
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                        )}
                        <span>{e.summary || e.title}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Banzuke adjustments pending. Rank changes will be announced before the next basho.
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* OZEKI KADOBAN STATUS */}
          {(() => {
            const kadobanMap: OzekiKadobanMap = (world as any).ozekiKadoban ?? {};
            const ozekiEntries = Object.entries(kadobanMap).filter(([_, s]) => s.isKadoban || s.consecutiveMakeKoshi >= 2);
            if (ozekiEntries.length === 0) return null;
            return (
              <Card className="border-amber-600/30 bg-amber-600/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-amber-600" />
                    Ōzeki Kadoban Watch
                  </CardTitle>
                  <CardDescription>Ōzeki with makekoshi face demotion pressure</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {ozekiEntries.map(([rid, status]) => {
                      const r = world.rikishi.get(rid);
                      if (!r) return null;
                      const heya = world.heyas.get(r.heyaId);
                      const isPlayerRikishi = r.heyaId === world.playerHeyaId;
                      const isDemoted = status.consecutiveMakeKoshi >= 2;
                      return (
                        <div key={rid} className={`p-3 rounded-lg border ${isDemoted ? 'border-destructive/50 bg-destructive/5' : 'border-amber-500/30 bg-amber-500/10'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isDemoted ? 'bg-destructive/20' : 'bg-amber-500/20'}`}>
                                <ShieldAlert className={`h-5 w-5 ${isDemoted ? 'text-destructive' : 'text-amber-500'}`} />
                              </div>
                              <div>
                                <p className="font-bold">{<RikishiName id={r.id} name={r.shikona} />}</p>
                                <p className="text-xs text-muted-foreground">{heya ? <StableName id={heya.id} name={heya.name} /> : "Unknown Stable"}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              {isDemoted ? (
                                <Badge variant="destructive">DEMOTED TO SEKIWAKE</Badge>
                              ) : (
                                <Badge className="bg-amber-600 hover:bg-amber-700">角番 KADOBAN</Badge>
                              )}
                              {isPlayerRikishi && (
                                <p className="text-xs text-primary mt-1 font-medium">Your rikishi</p>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            {isDemoted
                              ? "Two consecutive losing records — demoted from Ōzeki to Sekiwake."
                              : "Must achieve kachi-koshi (winning record) next basho or face demotion."}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* RETIREMENTS & DEPARTURES */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserMinus className="h-5 w-5 text-orange-500" />
                Retirements
              </CardTitle>
              <CardDescription>Rikishi who have left the dohyo</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                {hasRetirements ? (
                  <div className="space-y-2">
                    {groupedEvents.retirements.map((e, i) => (
                      <div key={e.id || i} className="flex items-start gap-2 text-sm">
                        <UserMinus className="h-3 w-3 text-orange-500 mt-1" />
                        <div>
                          <span className="font-medium">{e.title}</span>
                          <p className="text-muted-foreground">{e.summary}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No retirements announced this basho. The roster remains stable.
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* PRESTIGE SHIFTS */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Prestige Shifts
              </CardTitle>
              <CardDescription>Stable reputation changes</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                {hasPrestigeChanges ? (
                  <div className="space-y-2">
                    {prestigeChanges.map((pc, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="text-xs">
                          {pc.heya.statureBand}
                        </Badge>
                        <span><StableName id={pc.heya.id} name={pc.heya.name} />: {pc.change}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Stable standings remain unchanged. Prestige shifts occur after significant results.
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* GOVERNANCE RULINGS */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-blue-500" />
                Governance Rulings
              </CardTitle>
              <CardDescription>JSA decisions and disciplinary actions</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                {hasGovernance ? (
                  <div className="space-y-2">
                    {groupedEvents.governance.map((e, i) => (
                      <div key={e.id || i} className="flex items-start gap-2 text-sm">
                        <Scale className="h-3 w-3 text-blue-500 mt-1" />
                        <div>
                          <span className="font-medium">{e.title}</span>
                          <p className="text-muted-foreground">{e.summary}</p>
                        </div>
                      </div>
                    ))}
                    {(world.governanceLog || []).slice(-5).map((ruling: any, i: number) => (
                      <div key={`ruling-${i}`} className="flex items-start gap-2 text-sm">
                        <Shield className="h-3 w-3 text-blue-500 mt-1" />
                        <div>
                          <span className="font-medium">{ruling.type}</span>
                          <p className="text-muted-foreground">{ruling.summary || ruling.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No governance actions this period. The JSA maintains its steady oversight.
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* SPONSOR CHURN / KŌENKAI CHANGES */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-amber-500" />
                Kōenkai Changes
              </CardTitle>
              <CardDescription>Sponsor arrivals and departures</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                {hasSponsors ? (
                  <div className="space-y-2">
                    {groupedEvents.sponsors.map((e, i) => {
                      const isDeparture = e.title.toLowerCase().includes("departure") || 
                                          e.title.toLowerCase().includes("withdrawn") ||
                                          e.summary.toLowerCase().includes("withdrawn");
                      const isArrival = e.title.toLowerCase().includes("join") || 
                                        e.title.toLowerCase().includes("new sponsor") ||
                                        e.title.toLowerCase().includes("arrival");
                      return (
                        <div key={e.id || i} className="flex items-start gap-2 text-sm">
                          {isDeparture ? (
                            <UserX className="h-3 w-3 text-destructive mt-1" />
                          ) : isArrival ? (
                            <Heart className="h-3 w-3 text-emerald-500 mt-1" />
                          ) : (
                            <Coins className="h-3 w-3 text-amber-500 mt-1" />
                          )}
                          <div>
                            <span className="font-medium">{e.title}</span>
                            <p className="text-muted-foreground">{e.summary}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Kōenkai relationships remain stable. No sponsor changes this period.
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* PLAYER KOENKAI STATUS */}
        {playerHeya && (
          <Card className="border-amber-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-amber-500" />
                Your Kōenkai: {playerHeya.name}
              </CardTitle>
              <CardDescription>Supporter association status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Support Level</p>
                  <p className="font-medium capitalize">{playerHeya.koenkaiBand || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Recent Changes</p>
                  <p className="font-medium">
                    {playerSponsorEvents.length > 0 
                      ? `${playerSponsorEvents.length} sponsor event${playerSponsorEvents.length > 1 ? 's' : ''}`
                      : "No changes"}
                  </p>
                </div>
              </div>
              {playerSponsorEvents.length > 0 && (
                <div className="mt-4 space-y-2">
                  {playerSponsorEvents.map((e, i) => {
                    const isDeparture = e.title.toLowerCase().includes("departure") || 
                                        e.summary.toLowerCase().includes("withdrawn");
                    return (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {isDeparture ? (
                          <Badge variant="destructive" className="gap-1">
                            <UserX className="h-3 w-3" />
                            Lost
                          </Badge>
                        ) : (
                          <Badge className="gap-1 bg-emerald-500">
                            <Heart className="h-3 w-3" />
                            Gained
                          </Badge>
                        )}
                        <span>{e.summary}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {playerHeya && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Your Stable: {playerHeya.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">{playerHeya.statureBand}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Roster Size</p>
                  <p className="font-medium">{playerHeya.rikishiIds?.length || 0} Rikishi</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Financial Health</p>
                  <p className="font-medium">
                    {playerHeya.funds >= 50_000_000 ? "Secure" :
                     playerHeya.funds >= 20_000_000 ? "Comfortable" :
                     playerHeya.funds >= 5_000_000 ? "Tight" :
                     playerHeya.funds >= 1_000_000 ? "Critical" : "Desperate"}
                  </p>
                </div>
              </div>
              
              {playerHeya.riskIndicators && (
                <div className="mt-4 flex gap-2 flex-wrap">
                  {playerHeya.riskIndicators.financial && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Financial Risk
                    </Badge>
                  )}
                  {playerHeya.riskIndicators.governance && (
                    <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-500">
                      <Scale className="h-3 w-3" />
                      Governance Watch
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* PROGRESSION ARCS — Ozeki Runs, Yokozuna Deliberation, Kadoban */}
        <ProgressionTracker world={world} />

        {/* INTAI CEREMONIES for retired rikishi */}
        {(() => {
          const retiredEvents = groupedEvents.retirements.filter(e => 
            e.type.includes("RETIRE") && e.rikishiId
          );
          const firstRetired = retiredEvents[0];
          const retiredRikishi = firstRetired?.rikishiId ? world.rikishi.get(firstRetired.rikishiId) : null;
          
          if (retiredRikishi) {
            return (
              <IntaiCeremonyTrigger
                rikishi={retiredRikishi}
                reason={firstRetired?.summary || ""}
                world={world}
              />
            );
          }
          return null;
        })()}

        {/* NARRATIVE CEREMONIES */}
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowPressConference(true)}>
            🎤 Press Conference
          </Button>
          {yokozunaCandidate && (
            <Button variant="outline" size="sm" onClick={() => setShowYokozunaDelib(true)}>
              👑 Yokozuna Deliberation
            </Button>
          )}
          {newInductees.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowHoFCeremony(newInductees[0])}>
              🏆 Hall of Fame Induction
            </Button>
          )}
        </div>

        {/* NAVIGATION */}
        <div className="flex flex-wrap gap-4">
          <Button onClick={handleContinue}>
            Continue to Off-Season
          </Button>
          <Button variant="outline" asChild>
            <NavLink to="/history">View Full History</NavLink>
          </Button>
          <Button variant="outline" asChild>
            <NavLink to="/banzuke">View Banzuke</NavLink>
          </Button>
        </div>

        {/* MODALS */}
        {showPressConference && world && (
          <PressConference world={world} open={showPressConference} onClose={handlePressConferenceClose} />
        )}
        {showYokozunaDelib && yokozunaCandidate && world && (
          <YokozunaDeliberation
            rikishi={yokozunaCandidate}
            world={world}
            open={showYokozunaDelib}
            onClose={() => setShowYokozunaDelib(false)}
            verdict={yokozunaCandidate.careerRecord?.yusho && yokozunaCandidate.careerRecord.yusho >= 2 ? "promoted" : "deferred"}
            reasoning={["Recent tournament performances reviewed", "Hinkaku (dignity) assessment conducted"]}
          />
        )}
        {showHoFCeremony && world && (
          <HoFInductionCeremony
            inductee={showHoFCeremony}
            world={world}
            open={!!showHoFCeremony}
            onClose={() => setShowHoFCeremony(null)}
          />
        )}
      </div>
    </AppLayout>
  );
}

// Helper: auto-shows intai ceremony for a retired rikishi
function IntaiCeremonyTrigger({ rikishi, reason, world }: { rikishi: any; reason: string; world: any }) {
  const [open, setOpen] = useState(true);
  return (
    <IntaiCeremony
      rikishi={rikishi}
      reason={reason}
      world={world}
      open={open}
      onClose={() => setOpen(false)}
    />
  );
}
