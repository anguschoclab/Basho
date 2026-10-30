/**
 * RikishiCarePanel — P6 per-rikishi card depth.
 * Signature kimarite + style lean (derived from win history), career W-L-A,
 * diet regimen + effort level controls (P3 worker commands), and a paid
 * physio session (BUY_PHYSIO) while injured.
 */
import { useGameStore } from "@/state/stores/gameStore";
import type { Rikishi } from "@/engine/types/rikishi";
import type { Heya } from "@/engine/types/heya";
import type { WorldState } from "@/presenters/uiDigest";
import type { Style } from "@/engine/types/combat";
import { deriveSignatureKimarite, PHYSIO_SESSION_COST } from "@/presenters/engineAccess";
import {
  InjuryCard,
  InjuryHistory,
  CareControls,
} from "@/components/rikishi/RikishiCarePanelSections";

const OSHI = new Set([
  "oshidashi", "tsukidashi", "hatakikomi", "tsukiotoshi", "hikiotoshi",
  "okuridashi", "okuritaoshi", "tsuppari",
]);
const YOTSU = new Set([
  "yorikiri", "yoritaoshi", "uwatenage", "shitatenage", "kotenage",
  "sukuinage", "kakenage", "uchigake", "sotogake", "utschari",
]);

const ALL_STYLES: Style[] = ["oshi", "yotsu", "hybrid"];
const STYLE_LABELS: Record<Style, string> = { oshi: "Oshi", yotsu: "Yotsu", hybrid: "Hybrid" };

export function RikishiCarePanel({
  rawRikishi,
  heya,
  world,
}: {
  rawRikishi: Rikishi;
  heya: Heya;
  world?: WorldState;
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
  const status = rawRikishi.injuryStatus;

  // "Best with" matchup hint (P6): styles not in the rikishi's
  // weakAgainstStyles list are the ones he handles best.
  const weakStyles = new Set(rawRikishi.weakAgainstStyles ?? []);
  const favoredStyles = ALL_STYLES.filter((s) => !weakStyles.has(s));
  const matchup =
    favoredStyles.length === ALL_STYLES.length
      ? "No exploitable weakness"
      : favoredStyles.length === 0
        ? "No favorable matchups"
        : `Best vs ${favoredStyles.map((s) => STYLE_LABELS[s]).join(" / ")}`;

  // Injury history — engine events of category "injury" scoped to this rikishi.
  const injuryHistory = (world?.events?.log ?? [])
    .filter((e) => e.category === "injury" && e.rikishiId === rawRikishi.id)
    .slice(-4)
    .reverse();

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
        <div>
          <div className="text-[hsl(var(--muted-foreground))]">Matchups</div>
          <div className="font-medium">{matchup}</div>
        </div>
      </div>

      {injured && status && (
        <InjuryCard status={status} weeksRemaining={rawRikishi.injuryWeeksRemaining ?? 0} />
      )}

      {injuryHistory.length > 0 && <InjuryHistory events={injuryHistory} />}

      <CareControls
        rikishi={rawRikishi}
        injured={injured}
        physioAffordable={physioAffordable}
        sendCommand={sendCommand}
      />
    </section>
  );
}
