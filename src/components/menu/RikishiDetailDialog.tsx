/**
 * RikishiDetailDialog.tsx
 *
 * Rikishi detail dialog component for HeyaPreview.
 * Sections live in ./RikishiDetailDialogSections.tsx.
 */

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UIRikishi } from "@/presenters/uiModels";
import {
  DossierHeader,
  QuickStatsRow,
  BasicInfoGrid,
  RankInfoCard,
  AttributesGrid,
  CombatStyleSection,
} from "./RikishiDetailDialogSections";

interface RikishiDetailDialogProps {
  selectedRikishi: UIRikishi | null;
  onClose: () => void;
  rosterWithAge: Array<{ rikishi: UIRikishi; age: number }>;
}

export function RikishiDetailDialog({
  selectedRikishi,
  onClose,
  rosterWithAge,
}: RikishiDetailDialogProps) {
  if (!selectedRikishi) return null;

  const selectedEntry = rosterWithAge.find((r) => r.rikishi.id === selectedRikishi.id);

  return (
    <Dialog open={!!selectedRikishi} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0 [&>button]:hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{selectedRikishi?.shikona || "Rikishi Details"}</DialogTitle>
        </DialogHeader>
        <DossierHeader rikishi={selectedRikishi} />

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {/* Quick Stats */}
            <QuickStatsRow rikishi={selectedRikishi} />

            {/* Basic Info */}
            <BasicInfoGrid rikishi={selectedRikishi} selectedEntry={selectedEntry} />

            {/* Rank Info */}
            <RankInfoCard rikishi={selectedRikishi} />

            {/* Stats */}
            <AttributesGrid rikishi={selectedRikishi} />

            {/* Combat Style */}
            <CombatStyleSection rikishi={selectedRikishi} />
          </div>
        </ScrollArea>

        <DialogFooter className="pt-3 border-t shrink-0">
          <Button
            variant="outline"
            className="font-bold uppercase tracking-widest h-10"
            onClick={onClose}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
