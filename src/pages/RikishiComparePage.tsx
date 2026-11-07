/**
 * RikishiComparePage.tsx — side-by-side rikishi comparison (T2.2).
 * Two active rikishi selectable via dropdowns; shows rank/division,
 * core stats, career record, and their head-to-head tally.
 */

import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ASSOCIATION_TABS } from "@/constants/ui/navigation";
import { PageHeader } from "@/components/layout/page-shell/index";
import { useGame } from "@/state/game/useGame";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Swords } from "lucide-react";
import { GlossaryTip } from "@/components/ui/GlossaryTip";
import type { WorldState } from "@/presenters/uiDigest";
import { getAllRikishi } from "@/presenters/worldAccess";
import type { Rikishi } from "@/engine/types/rikishi";

const DIVISION_ORDER = ["makuuchi", "juryo", "makushita", "sandanme", "jonidan", "jonokuchi"];

const STAT_KEYS = [
  ["power", "Power"],
  ["technique", "Technique"],
  ["speed", "Speed"],
  ["stamina", "Stamina"],
  ["balance", "Balance"],
  ["mental", "Mental"],
] as const satisfies readonly (readonly [keyof Rikishi["stats"], string])[];

function activeRikishi(world: WorldState): Rikishi[] {
  return getAllRikishi(world)
    .filter((r) => !r.isRetired)
    .sort(
      (a, b) =>
        DIVISION_ORDER.indexOf(a.division) - DIVISION_ORDER.indexOf(b.division) ||
        a.shikona.localeCompare(b.shikona)
    );
}

function StatRow({ label, a, b }: { label: string; a: number | string; b: number | string }) {
  const aBetter = a > b;
  const bBetter = b > a;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className={`text-right font-mono ${aBetter ? "text-gold font-semibold" : ""}`}>
        {a}
      </span>
      <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className={`font-mono ${bBetter ? "text-gold font-semibold" : ""}`}>{b}</span>
    </div>
  );
}

function Picker({
  value,
  onChange,
  rikishi,
  excludeId,
}: {
  value: string;
  onChange: (id: string) => void;
  rikishi: Rikishi[];
  excludeId?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select rikishi" />
      </SelectTrigger>
      <SelectContent>
        {rikishi
          .filter((r) => r.id !== excludeId)
          .map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.shikona} — {r.rank} {r.side}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}

function RikishiCard({ rikishi }: { rikishi: Rikishi }) {
  const wins = rikishi.careerRecord?.wins ?? 0;
  const losses = rikishi.careerRecord?.losses ?? 0;
  return (
    <Card className="paper">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="text-xl font-display">{rikishi.shikona}</span>
          <Badge variant="outline" className="capitalize">
            <GlossaryTip termId={rikishi.rank}>{rikishi.rank}</GlossaryTip> {rikishi.side}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground capitalize mb-3">
          {rikishi.division} · {rikishi.heyaId}
        </p>
        <p className="font-mono text-sm">
          Career {wins}–{losses}
          {rikishi.careerRecord?.yusho ? ` · ${rikishi.careerRecord.yusho} yusho` : ""}
        </p>
      </CardContent>
    </Card>
  );
}

export default function RikishiComparePage() {
  const { state } = useGame();
  const world = state.world;
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");

  const roster = useMemo(() => (world ? activeRikishi(world) : []), [world]);
  const a = aId ? world?.rikishi.get(aId) : undefined;
  const b = bId ? world?.rikishi.get(bId) : undefined;

  const h2h = useMemo(() => {
    if (!a || !b) return null;
    return {
      aWins: a.h2h?.[b.id]?.wins ?? 0,
      bWins: b.h2h?.[a.id]?.wins ?? 0,
    };
  }, [a, b]);

  if (!world) return null;

  return (
    <AppLayout subNavTabs={ASSOCIATION_TABS} pageTitle="Rikishi Comparison">
      <PageHeader
        eyebrow="RIKISHI"
        title="Rikishi Comparison"
        lede="Side-by-side stats and head-to-head record."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Picker value={aId} onChange={setAId} rikishi={roster} excludeId={bId} />
        <Picker value={bId} onChange={setBId} rikishi={roster} excludeId={aId} />
      </div>

      {a && b ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RikishiCard rikishi={a} />
            <RikishiCard rikishi={b} />
          </div>

          <Card className="paper">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Swords className="h-4 w-4" /> Head-to-Head
              </CardTitle>
            </CardHeader>
            <CardContent>
              {h2h && (h2h.aWins > 0 || h2h.bWins > 0) ? (
                <p className="font-mono text-center text-lg">
                  {a.shikona} {h2h.aWins} — {h2h.bWins} {b.shikona}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground text-center">No recorded meetings.</p>
              )}
            </CardContent>
          </Card>

          <Card className="paper">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Stats</CardTitle>
            </CardHeader>
            <CardContent>
              {STAT_KEYS.map(([key, label]) => (
                <StatRow key={key} label={label} a={a.stats[key]} b={b.stats[key]} />
              ))}
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select two rikishi to compare.</p>
      )}
    </AppLayout>
  );
}
