/**
 * TrainingAdvisorySections.tsx
 * ============================
 * Advisory surfaces for TrainingPage: coach advisory notes (W10/V21) and
 * the projected weekly gains preview (P3/V22). Data comes from
 * trainingAdvisoryProjections — the component never touches world.*.
 */

import type { Rikishi } from "@/engine/types/rikishi";
import type { HeyaTrainingState } from "@/engine/types/training";
import type { Id } from "@/engine/types/common";
import {
  buildCoachNotes,
  buildProjectedGains,
} from "@/presenters/projections/trainingAdvisoryProjections";

type WorldInput = Parameters<typeof buildCoachNotes>[0];

/** W10/V21 — coach advisory notes surfaced on TrainingPage. */
export function CoachAdvisoryPanel({
  world,
  playerHeyaId,
}: {
  world: WorldInput;
  playerHeyaId: Id;
}) {
  const notes = buildCoachNotes(world, playerHeyaId);
  if (notes.length === 0) return null;
  return (
    <section className="rounded-md border border-border/50 p-4 space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Coach Advisory
      </h3>
      <ul className="space-y-1.5 text-xs">
        {notes.map((n) => (
          <li key={n.id} className="flex gap-2">
            <span className="shrink-0 font-semibold text-primary uppercase text-[10px] pt-0.5 w-16">
              {n.priority}
            </span>
            <span>
              <span className="font-medium">{n.title}</span>
              {n.detail ? ` — ${n.detail}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** P3 — predicted weekly gains preview via production calculateGains. */
export function ProjectedGainsPanel({
  world,
  rikishiList,
  trainingState,
}: {
  world: WorldInput;
  rikishiList: Rikishi[];
  trainingState: HeyaTrainingState;
}) {
  const rows = buildProjectedGains(world, rikishiList, trainingState);
  if (rows.length === 0) return null;
  return (
    <section className="rounded-md border border-border/50 p-4 space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Projected Weekly Gains
      </h3>
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
        {rows.map((r) => (
          <li key={r.name}>
            <span className="font-medium">{r.name}</span>
            <span className="text-muted-foreground">
              {" "}
              · {r.stat} +{r.gain.toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
