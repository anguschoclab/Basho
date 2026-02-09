// StablePage.tsx
// Stable Management Page - Training, roster, and facilities
// Narrative-First per Master Context v2.2 - No raw numbers for hidden attributes
//
// UPDATES APPLIED:
// - Canon rename: Basho (no “Stable Lords” strings here; page title kept neutral)
// - Fixed training state init: prefer heya.trainingState if present, otherwise default
// - Removed unused imports (Helmet kept; many icons trimmed to only those used)
// - Facilities tab: removed direct numeric thresholds in UI copy (now uses facilitiesBand + narrative)
//   and falls back gracefully if raw facility numbers exist.
// - Added safe guards for optional heya.riskIndicators / facilities / bands
// - Keeps “allowed” numbers (wins/losses) but avoids raw hidden stats
//
// Drop-in compatibility with updated engine/types + engine/training from earlier messages.

import { Helmet } from "react-helmet";
import { useNavigate, useParams } from "react-router-dom";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RANK_HIERARCHY } from "@/engine/banzuke";
import type { FacilitiesBand, KoenkaiBandType, PrestigeBand, RunwayBand, StatureBand, Rikishi } from "@/engine/types";
import {
  INTENSITY_EFFECTS,
  FOCUS_EFFECTS,
  RECOVERY_EFFECTS,
  getIntensityLabel,
  getFocusLabel,
  getRecoveryLabel,
  getFocusModeLabel,
  getCareerPhase,
  type TrainingIntensity,
  type TrainingFocus,
  type RecoveryEmphasis,
  type BeyaTrainingState,
  createDefaultTrainingState
} from "@/engine/training";
import { describeTrainingEffect } from "@/engine/narrativeDescriptions";
import {
  Activity,
  AlertTriangle,
  Bed,
  Building,
  ChefHat,
  Coins,
  Crown,
  Dumbbell,
  Heart,
  History,
  Medal,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  Users2,
  Zap
} from "lucide-react";
import { useMemo, useState } from "react";
import { OyakataName } from "@/components/ClickableName";
import { InstitutionPanel } from "@/components/game/InstitutionPanel";

