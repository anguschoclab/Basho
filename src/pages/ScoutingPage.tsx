// ScoutingPage.tsx
// Dedicated Scouting & Recruitment page per Basho Constitution A8/System 4
// Between-basho player actions: scout opponents, evaluate prospects, invest in intel
//
// Constitution compliance:
// - No raw stats shown — all narrative bands
// - Scouting uses fog-of-war from scouting.ts
// - Talent pool integration from talentpool.ts

import { useMemo, useState } from "react";
import { RecruitSigningDialog } from "@/components/game/RecruitSigningDialog";
import { Helmet } from "react-helmet";
import { AppLayout } from "@/components/layout/AppLayout";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Eye,
  EyeOff,
  UserPlus,
  Users,
  Target,
  Binoculars,
  Globe,
  GraduationCap,
  School,
  ChevronRight,
  Sparkles,
  Shield,
  Zap,
  Flame,
  AlertTriangle,
} from "lucide-react";
import {
  RANK_NAMES,
  STYLE_NAMES,
  ARCHETYPE_NAMES,
  createScoutedView,
  getScoutedAttributes,
  describeScoutingLevel,
  type ScoutingInvestment,
} from "@/engine/scouting";
import { getOrCreateScouted, setScoutingInvestment, getScoutingLevel, warmScoutingForRikishiList } from "@/engine/scoutingStore";
import * as talentpool from "@/engine/talentpool";
import { RANK_HIERARCHY } from "@/engine/banzuke";
import { RikishiName, StableName } from "@/components/ClickableName";
import { useToast } from "@/hooks/use-toast";
import { PerceptionOverview } from "@/components/game/PerceptionOverview";
import type { Rikishi } from "@/engine/types/rikishi";
import type { Rank } from "@/engine/types/banzuke";
import type { TacticalArchetype } from "@/engine/types/combat";
import {
  describeAttribute,
  describeAggression,
  describeExperience,
} from "@/engine/narrativeDescriptions";

// ==============================
// OPPONENT SCOUTING TAB
// ==============================

/**
 * opponent scouting tab.
 *  * @param {
 *   world,
 *   playerHeyaId,
 * } - The {
 *   world,
 *   player heya id,
 * }.
 */
