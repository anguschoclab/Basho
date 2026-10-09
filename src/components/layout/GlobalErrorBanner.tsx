// GlobalErrorBanner.tsx
// =======================================================
// Renders worker-reported failures from the game store. Worker `ERROR`
// events already land in `useGameStore.error` but nothing displayed them —
// failures like a declined SCOUT_CANDIDATE were invisible to the player.
// Command drops (mid-tick rejections) surface as transient toasts.
// =======================================================

import { useEffect } from "react";
import { X } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { toast } from "@/hooks/use-toast";

export function GlobalErrorBanner() {
  const error = useGameStore((s) => s.error);
  const commandRejected = useGameStore((s) => s.commandRejected);
  const setError = useGameStore((s) => s.setError);

  useEffect(() => {
    if (!commandRejected) return;
    toast({ title: "Action not sent", description: commandRejected, variant: "destructive" });
    useGameStore.setState({ commandRejected: null });
  }, [commandRejected]);

  if (!error) return null;

  return (
    <div
      role="alert"
      className="fixed top-2 left-1/2 z-[100] flex max-w-xl -translate-x-1/2 items-start gap-3 rounded-md border border-destructive/40 bg-destructive/95 px-4 py-2 text-sm text-destructive-foreground shadow-lg"
    >
      <span className="pt-0.5">{error}</span>
      <button
        type="button"
        aria-label="Dismiss error"
        onClick={() => setError(null)}
        className="ml-auto rounded p-1 hover:bg-white/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
