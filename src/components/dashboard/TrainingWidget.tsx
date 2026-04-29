import React, { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BaseWidget } from "./BaseWidget";
import { Dumbbell, Zap, Target, Shield, Activity } from "lucide-react";
import type {
  TrainingIntensity,
  TrainingFocus,
  RecoveryEmphasis,
  TrainingProfile,
} from "@/engine/types/training";
import {
  INTENSITY_MULTIPLIERS,
  RECOVERY_MULTIPLIERS,
  ensureHeyaTrainingState,
} from "@/presenters/uiDigest";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";

const INTENSITY_OPTIONS: TrainingIntensity[] = [
  "conservative",
  "balanced",
  "intensive",
  "punishing",
];
const FOCUS_OPTIONS: TrainingFocus[] = ["neutral", "power", "speed", "technique", "balance"];
const RECOVERY_OPTIONS: RecoveryEmphasis[] = ["low", "normal", "high"];

const INTENSITY_ICONS: Record<TrainingIntensity, string> = {
  conservative: "🛡️",
  balanced: "⚖️",
  intensive: "🔥",
  punishing: "💀",
};

const FOCUS_LABELS: Record<TrainingFocus, string> = {
  neutral: "Neutral",
  power: "Power",
  speed: "Speed",
  technique: "Technique",
  balance: "Balance",
};

const RECOVERY_LABELS: Record<RecoveryEmphasis, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
};

/**
 * profile row.
 *  * @param { label, icon, value, options, onChange } - The { label, icon, value, options, on change }.
 */
const ProfileRow = React.memo(
  ({
    label,
    icon,
    value,
    options,
    onChange,
  }: {
    label: string;
    icon: React.ReactNode;
    value: string;
    options: { value: string; label: string; disabled?: boolean }[];
    onChange: (v: string) => void;
  }) => {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 w-20 shrink-0">
          {icon}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="flex gap-1 flex-1 flex-wrap">
          {options.map((opt) => (
            <TooltipWrap
              key={opt.value}
              content={
                opt.disabled
                  ? "Blocked by welfare sanctions"
                  : `Set ${label.toLowerCase()} to ${opt.label}`
              }
              side="top"
            >
              <Button
                variant="ghost"
                onClick={() => !opt.disabled && onChange(opt.value)}
                disabled={opt.disabled}
                aria-pressed={value === opt.value}
                className={`h-auto text-[10px] px-2 py-0.5 rounded-full border transition-all duration-200 ${
                  opt.disabled
                    ? "opacity-40 cursor-not-allowed border-border bg-muted/30 text-muted-foreground"
                    : value === opt.value
                      ? "bg-primary text-primary-foreground border-primary shadow-sm hover:bg-primary/90"
                      : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:border-border"
                }`}
              >
                {opt.label}
              </Button>
            </TooltipWrap>
          ))}
        </div>
      </div>
    );
  }
);

