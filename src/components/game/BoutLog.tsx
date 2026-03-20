// BoutLog.tsx
// Bout Log display - shows simulation phases
//
// Fixes:
// - Safe handling when log is undefined/empty
// - Handles unknown/extra phases without crashing (fallback label/color)
// - Stable keys (phase+clock+index) when available
// - Avoids indexing into maps with undefined phase
// - Optional: shows a friendly empty-state

import { cn } from "@/lib/utils";
import type { BoutLogEntry } from "@/engine/types/basho";

/** Defines the structure for bout log props. */
interface BoutLogProps {
  log?: BoutLogEntry[] | null;
  className?: string;
}

const phaseLabels: Record<string, string> = {
  tachiai: "Tachiai",
  clinch: "Clinch",
  momentum: "Struggle",
  finish: "Finish"
};

const phaseColors: Record<string, string> = {
  tachiai: "phase-tachiai",
  clinch: "phase-clinch",
  momentum: "phase-momentum",
  finish: "phase-finish"
};

/**
 * Safe phase.
 *  * @param phase - The Phase.
 *  * @returns The result.
 */
function safePhase(phase: unknown): string {
  return typeof phase === "string" && phase.length > 0 ? phase : "other";
}

/**
 * bout log.
 *  * @param { log, className } - The { log, class name }.
 */

function getFallbackDescription(entry: any): string {
  if (entry.description && typeof entry.description === "string" && entry.description.length > 0) {
    return entry.description;
  }

  if (!entry.data) return "—";

  switch (entry.phase) {
    case "tachiai":
      if (entry.data.winner) {
        return `${entry.data.winner === "east" ? "East" : "West"} wins the tachiai`;
      }
      return "Tachiai collision";

    case "clinch":
      if (entry.data.stance === "push-dominant") return "They settle into oshi pressure";
      if (entry.data.stance === "no-grip") return "No grip — scramble for position";
      return "Belt contact established";

    case "momentum":
      if (entry.data.reason === "mizu_iri") return "Mizu-iri! The Gyoji halts the marathon bout for a water break.";
      if (entry.data.reason === "physics_wall") return "Stopped cold by massive weight!";
      if (entry.data.reason === "footwork_angle") return entry.data.position === "rear" ? "Rear position danger!" : "Angle and footwork";
      if (entry.data.reason === "tachiai_win" && entry.data.edgeEvent) return "Tawara pressure at the edge!";
      if (entry.data.recovery) return "A recovery and counter!";
      if (entry.data.reason === "fatigue_turn") return "Fatigue shows—momentum swings!";
      return "Steady struggle";

    case "finish":
      if (entry.data.reversal) return "Incredible reversal at the edge!";
      if (entry.data.kimariteName) return `${entry.data.winner === "east" ? "East" : "West"} wins by ${entry.data.kimariteName}`;
      return "Bout finished";

    case "tactical":
      if (entry.data.tacticalResult) return "Tactical clash resolved";
      if (entry.data.strategy) return `Strategy: ${entry.data.strategy}`;
      return "Tactical approach";

    default:
      return "—";
  }
}

export function BoutLog({ log, className }: BoutLogProps) {
  const entries = Array.isArray(log) ? log : [];

  return (
    <div className={cn("space-y-2", className)}>
      <h4 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Bout Log
      </h4>

      {entries.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No log entries.
        </div>
      ) : (
        <div className="space-y-1.5">
          {entries.map((entry, index) => {
            const phase = safePhase((entry as any)?.phase);
            const label = phaseLabels[phase] ?? (phase === "other" ? "Event" : phase);
            const color = phaseColors[phase] ?? "bg-secondary text-foreground";

            const clock =
              typeof (entry as any)?.clock === "number" && Number.isFinite((entry as any).clock)
                ? (entry as any).clock
                : null;

            const key = `${phase}-${clock ?? "x"}-${index}`;

            return (
              <div
                key={key}
                className="flex items-start gap-2 text-sm animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <span
                  className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium shrink-0",
                    // If you have .phase-* classes, we keep using them; otherwise fallback to a generic pill style.
                    phaseColors[phase] ? phaseColors[phase] : color
                  )}
                >
                  {label}
                </span>

                <span className="text-foreground">
                  {getFallbackDescription(entry)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
