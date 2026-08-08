/**
 * src/components/menu/SaveSlotManager.tsx
 *
 * Manages save slot listing, loading, deleting, and importing.
 * Includes the Load Game dialog content.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Save, Trash2, Upload, Clock, ArrowRight, Database, History, Star } from "lucide-react";
import type { SaveSlotInfo } from "@/engine/saveload";
import { formatSaveDate } from "@/engine/utils/formatters";
import { useSaveSlotManager } from "@/hooks/useSaveSlotManager";

interface SaveSlotManagerProps {
  getSaveSlots: () => SaveSlotInfo[];
  loadFromSlot: (slotName: string) => boolean;
  loadFromAutosave: () => void;
  hasAutosave: () => boolean;
  onLoadSuccess: () => void;
  loadWorldDirect?: (world: unknown) => void;
  createWorld?: (seed: string, playerHeyaId?: string) => void;
  hideArchiveButton?: boolean;
}

export function SaveSlotManager({
  getSaveSlots,
  loadFromSlot,
  loadFromAutosave,
  hasAutosave,
  onLoadSuccess,
  loadWorldDirect,
  createWorld,
  hideArchiveButton,
}: SaveSlotManagerProps) {
  const {
    showLoadDialog,
    setShowLoadDialog,
    saveSlots,
    isImporting,
    confirmDelete,
    setConfirmDelete,
    canContinue,
    handleContinue,
    handleLoadSlot,
    handleDeleteSlot,
    handleImportSave,
    getBashoDisplay,
    confirmDeleteAction,
  } = useSaveSlotManager({
    getSaveSlots,
    loadFromSlot,
    loadFromAutosave,
    hasAutosave,
    onLoadSuccess,
    loadWorldDirect,
    createWorld,
  });

  return (
    <div className="flex items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200 fill-mode-both">
      {canContinue && (
        <Button
          size="lg"
          variant="default"
          className="gap-2 font-bold uppercase tracking-widest shadow-xl hover:scale-105 transition-transform"
          onClick={handleContinue}
        >
          <History className="w-4 h-4" />
          Resume Career
        </Button>
      )}

      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogTrigger asChild>
          <Button
            id="archive-trigger"
            variant="outline"
            size="lg"
            className={`gap-2 font-bold uppercase tracking-widest border-2 hover:bg-muted/50 ${hideArchiveButton ? "hidden" : ""}`}
          >
            <Database className="w-4 h-4" />
            Archive Management
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-lg border-t-8 border-t-primary shadow-2xl backdrop-blur-sm bg-background/95">
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
                  <Card
                    key={slot.key}
                    className="hover:border-primary/50 transition-all cursor-pointer group shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background"
                    onClick={() => handleLoadSlot(slot.slotName)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleLoadSlot(slot.slotName);
                      }
                    }}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-display font-bold text-lg group-hover:text-primary transition-colors">
                            {slot.playerHeyaName || "Vagrant Oyakata"}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-[9px] font-bold uppercase tracking-widest"
                          >
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
                              handleDeleteSlot(slot.slotName);
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
                onChange={handleImportSave}
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
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete save?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {confirmDelete?.replace("slot_", "Slot ")}? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) {
                  confirmDeleteAction();
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
