/**
 * RikishiCarePanel — P6 per-rikishi card depth.
 * Signature kimarite + style lean (derived from win history), career W-L-A,
 * diet regimen + effort level controls (P3 worker commands), and a paid
 * physio session (BUY_PHYSIO) while injured.
 */
import { useGameStore } from "@/state/stores/gameStore";
import { toast } from "sonner";
import type { Rikishi } from "@/engine/types/rikishi";
import type { Heya } from "@/engine/types/heya";
import type { DietRegimen } from "@/engine/types/economy";
import { deriveSignatureKimarite, PHYSIO_SESSION_COST } from "@/presenters/engineAccess";

const OSHI = new Set([
  "oshidashi", "tsukidashi", "hatakikomi", "tsukiotoshi", "hikiotoshi",
  "okuridashi", "okuritaoshi", "tsuppari",
]);
const YOTSU = new Set([
  "yorikiri", "yoritaoshi", "uwatenage", "shitatenage", "kotenage",
  "sukuinage", "kakenage", "uchigake", "sotogake", "utschari",
]);

const DIETS: DietRegimen[] = ["austerity", "maintenance", "heavy_bulk", "premium"];
const EFFORTS = ["light", "standard", "hard"] as const;

export function RikishiCarePanel({
  rawRikishi,
  heya,
}: {
  rawRikishi: Rikishi;
  heya: Heya;
}) {
  const sendCommand = useGameStore((s) => s.sendCommand);
  const sig = deriveSignatureKimarite(rawRikishi);
  const wins = (rawRikishi.history ?? []).filter((m) => m.win).length;
  const losses = (rawRikishi.history ?? []).filter((m) => !m.win).length;

  // Style lean from the win tally — oshi (push/thrust) vs yotsu (belt).
  let oshiWins = 0;
  let yotsuWins = 0;
  for (const [k, n] of Object.entries(sig.tally)) {
    if (OSHI.has(k)) oshiWins += n;
    else if (YOTSU.has(k)) yotsuWins += n;
  }
  const lean =
    oshiWins + yotsuWins === 0 ? null : oshiWins >= yotsuWins ? "Oshi" : "Yotsu";

  const injured = rawRikishi.injured && (rawRikishi.injuryWeeksRemaining ?? 0) > 0;
  const physioAffordable = (heya.funds ?? 0) >= PHYSIO_SESSION_COST;

  return (
    <section className="rounded-md border border-[hsl(var(--border))] p-4 space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
        Stable Care
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <div className="text-[hsl(var(--muted-foreground))]">Record</div>
          <div className="font-medium">
            {wins}-{losses}
            {(rawRikishi.consecutiveKyujo ?? 0) > 0 ? ` (${rawRikishi.consecutiveKyujo}× kyūjo)` : ""}
          </div>
        </div>
        <div>
          <div className="text-[hsl(var(--muted-foreground))]">Signature Kimarite</div>
          <div className="font-medium">
            {sig.kimariteId ? `${sig.kimariteId} (${sig.wins})` : "—"}
          </div>
        </div>
        <div>
          <div className="text-[hsl(var(--muted-foreground))]">Style Lean</div>
          <div className="font-medium">
            {lean ? `${lean} (${oshiWins}o/${yotsuWins}y)` : "—"}
          </div>
        </div>
        <div>
          <div className="text-[hsl(var(--muted-foreground))]">Condition</div>
          <div className="font-medium">
            {injured
              ? `Injured — ${rawRikishi.injuryWeeksRemaining}wk left`
              : `Fatigue ${Math.round(rawRikishi.fatigue ?? 0)}`}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <label className="flex items-center gap-1.5">
          <span className="text-[hsl(var(--muted-foreground))]">Diet</span>
          <select
            value={rawRikishi.diet ?? ""}
            onChange={(e) =>
              sendCommand({
                type: "SET_RIKISHI_DIET",
                rikishiId: rawRikishi.id,
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
            value={rawRikishi.effortLevel ?? "standard"}
            onChange={(e) => {
              sendCommand({
                type: "SET_RIKISHI_EFFORT",
                rikishiId: rawRikishi.id,
                effort: e.target.value as (typeof EFFORTS)[number],
              });
              toast.success(`${rawRikishi.shikona}: effort → ${e.target.value}`);
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
              sendCommand({ type: "BUY_PHYSIO", rikishiId: rawRikishi.id });
              toast.success(`Physio booked for ${rawRikishi.shikona}`);
            }}
            className="ml-auto text-xs font-medium px-3 py-1.5 rounded border border-[hsl(var(--border))] disabled:opacity-40"
            title="Paid physiotherapy session — removes 1 week of recovery"
          >
            Physio session · ¥{PHYSIO_SESSION_COST.toLocaleString("en-US")}
          </button>
        )}
      </div>
    </section>
  );
}