const MultiplierBar = React.memo(
  ({
    label,
    value,
    icon: Icon,
    color,
  }: {
    label: string;
    value: number;
    icon: React.ElementType;
    color: string;
  }) => {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Icon className="h-3 w-3" />
          <span>{label}</span>
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full ${color} transition-all`}
            style={{ width: `${Math.min(100, value * 60)}%` }}
          />
        </div>
        <span className="font-medium text-foreground">{(value * 100).toFixed(0)}%</span>
      </div>
    );
  }
);

/** training widget. */
export function TrainingWidget() {
  const { state, updateWorld } = useGame();
  const navigate = useNavigate();
  const headerAction = useMemo(
    () => ({
      label: "Full Plan",
      onClick: () => navigate({ to: "/stable/training" }),
      tooltip: "Design and implement comprehensive training regimens for your rikishi",
    }),
    [navigate]
  );
  const world = state.world;
  const [expanded, setExpanded] = useState(false);

  // Constants for intensity ranking
  const CAP_TO_INTENSITY: Record<string, TrainingIntensity> = {
    low: "conservative",
    medium: "balanced",
    high: "intensive",
  };
  const INTENSITY_RANK = useMemo<TrainingIntensity[]>(
    () => ["conservative", "balanced", "intensive", "punishing"],
    []
  );

  // All hooks must be called before any early return
  const profile = useMemo(() => {
    if (!world?.playerHeyaId) return null;
    const ts = ensureHeyaTrainingState(world, world.playerHeyaId);
    return ts.activeProfile;
  }, [world]);

  const sanctionCap = useMemo(() => {
    if (!world?.playerHeyaId) return null;
    const ph = world.heyas.get(world.playerHeyaId);
    return ph?.welfareState?.sanctions?.trainingIntensityCap ?? null;
  }, [world]);

  const maxIntensityIdx =
    sanctionCap != null
      ? INTENSITY_RANK.indexOf(CAP_TO_INTENSITY[sanctionCap] ?? "punishing")
      : INTENSITY_RANK.length - 1;

  const intensityOptions = useMemo(
    () =>
      INTENSITY_OPTIONS.map((v, i) => ({
        value: v,
        label: v.charAt(0).toUpperCase() + v.slice(1),
        disabled: i > maxIntensityIdx,
      })),
    [maxIntensityIdx]
  );

  const focusOptions = useMemo(
    () =>
      FOCUS_OPTIONS.map((v) => ({
        value: v,
        label: FOCUS_LABELS[v],
      })),
    []
  );

  const recoveryOptions = useMemo(
    () =>
      RECOVERY_OPTIONS.map((v) => ({
        value: v,
        label: RECOVERY_LABELS[v],
      })),
    []
  );

  const updateProfile = React.useCallback(
    (patch: Partial<TrainingProfile>) => {
      if (!world?.playerHeyaId) return;
      const ts = ensureHeyaTrainingState(world, world.playerHeyaId);
      // Enforce training intensity cap from active welfare sanctions
      if (patch.intensity) {
        const chosenIdx = INTENSITY_RANK.indexOf(patch.intensity);
        if (chosenIdx > maxIntensityIdx) {
          patch = { ...patch, intensity: INTENSITY_RANK[maxIntensityIdx] };
        }
      }
      ts.activeProfile = { ...ts.activeProfile, ...patch };
      updateWorld({ ...world });
    },
    [world, maxIntensityIdx, updateWorld, INTENSITY_RANK]
  );

  const handleIntensityChange = React.useCallback(
    (v: string) => updateProfile({ intensity: v as TrainingIntensity }),
    [updateProfile]
  );

  const handleFocusChange = React.useCallback(
    (v: string) => updateProfile({ focus: v as TrainingFocus }),
    [updateProfile]
  );

  const handleRecoveryChange = React.useCallback(
    (v: string) => updateProfile({ recovery: v as RecoveryEmphasis }),
    [updateProfile]
  );

  const toggleExpanded = React.useCallback(() => setExpanded((prev) => !prev), []);

  // Early return after all hooks
  if (!world || !profile) return null;

  const intensityInfo = INTENSITY_MULTIPLIERS[profile.intensity];
  const recoveryInfo = RECOVERY_MULTIPLIERS[profile.recovery];

  // Read pre-computed modifier from transientContext (set by phase02_context each tick).
  // Falls back to raw intensity multiplier if context hasn't been built yet.
  const activeModifiers = world.transientContext?.activeModifiers;
  const effectiveGrowthMultiplier =
    activeModifiers != null ? activeModifiers.trainingMultiplier : intensityInfo.growth;
  const financialPenalty = activeModifiers?.financialPenalty ?? false;
  const moraleBoost = activeModifiers?.moraleBoost ?? false;

  return (
    <BaseWidget title="Training" icon={Dumbbell} headerAction={headerAction}>
      {/* Current profile */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary" className="text-[10px] gap-1">
          {INTENSITY_ICONS[profile.intensity]} {profile.intensity}
        </Badge>
        <Badge variant="secondary" className="text-[10px] gap-1">
          <Target className="h-2.5 w-2.5" /> {FOCUS_LABELS[profile.focus]}
        </Badge>
        <Badge variant="secondary" className="text-[10px] gap-1">
          <Shield className="h-2.5 w-2.5" /> Recovery: {RECOVERY_LABELS[profile.recovery]}
        </Badge>
      </div>

      {/* Context-driven status banners — sourced from transientContext (never derived in UI) */}
      {financialPenalty && (
        <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 border border-destructive/30 px-2 py-1.5 text-[11px] text-destructive">
          <Activity className="h-3 w-3 shrink-0" />
          Stable is bankrupt! Training effectiveness severely reduced.
        </div>
      )}
      {moraleBoost && !financialPenalty && (
        <div className="flex items-center gap-1.5 rounded-md bg-success/10 border border-success/30 px-2 py-1.5 text-[11px] text-success">
          <Zap className="h-3 w-3 shrink-0" />
          Yusho boost active — training gains increased.
        </div>
      )}

      {/* Multiplier bars — Growth uses effectiveGrowthMultiplier from transientContext */}
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        {(() => {
          const multiplierData = [
            {
              label: "Growth",
              value: effectiveGrowthMultiplier,
              icon: Zap,
              color: financialPenalty ? "bg-destructive" : "bg-primary",
            },
            {
              label: "Fatigue",
              value: intensityInfo.fatigue,
              icon: Activity,
              color: intensityInfo.fatigue > 1.2 ? "bg-destructive" : "bg-warning",
            },
            {
              label: "Recovery",
              value: recoveryInfo.fatigueDecay,
              icon: Shield,
              color: "bg-success",
            },
          ];
          const limit = multiplierData.length;
          const nodes = new Array(limit);
          for (let i = 0; i < limit; i++) {
            const m = multiplierData[i];
            nodes[i] = (
              <MultiplierBar
                key={m.label}
                label={m.label}
                value={m.value}
                icon={m.icon}
                color={m.color}
              />
            );
          }
          return nodes;
        })()}
      </div>

      <Button
        variant="ghost"
        onClick={toggleExpanded}
        aria-expanded={expanded}
        aria-controls="training-quick-change-panel"
        className="h-auto p-0 text-[11px] text-primary hover:underline underline-offset-2 rounded-sm"
      >
        {expanded ? "Hide quick-change ▲" : "Quick-change ▼"}
      </Button>

      {expanded && (
        <div
          id="training-quick-change-panel"
          className="space-y-2 pt-1 border-t border-border/50 animate-slide-up"
        >
          <ProfileRow
            label="Intensity"
            icon={<Zap className="h-3 w-3 text-muted-foreground" />}
            value={profile.intensity}
            options={intensityOptions}
            onChange={handleIntensityChange}
          />
          <ProfileRow
            label="Focus"
            icon={<Target className="h-3 w-3 text-muted-foreground" />}
            value={profile.focus}
            options={focusOptions}
            onChange={handleFocusChange}
          />
          <ProfileRow
            label="Recovery"
            icon={<Shield className="h-3 w-3 text-muted-foreground" />}
            value={profile.recovery}
            options={recoveryOptions}
            onChange={handleRecoveryChange}
          />
        </div>
      )}
    </BaseWidget>
  );
}
