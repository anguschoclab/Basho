import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import { BaseWidget } from "./BaseWidget";
import { Dumbbell, ChevronRight, Zap, Target, Shield, Activity } from "lucide-react";
import type { TrainingIntensity, TrainingFocus, RecoveryEmphasis } from "@/engine/training";
import type { TrainingProfile } from "@/engine/types/training";
import { INTENSITY_MULTIPLIERS, RECOVERY_MULTIPLIERS, ensureHeyaTrainingState } from "@/presenters/uiDigest";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";

const INTENSITY_OPTIONS: TrainingIntensity[] = ["conservative", "balanced", "intensive", "punishing"];
const FOCUS_OPTIONS: TrainingFocus[] = ["neutral", "power", "speed", "technique", "balance"];
const RECOVERY_OPTIONS: RecoveryEmphasis[] = ["low", "normal", "high"];

const INTENSITY_ICONS: Record<TrainingIntensity, string> = {
  conservative: "🛡️", balanced: "⚖️", intensive: "🔥", punishing: "💀",
};

const FOCUS_LABELS: Record<TrainingFocus, string> = {
  neutral: "Neutral", power: "Power", speed: "Speed", technique: "Technique", balance: "Balance",
};

const RECOVERY_LABELS: Record<RecoveryEmphasis, string> = {
  low: "Low", normal: "Normal", high: "High",
};

/**
 * profile row.
 *  * @param { label, icon, value, options, onChange } - The { label, icon, value, options, on change }.
 */
function ProfileRow({ label, icon, value, options, onChange }: {
  label: string; icon: React.ReactNode; value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 w-20 shrink-0">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex gap-1 flex-1 flex-wrap">
        {options.map(opt => (
          <TooltipWrap key={opt.value} content={`Set ${label.toLowerCase()} to ${opt.label}`} side="top">
            <button
              onClick={() => onChange(opt.value)}
              aria-pressed={value === opt.value}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                value === opt.value
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:border-border"
              }`}
            >
              {opt.label}
            </button>
          </TooltipWrap>
        ))}
      </div>
    </div>
  );
}

/** training widget. */
export function TrainingWidget() {
  const { state, updateWorld } = useGame();
  const navigate = useNavigate();
  const world = state.world;
  const [expanded, setExpanded] = useState(false);

  const profile = useMemo(() => {
    if (!world?.playerHeyaId) return null;
    const ts = ensureHeyaTrainingState(world, world.playerHeyaId);
    return ts.activeProfile;
  }, [world]);

  if (!world || !profile) return null;

  const intensityInfo = INTENSITY_MULTIPLIERS[profile.intensity];
  const recoveryInfo = RECOVERY_MULTIPLIERS[profile.recovery];

  const updateProfile = (patch: Partial<TrainingProfile>) => {
    if (!world.playerHeyaId) return;
    const ts = ensureHeyaTrainingState(world, world.playerHeyaId);
    ts.activeProfile = { ...ts.activeProfile, ...patch };
    updateWorld({ ...world });
  };

  return (
    <BaseWidget
      title="Training"
      icon={Dumbbell}
      headerAction={{ 
        label: "Full Plan", 
        onClick: () => navigate({ to: "/training" }),
        tooltip: "Design and implement comprehensive training regimens for your rikishi"
      }}
    >
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

      {/* Multiplier bars */}
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        {[
          { label: "Growth", value: intensityInfo.growth, icon: Zap, color: "bg-primary" },
          { label: "Fatigue", value: intensityInfo.fatigue, icon: Activity, color: intensityInfo.fatigue > 1.2 ? "bg-destructive" : "bg-warning" },
          { label: "Recovery", value: recoveryInfo.fatigueDecay, icon: Shield, color: "bg-success" },
        ].map(m => (
          <div key={m.label} className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <m.icon className="h-3 w-3" />
              <span>{m.label}</span>
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full ${m.color} transition-all`} style={{ width: `${Math.min(100, m.value * 60)}%` }} />
            </div>
            <span className="font-medium text-foreground">{(m.value * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls="training-quick-change-panel"
        className="text-[11px] text-primary hover:underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-sm"
      >
        {expanded ? "Hide quick-change ▲" : "Quick-change ▼"}
      </button>

      {expanded && (
        <div id="training-quick-change-panel" className="space-y-2 pt-1 border-t border-border/50 animate-slide-up">
          <ProfileRow
            label="Intensity" icon={<Zap className="h-3 w-3 text-muted-foreground" />}
            value={profile.intensity}
            options={INTENSITY_OPTIONS.map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))}
            onChange={(v) => updateProfile({ intensity: v as TrainingIntensity })}
          />
          <ProfileRow
            label="Focus" icon={<Target className="h-3 w-3 text-muted-foreground" />}
            value={profile.focus}
            options={FOCUS_OPTIONS.map(v => ({ value: v, label: FOCUS_LABELS[v] }))}
            onChange={(v) => updateProfile({ focus: v as TrainingFocus })}
          />
          <ProfileRow
            label="Recovery" icon={<Shield className="h-3 w-3 text-muted-foreground" />}
            value={profile.recovery}
            options={RECOVERY_OPTIONS.map(v => ({ value: v, label: RECOVERY_LABELS[v] }))}
            onChange={(v) => updateProfile({ recovery: v as RecoveryEmphasis })}
          />
        </div>
      )}
    </BaseWidget>
  );
}
