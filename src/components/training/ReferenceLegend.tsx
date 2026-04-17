/**
 * ReferenceLegend.tsx
 *
 * Focus orientation reference legend for training page.
 */

import { ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_MODE_OPTIONS } from "./trainingConstants";

export function ReferenceLegend() {
  return (
    <section className="dossier-paper p-8 rounded-3xl bg-muted/20 border-2 border-dashed">
      <div className="flex items-center gap-3 mb-6">
        <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
        <h4 className="pro-header">Focus Orientation Reference</h4>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {FOCUS_MODE_OPTIONS.map((opt) => (
          <div key={opt.value} className="space-y-2">
            <div className="flex items-center gap-2">
              <div className={cn("p-1.5 rounded-lg", opt.color)}>{opt.icon}</div>
              <div className="font-display font-black text-sm uppercase">{opt.label}</div>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed italic">
              "{opt.description}"
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
