/**
 * DivisionRecordsCard.tsx
 *
 * Per-division career W-L ledger for the rikishi career tab — answers
 * "is this record proven at the top or padded lower down?" using the
 * engine-tracked rikishi.divisionRecords (updated per bout result).
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Rikishi } from "@/engine/types/rikishi";

type DivisionRecords = Rikishi["divisionRecords"];
type DivisionKey = keyof DivisionRecords;

const DIVISION_ORDER: DivisionKey[] = [
  "makuuchi",
  "juryo",
  "makushita",
  "sandanme",
  "jonidan",
  "jonokuchi",
];

const DIVISION_LABELS: Record<DivisionKey, string> = {
  makuuchi: "Makuuchi",
  juryo: "Juryo",
  makushita: "Makushita",
  sandanme: "Sandanme",
  jonidan: "Jonidan",
  jonokuchi: "Jonokuchi",
};

export function DivisionRecordsCard({ records }: { records?: DivisionRecords }) {
  const rows = DIVISION_ORDER.map((div) => ({ div, rec: records?.[div] })).filter(
    ({ rec }) => (rec?.wins ?? 0) + (rec?.losses ?? 0) > 0
  );

  return (
    <Card className="paper border-0 shadow-none bg-transparent overflow-hidden">
      <CardHeader className="px-0 pb-6 border-b border-dashed border-border mb-6">
        <CardTitle className="text-2xl font-display font-black flex items-center gap-3 uppercase tracking-tight">
          <Layers className="h-6 w-6 text-primary" />
          Record by Division
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm font-display italic text-muted-foreground opacity-50">
            No recorded bouts yet.
          </p>
        ) : (
          <table className="w-full max-w-md">
            <tbody className="divide-y divide-border/40">
              {rows.map(({ div, rec }) => {
                const wins = rec?.wins ?? 0;
                const losses = rec?.losses ?? 0;
                const winPct = wins / (wins + losses);
                return (
                  <tr key={div} className="hover:bg-primary/5 transition-colors">
                    <td className="py-2.5 pr-6 text-xs font-black uppercase tracking-widest text-muted-foreground">
                      {DIVISION_LABELS[div]}
                    </td>
                    <td
                      className={cn(
                        "py-2.5 px-6 text-center tabular-nums font-display font-black",
                        wins >= losses ? "text-success" : "text-gold"
                      )}
                    >
                      {wins}-{losses}
                    </td>
                    <td className="py-2.5 pl-6 text-right tabular-nums text-xs font-black opacity-60">
                      {(winPct * 100).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
