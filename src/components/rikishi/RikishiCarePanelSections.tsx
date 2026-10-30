/**
 * RikishiCarePanelSections — injury card detail + injury history list.
 * Split from RikishiCarePanel (function-length budget).
 */
import { toast } from "sonner";
import type { Rikishi } from "@/engine/types/rikishi";
import type { EngineEvent } from "@/engine/types/events";
import type { DietRegimen } from "@/engine/types/economy";
import {
  INJURY_TYPE_LABELS,
  BODY_AREA_LABELS,
  PHYSIO_SESSION_COST,
  type EngineCommand,
} from "@/presenters/engineAccess";

const DIETS: DietRegimen[] = ["austerity", "maintenance", "heavy_bulk", "premium"];
const EFFORTS = ["light", "standard", "hard"] as const;

/** Named injury card — type, severity, body part, est. days out. */
export function InjuryCard({
  status,
  weeksRemaining,
}: {
  status: NonNullable<Rikishi["injuryStatus"]>;
  weeksRemaining: number;
}) {
  return (
    <div className="rounded border border-[hsl(var(--border))] bg-destructive/5 p-3 space-y-1 text-xs">
      <div className="font-medium">
        {status.type ? (INJURY_TYPE_LABELS[status.type] ?? status.type) : "Injury"}
        {status.severity && status.severity !== "none" ? (
          <span className="ml-2 text-[hsl(var(--muted-foreground))] capitalize">
            {status.severity}
          </span>
        ) : null}
      </div>
      <div className="text-[hsl(var(--muted-foreground))]">
        {status.location ? `${BODY_AREA_LABELS[status.location] ?? status.location} · ` : ""}
        ~{Math.max(0, weeksRemaining * 7)} days out
      </div>
    </div>
  );
}

/** Injury history — engine events of category "injury" for this rikishi. */
export function InjuryHistory({ events }: { events: EngineEvent[] }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[hsl(var(--muted-foreground))] text-xs">Injury History</div>
      {events.map((e) => (
        <div key={e.id} className="text-xs text-[hsl(var(--muted-foreground))]">
          Y{e.year} · W{e.week} — {e.title}
        </div>
      ))}
    </div>
  );
}

/** Diet + effort selects and the paid physio button (P3/P6 commands). */
export function CareControls({
  rikishi,
  injured,
  physioAffordable,
  sendCommand,
}: {
  rikishi: Rikishi;
  injured: boolean;
  physioAffordable: boolean;
  sendCommand: (cmd: EngineCommand) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <label className="flex items-center gap-1.5">
        <span className="text-[hsl(var(--muted-foreground))]">Diet</span>
        <select
          value={rikishi.diet ?? ""}
          onChange={(e) =>
            sendCommand({
              type: "SET_RIKISHI_DIET",
              rikishiId: rikishi.id,
              diet: (e.target.value || null) as DietRegimen | null,
            })
          }
          className="bg-transparent border border-[hsl(var(--border))] rounded px-2 py-1"
        >
          <option value="">Heya default</option>
          {DIETS.map((d) => (
            <option key={d} value={d}>
              {d.replace("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1.5">
        <span className="text-[hsl(var(--muted-foreground))]">Effort</span>
        <select
          value={rikishi.effortLevel ?? "standard"}
          onChange={(e) => {
            sendCommand({
              type: "SET_RIKISHI_EFFORT",
              rikishiId: rikishi.id,
              effort: e.target.value as (typeof EFFORTS)[number],
            });
            toast.success(`${rikishi.shikona}: effort → ${e.target.value}`);
          }}
          className="bg-transparent border border-[hsl(var(--border))] rounded px-2 py-1"
        >
          {EFFORTS.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </label>
      {injured && (
        <button
          type="button"
          disabled={!physioAffordable}
          onClick={() => {
            sendCommand({ type: "BUY_PHYSIO", rikishiId: rikishi.id });
            toast.success(`Physio booked for ${rikishi.shikona}`);
          }}
          className="ml-auto text-xs font-medium px-3 py-1.5 rounded border border-[hsl(var(--border))] disabled:opacity-40"
          title="Paid physiotherapy session — removes 1 week of recovery"
        >
          Physio session · ¥{PHYSIO_SESSION_COST.toLocaleString("en-US")}
        </button>
      )}
    </div>
  );
}