function OpponentScoutingTab({
  world,
  playerHeyaId,
}: {
  world: any;
  playerHeyaId: string | null;
}) {
  const navigate = useNavigate();
  const { updateWorld } = useGame();
  const { toast } = useToast();
  const [filterDivision, setFilterDivision] = useState<string>("makuuchi");

  const opponents = useMemo(() => {
    if (!world) return [];
    const list: Rikishi[] = [];
    for (const r of world.rikishi.values()) {
      if (r.isRetired) continue;
      if (r.heyaId === playerHeyaId) continue;
      if (filterDivision && r.division !== filterDivision) continue;
      list.push(r);
    }
    // Sort by rank tier
    list.sort((a, b) => {
      const ta = (RANK_HIERARCHY as any)?.[a.rank]?.tier ?? 99;
      const tb = (RANK_HIERARCHY as any)?.[b.rank]?.tier ?? 99;
      if (ta !== tb) return ta - tb;
      return (a.rankNumber ?? 0) - (b.rankNumber ?? 0);
    });
    const sliced = list.slice(0, 40);
    // Pre-warm scouting entries for all opponents shown
    warmScoutingForRikishiList(world, sliced.map(r => r.id));
    return sliced;
  }, [world, playerHeyaId, filterDivision]);

  const handleInvestScouting = (rikishiId: string, level: ScoutingInvestment) => {
    if (!world) return;
    setScoutingInvestment(world, rikishiId, level);
    updateWorld({ ...world });
    toast({ title: "Scouting updated", description: `Investment set to ${level}.` });
  };

  const seed = world?.seed || "default";
  const currentWeek = (world as any)?.week ?? 0;

  return (
    <div className="space-y-4">
      {/* Division filter */}
      <div className="flex gap-2 flex-wrap">
        {["makuuchi", "juryo", "makushita"].map((div) => (
          <Button
            key={div}
            variant={filterDivision === div ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterDivision(div)}
            className="capitalize"
          >
            {div}
          </Button>
        ))}
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-3 pr-2">
          {opponents.map((r) => {
            const scouted = getOrCreateScouted(world, r.id, 1);
            const scoutLevel = getScoutingLevel(world, r.id, 1);
            const attrs = getScoutedAttributes(scouted, r, seed);
            const scoutInfo = describeScoutingLevel(scoutLevel);
            const rankNames = RANK_NAMES[r.rank] || { ja: r.rank, en: r.rank };
            const heya = world.heyas.get(r.heyaId);

            return (
              <Card
                key={r.id}
                className="paper cursor-pointer hover:border-primary/50 transition-all"
                onClick={() => navigate({ to: "/rikishi/$rikishiId", params: { rikishiId: r.id } })}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    {/* Identity */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-semibold text-lg truncate">
                          {r.shikona}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {rankNames.ja}
                          {r.rankNumber ? ` ${r.rankNumber}` : ""}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {heya?.name ?? "Unknown stable"} • {r.height}cm / {r.weight}kg
                      </div>

                      {/* Scouted attributes — narrative only */}
                      <div className="grid grid-cols-3 gap-x-4 gap-y-1 mt-3 text-xs">
                        <AttrChip label="Power" attr={attrs.power} />
                        <AttrChip label="Speed" attr={attrs.speed} />
                        <AttrChip label="Balance" attr={attrs.balance} />
                        <AttrChip label="Technique" attr={attrs.technique} />
                        <AttrChip label="Aggression" attr={attrs.aggression} />
                        <AttrChip label="Experience" attr={attrs.experience} />
                      </div>
                    </div>

                    {/* Scouting level + invest controls */}
                    <div className="flex flex-col items-end gap-2 shrink-0 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <Search className={`h-4 w-4 ${scoutInfo.color}`} />
                        <span className={`text-sm font-medium ${scoutInfo.color}`}>
                          {scoutInfo.label}
                        </span>
                      </div>
                      <Progress value={scouted.scoutingLevel} className="h-1.5 w-24" />

                      {/* Investment buttons */}
                      <div className="flex gap-1 mt-1">
                        {(["none", "light", "standard", "deep"] as ScoutingInvestment[]).map(
                          (inv) => (
                            <Button
                              key={inv}
                              variant={
                                scouted.scoutingInvestment === inv ? "default" : "ghost"
                              }
                              size="sm"
                              className="h-6 px-2 text-[10px]"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInvestScouting(r.id, inv);
                              }}
                            >
                              {inv === "none" ? "—" : inv.charAt(0).toUpperCase()}
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {opponents.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No opponents found in this division.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

/**
 * attr chip.
 *  * @param {
 *   label,
 *   attr,
 * } - The {
 *   label,
 *   attr,
 * }.
 */
function AttrChip({
  label,
  attr,
}: {
  label: string;
  attr: { value: string; confidence: string; narrative: string };
}) {
  const isUnknown = attr.confidence === "unknown";
  return (
    <div className="flex items-center gap-1" title={attr.narrative}>
      <span className="text-muted-foreground">{label}:</span>
      <span
        className={
          isUnknown
            ? "text-muted-foreground/50 italic"
            : attr.confidence === "low"
              ? "text-muted-foreground"
              : "text-foreground"
        }
      >
        {isUnknown ? "?" : attr.value}
      </span>
    </div>
  );
}

// ==============================
// OWN STABLE INTEL TAB
// ==============================

/**
 * stable intel tab.
 *  * @param {
 *   world,
 *   playerHeyaId,
 * } - The {
 *   world,
 *   player heya id,
 * }.
 */
function StableIntelTab({
  world,
  playerHeyaId,
}: {
  world: any;
  playerHeyaId: string | null;
}) {
  const navigate = useNavigate();

  const roster = useMemo(() => {
    if (!world || !playerHeyaId) return [];
    const list: Rikishi[] = [];
    for (const r of world.rikishi.values()) {
      if (r.heyaId !== playerHeyaId || r.isRetired) continue;
      list.push(r);
    }
    list.sort((a, b) => {
      const ta = (RANK_HIERARCHY as any)?.[a.rank]?.tier ?? 99;
      const tb = (RANK_HIERARCHY as any)?.[b.rank]?.tier ?? 99;
      return ta - tb || (a.rankNumber ?? 0) - (b.rankNumber ?? 0);
    });
    return list;
  }, [world, playerHeyaId]);

  const seed = world?.seed || "default";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Full intel on your own wrestlers. You know everything about those who train under your roof.
      </p>

      <ScrollArea className="h-[600px]">
        <div className="space-y-2 pr-2">
          {roster.map((r) => {
            const rankNames = RANK_NAMES[r.rank] || { ja: r.rank, en: r.rank };

            return (
              <div
                key={r.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                onClick={() => navigate({ to: "/rikishi/$rikishiId", params: { rikishiId: r.id } })}
              >
                <div className={`w-1 h-10 rounded-full ${r.side === "east" ? "bg-east" : "bg-west"}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-display font-medium truncate">{r.shikona}</div>
                  <div className="text-xs text-muted-foreground">
                    {rankNames.ja}
                    {r.rankNumber ? ` ${r.rankNumber}` : ""} • {describeAttribute(r.power)} power •{" "}
                    {describeAttribute(r.technique)} technique
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-mono">
                    {r.currentBashoWins}-{r.currentBashoLosses}
                  </div>
                  {r.injured && (
                    <Badge variant="destructive" className="text-[10px]">
                      Injured
                    </Badge>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// ==============================
// TALENT POOL / RECRUITING TAB
// ==============================

/**
 * recruiting tab.
 *  * @param {
 *   world,
 *   playerHeyaId,
 * } - The {
 *   world,
 *   player heya id,
 * }.
 */
function RecruitingTab({
  world,
  playerHeyaId,
}: {
  world: any;
  playerHeyaId: string | null;
}) {
  const { updateWorld } = useGame();
  const { toast } = useToast();
  const [activePool, setActivePool] = useState<"high_school" | "university" | "foreign">(
    "high_school"
  );
  const [signingCandidate, setSigningCandidate] = useState<any>(null);

  const candidates = useMemo(() => {
    if (!world) return [];
    try {
      return talentpool.listVisibleCandidates(world, activePool);
    } catch {
      return [];
    }
  }, [world, activePool]);

  const handleScoutPool = () => {
    if (!world) return;
    try {
      const result = talentpool.scoutPool(world, activePool, { revealCount: 2 });
      updateWorld({ ...world });
      if (result.revealed.length > 0) {
        toast({
          title: "New prospects found",
          description: `${result.revealed.length} prospect(s) revealed.`,
        });
      } else {
        toast({
          title: "No new prospects",
          description: "No more hidden prospects in this pool right now.",
        });
      }
    } catch {
      toast({ title: "Scouting failed", description: "Could not scout this pool." });
    }
  };

  const handleScoutCandidate = (candidateId: string) => {
    if (!world) return;
    try {
      const result = talentpool.scoutCandidate(world, candidateId, { effort: 1 });
      updateWorld({ ...world });
      if (result.ok) {
        toast({
          title: "Intel gathered",
          description: `Scouting level: ${describeScoutingLevel(result.scoutingLevel).label}`,
        });
      }
    } catch {
      toast({ title: "Scout failed" });
    }
  };

  const handleOfferClick = (candidate: any) => {
    setSigningCandidate(candidate);
  };

  const handleConfirmSigning = () => {
    if (!world || !playerHeyaId || !signingCandidate) return;
    try {
      const result = talentpool.offerCandidate(world, signingCandidate.candidateId, playerHeyaId);
      updateWorld({ ...world });
      if (result.ok) {
        toast({
          title: (result as any).signed ? "🎉 Prospect signed!" : "Offer submitted",
          description: (result as any).signed
            ? `${signingCandidate.shikona || "The prospect"} has joined your stable!`
            : "Decision pending — the prospect is considering offers.",
        });
      } else {
        toast({
          title: "Offer blocked",
          description: (result as any).reason ?? "Cannot make this offer.",
        });
      }
    } catch {
      toast({ title: "Offer failed" });
    }
    setSigningCandidate(null);
  };

  const playerHeya = playerHeyaId ? world?.heyas?.get(playerHeyaId) : null;

  const poolIcons = {
    high_school: <School className="h-4 w-4" />,
    university: <GraduationCap className="h-4 w-4" />,
    foreign: <Globe className="h-4 w-4" />,
  };

  const poolLabels = {
    high_school: "High School",
    university: "University",
    foreign: "Foreign",
  };

  return (
    <div className="space-y-4">
      {/* Pool selector */}
      <div className="flex gap-2 flex-wrap items-center">
        {(["high_school", "university", "foreign"] as const).map((pool) => (
          <Button
            key={pool}
            variant={activePool === pool ? "default" : "outline"}
            size="sm"
            onClick={() => setActivePool(pool)}
            className="gap-2"
          >
            {poolIcons[pool]}
            {poolLabels[pool]}
          </Button>
        ))}

        <Button variant="secondary" size="sm" onClick={handleScoutPool} className="ml-auto gap-2">
          <Binoculars className="h-4 w-4" />
          Scout Pool
        </Button>
      </div>

      <ScrollArea className="h-[550px]">
        <div className="space-y-3 pr-2">
          {candidates.map((c: any) => {
            const scoutLevel = talentpool.getCandidateScoutingLevel(world, c.candidateId);
            const scoutInfo = describeScoutingLevel(scoutLevel);
            const visLabel =
              c.visibilityBand === "public"
                ? "Public"
                : c.visibilityBand === "rumored"
                  ? "Rumored"
                  : "Obscure";

            return (
              <Card key={c.candidateId} className="paper">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-semibold">
                          {c.visibilityBand === "obscure" ? "Unknown Prospect" : c.shikona || c.candidateId.slice(0, 8)}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {visLabel}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {c.poolType?.replace("_", " ") ?? activePool.replace("_", " ")}
                        </Badge>
                      </div>

                      <div className="text-xs text-muted-foreground mt-1">
                        {c.nationality ?? "Unknown origin"} •{" "}
                        {c.age ? `Age ${c.age}` : "Age unknown"} •{" "}
                        {c.height ? `${c.height}cm` : ""} {c.weight ? `${c.weight}kg` : ""}
                      </div>

                      {scoutLevel >= 35 && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {c.archetype && (
                            <span>
                              Style: {ARCHETYPE_NAMES[c.archetype as TacticalArchetype]?.label ?? c.archetype}
                            </span>
                          )}
                          {scoutLevel >= 65 && c.talentSeed && (
                            <span className="ml-3">
                              Potential: {c.talentSeed > 0.7 ? "Promising" : c.talentSeed > 0.4 ? "Average" : "Modest"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center gap-1">
                        <Search className={`h-3 w-3 ${scoutInfo.color}`} />
                        <span className={`text-xs ${scoutInfo.color}`}>{scoutInfo.label}</span>
                      </div>

                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleScoutCandidate(c.candidateId);
                          }}
                        >
                          <Eye className="h-3 w-3" />
                          Scout
                        </Button>
                        {c.availabilityState === "available" && (
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOfferClick(c);
                            }}
                          >
                            <UserPlus className="h-3 w-3" />
                            Offer
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {candidates.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Binoculars className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No visible prospects in this pool yet.</p>
              <p className="text-xs mt-1">Use "Scout Pool" to reveal hidden prospects.</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Signing confirmation dialog */}
      <RecruitSigningDialog
        open={!!signingCandidate}
        onConfirm={handleConfirmSigning}
        onCancel={() => setSigningCandidate(null)}
        candidate={signingCandidate}
        playerHeyaName={playerHeya?.name}
        rosterSize={playerHeya?.rikishiIds?.length}
      />
    </div>
  );
}

// ==============================
// MAIN PAGE
// ==============================

/** scouting page. */
export default function ScoutingPage() {
  const { state } = useGame();
  const world = state.world;
  const playerHeyaId = state.playerHeyaId ?? (world as any)?.playerHeyaId ?? null;

  if (!world) {
    return <div className="p-6 text-center text-muted-foreground">No world loaded.</div>;
  }

  const managementTabs = [
    { id: "economy", label: "Economy", href: "/economy" },
    { id: "scouting", label: "Scouting" },
    { id: "talent", label: "Talent Pools", href: "/talent" },
    { id: "governance", label: "Governance", href: "/governance" },
    { id: "myoseki", label: "Myoseki", href: "/myoseki" },
  ];

  return (
    <AppLayout
      pageTitle="Scouting & Recruitment"
      subNavTabs={managementTabs}
      activeSubTab="scouting"
    >
      <Helmet>
        <title>Scouting & Recruitment — Basho</title>
        <meta name="description" content="Scout opponents, evaluate prospects, and build your roster in Basho sumo management simulation." />
      </Helmet>

      <div className="space-y-6">

        <Tabs defaultValue="opponents" className="space-y-4">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="opponents" className="gap-2">
              <Target className="h-4 w-4" />
              Opponents
            </TabsTrigger>
            <TabsTrigger value="stable" className="gap-2">
              <Shield className="h-4 w-4" />
              My Stable
            </TabsTrigger>
            <TabsTrigger value="perception" className="gap-2">
              <Eye className="h-4 w-4" />
              Intel
            </TabsTrigger>
            <TabsTrigger value="recruit" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Recruit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="opponents">
            <OpponentScoutingTab world={world} playerHeyaId={playerHeyaId} />
          </TabsContent>

          <TabsContent value="stable">
            <StableIntelTab world={world} playerHeyaId={playerHeyaId} />
          </TabsContent>

          <TabsContent value="perception">
            <PerceptionOverview world={world} playerHeyaId={playerHeyaId} />
          </TabsContent>

          <TabsContent value="recruit">
            <RecruitingTab world={world} playerHeyaId={playerHeyaId} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
