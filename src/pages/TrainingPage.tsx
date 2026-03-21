// @ts-nocheck
// TrainingPage.tsx - Dedicated stable training management
// FM-style layout for beya-wide training controls and individual rikishi focus slots

import { Helmet } from "react-helmet";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { RANK_HIERARCHY } from "@/engine/banzuke";
import type { Rikishi } from "@/engine/types/rikishi";
import type { IndividualFocusType } from "@/engine/types/training";
import {
  INTENSITY_EFFECTS,
  FOCUS_EFFECTS,
  RECOVERY_EFFECTS,
  getIntensityLabel,
  getFocusLabel,
  getRecoveryLabel,
  getFocusModeLabel,
  getCareerPhase,
  PHASE_EFFECTS,
  type TrainingIntensity,
  type TrainingFocus,
  type RecoveryEmphasis,
  type BeyaTrainingState,
  createDefaultTrainingState
} from "@/engine/training";
import { describeTrainingEffect } from "@/engine/narrativeDescriptions";
import { toFatigueBand, toPotentialBand, FATIGUE_LABELS, POTENTIAL_LABELS } from "@/engine/descriptorBands";
import {
  Activity,
  Dumbbell,
  Heart,
  Shield,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
  AlertTriangle,
  Flame,
  CircleDot,
  ChevronRight
} from "lucide-react";
import { useMemo, useState } from "react";
import { RikishiName } from "@/components/ClickableName";

const FOCUS_MODE_OPTIONS: { value: IndividualFocusType; label: string; description: string; icon: React.ReactNode }[] = [
  { value: "develop", label: "Develop", description: "Balanced growth for rising talent", icon: <TrendingUp className="h-4 w-4" /> },
  { value: "push", label: "Push", description: "Maximum growth, higher risk", icon: <Flame className="h-4 w-4" /> },
  { value: "protect", label: "Protect", description: "Lower risk, preserve current form", icon: <Shield className="h-4 w-4" /> },
  { value: "rebuild", label: "Rebuild", description: "Recovery-focused after injury", icon: <Heart className="h-4 w-4" /> },
];

