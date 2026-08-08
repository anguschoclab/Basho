import type { EngineEvent } from "../types/events";
import {
  FINE_PENALTY_SEVERE_THRESHOLD,
  FINE_PENALTY_SIGNIFICANT_THRESHOLD,
  FINE_PENALTY_MODERATE_THRESHOLD,
} from "../../constants/engine/economic";

/** Safely extracts a string or defaults. */
function safeString(raw: unknown, fallback: string): string {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && "toString" in raw && typeof raw.toString === "function") {
    return raw.toString();
  }
  return fallback;
}

export function formatStance(raw: unknown): string {
  const s = safeString(raw, "");
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.split("-").join(" ").slice(1);
}

export function formatSaveDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function formatEventTime(e: EngineEvent): string {
  if (e.day !== undefined && e.bashoNumber !== undefined) {
    return `B${e.bashoNumber} D${e.day}`;
  }
  return `W${e.week}`;
}

export function formatFinePenalty(amount: number): string {
  if (amount >= FINE_PENALTY_SEVERE_THRESHOLD) return "Severe fine";
  if (amount >= FINE_PENALTY_SIGNIFICANT_THRESHOLD) return "Significant fine";
  if (amount >= FINE_PENALTY_MODERATE_THRESHOLD) return "Moderate fine";
  return "Minor fine";
}

export function formatCurrency(
  amount: number,
  locale: "en-US" | "ja-JP" = "ja-JP"
): string {
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
  if (locale === "en-US") {
    return formatted.replace("￥", "¥");
  }
  return formatted.replace("¥", "￥");
}
