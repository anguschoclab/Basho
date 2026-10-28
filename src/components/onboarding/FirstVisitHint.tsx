import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ONBOARDING_HINTS } from "@/constants/ui/onboardingHints";

const storageKey = (id: string) => `basho:onboarding:${id}`;

function seen(id: string): boolean {
  try {
    return window.localStorage.getItem(storageKey(id)) === "seen";
  } catch {
    return false;
  }
}

/** Dismissible first-visit hint for a gated system. Renders once per hint id. */
export function FirstVisitHint({ hintId }: { hintId: keyof typeof ONBOARDING_HINTS }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(!seen(hintId));
  }, [hintId]);

  const hint = ONBOARDING_HINTS[hintId];
  if (!open || !hint) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(storageKey(hintId), "seen");
    } catch {
      /* storage unavailable */
    }
    setOpen(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-border bg-card p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="space-y-1">
          <p className="text-sm font-semibold">{hint.title}</p>
          <p className="text-xs text-muted-foreground">{hint.body}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={dismiss} aria-label="Dismiss hint">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
