/**
 * SaveSlotManagerSections.tsx
 *
 * Sections of SaveSlotManager — archive dialog content (slot cards +
 * import footer) and the delete-confirmation alert.
 */

import { DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { activationKeyHandler } from "@/lib/a11y";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, Trash2, Upload, Clock, ArrowRight, Star } from "lucide-react";
import { formatSaveDate, type SaveSlotInfo } from "@/presenters/engineAccess";
import type { BashoName } from "@/engine/types/basho";

/** One save-slot card in the archive list. */
function SaveSlotCard({
  slot,
  onLoad,
  onDelete,
  getBashoDisplay,
}: {
  slot: SaveSlotInfo;
  onLoad: (slotName: string) => void;
  onDelete: (slotName: string) => void;
  getBashoDisplay: (bashoName?: BashoName) => string;
}) {
  return (
    <Card
      className="hover:border-primary/50 transition-all cursor-pointer group shadow-xs hover:shadow-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background"
      onClick={() => onLoad(slot.slotName)}
      role="button"
      aria-label={`Load save slot ${slot.slotName}`}
      tabIndex={0}
      onKeyDown={activationKeyHandler(() => onLoad(slot.slotName))}
    >
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-display font-bold text-lg group-hover:text-primary transition-colors">
              {slot.playerHeyaName || "Vagrant Oyakata"}
            </span>
            <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-widest">
              {slot.slotName === "autosave" ? "Dynamic" : "Stable"}
            </Badge>
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-3 uppercase font-bold tracking-widest">
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 text-gold" /> Year {slot.year}
            </span>
            {slot.bashoName && (
              <>
                <span className="opacity-30">|</span>
                <span>{getBashoDisplay(slot.bashoName)}</span>
              </>
            )}
            <span className="opacity-30">|</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatSaveDate(slot.savedAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary group-hover:scale-110 transition-transform"
            aria-label={
              slot.slotName === "autosave"
                ? "Load autosave"
                : `Load ${slot.slotName.replace("slot_", "Slot ")}`
            }
            tooltip={
              slot.slotName === "autosave"
                ? "Load autosave"
                : `Load ${slot.slotName.replace("slot_", "Slot ")}`
            }
            tooltipSide="top"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          {slot.slotName !== "autosave" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(slot.slotName);
              }}
              aria-label={`Delete ${slot.slotName.replace("slot_", "Slot ")}`}
              tooltip={`Delete ${slot.slotName.replace("slot_", "Slot ")} permanently`}
              tooltipSide="top"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** Archive dialog body — header, slot list, import footer. */
export function ArchiveDialogContent({
  saveSlots,
  isImporting,
  onLoadSlot,
  onDeleteSlot,
  onImportSave,
  getBashoDisplay,
}: {
  saveSlots: SaveSlotInfo[];
  isImporting: boolean;
  onLoadSlot: (slotName: string) => void;
  onDeleteSlot: (slotName: string) => void;
  onImportSave: (e: React.ChangeEvent<HTMLInputElement>) => void;
  getBashoDisplay: (bashoName?: BashoName) => string;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-2xl font-display font-bold">
          <Save className="w-6 h-6 text-primary" />
          Career Archives
        </DialogTitle>
        <DialogDescription className="text-sm tracking-tight opacity-70">
          Review and reactivate your historical sumo legacies.
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="max-h-[400px] mt-4 pr-1">
        <div className="space-y-3">
          {saveSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12 italic opacity-60">
              No archival records detected.
            </p>
          ) : (
            saveSlots.map((slot) => (
              <SaveSlotCard
                key={slot.key}
                slot={slot}
                onLoad={onLoadSlot}
                onDelete={onDeleteSlot}
                getBashoDisplay={getBashoDisplay}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <DialogFooter className="flex-col sm:flex-row gap-2 mt-6 pt-4 border-t">
        <label className="cursor-pointer flex-1">
          <input
            type="file"
            accept=".json"
            className="sr-only peer"
            onChange={onImportSave}
            disabled={isImporting}
          />
          <Button
            variant="outline"
            className="gap-2 w-full font-bold uppercase tracking-widest border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2"
            asChild
          >
            <span>
              <Upload className="w-4 h-4" />
              {isImporting ? "Importing Data..." : "External Import"}
            </span>
          </Button>
        </label>
      </DialogFooter>
    </>
  );
}

/** Delete-save confirmation alert. */
export function DeleteSlotDialog({
  confirmDelete,
  onOpenChange,
  onConfirm,
}: {
  confirmDelete: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={!!confirmDelete} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete save?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {confirmDelete?.replace("slot_", "Slot ")}? This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
