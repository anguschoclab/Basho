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
import type { BoutLogEntry } from "@/engine/types";

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

function safePhase(phase: unknown): string {
  return typeof phase === "string" && phase.length > 0 ? phase : "other";
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
                  {typeof (entry as any)?.description === "string" && (entry as any).description.length > 0
                    ? (entry as any).description
                    : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