/** training page. */
export default function TrainingPage() {
  const navigate = useNavigate();
  const { state, updateWorld } = useGame();
  const { world, playerHeyaId } = state;

  const heya = world?.heyas.get(playerHeyaId || "") ?? null;

  // Training state: prefer persisted heya trainingState if present
  const [trainingState, setTrainingState] = useState<BeyaTrainingState>(() => {
    if (!heya) return createDefaultTrainingState(playerHeyaId || "");
    const existing = (heya as any).trainingState as BeyaTrainingState | undefined;
    return existing ?? createDefaultTrainingState(heya.id);
  });

  const rikishiList = useMemo(() => {
    if (!heya || !world) return [];
    return heya.rikishiIds
      .map((id) => world.rikishi.get(id))
      .filter(Boolean)
      .sort((a, b) => {
        const tierA = RANK_HIERARCHY[a!.rank].tier;
        const tierB = RANK_HIERARCHY[b!.rank].tier;
        if (tierA !== tierB) return tierA - tierB;
        return a!.id.localeCompare(b!.id);
      }) as Rikishi[];
  }, [heya, world]);

  if (!world || !playerHeyaId || !heya) {
    return null;
  }

  const persistTrainingState = (next: BeyaTrainingState) => {
    (heya as any).trainingState = next;
    updateWorld({ ...world });
  };

  const handleIntensityChange = (intensity: TrainingIntensity) => {
    setTrainingState((prev) => {
      const next = { ...prev, activeProfile: { ...prev.activeProfile, intensity } };
      persistTrainingState(next);
      return next;
    });
  };

  const handleFocusChange = (focus: TrainingFocus) => {
    setTrainingState((prev) => {
      const next = { ...prev, activeProfile: { ...prev.activeProfile, focus } };
      persistTrainingState(next);
      return next;
    });
  };

  const handleRecoveryChange = (recovery: RecoveryEmphasis) => {
    setTrainingState((prev) => {
      const next = { ...prev, activeProfile: { ...prev.activeProfile, recovery } };
      persistTrainingState(next);
      return next;
    });
  };

  const handleIndividualFocusChange = (rikishiId: string, focusType: IndividualFocusType | null) => {
    setTrainingState((prev) => {
      const slots = prev.focusSlots.filter(s => s.rikishiId !== rikishiId);
      if (focusType) {
        slots.push({ rikishiId, focusType });
      }
      const next = { ...prev, focusSlots: slots };
      persistTrainingState(next);
      return next;
    });
  };

  const intensityEffect = INTENSITY_EFFECTS[trainingState.activeProfile.intensity];
  const focusEffect = FOCUS_EFFECTS[trainingState.activeProfile.focus];
  const recoveryEffect = RECOVERY_EFFECTS[trainingState.activeProfile.recovery];

  const stableTabs = [
    { id: "stable", label: "Overview", href: "/stable" },
    { id: "training", label: "Training" },
    { id: "rikishi", label: "Roster", href: "/rikishi" },
  ];

  return (
    <AppLayout
      pageTitle="Training"
      subNavTabs={stableTabs}
      activeSubTab="training"
    >
      <Helmet>
        <title>Training - {heya.name}</title>
      </Helmet>

      <div className="space-y-6">
        {/* Current Training Summary */}
        <Card className="paper bg-gradient-to-br from-card to-secondary/20">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold mb-1">Current Training Regime</h2>
                <p className="text-sm text-muted-foreground">
                  {getIntensityLabel(trainingState.activeProfile.intensity)} intensity •{" "}
                  {getFocusLabel(trainingState.activeProfile.focus)} focus •{" "}
                  {getRecoveryLabel(trainingState.activeProfile.recovery)} recovery
                </p>
              </div>
              <div className="flex gap-3">
                <Badge variant="outline" className="px-3 py-1.5">
                  <Dumbbell className="h-4 w-4 mr-1.5" />
                  Growth: {describeTrainingEffect(intensityEffect.growth)}
                </Badge>
                <Badge variant="outline" className="px-3 py-1.5">
                  <AlertTriangle className="h-4 w-4 mr-1.5" />
                  Risk: {intensityEffect.injuryRisk > 1.1 ? "High" : intensityEffect.injuryRisk < 0.9 ? "Low" : "Normal"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Beya-Wide Controls */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Intensity */}
          <Card className="paper">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Dumbbell className="h-5 w-5 text-primary" />
                Intensity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(Object.keys(INTENSITY_EFFECTS) as TrainingIntensity[]).map((intensity) => {
                const label = getIntensityLabel(intensity);
                const effect = INTENSITY_EFFECTS[intensity];
                const isActive = trainingState.activeProfile.intensity === intensity;

                return (
                  <button
                    key={intensity}
                    onClick={() => handleIntensityChange(intensity)}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      isActive 
                        ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background" 
                        : "bg-secondary/50 hover:bg-secondary"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{label}</span>
                      <span className={`text-xs ${isActive ? "" : effect.growth > 1 ? "text-success" : effect.growth < 1 ? "text-muted-foreground" : ""}`}>
                        {describeTrainingEffect(effect.growth)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Focus */}
          <Card className="paper">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-5 w-5 text-primary" />
                Focus Area
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(Object.keys(FOCUS_EFFECTS) as TrainingFocus[]).map((focus) => {
                const label = getFocusLabel(focus);
                const effect = FOCUS_EFFECTS[focus];
                const isActive = trainingState.activeProfile.focus === focus;

                const emphases: string[] = [];
                if (effect.strength > 1) emphases.push("Power");
                if (effect.speed > 1) emphases.push("Speed");
                if (effect.technique > 1) emphases.push("Technique");
                if (effect.balance > 1) emphases.push("Balance");

                return (
                  <button
                    key={focus}
                    onClick={() => handleFocusChange(focus)}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      isActive 
                        ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background" 
                        : "bg-secondary/50 hover:bg-secondary"
                    }`}
                  >
                    <div className="font-medium">{label}</div>
                    <div className={`text-xs mt-0.5 ${isActive ? "opacity-80" : "text-muted-foreground"}`}>
                      {emphases.length > 0 ? emphases.join(", ") : "Balanced"}
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Recovery */}
          <Card className="paper">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Heart className="h-5 w-5 text-primary" />
                Recovery
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(Object.keys(RECOVERY_EFFECTS) as RecoveryEmphasis[]).map((recovery) => {
                const label = getRecoveryLabel(recovery);
                const effect = RECOVERY_EFFECTS[recovery];
                const isActive = trainingState.activeProfile.recovery === recovery;

                let narrative = "Standard rest periods";
                if (effect.fatigueDecay > 1.2) narrative = "Maximum recovery";
                else if (effect.fatigueDecay < 0.9) narrative = "Minimal rest";

                return (
                  <button
                    key={recovery}
                    onClick={() => handleRecoveryChange(recovery)}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      isActive 
                        ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background" 
                        : "bg-secondary/50 hover:bg-secondary"
                    }`}
                  >
                    <div className="font-medium">{label}</div>
                    <div className={`text-xs mt-0.5 ${isActive ? "opacity-80" : "text-muted-foreground"}`}>
                      {narrative}
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Individual Rikishi Focus */}
        <Card className="paper">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Individual Development Plans
            </CardTitle>
            <CardDescription>
              Assign specific training modes to individual wrestlers for personalized development
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rikishiList.map((rikishi) => {
                const focus = focusMap.get(rikishi.id);
                const phase = getCareerPhase(rikishi.experience);
                const phaseEffect = PHASE_EFFECTS[phase];
                const rankInfo = RANK_HIERARCHY[rikishi.rank];

                return (
                  <div
                    key={rikishi.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    {/* Rikishi Info */}
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => navigate({ to: "/rikishi/$rikishiId", params: { rikishiId: rikishi.id } })}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-display font-medium truncate"><RikishiName id={rikishi.id} name={rikishi.shikona} /></span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {rankInfo.nameJa}
                        </Badge>
                        {rikishi.injured && (
                          <Badge variant="destructive" className="text-xs shrink-0">
                            <Activity className="h-3 w-3 mr-1" />
                            Injured
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="capitalize">{phase} phase</span>
                        <span>•</span>
                        <span>Injury sensitivity: {phaseEffect.injurySensitivity > 1.1 ? "High" : phaseEffect.injurySensitivity < 0.9 ? "Low" : "Normal"}</span>
                        {(() => {
                          const potBand = toPotentialBand((rikishi as any).talentSeed);
                          if (potBand === "unknown") return null;
                          const info = POTENTIAL_LABELS[potBand];
                          const potColor = potBand === "generational" ? "text-amber-500"
                            : potBand === "star" ? "text-purple-500"
                            : potBand === "solid" ? "text-blue-500"
                            : "";
                          return potBand !== "average" && potBand !== "limited" ? (
                            <>
                              <span>•</span>
                              <span className={potColor}>{info.label}</span>
                            </>
                          ) : null;
                        })()}
                        {rikishi.fatigue !== undefined && rikishi.fatigue > 0 && (() => {
                          const fb = toFatigueBand(rikishi.fatigue);
                          return (
                            <>
                              <span>•</span>
                              <span className={fb === "exhausted" || fb === "spent" ? "text-destructive" : fb === "tired" ? "text-warning" : ""}>
                                {FATIGUE_LABELS[fb]}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Focus Mode Selector */}
                    <div className="flex gap-2 shrink-0">
                      {FOCUS_MODE_OPTIONS.map((option) => {
                        const isActive = focus?.focusType === option.value;
                        return (
                          <button
                            key={option.value}
                            onClick={() => handleIndividualFocusChange(rikishi.id, isActive ? null : option.value)}
                            title={option.description}
                            className={`p-2 rounded-lg transition-all ${
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {option.icon}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {rikishiList.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No wrestlers in this stable yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Focus Mode Legend */}
        <Card className="paper">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Focus Mode Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {FOCUS_MODE_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                  <div className="p-2 rounded bg-primary/10 text-primary">
                    {option.icon}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
