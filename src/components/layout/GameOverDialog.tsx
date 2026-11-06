/**
 * GameOverDialog.tsx
 *
 * Ironman end-of-career surface (T1.2). Shown when `world.gameOver` is set —
 * the tick pipeline is already frozen, so this is the player's exit path:
 * review the final state or start a new career. Dismissal is session-scoped
 * so it re-nags on reload but not on every page navigation.
 */

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skull } from "lucide-react";
import { t } from "@/lib/i18n";
import type { WorldState } from "@/presenters/uiDigest";

/** Session-scoped dismissal — survives AppLayout remounts on navigation. */
let dismissedForSession = false;

export function GameOverDialog({ world }: { world: WorldState }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  if (!world.gameOver || dismissedForSession) return null;

  const dismiss = () => {
    dismissedForSession = true;
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && dismiss()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-2xl font-display">
            <Skull className="w-6 h-6 text-destructive" />
            {t("gameover.title", { name: world.gameOver.oyakataName })}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed">
            {world.gameOver.reason} Year {world.gameOver.year}. Ironman mode — your career
            ends here; the stable moves on without you.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={dismiss}>
            {t("gameover.review")}
          </Button>
          <Button onClick={() => navigate({ to: "/new-game", search: { heyaId: undefined } })}>
            {t("gameover.newCareer")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
