/**
 * Constants for TrainingWidget component.
 */

import type {
  TrainingIntensity,
  TrainingFocus,
  RecoveryEmphasis,
} from "@/engine/types/training";

export const INTENSITY_OPTIONS: TrainingIntensity[] = [
  "conservative",
  "balanced",
  "intensive",
  "punishing",
];
export const FOCUS_OPTIONS: TrainingFocus[] = ["neutral", "power", "speed", "technique", "balance"];
export const RECOVERY_OPTIONS: RecoveryEmphasis[] = ["low", "normal", "high"];

export const INTENSITY_ICONS: Record<TrainingIntensity, string> = {
  conservative: "🛡️",
  balanced: "⚖️",
  intensive: "🔥",
  punishing: "💀",
};

export const FOCUS_LABELS: Record<TrainingFocus, string> = {
  neutral: "Neutral",
  power: "Power",
  speed: "Speed",
  technique: "Technique",
  balance: "Balance",
};

export const RECOVERY_LABELS: Record<RecoveryEmphasis, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
};

export const CAP_TO_INTENSITY: Record<string, TrainingIntensity> = {
  low: "conservative",
  medium: "balanced",
  high: "intensive",
};
