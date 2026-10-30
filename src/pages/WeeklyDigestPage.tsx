import { AppLayout } from "@/components/layout/AppLayout";
import { DEFAULT_START_YEAR } from "@/constants/engine/calendar";
import { DigestWidget } from "@/components/dashboard/DigestWidget";
import { useGame } from "@/state/game/useGame";
import { useGameStore } from "@/state/stores/gameStore";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Newspaper, AlertCircle } from "lucide-react";

export default function WeeklyDigestPage() {
  const { state, digest } = useGame();
  const sendCommand = useGameStore((s) => s.sendCommand);
  const world = state.world;

  if (!world) {
    return (
      <AppLayout pageTitle="Weekly Report">
        <div className="flex items-center justify-center h-full py-20">
          <EmptyState
            icon={Newspaper}
            title="No world loaded"
            description="Start a game to view the weekly report."
          />
        </div>
      </AppLayout>
    );
  }

  const weekLabel = `${world.year ?? DEFAULT_START_YEAR} — Week ${world.week ?? 0}`;
  const decisions = world.pendingDecisions ?? [];

  return (
    <AppLayout pageTitle="Weekly Report">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Weekly Report</h1>
          <p className="text-sm text-muted-foreground">{weekLabel}</p>
        </div>

        {/* P1 — DecisionCard: pending loop decisions (chains, koenkai, crises) */}
        {decisions.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Pending Decisions
            </h2>
            {decisions.map((d) => (
              <div
                key={d.id}
                className="rounded-md border border-border/60 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm">{d.description}</p>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {d.type.replace(/_/g, " ")}
                    {d.required ? " · required" : ""}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(d.options ?? []).map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        sendCommand({
                          type: "RESOLVE_LOOP_DECISION",
                          decisionId: d.id,
                          optionId: o.id,
                        });
                        toast.success(o.label);
                      }}
                      className="text-xs font-medium px-3 py-1.5 rounded border border-border hover:bg-muted/50"
                      title={o.impact}
                    >
                      {o.label}
                      {o.impact ? ` — ${o.impact}` : ""}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        <DigestWidget digest={digest} fullPage />
      </div>
    </AppLayout>
  );
}