// Narrative band displays (no raw numbers)
const STATURE_DISPLAY: Record<StatureBand, { label: string; labelJa: string; color: string }> = {
  legendary: { label: "Legendary", labelJa: "伝説", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  powerful: { label: "Powerful", labelJa: "強豪", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  established: { label: "Established", labelJa: "安定", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  rebuilding: { label: "Rebuilding", labelJa: "再建中", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  fragile: { label: "Fragile", labelJa: "危機", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  new: { label: "New", labelJa: "新規", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" }
};

const PRESTIGE_NARRATIVE: Record<PrestigeBand, { label: string; description: string }> = {
  elite: { label: "Elite", description: "Commands respect throughout the sumo world. Recruits seek you out." },
  respected: { label: "Respected", description: "A name that carries weight in sumo circles." },
  modest: { label: "Modest", description: "Solid reputation, neither celebrated nor overlooked." },
  struggling: { label: "Struggling", description: "Fighting to maintain relevance in a competitive world." },
  unknown: { label: "Unknown", description: "Few outside the community know this name." }
};

const RUNWAY_NARRATIVE: Record<RunwayBand, { label: string; color: string; description: string }> = {
  secure: { label: "Secure", color: "text-success", description: "Comfortable reserves for the foreseeable future." },
  comfortable: { label: "Comfortable", color: "text-success", description: "No immediate concerns, room for investment." },
  tight: { label: "Tight", color: "text-warning", description: "Careful spending required, limited flexibility." },
  critical: { label: "Critical", color: "text-destructive", description: "Urgent attention needed, difficult decisions ahead." },
  desperate: { label: "Desperate", color: "text-destructive", description: "Every yen matters. Survival mode." }
};

const KOENKAI_NARRATIVE: Record<KoenkaiBandType, { label: string; description: string }> = {
  powerful: { label: "Powerful", description: "Influential patrons provide substantial monthly support." },
  strong: { label: "Strong", description: "Reliable supporter base with steady contributions." },
  moderate: { label: "Moderate", description: "A modest group of dedicated supporters." },
  weak: { label: "Weak", description: "Few patrons, minimal financial cushion from supporters." },
  none: { label: "None", description: "No established supporter network. You stand alone." }
};

const FACILITIES_NARRATIVE: Record<FacilitiesBand, { label: string; description: string }> = {
  world_class: { label: "World-Class", description: "State-of-the-art equipment rivals professional sports facilities." },
  excellent: { label: "Excellent", description: "A superior training environment that attracts talent." },
  adequate: { label: "Adequate", description: "Functional equipment that meets basic professional standards." },
  basic: { label: "Basic", description: "Humble facilities that demand creative training methods." },
  minimal: { label: "Minimal", description: "Bare essentials only. Character builds where equipment cannot." }
};

function safeFacilitiesCopy(band: FacilitiesBand | undefined, kind: "training" | "recovery" | "nutrition") {
  // Narrative-first, no raw thresholds.
  const base = band ? FACILITIES_NARRATIVE[band]?.description : "Facilities are still being assessed.";
  if (!band) return base;

  switch (kind) {
    case "training":
      return `${base} The dohyo and practice space shape the pace of development and technical refinement.`;
    case "recovery":
      return `${base} Recovery capacity influences fatigue, injury risk, and return-to-form after hard sessions.`;
    case "nutrition":
      return `${base} Nutrition quality affects strength gains, weight management, and long-term durability.`;
  }
}

type StableAchievements = {
  yusho: Array<{ rikishiId: string; bashoName: string; year: number }>;
  junYusho: Array<{ rikishiId: string; bashoName: string; year: number }>;
  ginoSho: Array<{ rikishiId: string; bashoName: string; year: number }>;
  kantosho: Array<{ rikishiId: string; bashoName: string; year: number }>;
  shukunsho: Array<{ rikishiId: string; bashoName: string; year: number }>;
};

export default function StablePage() {
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id?: string }>();
  const { state, updateWorld } = useGame();
  const { world, playerHeyaId } = state;

  // Guard: must not navigate during render; render a safe fallback instead.
  if (!world || !playerHeyaId) {
    return null;
  }

  // Use route param if provided, otherwise default to player's stable
  const viewingHeyaId = routeId || playerHeyaId;
  const isViewingOwnStable = viewingHeyaId === playerHeyaId;

  const heya = world.heyas.get(viewingHeyaId);
  if (!heya) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Card className="paper">
          <CardHeader>
            <CardTitle>Stable not found</CardTitle>
            <CardDescription>The requested heya could not be loaded.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate("/")}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rikishiList = useMemo(() => {
    return heya.rikishiIds
      .map((id) => world.rikishi.get(id))
      .filter(Boolean)
      .sort((a, b) => {
        const tierA = RANK_HIERARCHY[a!.rank].tier;
        const tierB = RANK_HIERARCHY[b!.rank].tier;
        if (tierA !== tierB) return tierA - tierB;

        // Stable deterministic tie-break: lower rankNumber first, then east before west, then id.
        const rnA = a!.rankNumber ?? 999;
        const rnB = b!.rankNumber ?? 999;
        if (rnA !== rnB) return rnA - rnB;

        if (a!.side !== b!.side) return a!.side === "east" ? -1 : 1;

        return a!.id.localeCompare(b!.id);
      });
  }, [heya.rikishiIds, world.rikishi]);

  const sekitori = useMemo(
    () => rikishiList.filter((r) => r && RANK_HIERARCHY[r.rank].isSekitori),
    [rikishiList]
  );

  // Compute stable achievements from world history
  const stableAchievements = useMemo<StableAchievements>(() => {
    const stableRikishiIds = new Set(heya.rikishiIds);
    const achievements: StableAchievements = { yusho: [], junYusho: [], ginoSho: [], kantosho: [], shukunsho: [] };

    for (const record of world.history || []) {
      if (record.yusho && stableRikishiIds.has(record.yusho)) {
        achievements.yusho.push({ rikishiId: record.yusho, bashoName: record.bashoName, year: record.year });
      }
      for (const jy of record.junYusho || []) {
        if (stableRikishiIds.has(jy)) {
          achievements.junYusho.push({ rikishiId: jy, bashoName: record.bashoName, year: record.year });
        }
      }
      if (record.ginoSho && stableRikishiIds.has(record.ginoSho)) {
        achievements.ginoSho.push({ rikishiId: record.ginoSho, bashoName: record.bashoName, year: record.year });
      }
      if (record.kantosho && stableRikishiIds.has(record.kantosho)) {
        achievements.kantosho.push({ rikishiId: record.kantosho, bashoName: record.bashoName, year: record.year });
      }
      if (record.shukunsho && stableRikishiIds.has(record.shukunsho)) {
        achievements.shukunsho.push({ rikishiId: record.shukunsho, bashoName: record.bashoName, year: record.year });
      }
    }

    // Sort newest-first, deterministic
    const sortNewest = (a: { year: number; bashoName: string }, b: { year: number; bashoName: string }) =>
      b.year - a.year || b.bashoName.localeCompare(a.bashoName);

    achievements.yusho.sort(sortNewest);
    achievements.junYusho.sort(sortNewest);
    achievements.ginoSho.sort(sortNewest);
    achievements.kantosho.sort(sortNewest);
    achievements.shukunsho.sort(sortNewest);

    return achievements;
  }, [heya.rikishiIds, world.history]);

  // Top performers in stable (by career wins)
  const topPerformers = useMemo(() => {
    return [...rikishiList]
      .filter((r): r is Rikishi => r !== undefined)
      .sort((a, b) => (b.careerWins || 0) - (a.careerWins || 0) || a.id.localeCompare(b.id))
      .slice(0, 5);
  }, [rikishiList]);

  // Training state: prefer persisted heya trainingState if present, else default.
  const [trainingState, setTrainingState] = useState<BeyaTrainingState>(() => {
    const existing = (heya as any).trainingState as BeyaTrainingState | undefined;
    const defaultSlots = Math.max(1, Math.min(6, sekitori.length || 3));
    return existing ?? createDefaultTrainingState(defaultSlots);
  });

  const persistTrainingState = (next: BeyaTrainingState) => {
    if (!isViewingOwnStable) return;
    (heya as any).trainingState = next;
    // Ensure React subscribers re-render and the state can be saved.
    updateWorld({ ...world });
  };

  const handleIntensityChange = (intensity: TrainingIntensity) => {
    if (!isViewingOwnStable) return;
    setTrainingState((prev) => {
      const next = { ...prev, profile: { ...prev.profile, intensity } };
      persistTrainingState(next);
      return next;
    });
  };

  const handleFocusChange = (focus: TrainingFocus) => {
    if (!isViewingOwnStable) return;
    setTrainingState((prev) => {
      const next = { ...prev, profile: { ...prev.profile, focus } };
      persistTrainingState(next);
      return next;
    });
  };

  const handleRecoveryChange = (recovery: RecoveryEmphasis) => {
    if (!isViewingOwnStable) return;
    setTrainingState((prev) => {
      const next = { ...prev, profile: { ...prev.profile, recovery } };
      persistTrainingState(next);
      return next;
    });
  };

  const intensityEffect = INTENSITY_EFFECTS[trainingState.profile.intensity];
  const focusEffect = FOCUS_EFFECTS[trainingState.profile.focus];
  const recoveryEffect = RECOVERY_EFFECTS[trainingState.profile.recovery];

  // Band fallbacks (in case older saves are missing fields)
  const statureBand: StatureBand = heya.statureBand ?? "new";
  const prestigeBand: PrestigeBand = heya.prestigeBand ?? "unknown";
  const runwayBand: RunwayBand = heya.runwayBand ?? "tight";
  const koenkaiBand: KoenkaiBandType = heya.koenkaiBand ?? "none";
  const facilitiesBand: FacilitiesBand = heya.facilitiesBand ?? "basic";

  return (
    <>
      <Helmet>
        <title>{heya.name} — Heya Management</title>
      </Helmet>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header with Narrative Bands */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="font-display text-3xl font-bold">{heya.name}</h1>
              {heya.nameJa && <span className="text-muted-foreground font-display">{heya.nameJa}</span>}
              <Badge className={`${STATURE_DISPLAY[statureBand].color} border`}>
                {STATURE_DISPLAY[statureBand].labelJa} ({STATURE_DISPLAY[statureBand].label})
              </Badge>
              {!isViewingOwnStable && (
                <Badge variant="outline" className="text-xs">
                  Viewing
                </Badge>
              )}
            </div>

            <p className="text-muted-foreground">
              {rikishiList.length} wrestlers • {sekitori.length} sekitori
              {heya.oyakataId && (
                <span>
                  {" "}
                  • Oyakata: <OyakataName id={heya.oyakataId} name="View Profile" className="font-medium" />
                </span>
              )}
            </p>

            {heya.descriptor && <p className="text-sm text-muted-foreground italic mt-1">{heya.descriptor}</p>}
          </div>

          {/* Risk Indicators */}
          <div className="flex flex-col gap-2 items-end">
            {(heya as any).riskIndicators?.financial && (
              <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Financial Pressure
              </Badge>
            )}
            {(heya as any).riskIndicators?.governance && (
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                <Shield className="w-3 h-3 mr-1" />
                Governance Watch
              </Badge>
            )}
            {(heya as any).riskIndicators?.rivalry && (
              <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                <Sparkles className="w-3 h-3 mr-1" />
                Active Rivalry
              </Badge>
            )}
          </div>
        </div>

        {/* Stable Status Overview - Narrative Bands */}
        <Card className="paper">
          <CardContent className="pt-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="h-4 w-4" />
                  Standing
                </div>
                <p className="font-medium">{PRESTIGE_NARRATIVE[prestigeBand].label}</p>
                <p className="text-xs text-muted-foreground">{PRESTIGE_NARRATIVE[prestigeBand].description}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Coins className="h-4 w-4" />
                  Finances
                </div>
                <p className={`font-medium ${RUNWAY_NARRATIVE[runwayBand].color}`}>{RUNWAY_NARRATIVE[runwayBand].label}</p>
                <p className="text-xs text-muted-foreground">{RUNWAY_NARRATIVE[runwayBand].description}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users2 className="h-4 w-4" />
                  Supporters
                </div>
                <p className="font-medium">{KOENKAI_NARRATIVE[koenkaiBand].label}</p>
                <p className="text-xs text-muted-foreground">{KOENKAI_NARRATIVE[koenkaiBand].description}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building className="h-4 w-4" />
                  Facilities
                </div>
                <p className="font-medium">{FACILITIES_NARRATIVE[facilitiesBand].label}</p>
                <p className="text-xs text-muted-foreground">{FACILITIES_NARRATIVE[facilitiesBand].description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="roster" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="roster">Roster</TabsTrigger>
            <TabsTrigger value="training">Training</TabsTrigger>
            <TabsTrigger value="facilities">Facilities</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
                    <TabsTrigger value="institution" className="gap-2"><Shield className="h-4 w-4" />Institution</TabsTrigger>
</TabsList>

          {/* Roster Tab */}
          <TabsContent value="roster" className="space-y-4">
            <Card className="paper">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Full Roster
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {rikishiList.map((rikishi) => {
                    if (!rikishi) return null;
                    const rankInfo = RANK_HIERARCHY[rikishi.rank];

                    return (
                      <div
                        key={rikishi.id}
                        className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/rikishi/${rikishi.id}`)}
                      >
                        <div className={`w-1 h-10 rounded-full ${rikishi.side === "east" ? "bg-east" : "bg-west"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="font-display font-medium truncate">{rikishi.shikona}</div>
                          <div className="text-sm text-muted-foreground">
                            {rankInfo.nameJa}
                            {rikishi.rankNumber && ` ${rikishi.rankNumber}枚目`}
                          </div>
                        </div>
                        <div className="text-right">
                          {/* Allowed: W/L */}
                          <div className="text-sm font-mono">
                            {rikishi.currentBashoWins}-{rikishi.currentBashoLosses}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Career: {rikishi.careerWins}-{rikishi.careerLosses}
                          </div>
                        </div>
                        <div className="flex gap-2 items-center flex-wrap justify-end">
                          {rikishi.momentum !== 0 &&
                            (rikishi.momentum > 0 ? (
                              <span className="text-xs text-success flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" /> Hot
                              </span>
                            ) : (
                              <span className="text-xs text-destructive flex items-center gap-1">
                                <TrendingDown className="h-3 w-3" /> Cold
                              </span>
                            ))}
                          {rikishi.injured && (
                            <span className="text-xs text-destructive flex items-center gap-1">
                              <Activity className="h-3 w-3" /> Injured
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Training Tab */}
          <TabsContent value="training" className="space-y-6">
            {!isViewingOwnStable && (
              <Card className="paper">
                <CardContent className="pt-6 text-sm text-muted-foreground">
                  You’re viewing another heya. Training controls are read-only.
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Intensity */}
              <Card className="paper">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Dumbbell className="h-5 w-5" />
                    Training Intensity
                  </CardTitle>
                  <CardDescription>{intensityEffect.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(Object.keys(INTENSITY_EFFECTS) as TrainingIntensity[]).map((intensity) => {
                    const label = getIntensityLabel(intensity);
                    const effect = INTENSITY_EFFECTS[intensity];
                    const isActive = trainingState.profile.intensity === intensity;

                    return (
                      <button
                        key={intensity}
                        onClick={() => handleIntensityChange(intensity)}
                        disabled={!isViewingOwnStable}
                        className={`w-full p-3 rounded-lg text-left transition-colors ${
                          isActive ? "bg-primary text-primary-foreground" : "bg-secondary/50 hover:bg-secondary"
                        } ${!isViewingOwnStable ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-display font-medium">
                            {label.ja} <span className="text-sm opacity-80">({label.en})</span>
                          </span>
                          <div className="flex gap-3 text-xs">
                            <span
                              className={
                                effect.growthMult > 1
                                  ? isActive
                                    ? ""
                                    : "text-success"
                                  : effect.growthMult < 1
                                    ? isActive
                                      ? ""
                                      : "text-destructive"
                                    : ""
                              }
                            >
                              Growth: {describeTrainingEffect(effect.growthMult)}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs mt-1 opacity-70">
                          {effect.injuryRisk > 1.2
                            ? "Higher injury risk"
                            : effect.injuryRisk < 0.9
                              ? "Lower injury risk"
                              : "Standard injury risk"}
                        </p>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Focus */}
              <Card className="paper">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Training Focus
                  </CardTitle>
                  <CardDescription>{focusEffect.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(Object.keys(FOCUS_EFFECTS) as TrainingFocus[]).map((focus) => {
                    const label = getFocusLabel(focus);
                    const effect = FOCUS_EFFECTS[focus];
                    const isActive = trainingState.profile.focus === focus;

                    const emphases: string[] = [];
                    if (effect.power > 1) emphases.push("power");
                    if (effect.speed > 1) emphases.push("speed");
                    if (effect.technique > 1) emphases.push("technique");
                    if (effect.balance > 1) emphases.push("balance");

                    const emphasisText =
                      emphases.length > 0 ? `Emphasizes ${emphases.join(" and ")}` : "Balanced development";

                    return (
                      <button
                        key={focus}
                        onClick={() => handleFocusChange(focus)}
                        disabled={!isViewingOwnStable}
                        className={`w-full p-3 rounded-lg text-left transition-colors ${
                          isActive ? "bg-primary text-primary-foreground" : "bg-secondary/50 hover:bg-secondary"
                        } ${!isViewingOwnStable ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <div className="font-display font-medium">
                          {label.ja} <span className="text-sm opacity-80">({label.en})</span>
                        </div>
                        <p className="text-xs mt-1 opacity-70">{emphasisText}</p>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Recovery */}
              <Card className="paper lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Recovery Emphasis
                  </CardTitle>
                  <CardDescription>{recoveryEffect.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3 flex-col md:flex-row">
                    {(Object.keys(RECOVERY_EFFECTS) as RecoveryEmphasis[]).map((recovery) => {
                      const label = getRecoveryLabel(recovery);
                      const effect = RECOVERY_EFFECTS[recovery];
                      const isActive = trainingState.profile.recovery === recovery;

                      let narrative = "Standard recovery protocols";
                      if (effect.fatigueDecay > 1.2) narrative = "Prioritizes rest and rejuvenation";
                      else if (effect.fatigueDecay < 0.9) narrative = "Minimal rest periods";

                      return (
                        <button
                          key={recovery}
                          onClick={() => handleRecoveryChange(recovery)}
                          disabled={!isViewingOwnStable}
                          className={`flex-1 p-4 rounded-lg text-center transition-colors ${
                            isActive ? "bg-primary text-primary-foreground" : "bg-secondary/50 hover:bg-secondary"
                          } ${!isViewingOwnStable ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <div className="font-display font-medium text-lg">{label.ja}</div>
                          <div className="text-sm opacity-80">{label.en}</div>
                          <p className="mt-2 text-xs opacity-70">{narrative}</p>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Focus Slots */}
            <Card className="paper">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Individual Focus ({trainingState.focusSlots.length}/{trainingState.maxFocusSlots} slots)
                </CardTitle>
                <CardDescription>Assign specific training programs to key wrestlers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {sekitori.slice(0, 6).map((rikishi) => {
                    if (!rikishi) return null;
                    const focus = trainingState.focusSlots.find((f) => f.rikishiId === rikishi.id);
                    // NOTE: getCareerPhase in engine/training expects experience number in our updated types.
                    const phase = getCareerPhase(rikishi.experience);

                    return (
                      <div
                        key={rikishi.id}
                        className="p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/rikishi/${rikishi.id}`)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-display font-medium truncate">{rikishi.shikona}</span>
                          <Badge variant="outline" className="text-xs">
                            {RANK_HIERARCHY[rikishi.rank].nameJa}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span className="capitalize">{phase} phase</span>
                          {focus && (
                            <Badge variant="secondary" className="text-xs">
                              {getFocusModeLabel(focus.mode).en}
                            </Badge>
                          )}
                        </div>

                        <div className="mt-2 flex gap-2 items-center flex-wrap">
                          {rikishi.momentum !== 0 && (
                            <>
                              {rikishi.momentum > 0 ? (
                                <TrendingUp className="h-3 w-3 text-success" />
                              ) : (
                                <TrendingDown className="h-3 w-3 text-destructive" />
                              )}
                              <span className="text-xs text-muted-foreground">
                                {rikishi.momentum > 0 ? "Rising form" : "Struggling"}
                              </span>
                            </>
                          )}
                          {rikishi.injured && (
                            <>
                              <Activity className="h-3 w-3 text-destructive" />
                              <span className="text-xs text-destructive">Injured</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {sekitori.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No sekitori in this heya yet. Earn promotions to unlock high-level focus programs.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Facilities Tab - Narrative-first */}
          <TabsContent value="facilities" className="space-y-4">
            <Card className="paper">
              <CardHeader>
                <CardTitle>Facility Details</CardTitle>
                <CardDescription>Your heya’s infrastructure shapes development over seasons.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Training Dohyo</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{safeFacilitiesCopy(facilitiesBand, "training")}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Bed className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Recovery Center</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{safeFacilitiesCopy(facilitiesBand, "recovery")}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ChefHat className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Kitchen & Chanko</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{safeFacilitiesCopy(facilitiesBand, "nutrition")}</p>
                  </div>
                </div>

                {/* If legacy numeric facilities exist in old saves, keep them hidden but acknowledged */}
                {(heya as any).facilities && (
                  <p className="text-xs text-muted-foreground mt-6">
                    Notes: Detailed facility metrics are tracked internally and expressed here as narrative bands.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="paper">
              <CardHeader>
                <CardTitle>About Facilities</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Facilities influence how quickly wrestlers improve, how well they recover, and how consistently they can hold form
                  across the grueling basho cycle. Upgrades tend to compound over time—especially when paired with smart training profiles.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card className="paper">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Stable Achievements
                </CardTitle>
                <CardDescription>Championship history and special prizes earned by stable members</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Yusho */}
                {stableAchievements.yusho.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gold">
                      <Trophy className="h-4 w-4" />
                      <span className="font-medium">Yūshō ({stableAchievements.yusho.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {stableAchievements.yusho.slice(0, 10).map((a, i) => {
                        const r = world.rikishi.get(a.rikishiId);
                        return (
                          <Badge key={i} variant="outline" className="text-xs bg-gold/10 border-gold/30">
                            {r?.shikona ?? "Unknown"} — {a.bashoName} {a.year}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Jun-Yusho */}
                {stableAchievements.junYusho.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Medal className="h-4 w-4" />
                      <span className="font-medium">Jun-Yūshō ({stableAchievements.junYusho.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {stableAchievements.junYusho.slice(0, 8).map((a, i) => {
                        const r = world.rikishi.get(a.rikishiId);
                        return (
                          <Badge key={i} variant="outline" className="text-xs">
                            {r?.shikona ?? "Unknown"} — {a.bashoName} {a.year}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sansho summary tiles */}
                {(stableAchievements.ginoSho.length > 0 ||
                  stableAchievements.kantosho.length > 0 ||
                  stableAchievements.shukunsho.length > 0) && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-primary" />
                      <span className="font-medium">Special Prizes (Sanshō)</span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {stableAchievements.ginoSho.length > 0 && (
                        <div className="p-3 rounded-lg bg-secondary/50">
                          <div className="text-sm font-medium mb-1">
                            技能賞 Gino-shō ({stableAchievements.ginoSho.length})
                          </div>
                          <div className="text-xs text-muted-foreground">Technique Prize</div>
                        </div>
                      )}
                      {stableAchievements.kantosho.length > 0 && (
                        <div className="p-3 rounded-lg bg-secondary/50">
                          <div className="text-sm font-medium mb-1">
                            敢闘賞 Kantō-shō ({stableAchievements.kantosho.length})
                          </div>
                          <div className="text-xs text-muted-foreground">Fighting Spirit Prize</div>
                        </div>
                      )}
                      {stableAchievements.shukunsho.length > 0 && (
                        <div className="p-3 rounded-lg bg-secondary/50">
                          <div className="text-sm font-medium mb-1">
                            殊勲賞 Shukunshō ({stableAchievements.shukunsho.length})
                          </div>
                          <div className="text-xs text-muted-foreground">Outstanding Performance Prize</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {stableAchievements.yusho.length === 0 &&
                  stableAchievements.junYusho.length === 0 &&
                  stableAchievements.ginoSho.length === 0 &&
                  stableAchievements.kantosho.length === 0 &&
                  stableAchievements.shukunsho.length === 0 && (
                    <p className="text-muted-foreground text-center py-6">
                      No major achievements recorded yet. Glory awaits those who train diligently.
                    </p>
                  )}
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card className="paper">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Top Performers
                </CardTitle>
                <CardDescription>Leading wrestlers by career wins</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topPerformers.map((r, idx) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/rikishi/${r.id}`)}
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{r.shikona}</div>
                        <div className="text-xs text-muted-foreground">
                          {RANK_HIERARCHY[r.rank].nameJa}
                          {r.rankNumber && ` ${r.rankNumber}枚目`}
                        </div>
                      </div>
                      <div className="text-sm font-mono">
                        {r.careerWins}-{r.careerLosses}
                      </div>
                    </div>
                  ))}
                  {topPerformers.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No performers to display.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        
        <TabsContent value="institution" className="mt-6 space-y-4">
          <InstitutionPanel world={world} heya={heya} />
        </TabsContent>

</Tabs>

        {/* Optional: a small return button for flow */}
        <div className="pt-2 flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate("/")}>
            Return to Dashboard
          </Button>

          {/* Placeholder for future: facilities upgrades / recruiting actions */}
          {isViewingOwnStable && (
            <div className="text-xs text-muted-foreground">
              Training choices are saved in-memory. Hook your persistence layer to heya.trainingState when ready.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
