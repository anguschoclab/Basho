/**
 * src/components/menu/SaveSlotManager.tsx
 *
 * Manages save slot listing, loading, deleting, and importing.
 * Includes the Load Game dialog content.
 * Sections live in ./SaveSlotManagerSections.tsx.
 */

import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Database, History } from "lucide-react";
import { useSaveSlotManager, type UseSaveSlotManagerProps } from "@/hooks/useSaveSlotManager";
import { ArchiveDialogContent, DeleteSlotDialog } from "./SaveSlotManagerSections";

interface SaveSlotManagerProps extends UseSaveSlotManagerProps {
  hideArchiveButton?: boolean;
}

export function SaveSlotManager({
  getSaveSlots,
  loadFromSlot,
  loadFromAutosave,
  hasAutosave,
  onLoadSuccess,
  loadWorldDirect,
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

        <DialogContent className="max-w-lg border-t-8 border-t-primary shadow-2xl bg-background">
          <ArchiveDialogContent
            saveSlots={saveSlots}
            isImporting={isImporting}
            onLoadSlot={handleLoadSlot}
            onDeleteSlot={handleDeleteSlot}
            onImportSave={handleImportSave}
            getBashoDisplay={getBashoDisplay}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <DeleteSlotDialog
        confirmDelete={confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        onConfirm={confirmDeleteAction}
      />
    </div>
  );
}
