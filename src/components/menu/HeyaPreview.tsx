/**
 * src/components/menu/HeyaPreview.tsx
 *
 * Detailed preview dialog for a stable's roster and stats.
 * Uses a "Dossier" style aesthetic for a premium feel.
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Heya } from "@/engine/types/heya";
import { STATURE_CONFIG } from "./statureConfig";
import { sortRikishiByRank } from "@/utils/engineUtils";
import type { UIRikishi } from "@/presenters/uiModels";
import { RikishiDetailDialog } from "./RikishiDetailDialog";
import { PreviewHero, PreviewStats, PreviewRoster, PreviewFooter } from "./HeyaPreviewSections";

interface HeyaPreviewProps {
  heya: Heya | null;
  onClose: () => void;
  onConfirm: (heyaId: string) => void;
  sekitoriCount: number;
  rosterWithAge: Array<{ rikishi: UIRikishi; age: number }>;
}

export function HeyaPreview({
  heya,
  onClose,
  onConfirm,
  sekitoriCount,
  rosterWithAge,
}: HeyaPreviewProps) {
  const [selectedRikishi, setSelectedRikishi] = useState<UIRikishi | null>(null);

  if (!heya) return null;

  const config = STATURE_CONFIG[heya.statureBand];

  const roster = [...rosterWithAge].sort((a, b) => sortRikishiByRank(a.rikishi, b.rikishi));

  return (
    <Dialog open={!!heya} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Stable Preview</DialogTitle>
        </DialogHeader>
        <div className="bg-background rounded-lg border-2 border-primary/20 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <PreviewHero heya={heya} config={config} />

          <div className="p-4 flex-1 flex flex-col overflow-hidden gap-4 min-h-0">
            <PreviewStats config={config} roster={roster} sekitoriCount={sekitoriCount} />
            <PreviewRoster roster={roster} onSelect={setSelectedRikishi} />
            <PreviewFooter heyaId={heya.id} onClose={onClose} onConfirm={onConfirm} />
          </div>
        </div>
      </DialogContent>

      <RikishiDetailDialog
        selectedRikishi={selectedRikishi}
        onClose={() => setSelectedRikishi(null)}
        rosterWithAge={rosterWithAge}
      />
    </Dialog>
  );
}
