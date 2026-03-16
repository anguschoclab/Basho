import type { EngineEvent } from "../types/events";

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
  if (amount >= 10_000_000) return "Severe fine";
  if (amount >= 3_000_000) return "Significant fine";
  if (amount >= 500_000) return "Moderate fine";
  return "Minor fine";
}
